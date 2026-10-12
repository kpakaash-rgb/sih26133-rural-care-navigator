/**
 * clustering.js
 * =============
 * Density-based spatial clustering of healthcare facilities using DBSCAN
 * with Haversine distance on geographic coordinates (latitude / longitude).
 *
 * Distinguishes clearly between:
 * 1. Density-based Spatial Clustering (DBSCAN): Groups facilities that form geographic clusters.
 * 2. Nearest-Hospital Ranking: Sorts facilities strictly by actual distance to the user.
 *
 * Gracefully handles:
 * - Unclustered hospitals (DBSCAN noise points / isolated facilities)
 * - Missing coordinates (never fabricates GPS coordinates)
 * - Denied location permission & unavailable GPS
 */

/**
 * Earth radius in kilometers for spherical trigonometry.
 */
export const EARTH_RADIUS_KM = 6371.0

/**
 * Default DBSCAN configuration for Tamil Nadu rural/urban healthcare facilities:
 * - epsKm: 25.0 km search radius (meaningful district & regional health catchment radius)
 * - minPts: 2 minimum facilities to form a density cluster
 */
export const DEFAULT_DBSCAN_CONFIG = {
  epsKm: 25.0,
  minPts: 2,
}

/**
 * Calculate the great-circle distance between two geographic coordinates in kilometers
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number|null} Great-circle distance in km, or null if coordinates are invalid
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return null
  }

  // Bounds validation
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) return null
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) return null

  const dLat = ((lat2 - lat1) * Math.PI) / 180.0
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0

  const lat1Rad = (lat1 * Math.PI) / 180.0
  const lat2Rad = (lat2 * Math.PI) / 180.0

  const a =
    Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0)

  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a))
  const distance = EARTH_RADIUS_KM * c

  return Math.round(distance * 10) / 10
}

/**
 * Validates whether a facility has genuine geographic coordinates.
 *
 * @param {object} facility - Healthcare facility object
 * @returns {boolean} True if coordinates are valid numbers
 */
export function hasValidCoordinates(facility) {
  if (!facility || typeof facility !== 'object') return false
  const lat = facility.latitude ?? facility.raw?.latitude
  const lon = facility.longitude ?? facility.raw?.longitude
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  )
}

/**
 * Extracts normalized latitude and longitude numbers from a facility record.
 *
 * @param {object} facility - Healthcare facility object
 * @returns {{ lat: number, lon: number } | null}
 */
export function getFacilityCoordinates(facility) {
  if (!hasValidCoordinates(facility)) return null
  const lat = facility.latitude ?? facility.raw?.latitude
  const lon = facility.longitude ?? facility.raw?.longitude
  return { lat, lon }
}

/**
 * Run Density-Based Spatial Clustering of Applications with Noise (DBSCAN)
 * on a collection of healthcare facilities using Haversine distance.
 *
 * @param {Array<object>} facilities - List of healthcare facilities
 * @param {object} [options] - Configuration options
 * @param {number} [options.epsKm=25.0] - Epsilon neighborhood radius in kilometers
 * @param {number} [options.minPts=2] - Minimum number of points required to form a core cluster
 * @returns {{
 *   clusters: Array<object>,
 *   unclustered: Array<object>,
 *   missingCoordinates: Array<object>,
 *   allWithCoordinates: Array<object>,
 *   parameters: { epsKm: number, minPts: number }
 * }}
 */
