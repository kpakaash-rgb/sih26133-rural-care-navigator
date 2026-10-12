/**
 * test-phase1-firstaid.js
 * Verification suite for Phase 1: Fully Offline Emergency First-Aid Module
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('🧪 Starting Phase 1 Emergency First-Aid Test Suite')
console.log('====================================================\n')

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
// Test 1: Content.json verification
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: Bundled Content (/first-aid/content.json) ---')
const contentJsonPath = path.join(frontendRoot, 'public', 'first-aid', 'content.json')
assert(fs.existsSync(contentJsonPath), 'frontend/public/first-aid/content.json exists')

const contentRaw = fs.readFileSync(contentJsonPath, 'utf8')
let topics = []
try {
  topics = JSON.parse(contentRaw)
  assert(Array.isArray(topics), 'content.json is a valid JSON array')
} catch (e) {
  assert(false, `content.json failed to parse: ${e.message}`)
}

const REQUIRED_TOPIC_IDS = [
  'snake_bite',
  'bleeding',
  'choking',
  'burns',
  'heart_attack',
  'stroke',
  'unconsciousness',
  'fainting',
  'drowning',
  'fractures',
  'high_fever',
]

const REQUIRED_LANGUAGES = ['en', 'ta', 'hi', 'mr']

assert(topics.length >= 11, `Contains at least 11 topics (actual: ${topics.length})`)

const topicIds = topics.map((t) => t.id)
REQUIRED_TOPIC_IDS.forEach((reqId) => {
  assert(topicIds.includes(reqId), `Topic '${reqId}' is present in content.json`)
})

topics.forEach((topic) => {
  const id = topic.id
  assert(Boolean(topic.icon), `[${id}] Has icon: ${topic.icon}`)
  assert(
    ['call_immediately', 'seek_care', 'self_manage'].includes(topic.urgency),
    `[${id}] Has valid urgency level: ${topic.urgency}`
  )

  REQUIRED_LANGUAGES.forEach((lang) => {
    assert(
      typeof topic.title?.[lang] === 'string' && topic.title[lang].trim().length > 0,
      `[${id}] Has localized title in '${lang}': "${topic.title?.[lang]}"`
    )
    assert(
      typeof topic.summary?.[lang] === 'string' && topic.summary[lang].trim().length > 0,
      `[${id}] Has localized summary in '${lang}'`
    )
  })

  assert(
    Array.isArray(topic.warnings) && topic.warnings.length > 0,
    `[${id}] Has red flag warnings (${topic.warnings?.length})`
  )

  topic.warnings.forEach((warn, idx) => {
    REQUIRED_LANGUAGES.forEach((lang) => {
      assert(
        typeof warn[lang] === 'string' && warn[lang].trim().length > 0,
        `[${id}] Warning ${idx + 1} has '${lang}' translation`
      )
    })
  })

  assert(
    Array.isArray(topic.steps) && topic.steps.length >= 3,
    `[${id}] Has at least 3 action steps (${topic.steps?.length})`
  )

  topic.steps.forEach((step, sIdx) => {
    REQUIRED_LANGUAGES.forEach((lang) => {
      assert(
        typeof step.title?.[lang] === 'string' && step.title[lang].trim().length > 0,
        `[${id}] Step ${sIdx + 1} has title in '${lang}'`
      )
      assert(
        typeof step.text?.[lang] === 'string' && step.text[lang].trim().length > 0,
        `[${id}] Step ${sIdx + 1} has instruction in '${lang}'`
      )
      assert(
        typeof step.doNot?.[lang] === 'string' && step.doNot[lang].trim().length > 0,
        `[${id}] Step ${sIdx + 1} has 'doNot' warning in '${lang}'`
      )
    })
  })
})

// -----------------------------------------------------------------------------
// Test 2: Synchronous Local Fallback (firstAidData.js)
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Synchronous Data Module (firstAidData.js) ---')
const firstAidDataPath = path.join(frontendRoot, 'src', 'data', 'firstAidData.js')
assert(fs.existsSync(firstAidDataPath), 'frontend/src/data/firstAidData.js exists')

const firstAidDataRaw = fs.readFileSync(firstAidDataPath, 'utf8')
assert(firstAidDataRaw.includes('FIRST_AID_TOPICS'), 'Exports FIRST_AID_TOPICS')
assert(firstAidDataRaw.includes('CATEGORIES'), 'Exports CATEGORIES')

// -----------------------------------------------------------------------------
// Test 3: Translations Verification (all 4 languages)
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Translations (translations.js) ---')
const translationsPath = path.join(frontendRoot, 'src', 'i18n', 'translations.js')
const translationsRaw = fs.readFileSync(translationsPath, 'utf8')

REQUIRED_LANGUAGES.forEach((lang) => {
  assert(
    translationsRaw.includes(`${lang}:`) || translationsRaw.includes(`  ${lang}: {`),
    `Language section '${lang}' exists in translations.js`
  )
})

const REQUIRED_FIRST_AID_KEYS = [
  'screenTitle',
  'subtitle',
  'searchPlaceholder',
  'allCategories',
  'offlineReadyBadge',
  'callAmbulanceBtn',
  'call108Now',
  'redFlagsTitle',
  'stepByStepTitle',
  'whatNotToDo',
  'readAloud',
  'stopReading',
  'backToTopics',
  'homeCardTitle',
  'homeCardSub',
  'urgencyImmediate',
  'urgencySeekCare',
  'urgencySelfManage',
]

REQUIRED_FIRST_AID_KEYS.forEach((key) => {
  const matches = (translationsRaw.match(new RegExp(`\\b${key}\\b`, 'g')) || []).length
  assert(matches >= 4, `Translation key 'firstAid.${key}' appears in all 4 languages (found ${matches} times)`)
})

// -----------------------------------------------------------------------------
// Test 4: Screen Constants & Navigation Registry
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Constants & Screen Registry ---')
const constantsPath = path.join(frontendRoot, 'src', 'utils', 'constants.js')
const constantsRaw = fs.readFileSync(constantsPath, 'utf8')
assert(constantsRaw.includes("EMERGENCY_FIRST_AID: 'emergency_first_aid'"), "constants.js includes SCREENS.EMERGENCY_FIRST_AID")
assert(constantsRaw.includes("[SCREENS.EMERGENCY_FIRST_AID]: 'Emergency First Aid Guide'"), "constants.js includes SCREEN_TITLES[SCREENS.EMERGENCY_FIRST_AID]")

const patientIndexPath = path.join(frontendRoot, 'src', 'pages', 'patient', 'index.js')
const patientIndexRaw = fs.readFileSync(patientIndexPath, 'utf8')
assert(patientIndexRaw.includes("export { default as EmergencyFirstAid } from './EmergencyFirstAid'"), 'pages/patient/index.js exports EmergencyFirstAid')

const patientAppPath = path.join(frontendRoot, 'src', 'pages', 'patient', 'PatientApp.jsx')
const patientAppRaw = fs.readFileSync(patientAppPath, 'utf8')
assert(patientAppRaw.includes('EmergencyFirstAid'), 'PatientApp.jsx imports EmergencyFirstAid')
assert(patientAppRaw.includes('currentScreen === SCREENS.EMERGENCY_FIRST_AID'), 'PatientApp.jsx renders EmergencyFirstAid screen')

// -----------------------------------------------------------------------------
// Test 5: Home Screen Entry Point
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 5: Home Screen First-Aid Entry Point ---')
const homePath = path.join(frontendRoot, 'src', 'pages', 'patient', 'Home.jsx')
const homeRaw = fs.readFileSync(homePath, 'utf8')
assert(homeRaw.includes('firstaid-banner-card'), 'Home.jsx renders firstaid-banner-card')
assert(homeRaw.includes('SCREENS.EMERGENCY_FIRST_AID'), 'Home.jsx navigates to SCREENS.EMERGENCY_FIRST_AID')
assert(homeRaw.includes('handleSosClick'), 'Home.jsx preserves direct 108 emergency SOS calling')

// -----------------------------------------------------------------------------
// Test 6: Workbox & PWA Offline Configuration
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 6: PWA Workbox Precache Config ---')
const viteConfigPath = path.join(frontendRoot, 'vite.config.js')
const viteConfigRaw = fs.readFileSync(viteConfigPath, 'utf8')
assert(viteConfigRaw.includes('first-aid/content.json'), 'vite.config.js includes first-aid/content.json in assets')
assert(viteConfigRaw.includes("url: '/first-aid/content.json'"), 'vite.config.js precaches /first-aid/content.json in additionalManifestEntries')
assert(viteConfigRaw.includes('first-aid-cache'), 'vite.config.js defines CacheFirst runtimeCaching for first-aid')

// -----------------------------------------------------------------------------
// Test 7: UI & CSS Styling
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 7: Screen Implementation & Styling ---')
const screenPath = path.join(frontendRoot, 'src', 'pages', 'patient', 'EmergencyFirstAid.jsx')
const screenRaw = fs.readFileSync(screenPath, 'utf8')
assert(screenRaw.includes('SpeechSynthesisUtterance'), 'EmergencyFirstAid implements browser SpeechSynthesis for TTS')
assert(screenRaw.includes('tel:108'), 'EmergencyFirstAid provides direct tel:108 emergency calling')
assert(screenRaw.includes('efa-pulse-dot'), 'EmergencyFirstAid renders offline ready pulse indicator')
assert(screenRaw.includes('whatNotToDo'), 'EmergencyFirstAid renders critical rural "What NOT To Do" precautions')

const cssPath = path.join(frontendRoot, 'src', 'styles', 'emergencyFirstAid.css')
assert(fs.existsSync(cssPath), 'emergencyFirstAid.css stylesheet exists')

console.log('\n====================================================')
console.log(`📊 Test Summary: ${passCount} passed, ${failCount} failed`)
console.log('====================================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL PHASE 1 AUTOMATED TESTS PASSED!')
}
