/**
 * offlineTriage.js
 * ================
 * Pure client-side JavaScript implementation of MYTHRI / Nalam Connect rule-based triage.
 * Matches ai/triage/triage.py, safety.py, and normalization.py clinical protocol.
 * Executes instantly without any network or server dependency.
 */

// Canonical symptom categories
export const SymptomCategory = {
  FEVER: 'FEVER',
  COUGH: 'COUGH',
  HEADACHE: 'HEADACHE',
  STOMACH_PROBLEM: 'STOMACH_PROBLEM',
  KNEE_PAIN: 'KNEE_PAIN',
  BACK_PAIN: 'BACK_PAIN',
  OTHER_PAIN: 'OTHER_PAIN',
  INJURY: 'INJURY',
  GENERAL_OTHER: 'GENERAL_OTHER',
}

// Configurable duration thresholds (matching triage.py)
const DURATION_MIN_DAYS = 1
const DURATION_MAX_DAYS = 30
const DURATION_THRESHOLD_FEVER = 2
const DURATION_THRESHOLD_HEADACHE = 2
const DURATION_THRESHOLD_STOMACH = 2
const DURATION_THRESHOLD_KNEE_PAIN = 3
const DURATION_THRESHOLD_BACK_PAIN = 3
const DURATION_THRESHOLD_COUGH = 3
const DURATION_THRESHOLD_OTHER_PAIN = 3

// Emergency red flag terms (EN, TA, HI, MR)
const EMERGENCY_TERMS = [
  'difficulty breathing',
  'trouble breathing',
  'cannot breathe',
  "can't breathe",
  'severe chest pain',
  'chest pain',
  'unconscious',
  'passed out',
  'loss of consciousness',
  'severe bleeding',
  'heavy bleeding',
  'vomiting blood',
  'blood in vomit',
  'seizure',
  'convulsion',
  'stroke',
  'face drooping',
  'slurred speech',
  'severe allergic reaction',
  'snake bite',
  'poison',
  // Tamil emergency terms
  'மூச்சுத் திணறல்',
  'நெஞ்சு வலி',
  'நினைவிழப்பு',
  'அதிக ரத்தப்போக்கு',
  'ரத்த வாந்தி',
  'வலிப்பு',
  'பக்கவாதம்',
  'பாம்பு கடி',
  'விஷம்',
  // Hindi emergency terms
  'सांस लेने में तकलीफ',
  'छाती में दर्द',
  'बेहोश',
  'अत्यधिक रक्तस्राव',
  'खून की उल्टी',
  'दौरा',
  'पक्षाघात',
  'सांप का काटना',
  'जहर',
  // Marathi emergency terms
  'श्वास घेण्यास त्रास',
  'छातीत दुखणे',
  'बेशुद्ध',
  'अति रक्तस्त्राव',
  'उलटीतून रक्त',
  'झटका',
  'साप चावणे',
  'विष',
]

// Description severity escalation phrases
const ATTENTION_DESCRIPTIVE_TERMS = [
  'getting worse',
  'severe pain',
  'persistent pain',
  'high fever',
  'feeling very weak',
  'worsening',
  'intense pain',
  'unable to walk',
  'cannot walk',
  'not getting better',
  'அதிக வலி',
  'மோசமாகிறது',
  'நடவடிக்கை கடினம்',
  'बढ़ रहा है',
  'बहुत तेज दर्द',
  'असह्य वेदना',
]

// Keyword-to-category mapping for normalization
const EXACT_MAP = {
  fever: SymptomCategory.FEVER,
  bukhar: SymptomCategory.FEVER,
  taap: SymptomCategory.FEVER,
  காய்ச்சல்: SymptomCategory.FEVER,
  cough: SymptomCategory.COUGH,
  coughing: SymptomCategory.COUGH,
  khasi: SymptomCategory.COUGH,
  khokla: SymptomCategory.COUGH,
  இருமல்: SymptomCategory.COUGH,
  headache: SymptomCategory.HEADACHE,
  'head pain': SymptomCategory.HEADACHE,
  'sar dard': SymptomCategory.HEADACHE,
  dokedukhi: SymptomCategory.HEADACHE,
  தலைவலி: SymptomCategory.HEADACHE,
  pain: SymptomCategory.OTHER_PAIN,
  'knee pain': SymptomCategory.KNEE_PAIN,
  'ghutne dard': SymptomCategory.KNEE_PAIN,
  'முழங்கால் வலி': SymptomCategory.KNEE_PAIN,
  'back pain': SymptomCategory.BACK_PAIN,
  'kamar dard': SymptomCategory.BACK_PAIN,
  'pathidukhi': SymptomCategory.BACK_PAIN,
  'முதுகு வலி': SymptomCategory.BACK_PAIN,
  'other pain': SymptomCategory.OTHER_PAIN,
  'stomach problem': SymptomCategory.STOMACH_PROBLEM,
  'stomach pain': SymptomCategory.STOMACH_PROBLEM,
  'pet dard': SymptomCategory.STOMACH_PROBLEM,
  'வயிற்று வலி': SymptomCategory.STOMACH_PROBLEM,
  injury: SymptomCategory.INJURY,
  wound: SymptomCategory.INJURY,
  காயம்: SymptomCategory.INJURY,
  general: SymptomCategory.GENERAL_OTHER,
  'general other': SymptomCategory.GENERAL_OTHER,
}

