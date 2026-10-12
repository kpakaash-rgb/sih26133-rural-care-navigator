/**
 * hospitalLocalization.js
 * =======================
 * Integration helper for hospital, facility, district, and clustering localization.
 * Resolves localized labels via the centralized i18n translation system (translations.js)
 * with zero hardcoded language conditionals.
 */

// Normalized mapping from English hospital identifiers to translation keys in translations.js
export const FACILITY_NAME_TO_KEY = {
  'chc maduranthakam': 'facilities.chcMaduranthakam',
  'maduranthakam chc': 'facilities.chcMaduranthakam',
  'phc thirukazhukundram': 'facilities.phcThirukazhukundram',
  'thirukazhukundram phc': 'facilities.phcThirukazhukundram',
  'district headquarters hospital kanchipuram': 'facilities.dhKanchipuram',
  'kanchipuram dh': 'facilities.dhKanchipuram',
  'mobile medical unit chengalpattu': 'facilities.mmuChengalpattu',
  'chengalpattu mmu': 'facilities.mmuChengalpattu',
  'rajiv gandhi government general hospital chennai': 'facilities.rggghChennai',
  'chennai rgggh': 'facilities.rggghChennai',
  'government kilpauk medical college hospital chennai': 'facilities.kmchChennai',
  'kilpauk medical college hospital': 'facilities.kmchChennai',
  'government stanley medical college hospital chennai': 'facilities.smchChennai',
  'government headquarters hospital tiruvallur': 'facilities.ghhTiruvallur',
  'tiruvallur ghh': 'facilities.ghhTiruvallur',
  'government rajaji hospital madurai': 'facilities.grhMadurai',
  'madurai grh': 'facilities.grhMadurai',
  'tirumangalam government hospital madurai': 'facilities.tmghMadurai',
  'coimbatore medical college hospital': 'facilities.cmchCoimbatore',
  'pollachi sub-district government hospital': 'facilities.psdhCoimbatore',
  'mahatma gandhi memorial government hospital tiruchirappalli': 'facilities.mgmghTiruchirappalli',
  'trichy mgmgh': 'facilities.mgmghTiruchirappalli',
  'srirangam government hospital tiruchirappalli': 'facilities.sghTiruchirappalli',
  'chengalpattu government medical college hospital': 'facilities.chengalpattuGmc',
  'valparai government hospital': 'facilities.vghValparai',
}

// Normalized mapping from district names to translation keys
export const DISTRICT_TO_KEY = {
  chengalpattu: 'districts.chengalpattu',
  kanchipuram: 'districts.kanchipuram',
  kancheepuram: 'districts.kanchipuram',
  villupuram: 'districts.villupuram',
  chennai: 'districts.chennai',
  tiruvallur: 'districts.tiruvallur',
  madurai: 'districts.madurai',
  coimbatore: 'districts.coimbatore',
  tiruchirappalli: 'districts.tiruchirappalli',
  salem: 'districts.salem',
  thanjavur: 'districts.thanjavur',
  tirunelveli: 'districts.tirunelveli',
  vellore: 'districts.vellore',
  kallakurichi: 'districts.kallakurichi',
  cuddalore: 'districts.cuddalore',
  thoothukudi: 'districts.thoothukudi',
  ramanathapuram: 'districts.ramanathapuram',
}

/**
 * Resolves the localized display name for a healthcare facility using the i18n system.
 *
 * @param {string|object} facility - Facility name string or facility object
 * @param {Function} t - The translation lookup function from useTranslation()
 * @returns {string} The localized facility name or fallback
 */
export function getLocalizedFacilityName(facility, t) {
  if (!facility) return ''
  const name = typeof facility === 'string' ? facility : (facility.name || facility.hospital_name || '')
  if (!name || typeof name !== 'string') return ''

  if (!t || typeof t !== 'function') return name

  // Check if explicit key is provided on the object
  if (typeof facility === 'object' && facility.name_key) {
    const translated = t(facility.name_key)
    if (translated && translated !== facility.name_key) return translated
  }

  // Lookup in canonical normalized mapping
  const normalized = name.toLowerCase().trim()
  const translationKey = FACILITY_NAME_TO_KEY[normalized]
  if (translationKey) {
    const translated = t(translationKey)
    if (translated && translated !== translationKey) {
      return translated
    }
  }

  return name
}

/**
 * Resolves the localized district name using the i18n system.
 *
 * @param {string} district - District name (e.g. 'Chengalpattu', 'Chennai')
 * @param {Function} t - The translation lookup function from useTranslation()
 * @returns {string} The localized district name or fallback
 */
export function getLocalizedDistrict(district, t) {
  if (!district || typeof district !== 'string') return ''
  if (!t || typeof t !== 'function') return district

  const normalized = district.toLowerCase().trim()
  const translationKey = DISTRICT_TO_KEY[normalized]
  if (translationKey) {
    const translated = t(translationKey)
    if (translated && translated !== translationKey) {
      return translated
    }
  }

  return district
}

/**
 * Resolves a localized cluster title using the cluster's primary district.
 *
 * @param {object} cluster - Cluster object with district and count
 * @param {Function} t - The translation lookup function
 * @returns {string} Localized cluster title
 */
export function getLocalizedClusterTitle(cluster, t) {
  if (!cluster) return ''
  const localizedDistrict = getLocalizedDistrict(cluster.district, t)
  const count = cluster.count || (cluster.hospitals ? cluster.hospitals.length : 0)

  if (t) {
    const template = t('healthcare.clusterTitleTemplate', {
      district: localizedDistrict,
      count,
    })
    if (template && !template.includes('clusterTitleTemplate')) {
      return template
    }
  }

  return `${localizedDistrict} Healthcare Cluster (${count} facilities)`
}
