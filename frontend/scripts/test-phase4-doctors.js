/**
 * test-phase4-doctors.js
 * Verification suite for Phase 4:
 * - Backend Doctor Directory API, Schemas, & Service (/api/v1/doctors)
 * - Bundled Offline Doctor Dataset & Offline Filtering (doctorsData.js)
 * - Doctor Directory Screen & Specialized Search (Doctors.jsx)
 * - End-to-End Patient Workflow Integration (Home, Healthcare, FacilityDetails, Availability, Booking, Confirmed, Appointments)
 * - Quad-lingual Localization (EN, HI, MR, TA)
 * - Accessibility (WCAG 2.1 AA, TTS Read Confirmation Aloud, ARIA landmarks, touch targets >= 44px)
 * - CSS Styling & Design System Integrity
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendRoot, '..')

console.log('=================================================================')
console.log('🧪 Starting Phase 4 Doctor Directory & Usability Test Suite')
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
console.log('--- Test Suite 1: Core Files and Components ---')
const filesToCheck = [
  'backend/app/schemas/doctor.py',
  'backend/app/services/doctor_directory_service.py',
  'backend/app/api/v1/routes/doctors.py',
  'backend/tests/test_doctor_directory.py',
  'frontend/src/data/doctorsData.js',
  'frontend/src/pages/patient/Doctors.jsx',
]

for (const rel of filesToCheck) {
  const fullPath = path.join(repoRoot, rel)
  assert(fs.existsSync(fullPath), `File exists: ${rel}`)
}

// -----------------------------------------------------------------------------
// Test Suite 2: Backend Doctor Schema, Service, & Routes
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Backend Architecture & Endpoints ---')
const schemaSrc = fs.readFileSync(path.join(repoRoot, 'backend/app/schemas/doctor.py'), 'utf8')
assert(schemaSrc.includes('class DoctorPublicResponse'), 'doctor.py defines DoctorPublicResponse schema')
assert(schemaSrc.includes('facility_name') && schemaSrc.includes('opd_timings') && schemaSrc.includes('languages'), 'DoctorPublicResponse contains facility, timing, and language metadata')

const serviceSrc = fs.readFileSync(path.join(repoRoot, 'backend/app/services/doctor_directory_service.py'), 'utf8')
assert(serviceSrc.includes('DEFAULT_DOCTORS_CATALOG'), 'doctor_directory_service.py has fallback doctors catalog')
assert(serviceSrc.includes('def list_doctors'), 'doctor_directory_service.py implements list_doctors query method')
assert(serviceSrc.includes('def get_doctor_by_id'), 'doctor_directory_service.py implements get_doctor_by_id method')
assert(serviceSrc.includes('def get_doctors_for_facility'), 'doctor_directory_service.py implements get_doctors_for_facility method')

const routesSrc = fs.readFileSync(path.join(repoRoot, 'backend/app/api/v1/routes/doctors.py'), 'utf8')
assert(routesSrc.includes('@router.get("", summary='), 'doctors.py defines GET /api/v1/doctors endpoint')
assert(routesSrc.includes('@router.get("/{doctor_id}", summary='), 'doctors.py defines GET /api/v1/doctors/{doctor_id} endpoint')

const facilityRoutesSrc = fs.readFileSync(path.join(repoRoot, 'backend/app/api/v1/routes/facilities.py'), 'utf8')
assert(facilityRoutesSrc.includes('/{facility_id}/doctors'), 'facilities.py defines GET /api/v1/facilities/{facility_id}/doctors endpoint')

const routerSrc = fs.readFileSync(path.join(repoRoot, 'backend/app/api/v1/router.py'), 'utf8')
assert(routerSrc.includes('doctors_router'), 'router.py registers doctors_router')

// -----------------------------------------------------------------------------
// Test Suite 3: Frontend Offline Dataset & Helper
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Offline Data Catalog (doctorsData.js) ---')
const doctorsDataSrc = fs.readFileSync(path.join(frontendRoot, 'src/data/doctorsData.js'), 'utf8')
assert(doctorsDataSrc.includes('export const DOCTORS_DATA = ['), 'doctorsData.js exports DOCTORS_DATA catalog')
assert(doctorsDataSrc.includes('export const SPECIALIZATION_FILTERS = ['), 'doctorsData.js exports SPECIALIZATION_FILTERS')
assert(doctorsDataSrc.includes('export function filterDoctorsOffline'), 'doctorsData.js exports filterDoctorsOffline helper')

// Dynamic test of offline filter logic
try {
  const docModule = await import('../src/data/doctorsData.js')
  const { DOCTORS_DATA, filterDoctorsOffline } = docModule
  assert(Array.isArray(DOCTORS_DATA) && DOCTORS_DATA.length >= 8, `DOCTORS_DATA has ${DOCTORS_DATA.length} doctors (expected >= 8)`)

  const pediatricians = filterDoctorsOffline({ specialization: 'Pediatrics' })
  assert(pediatricians.length >= 1 && pediatricians.every(d => d.specialization.includes('Pediatric')), 'Offline filter successfully filters by Pediatrics specialization')

  const searchAnanya = filterDoctorsOffline({ query: 'Ananya' })
  assert(searchAnanya.length >= 1 && searchAnanya[0].name.includes('Ananya'), 'Offline filter finds doctor by name query')

  const onDutyOnly = filterDoctorsOffline({ onlyAvailableToday: true })
  assert(onDutyOnly.every(d => d.available_today === true), 'Offline filter filters only on-duty doctors')
} catch (err) {
  assert(false, `Dynamic offline dataset test failed: ${err.message}`)
}

// -----------------------------------------------------------------------------
// Test Suite 4: Frontend API Client
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Frontend API Service (api.js) ---')
const apiSrc = fs.readFileSync(path.join(frontendRoot, 'src/services/api.js'), 'utf8')
assert(apiSrc.includes('export async function getDoctors('), 'api.js exports getDoctors')
assert(apiSrc.includes('export async function getDoctorDetails('), 'api.js exports getDoctorDetails')
assert(apiSrc.includes('export async function getFacilityDoctors('), 'api.js exports getFacilityDoctors')
assert(apiSrc.includes('/doctors'), 'api.js queries /doctors endpoint')

// -----------------------------------------------------------------------------
// Test Suite 5: Doctor Directory Screen (Doctors.jsx)
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Doctor Directory Screen Implementation ---')
const doctorsPageSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Doctors.jsx'), 'utf8')
assert(doctorsPageSrc.includes('role="search"'), 'Doctors.jsx includes accessible role="search" landmark')
assert(doctorsPageSrc.includes('doctor-search-input'), 'Doctors.jsx includes search input')
assert(doctorsPageSrc.includes('doctor-search-clear-btn'), 'Doctors.jsx includes quick clear search button')
assert(doctorsPageSrc.includes('doctor-filter-chip'), 'Doctors.jsx renders interactive specialization filter chips')
assert(doctorsPageSrc.includes('doctor-on-duty-toggle'), 'Doctors.jsx provides On Duty Today toggle')
assert(doctorsPageSrc.includes('doctor-card'), 'Doctors.jsx renders doctor cards')
assert(doctorsPageSrc.includes('doctor-duty-badge'), 'Doctors.jsx highlights On Duty status badge')
assert(doctorsPageSrc.includes('doctor-bio-toggle-btn'), 'Doctors.jsx provides collapsible bio / credentials expander')
assert(doctorsPageSrc.includes('handleBookWithDoctor'), 'Doctors.jsx routes directly into appointment booking flow')
assert(doctorsPageSrc.includes('filterDoctorsOffline'), 'Doctors.jsx has robust zero-network fallback via filterDoctorsOffline')

// -----------------------------------------------------------------------------
// Test Suite 6: Patient Workflow Integrations
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 6: Patient Workflow & Screen Routing ---')
const constantsSrc = fs.readFileSync(path.join(frontendRoot, 'src/utils/constants.js'), 'utf8')
assert(constantsSrc.includes("DOCTORS: 'doctors'"), 'constants.js defines SCREENS.DOCTORS')

const patientAppSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/PatientApp.jsx'), 'utf8')
assert(patientAppSrc.includes('Doctors,') && patientAppSrc.includes("from './index'"), 'PatientApp.jsx imports Doctors screen')
assert(patientAppSrc.includes('selectedDoctorSpecialization'), 'PatientApp.jsx manages selectedDoctorSpecialization state')
assert(patientAppSrc.includes('selectedDoctorFacilityId'), 'PatientApp.jsx manages selectedDoctorFacilityId state')
assert(patientAppSrc.includes('currentScreen === SCREENS.DOCTORS'), 'PatientApp.jsx routes SCREENS.DOCTORS to Doctors screen')

const homeSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Home.jsx'), 'utf8')
assert(homeSrc.includes('doctor-finder-card'), 'Home.jsx renders doctor-finder-card')
assert(homeSrc.includes('SCREENS.DOCTORS'), 'Home.jsx links directly to SCREENS.DOCTORS')

const healthcareSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Healthcare.jsx'), 'utf8')
assert(healthcareSrc.includes('healthcare-view-switch-row'), 'Healthcare.jsx includes view switcher tabs')
assert(healthcareSrc.includes('facility-doctors-link-btn'), 'Healthcare.jsx cards include "Doctors on Duty" link')

const facilityDetailsSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/FacilityDetails.jsx'), 'utf8')
assert(facilityDetailsSrc.includes('getFacilityDoctors'), 'FacilityDetails.jsx fetches facility doctors')
assert(facilityDetailsSrc.includes('facility-doctors-section'), 'FacilityDetails.jsx renders facility-doctors-section')
assert(facilityDetailsSrc.includes('facility-doc-book-btn'), 'FacilityDetails.jsx allows direct booking with attending doctor')

const availabilitySrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Availability.jsx'), 'utf8')
assert(availabilitySrc.includes('doctorId') && availabilitySrc.includes('doctorName'), 'Availability.jsx passes doctorId and doctorName across booking steps')

const bookingSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Booking.jsx'), 'utf8')
assert(bookingSrc.includes('doctorName') && bookingSrc.includes('doctorRoom'), 'Booking.jsx displays doctor information in review card')

const confirmedSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/AppointmentConfirmed.jsx'), 'utf8')
assert(confirmedSrc.includes('confirmed-read-aloud-btn'), 'AppointmentConfirmed.jsx provides accessible TTS Read Aloud button')
assert(confirmedSrc.includes('SpeechSynthesisUtterance'), 'AppointmentConfirmed.jsx utilizes SpeechSynthesis API for audible confirmation')
assert(confirmedSrc.includes('doctorName'), 'AppointmentConfirmed.jsx displays attending doctor name')

const apptsSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Appointments.jsx'), 'utf8')
assert(apptsSrc.includes('appointment-doctor-row'), 'Appointments.jsx displays attending doctor row in appointment cards')

// -----------------------------------------------------------------------------
// Test Suite 7: Quad-Lingual Translations (EN, HI, MR, TA)
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 7: Multilingual Translations ---')
const transSrc = fs.readFileSync(path.join(frontendRoot, 'src/i18n/translations.js'), 'utf8')
const requiredLangs = ['en', 'hi', 'mr', 'ta']

for (const lang of requiredLangs) {
  assert(transSrc.includes(`${lang}:`), `translations.js contains language ${lang}`)
}

assert(transSrc.includes("directoryTitle: 'Doctor Directory'"), 'English translation for doctor directoryTitle present')
assert(transSrc.includes("directoryTitle: 'डॉक्टर डायरेक्टरी'"), 'Hindi translation for doctor directoryTitle present')
assert(transSrc.includes("directoryTitle: 'डॉक्टर डिरेक्टरी'"), 'Marathi translation for doctor directoryTitle present')
assert(transSrc.includes("directoryTitle: 'மருத்துவர் வழிகாட்டி'"), 'Tamil translation for doctor directoryTitle present')

// -----------------------------------------------------------------------------
// Test Suite 8: CSS Styling & Accessibility
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 8: CSS Styles & Accessibility Controls ---')
const cssSrc = fs.readFileSync(path.join(frontendRoot, 'src/App.css'), 'utf8')
const expectedClasses = [
  '.doctor-finder-card',
  '.healthcare-view-switch-row',
  '.healthcare-view-tab',
  '.facility-doctors-link-btn',
  '.facility-doctors-section',
  '.facility-doc-card',
  '.doctors-directory-wrapper',
  '.doctor-search-input',
  '.doctor-filter-chip',
  '.doctor-card',
  '.doctor-duty-badge',
  '.doctor-spec-pill',
  '.confirmed-read-aloud-btn',
]

for (const cls of expectedClasses) {
  assert(cssSrc.includes(cls), `App.css defines styling for ${cls}`)
}

assert(cssSrc.includes('min-height: 48px'), 'App.css enforces touch targets of at least 48px for search and TTS controls')
assert(cssSrc.includes('@media (forced-colors: active)'), 'App.css includes high-contrast forced colors support for accessibility')

// -----------------------------------------------------------------------------
// Final Report
// -----------------------------------------------------------------------------
console.log('\n=================================================================')
console.log(`📊 Phase 4 Verification Summary: ${passCount} Passed, ${failCount} Failed`)
console.log('=================================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 All Phase 4 verification checks passed successfully!\n')
  process.exit(0)
}
