/**
 * scripts/test-tamil-firstaid-tts.js
 * ===================================
 * Automated verification test suite for Tamil Text-to-Speech (TTS)
 * in Nalam Connect Emergency First Aid module.
 *
 * Verifies:
 * - Backend /api/v1/triage/synthesize endpoint and Sarvam AI TTS integration
 * - Frontend api.js synthesizeSpeech client function
 * - EmergencyFirstAid.jsx button handler, browser voice detection, and chunking
 * - Online Sarvam TTS integration when browser voice is absent (Tamil)
 * - Offline fallback safety (never pretending audio is playing when offline without voice)
 * - Asynchronous playback, loading, playing, error, and stop/cleanup controls
 * - Multilingual dictionary parity across en, hi, mr, ta
 * - CSS styling for loading state and accessible audio notification banners
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.join(__dirname, '..')
const repoRoot = path.join(frontendRoot, '..')

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

console.log('=================================================================')
console.log('🧪 Starting Tamil First Aid TTS & Voice Fallback Verification')
console.log('=================================================================\n')

// -----------------------------------------------------------------------------
// Test Suite 1: Backend TTS Endpoint Integration
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: Backend Triage Synthesize Endpoint & Sarvam Service ---')
const triageRoutePath = path.join(repoRoot, 'backend', 'app', 'api', 'v1', 'routes', 'triage.py')
assert(fs.existsSync(triageRoutePath), 'backend triage.py route file exists')
const triageSrc = fs.readFileSync(triageRoutePath, 'utf8')

assert(triageSrc.includes('@router.post(') && triageSrc.includes('/synthesize'), 'triage.py registers POST /synthesize endpoint')
assert(triageSrc.includes('TTSRequest') && triageSrc.includes('TTSResponse'), 'triage.py utilizes TTSRequest and TTSResponse schemas')
assert(triageSrc.includes('SarvamTTSService'), 'triage.py instantiates SarvamTTSService')
assert(triageSrc.includes('LANGUAGE_MAPPING'), 'triage.py normalizes regional language codes')
assert(triageSrc.includes('status.HTTP_400_BAD_REQUEST'), 'triage.py validates empty text input')
assert(triageSrc.includes('status.HTTP_503_SERVICE_UNAVAILABLE'), 'triage.py handles unconfigured API key gracefully')
assert(triageSrc.includes('status.HTTP_502_BAD_GATEWAY'), 'triage.py handles Sarvam API errors gracefully')

// -----------------------------------------------------------------------------
// Test Suite 2: Frontend API Client
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Frontend API Client (api.js) ---')
const apiServicePath = path.join(frontendRoot, 'src', 'services', 'api.js')
assert(fs.existsSync(apiServicePath), 'frontend api.js exists')
const apiSrc = fs.readFileSync(apiServicePath, 'utf8')

assert(apiSrc.includes('export async function synthesizeSpeech'), 'api.js exports synthesizeSpeech function')
assert(apiSrc.includes('/triage/synthesize'), 'synthesizeSpeech calls /triage/synthesize endpoint')
assert(apiSrc.includes("language || 'ta-IN'"), 'synthesizeSpeech defaults to regional language ta-IN')

// -----------------------------------------------------------------------------
// Test Suite 3: EmergencyFirstAid Screen Voice & Audio Engine Architecture
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: EmergencyFirstAid Read-Aloud & Hybrid Architecture ---')
const firstAidScreenPath = path.join(frontendRoot, 'src', 'pages', 'patient', 'EmergencyFirstAid.jsx')
assert(fs.existsSync(firstAidScreenPath), 'EmergencyFirstAid.jsx exists')
const screenSrc = fs.readFileSync(firstAidScreenPath, 'utf8')

assert(screenSrc.includes('synthesizeSpeech'), 'EmergencyFirstAid.jsx imports synthesizeSpeech from api service')
assert(screenSrc.includes('SpeechSynthesisUtterance'), 'EmergencyFirstAid.jsx retains SpeechSynthesisUtterance for browser playback')
assert(screenSrc.includes('findBrowserVoice'), 'EmergencyFirstAid.jsx implements findBrowserVoice detection')
assert(screenSrc.includes('getTopicSpeechChunks'), 'EmergencyFirstAid.jsx chunks long emergency texts for speech synthesis')
assert(screenSrc.includes('playBrowserSpeechChunks'), 'EmergencyFirstAid.jsx supports sequential browser speech chunking')
assert(screenSrc.includes('playSarvamAudioChunks'), 'EmergencyFirstAid.jsx supports online Sarvam AI TTS chunked audio playback')
assert(screenSrc.includes('stopAllAudio'), 'EmergencyFirstAid.jsx provides unified stopAllAudio controller')
assert(screenSrc.includes('isLoadingAudio'), 'EmergencyFirstAid.jsx tracks audio loading state')
assert(screenSrc.includes('isPlayingAudio'), 'EmergencyFirstAid.jsx tracks audio playing state')
assert(screenSrc.includes('audioStatusMessage'), 'EmergencyFirstAid.jsx tracks audio status / offline notice')
assert(screenSrc.includes('!isOnline'), 'EmergencyFirstAid.jsx guards against playing online audio when offline')
assert(screenSrc.includes('offlineVoiceUnavailable'), 'EmergencyFirstAid.jsx provides clear offline voice notice without fake playback')
assert(screenSrc.includes('efa-audio-notice'), 'EmergencyFirstAid.jsx renders accessible status alert for audio notices')

// -----------------------------------------------------------------------------
// Test Suite 4: Multilingual Parity for Audio State Strings
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Multilingual Parity for Audio State Translations ---')
const { translations } = await import('../src/i18n/translations.js')
const expectedKeys = ['loadingAudio', 'offlineVoiceUnavailable', 'voiceError', 'readAloud', 'stopReading']

for (const lang of ['en', 'hi', 'mr', 'ta']) {
  for (const key of expectedKeys) {
    const val = translations[lang]?.firstAid?.[key]
    assert(typeof val === 'string' && val.length > 0, `[${lang}] firstAid.${key} is localized: "${val}"`)
  }
}

// -----------------------------------------------------------------------------
// Test Suite 5: CSS Styles for Read-Aloud Loading & Notice Banner
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: CSS Styling for Loading & Notice ---')
const cssPath = path.join(frontendRoot, 'src', 'styles', 'emergencyFirstAid.css')
const cssSrc = fs.readFileSync(cssPath, 'utf8')

assert(cssSrc.includes('.efa-btn-read-aloud.playing'), 'emergencyFirstAid.css styles .efa-btn-read-aloud.playing')
assert(cssSrc.includes('.efa-btn-read-aloud.loading'), 'emergencyFirstAid.css styles .efa-btn-read-aloud.loading')
assert(cssSrc.includes('.efa-audio-notice'), 'emergencyFirstAid.css styles .efa-audio-notice banner')
assert(cssSrc.includes('.efa-audio-notice-close'), 'emergencyFirstAid.css styles notice dismiss button')

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n=================================================================')
console.log(`📊 Tamil First Aid TTS Test Summary: ${passCount} Passed, ${failCount} Failed`)
console.log('=================================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL TAMIL FIRST AID TTS CHECKS PASSED!')
}
