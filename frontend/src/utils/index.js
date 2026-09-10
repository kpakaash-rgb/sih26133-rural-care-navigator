export * from './constants'
export * from './location'

export const formatDistance = (km) => {
  if (km === undefined || km === null) return ''
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`
}

export const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

/**
 * Format queue last_updated timestamp with 2-hour staleness detection.
 * @param {string|Date} lastUpdatedString
 * @returns {{ text: string, isStale: boolean, diffMinutes: number }}
 */
export const formatQueueLastUpdated = (lastUpdatedString) => {
  if (!lastUpdatedString) {
    return { text: 'Queue information unavailable', isStale: false, diffMinutes: 0 }
  }
  const date = new Date(lastUpdatedString)
  if (isNaN(date.getTime())) {
    return { text: 'Queue information unavailable', isStale: false, diffMinutes: 0 }
  }
  const now = new Date()
  const diffMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000))

  if (diffMinutes > 120) {
    const hours = Math.floor(diffMinutes / 60)
    return {
      text: `Queue information may be outdated (Updated ${hours} ${hours === 1 ? 'hour' : 'hours'} ago)`,
      isStale: true,
      diffMinutes,
    }
  }

  if (diffMinutes < 1) {
    return {
      text: 'Updated just now',
      isStale: false,
      diffMinutes: 0,
    }
  }

  return {
    text: `Updated ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`,
    isStale: false,
    diffMinutes,
  }
}
