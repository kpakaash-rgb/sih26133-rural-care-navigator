/**
 * firstAidVideosData.js
 * =====================
 * Preloaded offline emergency first-aid video catalog for Nalam Connect.
 * Provides the shared video definitions available to every signed-in user.
 * 
 * Video files are served from /first-aid/videos/ and can be cached
 * for 100% offline playback.
 */

export const FIRST_AID_VIDEOS = [
  {
    id: 'choking',
    title: {
      en: 'First Aid for Choking',
      ta: 'விழுங்கு அடைப்பு முதலுதவி (Choking)',
      hi: 'दम घुटने पर प्राथमिक उपचार (Choking)',
      mr: 'श्वास अडकल्यास प्रथमोपचार',
    },
    category: {
      en: 'Choking',
      ta: 'விழுங்கு அடைப்பு',
      hi: 'दम घुटना',
      mr: 'श्वास अडकणे',
    },
    categoryKey: 'choking',
    icon: '🫁',
    videoUrl: '/first-aid/videos/choking.mp4',
    fileName: 'choking.mp4',
    duration: '2:15',
    summary: {
      en: 'Immediate back blows and abdominal thrusts to relieve foreign airway obstruction.',
      ta: 'சுவாசப்பாதை அடைப்பை நீக்க முதுகில் தட்டுதல் மற்றும் அடிவயிற்று அழுத்தம் தரும் செயல்முறை.',
      hi: 'वायुमार्ग अवरोध दूर करने के लिए पीठ पर थपकी और पेट पर दबाव देने की प्रक्रिया।',
      mr: 'श्वासनलिका मोकळी करण्यासाठी पाठीवर थाप आणि पोटावर दाब देण्याची पद्धत.',
    },
    transcripts: {
      en: null, // Displays "Transcript not available." until medical transcript is added
      ta: null,
    },
  },
  {
    id: 'burns',
    title: {
      en: 'First Aid for Burns',
      ta: 'தீக்காயங்கள் முதலுதவி (Burns)',
      hi: 'जलने पर प्राथमिक उपचार (Burns)',
      mr: 'भाजल्यास प्रथमोपचार',
    },
    category: {
      en: 'Burns',
      ta: 'தீக்காயங்கள்',
      hi: 'जलना',
      mr: 'भाजणे',
    },
    categoryKey: 'burns',
    icon: '🔥',
    videoUrl: '/first-aid/videos/burns.mp4',
    fileName: 'burns.mp4',
    duration: '1:45',
    summary: {
      en: 'Cooling the burn with running water, protecting the wound, and preventing infection.',
      ta: 'தீக்காயத்தை குளிர்ந்த நீரில் கழுவுதல், காயத்தை பாதுகாத்தல் மற்றும் தொற்று தடுப்பு முறைகள்.',
      hi: 'जले हुए स्थान को बहते ठंडे पानी से ठंडा करना और संक्रमण से बचाना।',
      mr: 'भाजलेला भाग थंड पाण्याखाली धरणे आणि जंतूसंसर्ग रोखणे.',
    },
    transcripts: {
      en: null,
      ta: null,
    },
  },
  {
    id: 'cpr',
    title: {
      en: 'CPR Demonstration',
      ta: 'சிபிஆர் செயல்முறை விளக்கம் (CPR)',
      hi: 'सीपीआर प्रदर्शन (CPR)',
      mr: 'सीपीआर प्रात्यक्षिक',
    },
    category: {
      en: 'CPR',
      ta: 'சிபிஆர்',
      hi: 'सीपीआर',
      mr: 'सीपीआर',
    },
    categoryKey: 'cpr',
    icon: '❤️',
    videoUrl: '/first-aid/videos/cpr.mp4',
    fileName: 'cpr.mp4',
    duration: '3:10',
    summary: {
      en: 'Hands-only cardiopulmonary resuscitation technique for unresponsive individuals.',
      ta: 'சுவாசமற்ற அல்லது இதயத்துடிப்பற்ற நபருக்கு கைகளால் நெஞ்சழுத்தம் கொடுக்கும் சிபிஆர் முறை.',
      hi: 'बेहोश और सांस न लेने वाले व्यक्ति के लिए केवल हाथों से सीपीआर देने की विधि।',
      mr: 'श्वास बंद पडलेल्या व्यक्तीसाठी छातीवर दाब देऊन सीपीआर देण्याची पद्धत.',
    },
    transcripts: {
      en: null,
      ta: null,
    },
  },
]

export const VIDEO_CATEGORIES = [
  { id: 'all', label: { en: 'All Videos', ta: 'அனைத்து வீடியோக்கள்', hi: 'सभी वीडियो', mr: 'सर्व व्हिडिओ' }, icon: '🎥' },
  { id: 'choking', label: { en: 'Choking', ta: 'விழுங்கு அடைப்பு', hi: 'दम घुटना', mr: 'श्वास अडकणे' }, icon: '🫁' },
  { id: 'burns', label: { en: 'Burns', ta: 'தீக்காயங்கள்', hi: 'जलना', mr: 'भाजणे' }, icon: '🔥' },
  { id: 'cpr', label: { en: 'CPR', ta: 'சிபிஆர்', hi: 'सीपीआर', mr: 'सीपीआर' }, icon: '❤️' },
]

export default FIRST_AID_VIDEOS
