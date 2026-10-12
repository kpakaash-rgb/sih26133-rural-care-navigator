/**
 * firstAidData.js
 * ===============
 * Bundled offline emergency first-aid knowledge base for Nalam Connect.
 * Sourced directly or used as synchronous fallback for /first-aid/content.json.
 */

import rawTopics from '../../public/first-aid/content.json'

export const FIRST_AID_TOPICS = rawTopics

export const CATEGORIES = [
  { id: 'all', label: { en: 'All Topics', ta: 'அனைத்தும்', hi: 'सभी विषय', mr: 'सर्व विषय' }, icon: '📋' },
  { id: 'critical', label: { en: 'Critical / Airway', ta: 'உயிராபத்து', hi: 'गंभीर स्थिति', mr: 'अतिदक्षता' }, icon: '🚨' },
  { id: 'trauma', label: { en: 'Trauma & Bleeding', ta: 'காயங்கள்', hi: 'चोट व रक्तस्राव', mr: 'जखम व रक्तस्त्राव' }, icon: '🩸' },
  { id: 'respiratory', label: { en: 'Breathing / Water', ta: 'சுவாசம் / நீர்', hi: 'श्वास व जल', mr: 'श्वसन व पाणी' }, icon: '🫁' },
  { id: 'cardiac', label: { en: 'Heart & Chest', ta: 'இதயம்', hi: 'हृदय व छाती', mr: 'हृदय' }, icon: '❤️' },
  { id: 'environmental', label: { en: 'Bites & Stings', ta: 'கடி நச்சு', hi: 'दंश व विष', mr: 'दंश व विष' }, icon: '🐍' },
  { id: 'pediatric', label: { en: 'Child Care', ta: 'குழந்தைகள்', hi: 'बाल स्वास्थ्य', mr: 'बालसंगोपन' }, icon: '👶' },
]

export default FIRST_AID_TOPICS
