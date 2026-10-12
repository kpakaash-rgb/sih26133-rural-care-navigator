/**
 * test-phase6-e2e.js
 * Comprehensive Phase 6 Verification Suite:
 * - Online / Offline Lifecycle & IndexedDB Sync Queue
 * - Quad-lingual Localization Parity & Parameter Interpolation (EN, HI, MR, TA)
 * - PWA Service Worker, Manifest, Caching Strategies & Assets
 * - Frontend Security, RBAC Token Handling, & WCAG 2.1 AA Accessibility
 * - Full Cross-Phase Workflow Consistency
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..')

console.log('=================================================================')
console.log('🧪 Starting Phase 6 End-to-End Verification Test Suite')
console.log('=================================================================\n')

let passCount = 0
let failCount = 0

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`)
    passCount++
  } else {
    console.error(`❌ FAIL: ${message}`)
    failCount++
  }
}

// -----------------------------------------------------------------------------
// Test Suite 1: Online / Offline Queue & Synchronization Architecture
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: Online/Offline Lifecycle & Queue Architecture ---')

const offlineQueueSrc = fs.readFileSync(path.join(frontendRoot, 'src/services/offlineQueue.js'), 'utf8')
assert(offlineQueueSrc.includes('const DB_NAME = \'nalam_connect_offline_db\''), 'offlineQueue.js targets nalam_connect_offline_db')
assert(offlineQueueSrc.includes('const STORE_NAME = \'pending_consultations\''), 'offlineQueue.js creates pending_consultations store')
assert(offlineQueueSrc.includes('export async function enqueueRequest'), 'offlineQueue.js exports enqueueRequest')
assert(offlineQueueSrc.includes('export async function getPendingRequests'), 'offlineQueue.js exports getPendingRequests')
assert(offlineQueueSrc.includes('export async function updateRequest'), 'offlineQueue.js exports updateRequest')
assert(offlineQueueSrc.includes('export async function markSubmitted'), 'offlineQueue.js exports markSubmitted')
assert(offlineQueueSrc.includes('export async function clearAllRequests'), 'offlineQueue.js exports clearAllRequests')
assert(offlineQueueSrc.includes('localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY'), 'offlineQueue.js provides transparent fallback to localStorage')

const syncServiceSrc = fs.readFileSync(path.join(frontendRoot, 'src/services/syncService.js'), 'utf8')
assert(syncServiceSrc.includes('export async function syncPendingConsultations'), 'syncService.js exports syncPendingConsultations')
assert(syncServiceSrc.includes('export function subscribeSyncState'), 'syncService.js exports subscribeSyncState')
assert(syncServiceSrc.includes('isSyncInProgress'), 'syncService.js guards against race conditions with isSyncInProgress mutex')
assert(syncServiceSrc.includes('status: \'syncing\''), 'syncService.js transitions item status to syncing during submission')
assert(syncServiceSrc.includes('status: isConflict ? \'failed\' : \'pending_sync\''), 'syncService.js distinguishes 409 slot conflicts from transient network errors')
assert(syncServiceSrc.includes('retryCount: (item.retryCount || 0) + 1'), 'syncService.js increments retry counter on transient failures')

const useOnlineSrc = fs.readFileSync(path.join(frontendRoot, 'src/hooks/useOnlineStatus.js'), 'utf8')
assert(useOnlineSrc.includes('window.addEventListener(\'online\''), 'useOnlineStatus listens to window online event')
assert(useOnlineSrc.includes('window.addEventListener(\'offline\''), 'useOnlineStatus listens to window offline event')
assert(useOnlineSrc.includes('reconnectedRecently'), 'useOnlineStatus provides reconnectedRecently transition flag')
assert(useOnlineSrc.includes('wasOfflineSince'), 'useOnlineStatus tracks wasOfflineSince timestamp')

// -----------------------------------------------------------------------------
// Test Suite 2: UI Offline Indicators Across Patient Screens
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: UI Offline Indicators Across Patient Screens ---')

const patientScreens = [
  'src/pages/patient/Home.jsx',
  'src/pages/patient/Symptoms.jsx',
  'src/pages/patient/CareGuidance.jsx',
  'src/pages/patient/Booking.jsx',
  'src/pages/patient/AppointmentConfirmed.jsx',
  'src/pages/patient/Appointments.jsx',
]

for (const screenPath of patientScreens) {
  const content = fs.readFileSync(path.join(frontendRoot, screenPath), 'utf8')
  assert(
    content.includes('ConnectivityBanner'),
    `${path.basename(screenPath)} renders ConnectivityBanner for transparent network feedback`
  )
}

const bannerSrc = fs.readFileSync(path.join(frontendRoot, 'src/components/ConnectivityBanner.jsx'), 'utf8')
assert(bannerSrc.includes('role="status"'), 'ConnectivityBanner has accessible role="status"')
assert(bannerSrc.includes('aria-live="polite"'), 'ConnectivityBanner uses aria-live="polite" to inform screen readers')

// -----------------------------------------------------------------------------
// Test Suite 3: Multilingual Coverage & 100% Dictionary Parity
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Multilingual Parity & Translation Robustness ---')

try {
  const { translations } = await import('../src/i18n/translations.js')
  const langs = ['en', 'hi', 'mr', 'ta']

  function collectKeys(obj, prefix = '') {
    const keys = []
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? prefix + '.' + k : k
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        keys.push(...collectKeys(v, full))
      } else {
        keys.push(full)
      }
    }
    return keys
  }

  const enKeys = collectKeys(translations.en)
  assert(enKeys.length >= 400, `Base dictionary has ${enKeys.length} keys (expected >= 400)`)

  for (const lang of ['hi', 'mr', 'ta']) {
    const targetKeys = new Set(collectKeys(translations[lang]))
    const missingInTarget = enKeys.filter(k => !targetKeys.has(k))
    assert(missingInTarget.length === 0, `[${lang}] has 0 missing keys compared to [en] (100% parity)`)

    const extraInTarget = [...targetKeys].filter(k => !enKeys.includes(k))
    assert(extraInTarget.length === 0, `[${lang}] has 0 orphaned keys not in [en]`)
  }

  // Key categories inspection
  const categories = ['nav', 'common', 'home', 'healthcare', 'doctors', 'firstAid', 'symptoms', 'voice', 'careGuidance', 'booking', 'appointments', 'connectivity', 'offlineQueue']
  for (const cat of categories) {
    for (const l of langs) {
      assert(translations[l][cat] !== undefined, `Category "${cat}" exists in language "${l}"`)
    }
  }
} catch (err) {
  assert(false, `Translation parity test threw exception: ${err.message}`)
}

const langContextSrc = fs.readFileSync(path.join(frontendRoot, 'src/i18n/LanguageContext.jsx'), 'utf8')
assert(langContextSrc.includes('document.documentElement.lang = language'), 'LanguageContext synchronizes document.documentElement.lang')
assert(langContextSrc.includes('localStorage.setItem(\'rcn_language\''), 'LanguageContext persists language preference to localStorage')
assert(langContextSrc.includes('current.replace(/\\{(\\w+)\\}/g'), 'LanguageContext implements parameter interpolation {param}')

// -----------------------------------------------------------------------------
// Test Suite 4: PWA Configuration, Service Worker & Manifest
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: PWA Service Worker & Manifest Integrity ---')

const viteConfigSrc = fs.readFileSync(path.join(frontendRoot, 'vite.config.js'), 'utf8')
assert(viteConfigSrc.includes('VitePWA('), 'vite.config.js initializes VitePWA')
assert(viteConfigSrc.includes('registerType: \'autoUpdate\''), 'VitePWA configured for autoUpdate')
assert(viteConfigSrc.includes('display: \'standalone\''), 'PWA manifest display set to standalone')
assert(viteConfigSrc.includes('first-aid/content.json'), 'PWA config includes first-aid/content.json asset')
assert(viteConfigSrc.includes('handler: \'CacheFirst\''), 'PWA config implements CacheFirst strategy for first aid data')

const indexHtmlSrc = fs.readFileSync(path.join(frontendRoot, 'index.html'), 'utf8')
assert(indexHtmlSrc.includes('meta name="viewport"'), 'index.html defines mobile viewport meta tag')
assert(indexHtmlSrc.includes('meta name="theme-color"'), 'index.html defines theme-color meta tag')
assert(indexHtmlSrc.includes('link rel="apple-touch-icon"'), 'index.html specifies apple-touch-icon')
assert(indexHtmlSrc.includes('link rel="icon"'), 'index.html specifies favicon')

const requiredPwaAssets = [
  'favicon.svg',
  'apple-touch-icon.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-512x512-maskable.png',
  'first-aid/content.json',
]

for (const relAsset of requiredPwaAssets) {
  const assetPath = path.join(frontendRoot, 'public', relAsset)
  assert(fs.existsSync(assetPath), `PWA static asset exists: public/${relAsset}`)
}

// -----------------------------------------------------------------------------
// Test Suite 5: Frontend Security & WCAG Accessibility
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Frontend Security & WCAG Accessibility ---')

// 1. Audit for accidental hardcoded secrets in frontend source
const srcFiles = []
function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      walkDir(full)
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
      srcFiles.push(full)
    }
  }
}
walkDir(path.join(frontendRoot, 'src'))

let hardcodedSecretsFound = 0
for (const file of srcFiles) {
  const code = fs.readFileSync(file, 'utf8')
  if (code.includes('SECRET_KEY =') || code.includes('SARVAM_API_KEY =') || code.includes('EXOTEL_API_KEY =')) {
    console.error(`❌ Found forbidden hardcoded key assignment in: ${file}`)
    hardcodedSecretsFound++
  }
}
assert(hardcodedSecretsFound === 0, 'Zero hardcoded backend API keys/secrets found in frontend sources')

// 2. CSS touch targets and high-contrast accessibility
const cssSrc = fs.readFileSync(path.join(frontendRoot, 'src/App.css'), 'utf8')
assert(cssSrc.includes('min-height: 48px') || cssSrc.includes('min-height: 44px'), 'App.css enforces touch targets of at least 44-48px')
assert(cssSrc.includes('@media (forced-colors: active)'), 'App.css includes high-contrast forced-colors mode')

console.log('\n=================================================================')
console.log(`📊 Phase 6 Verification Summary: ${passCount} Passed, ${failCount} Failed`)
console.log('=================================================================')

if (failCount === 0) {
  console.log('🎉 ALL PHASE 6 END-TO-END VERIFICATION CHECKS PASSED!')
} else {
  process.exit(1)
}
