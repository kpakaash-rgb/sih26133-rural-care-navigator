/**
 * test-phase2-offline.js
 * Verification suite for Phase 2:
 * - IndexedDB & localStorage Consultation Queuing
 * - Reconnection Synchronization Service
 * - Connectivity Indicators & Banners
 * - Pure JavaScript Offline Triage Fallback & Clinical Parity
 * - Multilingual Translations (EN, HI, MR, TA)
 * - Patient Flow Screen Integrations
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..')

console.log('=================================================================')
console.log('🧪 Starting Phase 2 Offline Queuing, Sync & Triage Test Suite')
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
// Test Suite 1: File Existence & Architecture
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: Core Files and Exports ---')
const filesToCheck = [
  'src/services/offlineQueue.js',
  'src/services/syncService.js',
  'src/services/offlineTriage.js',
  'src/hooks/useOnlineStatus.js',
  'src/components/ConnectivityBanner.jsx',
]

for (const rel of filesToCheck) {
  const fullPath = path.join(frontendRoot, rel)
  assert(fs.existsSync(fullPath), `File exists: ${rel}`)
}

// -----------------------------------------------------------------------------
// Test Suite 2: Offline Triage Clinical Protocol & Language Parity
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Offline Clinical Triage Rules ---')
const { runOfflineTriage } = await import('../src/services/offlineTriage.js')

// 1. Emergency Red Flags
const emergencyCases = [
  { input: { symptoms: ['Chest Pain'], description: 'Severe chest pain radiating to arm' }, name: 'Chest Pain (English)' },
  { input: { symptoms: ['Difficulty breathing'], description: 'Trouble breathing at rest' }, name: 'Breathing Difficulty (English)' },
  { input: { symptoms: ['Snake bite'], description: 'Bitten by snake in field' }, name: 'Snake Bite (English)' },
  { input: { symptoms: ['Cough'], description: 'மூச்சுத் திணறல் உள்ளது' }, name: 'Shortness of breath (Tamil)' },
  { input: { symptoms: [], description: 'छाती में दर्द हो रहा है' }, name: 'Chest Pain (Hindi)' },
  { input: { symptoms: [], description: 'बेशुद्ध पडला आहे' }, name: 'Unconsciousness (Marathi)' },
]

for (const tc of emergencyCases) {
  const res = runOfflineTriage(tc.input)
  assert(res.emergency === true && res.urgency === 'emergency' && res.offline === true, `Emergency triage detected: ${tc.name}`)
}

// 2. Descriptive Severity Escalation
const severityCues = [
  { desc: 'The pain is getting worse every hour', label: 'getting worse (EN)' },
  { desc: 'Patient has severe pain in right side', label: 'severe pain (EN)' },
  { desc: 'அதிக வலி தாங்க முடியவில்லை', label: 'high pain (Tamil)' },
  { desc: 'बहुत तेज दर्द है', label: 'intense pain (Hindi)' },
]

for (const sc of severityCues) {
  const res = runOfflineTriage({ symptoms: ['Knee Pain'], description: sc.desc, duration_days: 1 })
  assert(res.urgency === 'needs_attention' && res.emergency === false && res.offline === true, `Severity cue escalation: ${sc.label}`)
}

// 3. Duration-Aware Rules
// Fever: 1 day -> needs attention (monitor), 3 days -> needs attention (persistent)
const fever1 = runOfflineTriage({ symptoms: ['Fever'], duration_days: 1 })
assert(fever1.urgency === 'needs_attention', 'Fever day 1 evaluated to needs_attention')

const fever3 = runOfflineTriage({ symptoms: ['Fever'], duration_days: 3 })
assert(fever3.urgency === 'needs_attention' && fever3.reason.includes('3 days'), 'Persistent fever day 3 flagged with duration')

// Headache: day 1 -> routine, day 3 -> needs_attention (threshold = 2)
const headache1 = runOfflineTriage({ symptoms: ['Headache'], duration_days: 1 })
assert(headache1.urgency === 'routine', 'Headache day 1 evaluated to routine')

const headache3 = runOfflineTriage({ symptoms: ['Headache'], duration_days: 3 })
assert(headache3.urgency === 'needs_attention', 'Headache day 3 evaluated to needs_attention')

// Knee Pain: day 1 -> routine, day 4 -> needs_attention (threshold = 3)
const knee1 = runOfflineTriage({ symptoms: ['Knee Pain'], duration_days: 1 })
assert(knee1.urgency === 'routine', 'Knee pain day 1 evaluated to routine')

const knee4 = runOfflineTriage({ symptoms: ['Knee Pain'], duration_days: 4 })
assert(knee4.urgency === 'needs_attention', 'Knee pain day 4 evaluated to needs_attention')

// Cough: day 1 -> routine, day 4 -> needs_attention (threshold = 3)
const cough1 = runOfflineTriage({ symptoms: ['Cough'], duration_days: 1 })
assert(cough1.urgency === 'routine', 'Cough day 1 evaluated to routine')

const cough4 = runOfflineTriage({ symptoms: ['Cough'], duration_days: 4 })
assert(cough4.urgency === 'needs_attention', 'Cough day 4 evaluated to needs_attention')

// Injury -> needs_attention regardless of day
const injury1 = runOfflineTriage({ symptoms: ['Injury'], duration_days: 1 })
assert(injury1.urgency === 'needs_attention', 'Injury evaluated to needs_attention')

// -----------------------------------------------------------------------------
// Test Suite 3: Offline Queue Operations (localStorage Fallback Simulation)
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Offline Queue Enqueue / Get / Update / Remove ---')

// Mock browser global environment for Node.js test execution
const memoryStorage = new Map()
globalThis.localStorage = {
  getItem: (key) => memoryStorage.get(key) || null,
  setItem: (key, val) => memoryStorage.set(key, String(val)),
  removeItem: (key) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
}

let dispatchedEvents = []
globalThis.window = {
  dispatchEvent: (evt) => {
    dispatchedEvents.push(evt)
    return true
  },
  addEventListener: () => {},
  removeEventListener: () => {},
}
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init) {
    this.type = type
    this.detail = init?.detail
  }
}

const offlineQueue = await import('../src/services/offlineQueue.js')

// 1. Enqueue item
const testBookingPayload = {
  facility_id: 1,
  service_id: 2,
  availability_slot_id: 5,
  facility: 'PHC Malshiras',
  service: 'General Medicine',
  date: '2026-10-15',
  time: '10:30 AM',
}

const queuedItem = await offlineQueue.enqueueRequest(testBookingPayload)
assert(queuedItem && queuedItem.id.startsWith('consult_'), 'enqueueRequest generates consultation ID')
assert(queuedItem.status === 'saved_offline', 'Initial queued item status is "saved_offline"')
assert(queuedItem.payload.facility === 'PHC Malshiras', 'Queued payload preserved facility name')

// Check event dispatch
const enqueueEvt = dispatchedEvents.find((e) => e.type === 'offline-queue-updated' && e.detail.action === 'enqueue')
assert(Boolean(enqueueEvt), 'offline-queue-updated event dispatched on enqueue')

// 2. Retrieve pending requests
const pendingList = await offlineQueue.getPendingRequests()
assert(pendingList.length === 1 && pendingList[0].id === queuedItem.id, 'getPendingRequests returns enqueued item')

// 3. Update request status
await offlineQueue.updateRequest(queuedItem.id, { status: 'syncing', retryCount: 1 })
const updatedItem = await offlineQueue.getRequest(queuedItem.id)
assert(updatedItem.status === 'syncing' && updatedItem.retryCount === 1, 'updateRequest updates status and retry count')

// 4. Mark submitted
await offlineQueue.markSubmitted(queuedItem.id, { id: 9876 })
const submittedItem = await offlineQueue.getRequest(queuedItem.id)
assert(submittedItem.status === 'submitted' && submittedItem.remoteId === 9876, 'markSubmitted records remoteId and submitted status')

const remainingPending = await offlineQueue.getPendingRequests()
assert(remainingPending.length === 0, 'getPendingRequests excludes submitted requests')

// 5. Remove request
await offlineQueue.removeRequest(queuedItem.id)
const removedItem = await offlineQueue.getRequest(queuedItem.id)
assert(removedItem === null, 'removeRequest deletes item from queue')

// -----------------------------------------------------------------------------
// Test Suite 4: Reconnection Synchronization Service
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Sync Service Reconnection & Conflict Handling ---')

// Mock navigator.onLine
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = { onLine: true }
} else {
  Object.defineProperty(globalThis.navigator, 'onLine', {
    value: true,
    configurable: true,
    writable: true,
  })
}

// Enqueue 2 new test items
const itemToSync = await offlineQueue.enqueueRequest({
  facility_id: 1,
  service_id: 2,
  availability_slot_id: 10,
  facility: 'CHC Akluj',
  service: 'Pediatrics',
})

const itemToConflict = await offlineQueue.enqueueRequest({
  facility_id: 1,
  service_id: 2,
  availability_slot_id: 99,
  facility: 'CHC Akluj',
  service: 'Pediatrics',
})

// Mock booking function: slot 10 succeeds, slot 99 throws 409 conflict
const mockBookAppointment = async (req) => {
  if (req.availability_slot_id === 99) {
    const err = new Error('Slot already booked by another patient')
    err.status = 409
    throw err
  }
  return { id: 501, status: 'SCHEDULED' }
}

const syncService = await import('../src/services/syncService.js')
const syncResult = await syncService.syncPendingConsultations({ apiBookAppointment: mockBookAppointment })

assert(syncResult.synced === 1, 'Sync succeeded for valid consultation slot')
assert(syncResult.failed === 1, 'Sync reported failure for conflicted slot')

const syncedCheck = await offlineQueue.getRequest(itemToSync.id)
assert(syncedCheck.status === 'submitted' && syncedCheck.remoteId === 501, 'Successfully synced item marked as submitted with remoteId')

const conflictCheck = await offlineQueue.getRequest(itemToConflict.id)
assert(conflictCheck.status === 'failed', 'Conflicted item marked as failed for user intervention')
assert(conflictCheck.lastError.includes('Slot is no longer available'), 'Conflicted item recorded friendly error notice')

// -----------------------------------------------------------------------------
// Test Suite 5: Multilingual Translations Coverage (EN, HI, MR, TA)
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Multilingual Connectivity & Queue Translations ---')
const { translations } = await import('../src/i18n/translations.js')

const REQUIRED_LANGS = ['en', 'hi', 'mr', 'ta']
const REQUIRED_CONNECTIVITY_KEYS = [
  'offlineBanner',
  'reconnectedBanner',
  'syncingBanner',
  'syncNow',
  'pendingPill',
]
const REQUIRED_OFFLINE_QUEUE_KEYS = [
  'savedOffline',
  'pendingSync',
  'syncing',
  'submitted',
  'failed',
  'pendingSectionTitle',
  'notConfirmedNotice',
  'savedOfflineTitle',
  'savedOfflineDesc',
]

for (const lang of REQUIRED_LANGS) {
  assert(Boolean(translations[lang]), `Translation pack exists: ${lang}`)
  const conn = translations[lang].connectivity
  assert(Boolean(conn), `connectivity dictionary exists in ${lang}`)
  for (const k of REQUIRED_CONNECTIVITY_KEYS) {
    assert(typeof conn?.[k] === 'string' && conn[k].length > 0, `[${lang}] connectivity.${k} translated: "${conn?.[k]}"`)
  }

  const queue = translations[lang].offlineQueue
  assert(Boolean(queue), `offlineQueue dictionary exists in ${lang}`)
  for (const k of REQUIRED_OFFLINE_QUEUE_KEYS) {
    assert(typeof queue?.[k] === 'string' && queue[k].length > 0, `[${lang}] offlineQueue.${k} translated: "${queue?.[k]}"`)
  }
}

// -----------------------------------------------------------------------------
// Test Suite 6: Patient Flow Screen Integration Verifications
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 6: Patient Flow UI Integration Verifications ---')

// 1. Home.jsx renders ConnectivityBanner
const homeSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Home.jsx'), 'utf8')
assert(homeSrc.includes('<ConnectivityBanner />'), 'Home.jsx renders ConnectivityBanner')

// 2. Symptoms.jsx integrates offline triage fallback
const symptomsSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Symptoms.jsx'), 'utf8')
assert(symptomsSrc.includes('runOfflineTriage(triagePayload)'), 'Symptoms.jsx executes runOfflineTriage when offline or on API failure')
assert(symptomsSrc.includes('<ConnectivityBanner />'), 'Symptoms.jsx renders ConnectivityBanner')

// 3. CareGuidance.jsx renders offline evaluation badge and ConnectivityBanner
const careSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/CareGuidance.jsx'), 'utf8')
assert(careSrc.includes('triageResult?.offline'), 'CareGuidance.jsx checks triageResult?.offline flag')
assert(careSrc.includes('<ConnectivityBanner />'), 'CareGuidance.jsx renders ConnectivityBanner')

// 4. Booking.jsx enqueues offline consultation and redirects to confirmation
const bookingSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Booking.jsx'), 'utf8')
assert(bookingSrc.includes('enqueueRequest'), 'Booking.jsx calls enqueueRequest when offline')
assert(bookingSrc.includes("status: 'saved_offline'"), 'Booking.jsx marks offline booking status as saved_offline')
assert(bookingSrc.includes('<ConnectivityBanner />'), 'Booking.jsx renders ConnectivityBanner')

// 5. AppointmentConfirmed.jsx renders offline saved hero state
const confirmedSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/AppointmentConfirmed.jsx'), 'utf8')
assert(confirmedSrc.includes('isOfflineSaved'), 'AppointmentConfirmed.jsx detects isOfflineSaved')
assert(confirmedSrc.includes('savedOfflineTitle'), 'AppointmentConfirmed.jsx displays savedOfflineTitle')
assert(confirmedSrc.includes('<ConnectivityBanner />'), 'AppointmentConfirmed.jsx renders ConnectivityBanner')

// 6. Appointments.jsx renders pending offline requests and manual sync
const apptSrc = fs.readFileSync(path.join(frontendRoot, 'src/pages/patient/Appointments.jsx'), 'utf8')
assert(apptSrc.includes('offline-pending-group'), 'Appointments.jsx has dedicated offline pending consultation section')
assert(apptSrc.includes('handleSyncOffline'), 'Appointments.jsx provides manual Sync button')
assert(apptSrc.includes('<ConnectivityBanner />'), 'Appointments.jsx renders ConnectivityBanner')

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n=================================================================')
console.log(`Phase 2 Test Summary: ${passCount} Passed, ${failCount} Failed`)
console.log('=================================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL PHASE 2 VERIFICATION TESTS PASSED!')
  process.exit(0)
}