/**
 * Check for explicit emergency red flags.
 */
function checkEmergency(symptoms = [], description = '') {
  const combined = (symptoms.join(' ') + ' ' + description).toLowerCase()
  for (const term of EMERGENCY_TERMS) {
    if (combined.includes(term.toLowerCase())) {
      return {
        emergency: true,
        reason:
          'Your reported symptoms or description include an emergency warning sign. Please seek emergency medical help immediately.',
      }
    }
  }
  return { emergency: false, reason: 'No explicit emergency warning sign identified.' }
}

/**
 * Normalize input symptoms and extract from description.
 */
function normalizeSymptoms(symptoms = [], description = '') {
  const categories = new Set()
  const lowerDesc = (description || '').toLowerCase()

  // 1. Process explicit symptoms array
  for (const s of symptoms) {
    const clean = s.trim().toLowerCase()
    if (EXACT_MAP[clean]) {
      categories.add(EXACT_MAP[clean])
    } else {
      // Substring check
      for (const [key, cat] of Object.entries(EXACT_MAP)) {
        if (clean.includes(key)) {
          categories.add(cat)
          break
        }
      }
    }
  }

  // 2. Scan description for symptom indicators
  if (/fever|temperature|bukhar|taap|காய்ச்சல்|बुखार|ताप/.test(lowerDesc)) {
    categories.add(SymptomCategory.FEVER)
  }
  if (/headache|head pain|sar dard|dokedukhi|தலைவலி|सिर दर्द|डोकेदुखी/.test(lowerDesc)) {
    categories.add(SymptomCategory.HEADACHE)
  }
  if (/knee pain|knee hurts|ghutne|முழங்கால்|घुटने/.test(lowerDesc)) {
    categories.add(SymptomCategory.KNEE_PAIN)
  }
  if (/back pain|back hurts|kamar|முதுகு|कमर/.test(lowerDesc)) {
    categories.add(SymptomCategory.BACK_PAIN)
  }
  if (/stomach|belly|abdominal|pet dard|வயிற்று|पेट दर्द|पोट/.test(lowerDesc)) {
    categories.add(SymptomCategory.STOMACH_PROBLEM)
  }
  if (/cough|khasi|khokla|இருமல்|खांसी|खोकला/.test(lowerDesc)) {
    categories.add(SymptomCategory.COUGH)
  }
  if (/injury|cut|wound|bleed|fall|காயம்|चोट|जखम/.test(lowerDesc)) {
    categories.add(SymptomCategory.INJURY)
  }

  if (categories.size === 0) {
    categories.add(SymptomCategory.GENERAL_OTHER)
  }

  return Array.from(categories)
}

/**
 * Run client-side offline rule-based clinical decision support.
 *
 * @param {{ symptoms: string[], description?: string, duration_days?: number }} input
 * @returns {object} Triage result with urgency, recommended_care, reason, emergency flag, and offline marker
 */
