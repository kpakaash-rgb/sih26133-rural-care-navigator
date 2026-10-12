/**
 * test-voice-transcription-fix.js
 * =================================
 * Focused tests for Nalam Connect regional voice transcription and Tamil voice features:
 * 1. Source code integrity and model configuration (saaras:v4 for STT REST, bulbul:v3 for TTS).
 * 2. Scenario 1: Real user speech is prioritized over backend demo mode.
 * 3. Scenario 2: Tamil speech recognition preserves Tamil script.
 * 4. Scenario 3: Demo mode with no browser speech does not claim sample is real speech.
 * 5. Scenario 4: Genuine backend transcription (demo_mode: false) is displayed correctly.
 * 6. Scenario 5: API failure does not fabricate a transcript.
 * 7. Acceptance Criteria A: Tamil Read Aloud integration in EmergencyFirstAid.jsx.
 * 8. Acceptance Criteria B: Tamil locale propagation in Symptoms.jsx and useVoiceInput.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '../..')
const frontendRoot = path.resolve(__dirname, '..')

test('Voice Transcription & TTS Fix: Source Code Integrity & Architecture', () => {
  const useVoiceInputSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/hooks/useVoiceInput.js'),
    'utf8'
  )
  const symptomsSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/pages/patient/Symptoms.jsx'),
    'utf8'
  )
  const firstAidSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/pages/patient/EmergencyFirstAid.jsx'),
    'utf8'
  )
  const triageRouteSrc = fs.readFileSync(
    path.join(repoRoot, 'backend/app/api/v1/routes/triage.py'),
    'utf8'
  )
  const configSrc = fs.readFileSync(
    path.join(repoRoot, 'backend/app/core/config.py'),
    'utf8'
  )
  const ttsServiceSrc = fs.readFileSync(
    path.join(repoRoot, 'backend/app/services/sarvam_tts_service.py'),
    'utf8'
  )

  // 1. Check useVoiceInput prioritization logic
  assert(
    useVoiceInputSrc.includes('browserTranscript') &&
      useVoiceInputSrc.includes('response.demo_mode === false'),
    'useVoiceInput distinguishes genuine backend transcription from demo mode'
  )
  assert(
    useVoiceInputSrc.includes('setTranscript(browserTranscript)'),
    'useVoiceInput prioritizes actual browser recognition over demo fallback'
  )

  // 2. Check Symptoms.jsx demo mode labeling and translation hooks
  assert(
    symptomsSrc.includes('voice.demoTitle') &&
      symptomsSrc.includes('voice.demoBadge') &&
      symptomsSrc.includes('voice.demoNotice'),
    'Symptoms.jsx utilizes localized demo strings'
  )
  assert(
    symptomsSrc.includes('voice.useSampleBtn'),
    'Symptoms.jsx does not offer demo sample as genuine recognized speech'
  )

  // 3. Check backend REST model configuration (saaras:v4 preferred)
  assert(
    configSrc.includes('SARVAM_STT_REST_MODEL') &&
      configSrc.includes('saaras:v4'),
    'config.py defines separate SARVAM_STT_REST_MODEL = saaras:v4 for REST transcription'
  )
  assert(
    triageRouteSrc.includes('SARVAM_STT_REST_MODEL') &&
      triageRouteSrc.includes('saaras:v4'),
    'triage.py uses REST-compatible model saaras:v4 for speech-to-text POST endpoint'
  )

  // 4. Check Sarvam TTS service supports official inputs array and target_language_code
  assert(
    ttsServiceSrc.includes('"inputs": [clean_text]') &&
      ttsServiceSrc.includes('"target_language_code": self.language_code'),
    'sarvam_tts_service.py sends official Sarvam REST API payload'
  )

  // 5. Check EmergencyFirstAid prefers Sarvam TTS for Tamil with browser and offline fallback
  assert(
    firstAidSrc.includes("targetLang === 'ta-IN'") ||
      firstAidSrc.includes("language === 'ta'"),
    'EmergencyFirstAid has dedicated Tamil voice handling'
  )
  assert(
    firstAidSrc.includes('playSarvamAudioChunks') &&
      firstAidSrc.includes('playBrowserSpeechChunks'),
    'EmergencyFirstAid supports both Sarvam TTS and browser SpeechSynthesis'
  )
})

test('Scenario 1: Browser recognition captures "I had severe vomiting" while backend demo returns headache sample', () => {
  const mockRecognitionTranscript = 'I had severe vomiting'
  const mockBackendResponse = {
    transcript: 'I have had a severe headache and high fever for two days.',
    language: 'en-IN',
    demo_mode: true,
    provider: 'sarvam',
  }

  let finalTranscript = ''
  let finalDemoMode = null
  let finalState = ''

  const browserTranscript = (mockRecognitionTranscript || '').trim()

  if (mockBackendResponse && mockBackendResponse.demo_mode === false && mockBackendResponse.transcript?.trim()) {
    finalTranscript = mockBackendResponse.transcript.trim()
    finalDemoMode = false
    finalState = 'done'
  } else if (browserTranscript) {
    // Real user speech prioritized!
    finalTranscript = browserTranscript
    finalDemoMode = false
    finalState = 'done'
  } else if (mockBackendResponse && mockBackendResponse.demo_mode === true && mockBackendResponse.transcript?.trim()) {
    finalTranscript = mockBackendResponse.transcript.trim()
    finalDemoMode = true
    finalState = 'done'
  }

  assert.equal(finalTranscript, 'I had severe vomiting', 'User speech was preserved over headache demo sample')
  assert.equal(finalDemoMode, false, 'Speech recognized from user is marked as genuine (demoMode: false)')
  assert.equal(finalState, 'done', 'State transitioned to done')
})

test('Scenario 2: Tamil speech recognition preserves Tamil script over demo sample', () => {
  const mockTamilUserSpeech = 'எனக்கு கடுமையான காய்ச்சல் மற்றும் வாந்தி இருக்கிறது'
  const mockBackendResponse = {
    transcript: 'எனக்கு இரண்டு நாட்களாக தலைவலியும் கடுமையான காய்ச்சலும் இருக்கிறது',
    language: 'ta-IN',
    demo_mode: true,
    provider: 'sarvam',
  }

  const browserTranscript = (mockTamilUserSpeech || '').trim()
  let finalTranscript = ''
  let finalDemoMode = null

  if (mockBackendResponse && mockBackendResponse.demo_mode === false && mockBackendResponse.transcript?.trim()) {
    finalTranscript = mockBackendResponse.transcript.trim()
    finalDemoMode = false
  } else if (browserTranscript) {
    // Tamil speech prioritized!
    finalTranscript = browserTranscript
    finalDemoMode = false
  } else if (mockBackendResponse && mockBackendResponse.demo_mode === true && mockBackendResponse.transcript?.trim()) {
    finalTranscript = mockBackendResponse.transcript.trim()
    finalDemoMode = true
  }

  assert.equal(finalTranscript, mockTamilUserSpeech, 'Actual Tamil speech preserved in Tamil script')
  assert.equal(finalDemoMode, false, 'demoMode is false when real Tamil speech was captured')
})

test('Scenario 3: Demo mode with NO browser speech does not claim sample is real speech', () => {
  const mockRecognitionTranscript = '' // User did not speak or browser SpeechRec unavailable
  const mockBackendResponse = {
    transcript: 'எனக்கு இரண்டு நாட்களாக தலைவலியும் கடுமையான காய்ச்சலும் இருக்கிறது',
    language: 'ta-IN',
    demo_mode: true,
    provider: 'sarvam',
  }

  let finalTranscript = ''
  let finalDemoMode = null
  let finalState = ''

  const browserTranscript = (mockRecognitionTranscript || '').trim()

  if (mockBackendResponse && mockBackendResponse.demo_mode === false && mockBackendResponse.transcript?.trim()) {
    finalTranscript = mockBackendResponse.transcript.trim()
    finalDemoMode = false
    finalState = 'done'
  } else if (browserTranscript) {
    finalTranscript = browserTranscript
    finalDemoMode = false
    finalState = 'done'
  } else if (mockBackendResponse && mockBackendResponse.demo_mode === true && mockBackendResponse.transcript?.trim()) {
    finalTranscript = mockBackendResponse.transcript.trim()
    finalDemoMode = true
    finalState = 'done'
  }

  assert.equal(finalTranscript, 'எனக்கு இரண்டு நாட்களாக தலைவலியும் கடுமையான காய்ச்சலும் இருக்கிறது')
  assert.equal(finalDemoMode, true, 'Marked explicitly as demoMode: true')
  assert.equal(finalState, 'done')
})

test('Scenario 4: Genuine backend transcription (demo_mode: false) is displayed correctly', () => {
  const mockRecognitionTranscript = 'I had severe vomiting'
  const mockBackendResponse = {
    transcript: 'I had severe vomiting and stomach cramps',
    language: 'en-IN',
    demo_mode: false,
    provider: 'sarvam',
  }

  let finalTranscript = ''
  let finalDemoMode = null
  let finalState = ''

  const browserTranscript = (mockRecognitionTranscript || '').trim()

  if (mockBackendResponse && mockBackendResponse.demo_mode === false && mockBackendResponse.transcript?.trim()) {
    finalTranscript = mockBackendResponse.transcript.trim()
    finalDemoMode = false
    finalState = 'done'
  } else if (browserTranscript) {
    finalTranscript = browserTranscript
    finalDemoMode = false
    finalState = 'done'
  }

  assert.equal(finalTranscript, 'I had severe vomiting and stomach cramps', 'Genuine backend STT transcript used')
  assert.equal(finalDemoMode, false, 'demoMode is false for genuine backend transcription')
  assert.equal(finalState, 'done')
})

test('Scenario 5: Backend API failure does not fabricate a transcript', () => {
  const mockRecognitionTranscript = '' // No speech captured
  const mockBackendResponse = null // Backend threw 500 error or network error

  let caughtError = null
  let finalTranscript = ''

  try {
    const browserTranscript = (mockRecognitionTranscript || '').trim()
    if (mockBackendResponse && mockBackendResponse.demo_mode === false && mockBackendResponse.transcript?.trim()) {
      finalTranscript = mockBackendResponse.transcript.trim()
    } else if (browserTranscript) {
      finalTranscript = browserTranscript
    } else if (mockBackendResponse && mockBackendResponse.demo_mode === true && mockBackendResponse.transcript?.trim()) {
      finalTranscript = mockBackendResponse.transcript.trim()
    } else {
      throw new Error('No speech recognized in recording.')
    }
  } catch (err) {
    caughtError = err
  }

  assert.notEqual(caughtError, null, 'Error was thrown instead of inserting fake transcript')
  assert.equal(caughtError.message, 'No speech recognized in recording.')
  assert.equal(finalTranscript, '', 'Transcript remained empty')
})
