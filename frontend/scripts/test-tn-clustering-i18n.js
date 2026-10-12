/**
 * Comprehensive Verification Test Suite:
 * 1. Tamil Nadu Doctor & Hospital Data Integrity
 * 2. DBSCAN Density-Based Spatial Clustering & Nearby Discovery
 * 3. Graceful Location Access (Granted, Denied, Missing GPS, No Fabrication)
 * 4. Proper Tamil Localization & i18n Switching (specifically CHC Maduranthakam -> மதுராந்தகம் சமூக சுகாதார மையம்)
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { DOCTORS_DATA, filterDoctorsOffline } from '../src/data/doctorsData.js'
import {
  calculateHaversineDistance,
  runDBSCAN,
  hasValidCoordinates,
  discoverNearbyHospitalsAndClusters,
} from '../src/utils/clustering.js'
import {
  FACILITY_NAME_TO_KEY,
  DISTRICT_TO_KEY,
  getLocalizedFacilityName,
  getLocalizedDistrict,
  getLocalizedClusterTitle,
} from '../src/utils/hospitalLocalization.js'
import { translations } from '../src/i18n/translations.js'

// Simple mock translator based on translation object
function createMockT(lang) {
  const dict = translations[lang] || translations.en
  return (key, params = {}) => {
    const parts = key.split('.')
    let current = dict
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return key
      }
    }
    if (typeof current === 'string') {
      let str = current
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
      }
      return str
    }
    return current
  }
}

test('1. Tamil Nadu Doctor & Hospital Demo Data Integrity', () => {
  // Verify doctors count and Tamil Nadu distribution
  assert.ok(Array.isArray(DOCTORS_DATA), 'DOCTORS_DATA must be an array')
  assert.ok(DOCTORS_DATA.length >= 10, 'Must have at least 10 demo doctors')

  const expectedDistricts = [
    'Chennai',
    'Chengalpattu',
    'Kanchipuram',
    'Tiruvallur',
    'Madurai',
    'Coimbatore',
    'Tiruchirappalli',
  ]

  const representedDistricts = new Set(DOCTORS_DATA.map((d) => d.district))
  expectedDistricts.forEach((dist) => {
    assert.ok(
      representedDistricts.has(dist),
      `District ${dist} must be represented in DOCTORS_DATA`
    )
  })

  // Verify all doctors have demo markers and unverified status
  DOCTORS_DATA.forEach((doc) => {
    assert.equal(doc.is_demo, true, `Doctor ${doc.id} must have is_demo: true`)
    assert.equal(
      doc.verification_status,
      'DEMO_UNVERIFIED',
      `Doctor ${doc.id} must be marked DEMO_UNVERIFIED`
    )
    assert.ok(typeof doc.latitude === 'number', `Doctor ${doc.id} must have valid latitude`)
    assert.ok(typeof doc.longitude === 'number', `Doctor ${doc.id} must have valid longitude`)
    assert.ok(doc.name.startsWith('Dr. '), `Doctor ${doc.id} must have plausible title`)
    assert.ok(doc.facility_name, `Doctor ${doc.id} must have assigned facility name`)
  })

  // Verify backwards compatibility for test expectations
  const doc109 = DOCTORS_DATA.find((d) => d.doctor_id === 'DOC-10109' || d.id === 'DOC-10109')
  assert.ok(doc109, 'DOC-10109 must exist')
  assert.equal(doc109.facility_name, 'CHC Maduranthakam')
  assert.equal(doc109.district, 'Chengalpattu')

  const doc110 = DOCTORS_DATA.find((d) => d.doctor_id === 'DOC-10110' || d.id === 'DOC-10110')
  assert.ok(doc110, 'DOC-10110 must exist')
  assert.equal(doc110.facility_name, 'District Headquarters Hospital Kanchipuram')

  const doc111 = DOCTORS_DATA.find((d) => d.doctor_id === 'DOC-10111' || d.id === 'DOC-10111')
  assert.ok(doc111, 'DOC-10111 must exist')
  assert.equal(doc111.facility_name, 'Mobile Medical Unit Chengalpattu')

  // Search by "Priya" (must find at least 2 doctors)
  const priyaDocs = filterDoctorsOffline(DOCTORS_DATA, { search: 'Priya' })
  assert.ok(priyaDocs.length >= 2, 'Must have at least 2 doctors matching "Priya"')

  // Search by "Ananya"
  const ananyaDocs = filterDoctorsOffline(DOCTORS_DATA, { search: 'Ananya' })
  assert.ok(ananyaDocs.length >= 1, 'Must have doctor matching "Ananya"')

  // Filter by district
  const cgpDocs = filterDoctorsOffline(DOCTORS_DATA, { search: 'Chengalpattu' })
  assert.ok(cgpDocs.length >= 2, 'Must filter doctors by Chengalpattu district')
})

test('2. DBSCAN Density-Based Spatial Clustering & Haversine Distance', () => {
  // Test Haversine distance accuracy
  // Chennai (13.0827, 80.2707) to Chengalpattu (12.6841, 79.9836) ~ 53 km
  const dist = calculateHaversineDistance(13.0827, 80.2707, 12.6841, 79.9836)
  assert.ok(dist > 45 && dist < 60, `Haversine distance should be ~53km, got ${dist.toFixed(2)}`)

  // Identical coordinates must be 0 distance
  assert.equal(calculateHaversineDistance(13.0, 80.0, 13.0, 80.0), 0)

  // Coordinate validator
  assert.equal(hasValidCoordinates({ latitude: 12.5, longitude: 79.8 }), true)
  assert.equal(hasValidCoordinates({ latitude: null, longitude: 79.8 }), false)
  assert.equal(hasValidCoordinates({ latitude: 'abc', longitude: 79.8 }), false)

  // Sample TN demo facilities
  const demoFacilities = [
    // Chengalpattu cluster (within 20km of each other)
    { id: 1, name: 'CHC Maduranthakam', latitude: 12.5534, longitude: 79.8847, district: 'Chengalpattu' },
    { id: 2, name: 'PHC Thirukazhukundram', latitude: 12.6092, longitude: 80.0543, district: 'Chengalpattu' },
    { id: 3, name: 'Chengalpattu GMC Hospital', latitude: 12.6932, longitude: 79.9785, district: 'Chengalpattu' },

    // Chennai cluster (within 5km of each other)
    { id: 4, name: 'Rajiv Gandhi Government General Hospital Chennai', latitude: 13.0805, longitude: 80.2778, district: 'Chennai' },
    { id: 5, name: 'Government Kilpauk Medical College Hospital Chennai', latitude: 13.0784, longitude: 80.2432, district: 'Chennai' },
    { id: 6, name: 'Government Stanley Medical College Hospital Chennai', latitude: 13.1065, longitude: 80.2872, district: 'Chennai' },

    // Trichy cluster (within 6km of each other)
    { id: 7, name: 'Mahatma Gandhi Memorial Government Hospital Tiruchirappalli', latitude: 10.8062, longitude: 78.6881, district: 'Tiruchirappalli' },
    { id: 8, name: 'Srirangam Government Hospital Tiruchirappalli', latitude: 10.8624, longitude: 78.6946, district: 'Tiruchirappalli' },

    // Rural outlier / isolated hill hospital: Valparai GH (Anamalai hills, ~75km away from nearest plain hospital)
    { id: 9, name: 'Valparai Government Hospital', latitude: 10.3242, longitude: 76.9558, district: 'Coimbatore' },

    // Missing coordinates item
    { id: 10, name: 'Unmapped Remote Health Subcentre', latitude: null, longitude: null, district: 'Kanchipuram' },
  ]

  // Run DBSCAN with epsKm: 25.0, minPts: 2
  const dbscanOutput = runDBSCAN(demoFacilities.filter((f) => hasValidCoordinates(f)), 25.0, 2)

  assert.ok(dbscanOutput.clusters.length >= 3, 'DBSCAN must form at least 3 clusters (Chengalpattu, Chennai, Trichy)')
  assert.equal(dbscanOutput.noise.length, 1, 'Valparai GH must be identified as noise/unclustered')
  assert.equal(dbscanOutput.noise[0].name, 'Valparai Government Hospital')

  // Check cluster members
  const chengalpattuCluster = dbscanOutput.clusters.find((c) =>
    c.facilities.some((f) => f.name === 'CHC Maduranthakam')
  )
  assert.ok(chengalpattuCluster, 'Must have Chengalpattu cluster')
  assert.equal(chengalpattuCluster.facilities.length, 3, 'Chengalpattu cluster must have 3 facilities')
  assert.ok(chengalpattuCluster.radiusKm > 0 && chengalpattuCluster.radiusKm <= 25.0, 'Radius must be within eps')
})

test('3. Nearby Discovery with Location Granted vs Denied & No Fabrication', () => {
  const demoFacilities = [
    { id: 1, name: 'CHC Maduranthakam', latitude: 12.5534, longitude: 79.8847, district: 'Chengalpattu' },
    { id: 2, name: 'PHC Thirukazhukundram', latitude: 12.6092, longitude: 80.0543, district: 'Chengalpattu' },
    { id: 4, name: 'Rajiv Gandhi Government General Hospital Chennai', latitude: 13.0805, longitude: 80.2778, district: 'Chennai' },
    { id: 9, name: 'Valparai Government Hospital', latitude: 10.3242, longitude: 76.9558, district: 'Coimbatore' },
    { id: 10, name: 'Unmapped Facility', latitude: null, longitude: null, district: 'Kanchipuram' },
  ]

  // Scenario A: User grants GPS near Maduranthakam (12.55, 79.88)
  const userGps = { latitude: 12.5500, longitude: 79.8800 }
  const resultGranted = discoverNearbyHospitalsAndClusters(demoFacilities, userGps, {
    epsKm: 25.0,
    minPts: 2,
  })

  // Nearest ranking check
  assert.ok(resultGranted.nearestHospitals.length > 0, 'Must have ranked hospitals')
  assert.equal(
    resultGranted.nearestHospitals[0].name,
    'CHC Maduranthakam',
    'CHC Maduranthakam should be closest to user coords (12.55, 79.88)'
  )
  assert.ok(resultGranted.nearestHospitals[0].distanceToUserKm < 2.0, 'Distance should be under 2km')
  assert.ok(typeof resultGranted.nearestHospitals[0].distanceToUserKm === 'number')

  // Distinguishes spatial clustering from nearest ranking
  assert.ok(resultGranted.clusters.length > 0, 'Clusters must be generated')
  assert.ok(resultGranted.clusters[0].distanceToUserKm != null, 'Cluster distance to user must be computed')

  // Noise / unclustered handling
  assert.equal(resultGranted.unclustered.length, 2, 'Valparai GH and RGGGH Chennai (single facility in area) are unclustered')
  assert.ok(
    resultGranted.unclustered.some((f) => f.name === 'Valparai Government Hospital'),
    'Valparai GH is unclustered'
  )

  // Missing coordinates tracking
  assert.equal(resultGranted.missingCoordinates.length, 1)
  assert.equal(resultGranted.missingCoordinates[0].name, 'Unmapped Facility')

  // Scenario B: User denies GPS / GPS unavailable (userLocation = null)
  const resultDenied = discoverNearbyHospitalsAndClusters(demoFacilities, null, {
    epsKm: 25.0,
    minPts: 2,
  })

  // Must not fabricate coordinates
  assert.equal(resultDenied.userLocation, null, 'User location must remain null when denied')
  resultDenied.nearestHospitals.forEach((h) => {
    assert.equal(h.distanceToUserKm, null, 'Must not fabricate hospital distance when GPS denied')
  })
  resultDenied.clusters.forEach((c) => {
    assert.equal(c.distanceToUserKm, null, 'Must not fabricate cluster distance when GPS denied')
  })
  // DBSCAN still clusters valid facilities by their geographical coordinates
  assert.ok(resultDenied.clusters.length > 0, 'Clusters should still be identified from hospital coordinates')
})

test('4. Tamil Localization & i18n System Integrity', () => {
  const tEn = createMockT('en')
  const tTa = createMockT('ta')

  // CRITICAL REQUIREMENT: "CHC Maduranthakam" must NOT display in English in Tamil mode
  // It must display as "மதுராந்தகம் சமூக சுகாதார மையம்"
  const enFacilityName = getLocalizedFacilityName('CHC Maduranthakam', tEn)
  const taFacilityName = getLocalizedFacilityName('CHC Maduranthakam', tTa)

  assert.equal(
    enFacilityName,
    'CHC Maduranthakam',
    'In English, CHC Maduranthakam must display in English'
  )
  assert.equal(
    taFacilityName,
    'மதுராந்தகம் சமூக சுகாதார மையம்',
    'In Tamil, CHC Maduranthakam MUST display as மதுராந்தகம் சமூக சுகாதார மையம்'
  )

  // Verify other Tamil Nadu facilities in Tamil
  assert.equal(
    getLocalizedFacilityName('PHC Thirukazhukundram', tTa),
    'திருக்கழுகுன்றம் ஆரம்ப சுகாதார நிலையம்'
  )
  assert.equal(
    getLocalizedFacilityName('District Headquarters Hospital Kanchipuram', tTa),
    'காஞ்சிபுரம் மாவட்ட தலைமை மருத்துவமனை'
  )
  assert.equal(
    getLocalizedFacilityName('Rajiv Gandhi Government General Hospital Chennai', tTa),
    'ராஜீவ் காந்தி அரசு பொது மருத்துவமனை சென்னை'
  )
  assert.equal(
    getLocalizedFacilityName('Valparai Government Hospital', tTa),
    'வால்பாறை அரசு மருத்துவமனை'
  )

  // Verify district translations
  assert.equal(getLocalizedDistrict('Chengalpattu', tTa), 'செங்கல்பட்டு')
  assert.equal(getLocalizedDistrict('Kanchipuram', tTa), 'காஞ்சிபுரம்')
  assert.equal(getLocalizedDistrict('Chennai', tTa), 'சென்னை')
  assert.equal(getLocalizedDistrict('Madurai', tTa), 'மதுரை')
  assert.equal(getLocalizedDistrict('Coimbatore', tTa), 'கோயம்புத்தூர்')
  assert.equal(getLocalizedDistrict('Tiruchirappalli', tTa), 'திருச்சிராப்பள்ளி')

  // Verify cluster title localization
  const testCluster = {
    district: 'Chengalpattu',
    count: 3,
    title: 'Chengalpattu Healthcare Cluster (3 facilities)',
  }
  const clusterTitleTa = getLocalizedClusterTitle(testCluster, tTa)
  assert.ok(
    clusterTitleTa.includes('செங்கல்பட்டு'),
    `Cluster title in Tamil must contain localized district: ${clusterTitleTa}`
  )
  assert.ok(
    clusterTitleTa.includes('3'),
    `Cluster title in Tamil must include facility count: ${clusterTitleTa}`
  )

  // Verify demo badges and labels in Tamil
  assert.equal(tTa('doctors.unverifiedDemo'), 'சரிபார்க்கப்படாத மாதிரி')
  assert.equal(tTa('healthcare.standaloneBadge'), 'தனியான மருத்துவமனை')
  assert.equal(tTa('healthcare.clustersTab'), 'மருத்துவக் குழுமங்கள் (DBSCAN)')
  assert.equal(tTa('healthcare.nearestTab'), 'அருகிலுள்ள மருத்துவமனைகள்')

  // Immediate language switching test: same facility passed to en vs ta
  assert.notEqual(
    getLocalizedFacilityName('CHC Maduranthakam', tEn),
    getLocalizedFacilityName('CHC Maduranthakam', tTa),
    'Language switching must immediately alter display string without hardcoded conditionals'
  )
})