export function runOfflineTriage({ symptoms = [], description = '', duration_days = 1 } = {}) {
  const effectiveDuration = Math.max(
    DURATION_MIN_DAYS,
    Math.min(DURATION_MAX_DAYS, parseInt(duration_days, 10) || 1)
  )

  // 1. Emergency Check (Overrides all else)
  const safety = checkEmergency(symptoms, description)
  const normalized = normalizeSymptoms(symptoms, description)

  if (safety.emergency) {
    return {
      urgency: 'emergency',
      recommended_care: 'Emergency medical help',
      reason: safety.reason,
      emergency: true,
      symptoms: normalized,
      duration_days: effectiveDuration,
      offline: true,
    }
  }

  const symptomSet = new Set(normalized)
  const normDesc = (description || '').trim().toLowerCase()

  // 2. Description Severity Escalation
  const hasSeverityCue = ATTENTION_DESCRIPTIVE_TERMS.some((term) => normDesc.includes(term))
  if (hasSeverityCue) {
    return {
      urgency: 'needs_attention',
      recommended_care: 'Primary Health Centre (PHC)',
      reason:
        'Your description suggests symptom worsening or significant discomfort; clinical assessment by a healthcare professional is recommended.',
      emergency: false,
      symptoms: normalized,
      duration_days: effectiveDuration,
      offline: true,
    }
  }

  // 3. Duration-Aware Rules
  const needsAttentionTriggers = []
  const routineReasons = []

  // Check FEVER
  if (symptomSet.has(SymptomCategory.FEVER)) {
    if (effectiveDuration >= DURATION_THRESHOLD_FEVER) {
      needsAttentionTriggers.push([
        'FEVER',
        `Persistent fever reported for ${effectiveDuration} days; clinical review at a PHC is recommended.`,
      ])
    } else {
      needsAttentionTriggers.push([
        'FEVER',
        'Fever reported; healthcare evaluation is advised to monitor temperature and symptoms.',
      ])
    }
  }

  // Check HEADACHE
  if (symptomSet.has(SymptomCategory.HEADACHE)) {
    if (effectiveDuration >= DURATION_THRESHOLD_HEADACHE) {
      needsAttentionTriggers.push([
        'HEADACHE',
        `Headache persisting for ${effectiveDuration} days; clinical assessment is recommended.`,
      ])
    } else {
      routineReasons.push(
        `Recent headache reported (${effectiveDuration} day). Rest and hydration advised; consult healthcare if it persists.`
      )
    }
  }

  // Check STOMACH_PROBLEM
  if (symptomSet.has(SymptomCategory.STOMACH_PROBLEM)) {
    if (effectiveDuration >= DURATION_THRESHOLD_STOMACH) {
      needsAttentionTriggers.push([
        'STOMACH_PROBLEM',
        `Stomach discomfort persisting for ${effectiveDuration} days; clinical assessment is recommended.`,
      ])
    } else {
      needsAttentionTriggers.push([
        'STOMACH_PROBLEM',
        'Stomach discomfort reported; healthcare evaluation is advised.',
      ])
    }
  }

  // Check KNEE_PAIN
  if (symptomSet.has(SymptomCategory.KNEE_PAIN)) {
    if (effectiveDuration >= DURATION_THRESHOLD_KNEE_PAIN) {
      needsAttentionTriggers.push([
        'KNEE_PAIN',
        `Knee pain reported for ${effectiveDuration} days; clinical assessment is recommended.`,
      ])
    } else {
      routineReasons.push(
        `Recent knee discomfort (${effectiveDuration} day(s)). Rest and observation advised; seek care if pain persists.`
      )
    }
  }

  // Check BACK_PAIN
  if (symptomSet.has(SymptomCategory.BACK_PAIN)) {
    if (effectiveDuration >= DURATION_THRESHOLD_BACK_PAIN) {
      needsAttentionTriggers.push([
        'BACK_PAIN',
        `Back pain reported for ${effectiveDuration} days; clinical assessment is recommended.`,
      ])
    } else {
      routineReasons.push(
        `Recent back discomfort (${effectiveDuration} day(s)). Rest advised; consult healthcare provider if symptoms persist.`
      )
    }
  }

  // Check COUGH
  if (symptomSet.has(SymptomCategory.COUGH)) {
    if (effectiveDuration >= DURATION_THRESHOLD_COUGH) {
      needsAttentionTriggers.push([
        'COUGH',
        `Cough persisting for ${effectiveDuration} days; clinical assessment is recommended.`,
      ])
    } else {
      routineReasons.push(
        `Recent cough (${effectiveDuration} day(s)) without red flags. Monitor symptoms and seek care if worsening.`
      )
    }
  }

  // Check INJURY
  if (symptomSet.has(SymptomCategory.INJURY)) {
    needsAttentionTriggers.push([
      'INJURY',
      `Injury or wound reported (${effectiveDuration} day(s) duration); clinical assessment and wound care are recommended.`,
    ])
  }

  // Check OTHER_PAIN
  if (symptomSet.has(SymptomCategory.OTHER_PAIN)) {
    if (effectiveDuration >= DURATION_THRESHOLD_OTHER_PAIN) {
      needsAttentionTriggers.push([
        'OTHER_PAIN',
        `Pain persisting for ${effectiveDuration} days; clinical assessment is advised.`,
      ])
    } else {
      needsAttentionTriggers.push([
        'OTHER_PAIN',
        'Pain reported; healthcare evaluation is recommended if discomfort persists.',
      ])
    }
  }

  // If any trigger requires PHC evaluation:
  if (needsAttentionTriggers.length > 0) {
    let primaryReason = ''
    if (needsAttentionTriggers.length === 1) {
      primaryReason = needsAttentionTriggers[0][1]
    } else {
      const names = needsAttentionTriggers.map((t) => t[0].replace('_', ' ').toLowerCase())
      primaryReason = `Multiple symptoms reported (${names.join(', ')}) for ${effectiveDuration} day(s); clinical review at a Primary Health Centre (PHC) is recommended.`
    }

    return {
      urgency: 'needs_attention',
      recommended_care: 'Primary Health Centre (PHC)',
      reason: primaryReason,
      emergency: false,
      symptoms: normalized,
      duration_days: effectiveDuration,
      offline: true,
    }
  }

  // If evaluated to routine care:
  if (routineReasons.length > 0) {
    return {
      urgency: 'routine',
      recommended_care: 'Routine healthcare service',
      reason: routineReasons.join(' '),
      emergency: false,
      symptoms: normalized,
      duration_days: effectiveDuration,
      offline: true,
    }
  }

  // 4. Default safe guidance
  return {
    urgency: 'routine',
    recommended_care: 'Routine healthcare service',
    reason:
      'No emergency warning sign was identified. Rest, maintain hydration, and consider routine healthcare review if symptoms persist or become worse.',
    emergency: false,
    symptoms: normalized,
    duration_days: effectiveDuration,
    offline: true,
  }
}

export default runOfflineTriage
