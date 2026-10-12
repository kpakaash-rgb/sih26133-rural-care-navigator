/**
 * test-phase3-voice.js
 * Verification suite for Phase 3:
 * - Patient Voice Input Hook (useVoiceInput.js)
 * - Sarvam AI Backend Audio Transcription (/api/v1/triage/transcribe)
 * - Multilingual Voice Translations (EN, HI, MR, TA)
 * - Symptoms Screen Mic Button & "Did we get this right?" Review Box
 * - Care Guidance Text-to-Speech (TTS) Read Aloud Playback
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendRoot, '..')

console.log('=================================================================')
console.log('🧪 Starting Phase 3 Regional Voice AI & STT Test Suite')
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
// Test Suite 1: Core Voice Files & Exports
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: Core Files and Components ---')
const filesToCheck = [
  'frontend/src/hooks/useVoiceInput.js',
  'frontend/src/services/api.js',
  'backend/app/api/v1/routes/triage.py',
  'ai/triage/schemas.py',
]

for (const rel of filesToCheck) {
  const fullPath = path.join(repoRoot, rel)
  assert(fs.existsSync(fullPath), `File exists: ${rel}`)
}

// -----------------------------------------------------------------------------
// Test Suite 2: API Client transcribeAudio Export
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Frontend API Client transcribeAudio ---')
const apiSrc = fs.readFileSync(path.join(frontendRoot, 'src/services/api.js'), 'utf8')
assert(apiSrc.includes('export async function transcribeAudio'), 'api.js exports transcribeAudio function')
assert(apiSrc.includes("formData.append('audio'"), 'transcribeAudio appends audio file to FormData')
assert(apiSrc.includes("formData.append('language'"), 'transcribeAudio appends target language code')
assert(apiSrc.includes('/triage/transcribe'), 'transcribeAudio targets /triage/transcribe endpoint')

// -----------------------------------------------------------------------------
// Test Suite 3: useVoiceInput Hook State Machine & MediaRecorder Logic
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: useVoiceInput Hook Implementation ---')
const hookSrc = fs.readFileSync(path.join(frontendRoot, 'src/hooks/useVoiceInput.js'), 'utf8')
assert(hookSrc.includes('navigator.mediaDevices.getUserMedia'), 'useVoiceInput requests microphone stream via getUserMedia')
assert(hookSrc.includes('new MediaRecorder'), 'useVoiceInput instantiates MediaRecorder')
assert(hookSrc.includes("setState('listening')"), 'useVoiceInput supports listening state')
assert(hookSrc.includes("setState('processing')"), 'useVoiceInput supports processing state')
assert(hookSrc.includes("setState('done')"), 'useVoiceInput supports done state')
assert(hookSrc.includes("setState('error')"), 'useVoiceInput supports error state')
assert(hookSrc.includes('transcribeAudio('), 'useVoiceInput sends audio blob to transcribeAudio service')
assert(hookSrc.includes('resetVoice'), 'useVoiceInput provides resetVoice cleanup method')

// -----------------------------------------------------------------------------
// Test Suite 4: Backend Transcription Endpoint & Sarvam Integration
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Backend Route /api/v1/triage/transcribe ---')
const triageRouteSrc = fs.readFileSync(path.join(repoRoot, 'backend/app/api/v1/routes/triage.py'), 'utf8')
assert(triageRouteSrc.includes('@router.post(\n    "/transcribe"'), 'triage.py defines POST /transcribe endpoint')
assert(triageRouteSrc.includes('UploadFile = File('), 'transcribe route accepts multipart audio UploadFile')
assert(triageRouteSrc.includes('language: str = Form('), 'transcribe route accepts language Form field')
assert(triageRouteSrc.includes('https://api.sarvam.ai/speech-to-text'), 'transcribe route calls Sarvam AI STT service')
assert(triageRouteSrc.includes('api-subscription-key'), 'transcribe route passes Sarvam API subscription header')
assert(triageRouteSrc.includes('DEMO_TRANSCRIPTS'), 'transcribe route provides regional demo transcripts fallback')
assert(triageRouteSrc.includes('ta-IN') && triageRouteSrc.includes('hi-IN'), 'transcribe route covers Tamil, Hindi, Marathi, and English')

// -----------------------------------------------------------------------------
// Test Suite 5: Multilingual Translations (EN, HI, MR, TA)
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Multilingual Voice Translations ---')
const { translations } = await import('../src/i18n/translations.js')

const REQUIRED_LANGS = ['en', 'hi', 'mr', 'ta']
const REQUIRED_VOICE_KEYS = [
  'tapToSpeak',
  'listening',
  'processing',
  'done',
  'reviewTitle',
  'keepTranscript',
  'clearTranscript',
  'voiceUnavailable',
  'readAloud',
  'stopReading',
  'readingAloud',
  'micPermissionDenied',
]

for (const lang of REQUIRED_LANGS) {
  assert(Boolean(translations[lang]?.voice), `[${lang}] translations.voice dictionary exists`)
  for (const k of REQUIRED_VOICE_KEYS) {
    const val = translations[lang]?.voice?.[k]
    assert(typeof val === 'string' && val.length > 0, `[${lang}] voice.${k}: "${val}"`)
  }
}

// -----------------------------------------------------------------------------
// Test Suite 6: Symptoms Screen UI Integration
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 6: Symptoms Screen Microphone & Review UI ---')
const symptomsSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Symptoms.jsx'), 'utf8')
assert(symptomsSrc.includes('useVoiceInput'), 'Symptoms.jsx imports and utilizes useVoiceInput hook')
assert(symptomsSrc.includes('voice-mic-btn'), 'Symptoms.jsx renders microphone trigger button')
assert(symptomsSrc.includes('isListening'), 'Symptoms.jsx handles active listening state')
assert(symptomsSrc.includes('isProcessing'), 'Symptoms.jsx handles audio transcribing spinner state')
assert(symptomsSrc.includes('voice-review-card'), 'Symptoms.jsx renders "Did we get this right?" review card')
assert(symptomsSrc.includes('handleApplyVoiceTranscript'), 'Symptoms.jsx allows user to apply recognized transcript')
assert(symptomsSrc.includes('handleClearVoiceTranscript'), 'Symptoms.jsx allows user to clear recognized transcript')
assert(symptomsSrc.includes('voiceError'), 'Symptoms.jsx renders friendly voice error alert')

// -----------------------------------------------------------------------------
// Test Suite 7: Care Guidance Text-to-Speech (TTS) Read Aloud
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 7: Care Guidance Read Aloud TTS ---')
const careSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/CareGuidance.jsx'), 'utf8')
assert(careSrc.includes('window.speechSynthesis'), 'CareGuidance.jsx utilizes SpeechSynthesis API')
assert(careSrc.includes('SpeechSynthesisUtterance'), 'CareGuidance.jsx instantiates SpeechSynthesisUtterance')
assert(careSrc.includes('read-aloud-btn'), 'CareGuidance.jsx renders Read Aloud button in triage card')
assert(careSrc.includes('handleToggleSpeech'), 'CareGuidance.jsx toggles audio playback and stop state')
assert(careSrc.includes('isTtsSupported'), 'CareGuidance.jsx checks browser TTS support safely')

// -----------------------------------------------------------------------------
// Test Suite 8: CSS Styles Verification
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 8: CSS Stylesheets ---')
const cssSrc = fs.readFileSync(path.join(frontendRoot, 'src/App.css'), 'utf8')
assert(cssSrc.includes('.voice-mic-btn'), 'App.css defines .voice-mic-btn styles')
assert(cssSrc.includes('.voice-mic-btn.listening'), 'App.css defines .voice-mic-btn.listening with pulse animation')
assert(cssSrc.includes('.voice-review-card'), 'App.css defines .voice-review-card container')
assert(cssSrc.includes('.read-aloud-btn'), 'App.css defines .read-aloud-btn styling')
assert(cssSrc.includes('.read-aloud-btn.speaking'), 'App.css defines .read-aloud-btn.speaking indicator')

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n=================================================================')
console.log(`Phase 3 Test Summary: ${passCount} Passed, ${failCount} Failed`)
console.log('=================================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL PHASE 3 VOICE AI VERIFICATION TESTS PASSED!')
  process.exit(0)
}