export function runDBSCAN(facilities = [], options = {}, maybeMinPts = undefined) {
  let epsKm = DEFAULT_DBSCAN_CONFIG.epsKm
  let minPts = DEFAULT_DBSCAN_CONFIG.minPts
  if (typeof options === 'number') {
    epsKm = options
    if (typeof maybeMinPts === 'number') minPts = maybeMinPts
  } else if (options && typeof options === 'object') {
    if (typeof options.epsKm === 'number') epsKm = options.epsKm
    if (typeof options.minPts === 'number') minPts = options.minPts
  }

  const validPoints = []
  const missingCoordinates = []

  // Step 1: Separate facilities with valid coordinates from missing coordinates
  for (let i = 0; i < facilities.length; i++) {
    const fac = facilities[i]
    const coords = getFacilityCoordinates(fac)
    if (coords) {
      validPoints.push({
        index: i,
        facility: fac,
        lat: coords.lat,
        lon: coords.lon,
        visited: false,
        clusterId: null, // null = unassigned, -1 = noise/unclustered, >0 = cluster
      })
    } else {
      missingCoordinates.push({
        ...fac,
        isMissingCoordinates: true,
      })
    }
  }

  const n = validPoints.length
  if (n === 0) {
    return {
      clusters: [],
      unclustered: [],
      missingCoordinates,
      allWithCoordinates: [],
      parameters: { epsKm, minPts },
    }
  }

  // Precompute pairwise distances between all valid facility coordinates
  const distanceMatrix = Array.from({ length: n }, () => new Float32Array(n))
  for (let i = 0; i < n; i++) {
    distanceMatrix[i][i] = 0
    for (let j = i + 1; j < n; j++) {
      const d = calculateHaversineDistance(
        validPoints[i].lat,
        validPoints[i].lon,
        validPoints[j].lat,
        validPoints[j].lon
      )
      distanceMatrix[i][j] = d ?? 999999
      distanceMatrix[j][i] = d ?? 999999
    }
  }

  const getNeighbors = (pointIdx) => {
    const neighbors = []
    for (let j = 0; j < n; j++) {
      if (distanceMatrix[pointIdx][j] <= epsKm) {
        neighbors.push(j)
      }
    }
    return neighbors
  }

  let clusterCounter = 0

  // Step 2: Main DBSCAN loop
  for (let i = 0; i < n; i++) {
    const point = validPoints[i]
    if (point.visited) continue
    point.visited = true

    const neighbors = getNeighbors(i)

    if (neighbors.length < minPts) {
      // Mark as noise / unclustered point
      point.clusterId = -1
    } else {
      // Create new cluster
      clusterCounter += 1
      point.clusterId = clusterCounter

      // Expand cluster
      const seedQueue = [...neighbors.filter((idx) => idx !== i)]

      let queueIdx = 0
      while (queueIdx < seedQueue.length) {
        const neighborIdx = seedQueue[queueIdx]
        queueIdx += 1

        const neighborPoint = validPoints[neighborIdx]

        if (!neighborPoint.visited) {
          neighborPoint.visited = true
          const neighborNeighbors = getNeighbors(neighborIdx)
          if (neighborNeighbors.length >= minPts) {
            for (const nn of neighborNeighbors) {
              if (!seedQueue.includes(nn) && nn !== neighborIdx) {
                seedQueue.push(nn)
              }
            }
          }
        }

        // Assign point to cluster if not already part of any cluster
        if (neighborPoint.clusterId === null || neighborPoint.clusterId === -1) {
          neighborPoint.clusterId = clusterCounter
        }
      }
    }
  }

  // Step 3: Organize cluster objects and unclustered items
  const clustersMap = new Map()
  const unclustered = []
  const allWithCoordinates = []

  for (let i = 0; i < n; i++) {
    const p = validPoints[i]
    const facilityWithMeta = {
      ...p.facility,
      latitude: p.lat,
      longitude: p.lon,
      clusterId: p.clusterId > 0 ? p.clusterId : null,
      isClusterMember: p.clusterId > 0,
      isUnclustered: p.clusterId === -1,
    }

    allWithCoordinates.push(facilityWithMeta)

    if (p.clusterId > 0) {
      if (!clustersMap.has(p.clusterId)) {
        clustersMap.set(p.clusterId, [])
      }
      clustersMap.get(p.clusterId).push(facilityWithMeta)
    } else {
      unclustered.push(facilityWithMeta)
    }
  }

  // Build rich cluster objects
  const clusters = []
  for (const [id, memberHospitals] of clustersMap.entries()) {
    // Calculate centroid
    const avgLat = memberHospitals.reduce((sum, h) => sum + h.latitude, 0) / memberHospitals.length
    const avgLon = memberHospitals.reduce((sum, h) => sum + h.longitude, 0) / memberHospitals.length

    // Calculate maximum radius from centroid
    let maxRadius = 0
    for (const h of memberHospitals) {
      const d = calculateHaversineDistance(avgLat, avgLon, h.latitude, h.longitude) || 0
      if (d > maxRadius) maxRadius = d
    }

    // Determine primary district
    const districtCounts = {}
    for (const h of memberHospitals) {
      const d = h.district || h.raw?.district || 'Tamil Nadu'
      districtCounts[d] = (districtCounts[d] || 0) + 1
    }
    const primaryDistrict = Object.keys(districtCounts).sort(
      (a, b) => districtCounts[b] - districtCounts[a]
    )[0]

    clusters.push({
      id,
      label: `${primaryDistrict} Healthcare Cluster`,
      title: `${primaryDistrict} Healthcare Cluster (${memberHospitals.length} facilities)`,
      district: primaryDistrict,
      hospitals: memberHospitals,
      facilities: memberHospitals,
      count: memberHospitals.length,
      center: {
        latitude: Math.round(avgLat * 10000) / 10000,
        longitude: Math.round(avgLon * 10000) / 10000,
      },
      radiusKm: Math.round(maxRadius * 10) / 10,
    })
  }

  // Sort clusters by count descending initially
  clusters.sort((a, b) => b.count - a.count)

  return {
    clusters,
    unclustered,
    noise: unclustered,
    missingCoordinates,
    allWithCoordinates,
    parameters: { epsKm, minPts },
  }
}

