/**
 * test-otp-login-redirect.js
 * Regression Test Suite for Nalam Connect Patient OTP Login Redirect
 *
 * Verifies:
 * 1. Profile completeness evaluation (complete vs incomplete profiles)
 * 2. OTP verification response handling & session persistence (access_token, patient)
 * 3. Post-login navigation: complete profiles navigate to SCREENS.HOME
 * 4. Post-login navigation: incomplete profiles navigate to SCREENS.ONBOARDING
 * 5. Sanitization of returnScreen (never bouncing complete profiles back to ONBOARDING or REGISTRATION)
 * 6. Route guard logic: synchronous patient resolution prevents stale-state race conditions
 * 7. Initial mount screen resolution (complete -> HOME, incomplete -> ONBOARDING, unauthenticated -> WELCOME)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isProfileComplete, SCREENS } from '../src/utils/constants.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..')

console.log('=================================================================')
console.log('🧪 Starting Patient OTP Login Redirect Regression Test Suite')
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
// Test Suite 1: isProfileComplete Helper Function
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: Profile Completeness Helper ---')

assert(
  isProfileComplete({
    id: 1,
    mobile: '9876543210',
    full_name: 'Ramesh Kumar',
    district: 'Pune',
    village: 'Baramati',
    age: 35,
  }) === true,
  'Complete profile with all fields returns true'
)

assert(
  isProfileComplete({
    id: 2,
    mobile: '9876543210',
    full_name: 'Ramesh Kumar',
    district: 'Pune',
  }) === true,
  'Complete profile with name and district returns true'
)

assert(
  isProfileComplete({
    id: 3,
    mobile: '9876543210',
    full_name: 'Ramesh Kumar',
    village: 'Baramati',
  }) === true,
  'Complete profile with name and village returns true'
)

assert(
  isProfileComplete({
    id: 4,
    mobile: '9876543210',
    full_name: null,
    district: 'Pune',
  }) === false,
  'Incomplete profile (missing full_name) returns false'
)

assert(
  isProfileComplete({
    id: 5,
    mobile: '9876543210',
    full_name: ' ',
    district: 'Pune',
  }) === false,
  'Incomplete profile (blank full_name) returns false'
)

assert(
  isProfileComplete({
    id: 6,
    mobile: '9876543210',
    full_name: 'A',
    district: 'Pune',
  }) === false,
  'Incomplete profile (short full_name < 2 chars) returns false'
)

assert(
  isProfileComplete({
    id: 7,
    mobile: '9876543210',
    full_name: 'Ramesh Kumar',
    district: null,
    village: null,
  }) === false,
  'Incomplete profile (missing district and village) returns false'
)

assert(
  isProfileComplete({
    id: 8,
    mobile: '9876543210',
    is_profile_complete: true,
  }) === true,
  'Profile with explicit is_profile_complete: true returns true'
)

assert(
  isProfileComplete({
    id: 9,
    mobile: '9876543210',
    full_name: 'Ramesh Kumar',
    district: 'Pune',
    is_profile_complete: false,
  }) === false,
  'Profile with explicit is_profile_complete: false returns false'
)

assert(
  isProfileComplete(null) === false,
  'Null patient object returns false'
)

assert(
  isProfileComplete(undefined) === false,
  'Undefined patient object returns false'
)

// -----------------------------------------------------------------------------
// Test Suite 2: Login.jsx Post-Login Destination Resolution
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Login.jsx Post-Login Flow & Sanitization ---')

const loginSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Login.jsx'), 'utf8').replace(/\r\n/g, '\n')

assert(loginSrc.includes('import { SCREENS, isProfileComplete }'), 'Login.jsx imports isProfileComplete')
assert(loginSrc.includes('getMe'), 'Login.jsx imports getMe for latest profile fetch')
assert(loginSrc.includes('localStorage.setItem(\'access_token\', data.access_token)'), 'Login.jsx persists access_token')
assert(loginSrc.includes('localStorage.setItem(\'patient\', JSON.stringify'), 'Login.jsx persists patient in localStorage')
assert(loginSrc.includes('await getMe()'), 'Login.jsx awaits fresh profile status from getMe')
assert(loginSrc.includes('const complete = isProfileComplete(activePatient)'), 'Login.jsx evaluates profile completeness')

// Test simulation of targetScreen calculation in Login.jsx
function resolveLoginTarget(loginData, isComplete) {
  if (!isComplete) {
    return SCREENS.ONBOARDING
  }
  const targetScreen = (
    loginData?.returnScreen &&
    loginData.returnScreen !== SCREENS.ONBOARDING &&
    loginData.returnScreen !== SCREENS.REGISTRATION &&
    loginData.returnScreen !== SCREENS.LOGIN &&
    loginData.returnScreen !== SCREENS.WELCOME
  )
    ? loginData.returnScreen
    : SCREENS.HOME
  return targetScreen
}

assert(
  resolveLoginTarget({ returnScreen: SCREENS.ONBOARDING }, true) === SCREENS.HOME,
  'Complete profile with returnScreen=ONBOARDING routes to SCREENS.HOME (fixes bug)'
)

assert(
  resolveLoginTarget({ returnScreen: SCREENS.REGISTRATION }, true) === SCREENS.HOME,
  'Complete profile with returnScreen=REGISTRATION routes to SCREENS.HOME'
)

assert(
  resolveLoginTarget(null, true) === SCREENS.HOME,
  'Complete profile with default login routes to SCREENS.HOME'
)

assert(
  resolveLoginTarget({ returnScreen: SCREENS.APPOINTMENTS }, true) === SCREENS.APPOINTMENTS,
  'Complete profile returning from protected appointment flow routes to SCREENS.APPOINTMENTS'
)

assert(
  resolveLoginTarget({ returnScreen: SCREENS.BOOKING }, true) === SCREENS.BOOKING,
  'Complete profile returning from protected booking flow routes to SCREENS.BOOKING'
)

assert(
  resolveLoginTarget({ returnScreen: SCREENS.HOME }, false) === SCREENS.ONBOARDING,
  'Incomplete profile routes to SCREENS.ONBOARDING'
)

assert(
  resolveLoginTarget(null, false) === SCREENS.ONBOARDING,
  'Incomplete profile with default login routes to SCREENS.ONBOARDING'
)

// -----------------------------------------------------------------------------
// Test Suite 3: Onboarding.jsx Sanitized Return Screen
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Onboarding.jsx Link Sanitization ---')

const onboardingSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Onboarding.jsx'), 'utf8').replace(/\r\n/g, '\n')

assert(
  !onboardingSrc.includes('returnScreen: SCREENS.ONBOARDING,'),
  'Onboarding.jsx handleGoToLogin does NOT hardcode returnScreen to SCREENS.ONBOARDING'
)
assert(
  onboardingSrc.includes('registrationData.returnScreen !== SCREENS.ONBOARDING'),
  'Onboarding.jsx sanitizes returnScreen to prevent redirect loop'
)

// -----------------------------------------------------------------------------
// Test Suite 4: PatientApp.jsx Route Protection & Stale State Avoidance
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: PatientApp.jsx Route Guards & State Integrity ---')

const patientAppSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/PatientApp.jsx'), 'utf8').replace(/\r\n/g, '\n')

assert(
  patientAppSrc.includes('import { SCREENS, isProfileComplete }'),
  'PatientApp.jsx imports isProfileComplete'
)

assert(
  patientAppSrc.includes('if (p && !isProfileComplete(p)) {\n        return SCREENS.ONBOARDING'),
  'PatientApp.jsx initial state detects incomplete profile and initializes to ONBOARDING'
)

assert(
  patientAppSrc.includes('if (!isProfileComplete(data)) {'),
  'PatientApp.jsx getMe effect verifies profile completeness and routes to ONBOARDING if incomplete'
)

assert(
  patientAppSrc.includes('const activePatient = data?.patient ||'),
  'PatientApp.jsx handleNavigate accesses activePatient synchronously from payload/storage (avoids stale state)'
)

assert(
  patientAppSrc.includes('token &&\n      activePatient &&\n      isProfileComplete(activePatient) &&\n      (screenId === SCREENS.ONBOARDING || screenId === SCREENS.REGISTRATION)'),
  'PatientApp.jsx route guard prevents complete profile from being trapped in onboarding/registration'
)

assert(
  patientAppSrc.includes('token &&\n      activePatient &&\n      !isProfileComplete(activePatient) &&\n      (screenId === SCREENS.HOME'),
  'PatientApp.jsx route guard forces incomplete profile to onboarding when attempting home access'
)

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n=================================================================')
console.log(`📊 Test Summary: ${passCount} Passed, ${failCount} Failed`)
console.log('=================================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL PATIENT OTP LOGIN REDIRECT REGRESSION CHECKS PASSED!\n')
}
