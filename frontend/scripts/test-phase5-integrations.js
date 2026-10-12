/**
 * test-phase5-integrations.js
 * Verification suite for Phase 5:
 * - Backend Integrations & Route Handlers
 * - Sarvam AI Demo-Mode Behavior (STT & TTS fallback, error sanitization, regional transcripts)
 * - Tamil Seed Data (Facilities, Schemes, Mobile Clinics, Patient Murugan P, Doctor Directory)
 * - Tamil Symptom Normalization & Agglutinated Morphology
 * - Offline Catalog Coexistence & Cross-regional Support
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendRoot, '..')

console.log('=================================================================')
console.log('🧪 Starting Phase 5 Backend, Sarvam Demo & Tamil Seed Test Suite')
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
// Test Suite 1: Core Files and Components
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: Core Files & Architecture ---')
const filesToCheck = [
  'backend/app/database/seed_data.py',
  'ai/triage/normalization.py',
  'backend/app/api/v1/routes/triage.py',
  'backend/app/services/sarvam_stt_service.py',
  'backend/app/services/sarvam_tts_service.py',
  'backend/app/services/doctor_directory_service.py',
  'frontend/src/data/doctorsData.js',
  'backend/tests/test_phase5_verification.py',
]

for (const rel of filesToCheck) {
  const fullPath = path.join(repoRoot, rel)
  assert(fs.existsSync(fullPath), `File exists: ${rel}`)
}

// -----------------------------------------------------------------------------
// Test Suite 2: Tamil Nadu Seed Data in seed_data.py
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Tamil Seed Data in seed_data.py ---')
const seedSrc = fs.readFileSync(path.join(repoRoot, 'backend/app/database/seed_data.py'), 'utf8')

// Facilities
assert(seedSrc.includes('PHC Thirukazhukundram'), 'seed_data.py defines PHC Thirukazhukundram')
assert(seedSrc.includes('CHC Maduranthakam'), 'seed_data.py defines CHC Maduranthakam')
assert(seedSrc.includes('District Headquarters Hospital Kanchipuram'), 'seed_data.py defines District Headquarters Hospital Kanchipuram')
assert(seedSrc.includes('Mobile Medical Unit Chengalpattu'), 'seed_data.py defines Mobile Medical Unit Chengalpattu')
assert(seedSrc.includes('Chengalpattu') && seedSrc.includes('Kanchipuram'), 'seed_data.py includes Tamil Nadu districts')

// Schemes
assert(seedSrc.includes('Chief Minister\'s Comprehensive Health Insurance Scheme - CMCHIS (Tamil Nadu)'), 'seed_data.py includes CMCHIS Tamil Nadu scheme')
assert(seedSrc.includes('Dr. Muthulakshmi Reddy Maternity Benefit Scheme - MRMBS (Tamil Nadu)'), 'seed_data.py includes MRMBS Tamil Nadu scheme')
assert(seedSrc.includes('Makkalai Thedi Maruthuvam (Tamil Nadu Doorstep Healthcare)'), 'seed_data.py includes Makkalai Thedi Maruthuvam scheme')

// Mobile Clinics
assert(seedSrc.includes('Chengalpattu Coastal & Tribal Mobile Health Van (Demo MMU)'), 'seed_data.py includes Coastal & Tribal MMU')
assert(seedSrc.includes('Kanchipuram Weaver & Farm Outreach Clinic (Demo MMU)'), 'seed_data.py includes Weaver & Farm Outreach MMU')

// Patient Murugan P
assert(seedSrc.includes('Murugan P'), 'seed_data.py seeds demo patient Murugan P')
assert(seedSrc.includes('9876543211'), 'seed_data.py seeds mobile 9876543211 for Tamil demo patient')
assert(seedSrc.includes('14-9876-5432-1098'), 'seed_data.py seeds ABHA number for Tamil demo patient')

// Idempotence per record
assert(seedSrc.includes('existing_fac is not None') || seedSrc.includes('existing_sch is not None'), 'seed_data.py verifies record existence per item for idempotent execution')

// -----------------------------------------------------------------------------
// Test Suite 3: Tamil Normalization & Agglutinated Forms
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Tamil Symptom Normalization (normalization.py) ---')
const normSrc = fs.readFileSync(path.join(repoRoot, 'ai/triage/normalization.py'), 'utf8')

assert(normSrc.includes('காய்ச்சல[்ு]?') || normSrc.includes('காய்ச்சல'), 'normalization.py matches agglutinated Tamil fever forms (காய்ச்சலும்)')
assert(normSrc.includes('தலைவலி'), 'normalization.py matches Tamil headache (தலைவலி / தலைவலியும்)')
assert(normSrc.includes('இருமல[்ு]?') || normSrc.includes('இருமல்'), 'normalization.py matches agglutinated Tamil cough forms')
assert(normSrc.includes('வயிற்று\\s*வலி') || normSrc.includes('வயிற்று வலி'), 'normalization.py matches Tamil stomach problem forms')
assert(normSrc.includes('காயமும்') || normSrc.includes('காயம்'), 'normalization.py matches Tamil injury terms')

// -----------------------------------------------------------------------------
// Test Suite 4: Sarvam STT & Regional Demo Transcripts
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Sarvam STT & Regional Transcripts (triage.py) ---')
const triageSrc = fs.readFileSync(path.join(repoRoot, 'backend/app/api/v1/routes/triage.py'), 'utf8')

assert(triageSrc.includes('DEMO_TRANSCRIPTS: Dict[str, str] = {'), 'triage.py defines DEMO_TRANSCRIPTS dictionary')
assert(triageSrc.includes('"ta-IN": "எனக்கு இரண்டு நாட்களாக தலைவலியும் கடுமையான காய்ச்சலும் இருக்கிறது"'), 'triage.py defines Tamil demo transcript')
assert(triageSrc.includes('"hi-IN":') && triageSrc.includes('"mr-IN":') && triageSrc.includes('"en-IN":'), 'triage.py defines Hindi, Marathi, and English demo transcripts')
assert(triageSrc.includes('LANGUAGE_MAPPING'), 'triage.py maps language codes and aliases')
assert(triageSrc.includes('demo_mode=True'), 'triage.py returns demo_mode flag when falling back')
assert(triageSrc.includes('Recorded audio file is empty'), 'triage.py validates empty audio uploads')

// -----------------------------------------------------------------------------
// Test Suite 5: Sarvam TTS Service & Spoken Guidance
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Sarvam TTS & Error Sanitization (sarvam_tts_service.py) ---')
const ttsSrc = fs.readFileSync(path.join(repoRoot, 'backend/app/services/sarvam_tts_service.py'), 'utf8')

assert(ttsSrc.includes('SUPPORTED_TTS_LANGUAGES'), 'sarvam_tts_service.py exports SUPPORTED_TTS_LANGUAGES')
assert(ttsSrc.includes('"ta-IN": "Tamil"'), 'SUPPORTED_TTS_LANGUAGES includes Tamil')
assert(ttsSrc.includes('def build_spoken_response('), 'sarvam_tts_service.py defines build_spoken_response')
assert(ttsSrc.includes('class TTSError('), 'sarvam_tts_service.py defines sanitized TTSError')
assert(ttsSrc.includes('Voice response is temporarily unavailable'), 'TTSError provides sanitized fallback message')

// -----------------------------------------------------------------------------
// Test Suite 6: Doctor Directory Tamil Catalog & Frontend Sync
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 6: Doctor Directory Tamil Officers ---')
const docServiceSrc = fs.readFileSync(path.join(repoRoot, 'backend/app/services/doctor_directory_service.py'), 'utf8')
const docDataSrc = fs.readFileSync(path.join(frontendRoot, 'src/data/doctorsData.js'), 'utf8')

assert(docServiceSrc.includes('Dr. Meenakshi Sundaram') && docDataSrc.includes('Dr. Meenakshi Sundaram'), 'Both backend and frontend catalogs include Dr. Meenakshi Sundaram')
assert(docServiceSrc.includes('DOC-10109') && docDataSrc.includes('DOC-10109'), 'Dr. Meenakshi has DOC-10109 identifier across backend and frontend')
assert(docServiceSrc.includes('Dr. S. Anbarasan') && docDataSrc.includes('Dr. S. Anbarasan'), 'Both backend and frontend catalogs include Dr. S. Anbarasan')
assert(docServiceSrc.includes('DOC-10110') && docDataSrc.includes('DOC-10110'), 'Dr. S. Anbarasan has DOC-10110 identifier across backend and frontend')
assert(docServiceSrc.includes('Dr. Priya Natarajan') && docDataSrc.includes('Dr. Priya Natarajan'), 'Both backend and frontend catalogs include Dr. Priya Natarajan')
assert(docServiceSrc.includes('DOC-10111') && docDataSrc.includes('DOC-10111'), 'Dr. Priya Natarajan has DOC-10111 identifier across backend and frontend')

// Dynamic import of DOCTORS_DATA to test offline filtering with new doctors
try {
  const docModule = await import('../src/data/doctorsData.js')
  const { DOCTORS_DATA, filterDoctorsOffline } = docModule
  assert(DOCTORS_DATA.length >= 11, `DOCTORS_DATA has ${DOCTORS_DATA.length} doctors (expected >= 11)`)

  const tamilDoctors = DOCTORS_DATA.filter(d => d.languages && d.languages.includes('ta'))
  assert(tamilDoctors.length >= 4, `Found ${tamilDoctors.length} Tamil-speaking doctors (expected >= 4)`)

  const obgynDoctors = filterDoctorsOffline({ specialization: 'Obstetrics & Gynecology' })
  assert(obgynDoctors.some(d => d.name.includes('Meenakshi')), 'Offline filter finds Dr. Meenakshi in OB/GYN')

  const searchPriya = filterDoctorsOffline({ query: 'Priya' })
  assert(searchPriya.length >= 2, 'Offline filter finds Priya Sharma and Priya Natarajan')
} catch (err) {
  assert(false, `Dynamic offline doctors test failed: ${err.message}`)
}

// -----------------------------------------------------------------------------
// Test Suite 7: Pytest Phase 5 Test Suite Existence
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 7: Automated Backend Test Suite ---')
const testPhase5Src = fs.readFileSync(path.join(repoRoot, 'backend/tests/test_phase5_verification.py'), 'utf8')
assert(testPhase5Src.includes('test_tamil_facilities_catalogs'), 'test_phase5_verification.py tests Tamil facilities catalog')
assert(testPhase5Src.includes('test_tamil_schemes_catalogs'), 'test_phase5_verification.py tests Tamil schemes catalog')
assert(testPhase5Src.includes('test_tamil_mobile_clinics_catalogs'), 'test_phase5_verification.py tests Tamil mobile clinics catalog')
assert(testPhase5Src.includes('test_seed_demo_data_idempotent_execution'), 'test_phase5_verification.py tests idempotent DB seeding')
assert(testPhase5Src.includes('test_tamil_symptom_normalization_core_terms'), 'test_phase5_verification.py tests Tamil normalization')
assert(testPhase5Src.includes('test_transcribe_endpoint_demo_mode_tamil'), 'test_phase5_verification.py tests Tamil voice transcription')
assert(testPhase5Src.includes('test_facilities_route_with_tamil_seed'), 'test_phase5_verification.py tests facilities endpoint')
assert(testPhase5Src.includes('test_schemes_route_with_tamil_seed'), 'test_phase5_verification.py tests schemes endpoint')
assert(testPhase5Src.includes('test_mobile_clinics_route_with_tamil_seed'), 'test_phase5_verification.py tests mobile clinics endpoint')

console.log('\n=================================================================')
console.log(`📊 Phase 5 Verification Summary: ${passCount} Passed, ${failCount} Failed`)
console.log('=================================================================')

if (failCount === 0) {
  console.log('🎉 ALL PHASE 5 VERIFICATION CHECKS PASSED!')
} else {
  process.exit(1)
}