/**
 * Discover and rank nearby hospitals and hospital clusters based on user GPS coordinates.
 * Strictly calculates actual distances without fabricating user or facility coordinates.
 *
 * @param {Array<object>} facilities - Collection of facilities
 * @param {{ latitude: number|null, longitude: number|null } | null} userLocation - Device GPS location
 * @param {object} [dbscanOptions] - DBSCAN configuration overrides
 * @returns {object} Ranked hospital discovery result
 */
export function discoverNearbyHospitalsAndClusters(
  facilities = [],
  userLocation = null,
  dbscanOptions = {}
) {
  // Step 1: Run density-based spatial clustering on valid coordinates
  const clusteringResult = runDBSCAN(facilities, dbscanOptions)
  const { clusters, unclustered, missingCoordinates } = clusteringResult

  const hasUserCoords =
    userLocation &&
    typeof userLocation.latitude === 'number' &&
    typeof userLocation.longitude === 'number' &&
    !isNaN(userLocation.latitude) &&
    !isNaN(userLocation.longitude)

  const userLat = hasUserCoords ? userLocation.latitude : null
  const userLon = hasUserCoords ? userLocation.longitude : null

  // Helper to attach actual distance
  const enrichWithDistance = (hospital) => {
    const coords = getFacilityCoordinates(hospital)
    if (hasUserCoords && coords) {
      const distanceKm = calculateHaversineDistance(userLat, userLon, coords.lat, coords.lon)
      return {
        ...hospital,
        distance_km: distanceKm,
        distanceToUserKm: distanceKm,
        distance_text: distanceKm !== null ? `${distanceKm.toFixed(1)} km` : null,
      }
    }
    return {
      ...hospital,
      distance_km: typeof hospital.distance_km === 'number' ? hospital.distance_km : null,
      distanceToUserKm: typeof hospital.distance_km === 'number' ? hospital.distance_km : null,
      distance_text: typeof hospital.distance_km === 'number' ? `${hospital.distance_km.toFixed(1)} km` : null,
    }
  }

  // Step 2: Rank individual hospitals strictly by proximity (Nearest Hospital Ranking)
  const allRankedHospitals = []
  for (const fac of facilities) {
    allRankedHospitals.push(enrichWithDistance(fac))
  }

  if (hasUserCoords) {
    allRankedHospitals.sort((a, b) => {
      if (a.distance_km === null && b.distance_km === null) return 0
      if (a.distance_km === null) return 1
      if (b.distance_km === null) return -1
      return a.distance_km - b.distance_km
    })
  }

  // Step 3: Enrich clusters with user distance and sort clusters by proximity
  const enrichedClusters = clusters.map((cluster) => {
    const memberHospitals = cluster.hospitals.map(enrichWithDistance)

    let centroidDistanceKm = null
    let nearestHospitalDistanceKm = null

    if (hasUserCoords) {
      centroidDistanceKm = calculateHaversineDistance(
        userLat,
        userLon,
        cluster.center.latitude,
        cluster.center.longitude
      )

      // Find minimum distance among member hospitals
      for (const h of memberHospitals) {
        if (h.distance_km !== null) {
          if (nearestHospitalDistanceKm === null || h.distance_km < nearestHospitalDistanceKm) {
            nearestHospitalDistanceKm = h.distance_km
          }
        }
      }
    }

    // Sort member hospitals by proximity
    if (hasUserCoords) {
      memberHospitals.sort((a, b) => (a.distance_km || 99999) - (b.distance_km || 99999))
    }

    return {
      ...cluster,
      hospitals: memberHospitals,
      facilities: memberHospitals,
      centroidDistanceKm,
      nearestHospitalDistanceKm,
      distanceToUserKm: nearestHospitalDistanceKm,
      distance_text: nearestHospitalDistanceKm !== null ? `${nearestHospitalDistanceKm.toFixed(1)} km` : null,
    }
  })

  // Sort clusters closest to user first
  if (hasUserCoords) {
    enrichedClusters.sort((a, b) => {
      const distA = a.nearestHospitalDistanceKm ?? 99999
      const distB = b.nearestHospitalDistanceKm ?? 99999
      return distA - distB
    })
  }

  // Enrich unclustered facilities with distance
  const enrichedUnclustered = unclustered.map(enrichWithDistance)
  if (hasUserCoords) {
    enrichedUnclustered.sort((a, b) => (a.distance_km || 99999) - (b.distance_km || 99999))
  }

  return {
    userHasLocation: hasUserCoords,
    userLocation: hasUserCoords ? { latitude: userLat, longitude: userLon } : null,
    clusters: enrichedClusters,
    unclustered: enrichedUnclustered,
    missingCoordinates,
    nearestHospitals: allRankedHospitals,
    parameters: clusteringResult.parameters,
  }
}
