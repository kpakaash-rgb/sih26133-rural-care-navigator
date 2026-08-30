export * from './constants'

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
