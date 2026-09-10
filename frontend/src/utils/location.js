/**
 * utils/location.js
 * =================
 * Lightweight browser geolocation helper for Rural Care Navigator.
 *
 * Provides a clean Promise-based wrapper around navigator.geolocation.getCurrentPosition().
 * Returns ephemeral coordinates in-memory. Does NOT persist GPS to storage or databases.
 */

/**
 * Request the current device GPS coordinates.
 *
 * @param {PositionOptions} [customOptions] - Optional Geolocation API options
 * @returns {Promise<{ latitude: number|null, longitude: number|null, error: string|null }>}
 */
export async function getUserLocation(customOptions = {}) {
  if (typeof window === 'undefined' || !navigator || !navigator.geolocation) {
    return {
      latitude: null,
      longitude: null,
      error: 'Geolocation is not supported by your browser.',
    }
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes cache
    ...customOptions,
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (
          position &&
          position.coords &&
          typeof position.coords.latitude === 'number' &&
          typeof position.coords.longitude === 'number'
        ) {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
          })
        } else {
          resolve({
            latitude: null,
            longitude: null,
            error: 'Invalid coordinates received from device.',
          })
        }
      },
      (err) => {
        let safeError = 'Unable to access your location. Showing facilities based on your area.'
        if (err) {
          switch (err.code) {
            case 1: // PERMISSION_DENIED
              safeError = 'Location access is off. Showing facilities based on your area.'
              break
            case 2: // POSITION_UNAVAILABLE
              safeError = 'Location information is currently unavailable. Showing facilities based on your area.'
              break
            case 3: // TIMEOUT
              safeError = 'Location request timed out. Showing facilities based on your area.'
              break
            default:
              safeError = 'Unable to access your location. Showing facilities based on your area.'
              break
          }
        }
        resolve({
          latitude: null,
          longitude: null,
          error: safeError,
        })
      },
      defaultOptions
    )
  })
}
