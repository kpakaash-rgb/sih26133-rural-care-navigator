/**
 * doctorsData.js
 * ==============
 * Bundled offline Doctor Directory dataset for Nalam Connect.
 * Provides synchronous fallback when offline or in degraded connectivity.
 *
 * NOTE: All entries in this dataset are realistic demonstration records for prototype evaluation.
 * They represent simulated Tamil Nadu public healthcare postings across Chennai, Chengalpattu,
 * Kanchipuram, Tiruvallur, Madurai, Coimbatore, and Tiruchirappalli districts.
 * They do NOT represent verified employment or actual medical practitioner credentials.
 */

export const DOCTORS_DATA = [
  {
    id: 1,
    doctor_id: 'DOC-10101',
    name: 'Dr. R. Karthik',
    specialization: 'General Medicine',
    qualification: 'MBBS (Demo Profile)',
    experience_years: 12,
    facility_id: 1,
    facility_name: 'PHC Thirukazhukundram',
    facility_type: 'PRIMARY_HEALTH_CENTRE',
    facility_address: 'Hospital Road, Thirukazhukundram, Chengalpattu District',
    district: 'Chengalpattu',
    latitude: 12.5324,
    longitude: 80.0528,
    languages: ['ta', 'en'],
    opd_timings: '09:00 AM - 02:00 PM',
    opd_room: 'OPD-1 (Fever & Routine Clinic)',
    available_today: true,
    is_demo: true,
    verification_status: 'DEMO_UNVERIFIED',
    bio: 'Demonstration profile: Medical Officer providing primary outpatient healthcare, seasonal fever triage, and community wellness at PHC Thirukazhukundram. Unverified demo data for prototype evaluation.',
  },
  {
    id: 2,
    doctor_id: 'DOC-10102',
    name: 'Dr. Ananya Sundaram',
    specialization: 'Pediatrics',
    qualification: 'MBBS, DCH (Pediatrics, Demo Profile)',
    experience_years: 8,
    facility_id: 2,
    facility_name: 'CHC Maduranthakam',
    facility_type: 'COMMUNITY_HEALTH_CENTRE',
    facility_address: 'GST Road, Maduranthakam, Chengalpattu District',
    district: 'Chengalpattu',
    latitude: 12.5085,
    longitude: 79.8837,
    languages: ['ta', 'en'],
    opd_timings: '09:30 AM - 03:00 PM',
    opd_room: 'Pediatric OPD-3 (Child Wellness Wing)',
    available_today: true,
    is_demo: true,
    verification_status: 'DEMO_UNVERIFIED',
    bio: 'Demonstration profile: Child health specialist focusing on pediatric infection triage, immunization, infant nutrition, and newborn care in rural Chengalpattu. Unverified demo data for prototype evaluation.',
  },
  {
    id: 3,
    doctor_id: 'DOC-10103',
    name: 'Dr. K. Senthil Nathan',
    specialization: 'Orthopedics',
    qualification: 'MBBS, MS (Orthopedic Surgery, Demo Profile)',
    experience_years: 15,
    facility_id: 3,
    facility_name: 'District Headquarters Hospital Kanchipuram',
    facility_type: 'DISTRICT_HOSPITAL',
    facility_address: 'Railway Station Road, Kanchipuram',
    district: 'Kanchipuram',
    latitude: 12.8342,
    longitude: 79.7036,
    languages: ['ta', 'en'],
    opd_timings: '10:00 AM - 04:00 PM',
    opd_room: 'Specialty OPD-2 (Trauma & Bones)',
    available_today: true,
    is_demo: true,
    verification_status: 'DEMO_UNVERIFIED',
    bio: 'Demonstration profile: Consultant orthopedic surgeon providing trauma evaluation, rural agricultural fracture management, and joint pain care across Kanchipuram. Unverified demo data for prototype evaluation.',
  },
  {
    id: 4,
    doctor_id: 'DOC-10104',
    name: 'Dr. Deepa Chandran',
    specialization: 'Obstetrics & Gynecology',
    qualification: 'MBBS, DGO (Demo Profile)',
    experience_years: 10,
    facility_id: 9,
    facility_name: 'Government Headquarters Hospital Tiruvallur',
    facility_type: 'DISTRICT_HOSPITAL',
    facility_address: 'JN Road, Tiruvallur',
    district: 'Tiruvallur',
    latitude: 13.1438,
    longitude: 79.9079,
    languages: ['ta', 'en'],
    opd_timings: '09:00 AM - 02:00 PM',
    opd_room: 'Women & Child Health Wing Room 1',
    available_today: true,
    is_demo: true,
    verification_status: 'DEMO_UNVERIFIED',
    bio: 'Demonstration profile: Maternal healthcare specialist supervising high-risk antenatal screening and institutional women care in Tiruvallur district. Unverified demo data for prototype evaluation.',
  },
  {
    id: 5,
    doctor_id: 'DOC-10105',
    name: 'Dr. Priya Ramanathan',
    specialization: 'General Medicine',
    qualification: 'MBBS (Demo Profile)',
    experience_years: 7,
    facility_id: 5,
    facility_name: 'Rajiv Gandhi Government General Hospital Chennai',
    facility_type: 'DISTRICT_HOSPITAL',
    facility_address: 'EVR Periyar Salai, Park Town, Chennai',
    district: 'Chennai',
    latitude: 13.0805,
    longitude: 80.2785,
    languages: ['ta', 'en'],
    opd_timings: '08:30 AM - 02:00 PM',
    opd_room: 'OPD-5 (General Outpatient Wing)',
    available_today: true,
    is_demo: true,
    verification_status: 'DEMO_UNVERIFIED',
    bio: 'Demonstration profile: Medical Officer managing outpatient consultation, acute respiratory infection screening, and non-communicable disease monitoring in Chennai. Unverified demo data for prototype evaluation.',
  },
  {
    id: 6,
    doctor_id: 'DOC-10106',
    name: 'Dr. J. Murugesan',
    specialization: 'Orthopedics',
    qualification: 'MBBS, D.Ortho (Demo Profile)',
    experience_years: 11,
    facility_id: 6,
    facility_name: 'Government Rajaji Hospital Madurai',
    facility_type: 'DISTRICT_HOSPITAL',
    facility_address: 'Panagal Road, Goripalayam, Madurai',
    district: 'Madurai',
    latitude: 9.9252,
    longitude: 78.1198,
    languages: ['ta', 'en'],
    opd_timings: '10:00 AM - 03:30 PM',
    opd_room: 'Trauma & Bone Clinic Room 4',
    available_today: true,
    is_demo: true,
    verification_status: 'DEMO_UNVERIFIED',
    bio: 'Demonstration profile: Orthopedic consultant handling rural injury triage, joint inflammation, and occupational bone disorders in southern Tamil Nadu. Unverified demo data for prototype evaluation.',
  },
  {
    id: 7,
    doctor_id: 'DOC-10107',
    name: 'Dr. Divya Subramanian',
    specialization: 'Dermatology',
    qualification: 'MBBS, MD (Dermatology, Demo Profile)',
    experience_years: 9,
    facility_id: 7,
    facility_name: 'Coimbatore Medical College Hospital',
    facility_type: 'DISTRICT_HOSPITAL',
    facility_address: 'Trichy Road, Coimbatore',
    district: 'Coimbatore',
    latitude: 11.0025,
    longitude: 76.9665,
    languages: ['ta', 'en'],
    opd_timings: '09:00 AM - 02:00 PM',
    opd_room: 'Skin & Allergy OPD-3',
    available_today: true,
    is_demo: true,
    verification_status: 'DEMO_UNVERIFIED',
    bio: 'Demonstration profile: Consultant dermatologist treating contact dermatitis, agricultural fungal allergies, and chronic skin conditions in Western Tamil Nadu. Unverified demo data for prototype evaluation.',
  },
  {
    id: 8,
    doctor_id: 'DOC-10108',
    name: 'Dr. V. Saravanan',
    specialization: 'General Medicine',
    qualification: 'MBBS, MD (General Medicine, Demo Profile)',
    experience_years: 13,
    facility_id: 8,
    facility_name: 'Mahatma Gandhi Memorial Government Hospital Tiruchirappalli',
    facility_type: 'DISTRICT_HOSPITAL',
    facility_address: 'Collector Office Road, Tiruchirappalli',
    district: 'Tiruchirappalli',
    latitude: 10.8158,
    longitude: 78.6948,
    languages: ['ta', 'en'],
    opd_timings: '09:00 AM - 03:00 PM',
    opd_room: 'OPD-2 (Internal Medicine Clinic)',
    available_today: true,
    is_demo: true,
    verification_status: 'DEMO_UNVERIFIED',
    bio: 'Demonstration profile: Senior physician delivering diabetic care, hypertension management, and seasonal viral triage for the central Tamil Nadu Cauvery delta region. Unverified demo data for prototype evaluation.',
  },
  {
    id: 9,
    doctor_id: 'DOC-10109',
    name: 'Dr. Meenakshi Sundaram',
    specialization: 'Obstetrics & Gynecology',
    qualification: 'MBBS, DGO, MS (OB/GYN, Demo Profile)',
    experience_years: 14,
    facility_id: 2,
    facility_name: 'CHC Maduranthakam',
    facility_type: 'COMMUNITY_HEALTH_CENTRE',
    facility_address: 'GST Road, Maduranthakam, Chengalpattu District',
    district: 'Chengalpattu',
    latitude: 12.5085,
    longitude: 79.8837,
    languages: ['ta', 'en'],
    opd_timings: '09:00 AM - 02:30 PM',
    opd_room: 'Maternal Health Wing - Room 2',
    available_today: true,
    is_demo: true,
    verification_status: 'DEMO_UNVERIFIED',
    bio: 'Demonstration profile: Senior consultant obstetrician managing antenatal screening, institutional delivery triage, and maternal health counseling in Chengalpattu district. Unverified demo data for prototype evaluation.',
  },
  {
    id: 10,
    doctor_id: 'DOC-10110',
    name: 'Dr. S. Anbarasan',
    specialization: 'Pediatrics',
    qualification: 'MBBS, MD (Pediatrics, Demo Profile)',
    experience_years: 11,
    facility_id: 3,
    facility_name: 'District Headquarters Hospital Kanchipuram',
    facility_type: 'DISTRICT_HOSPITAL',
    facility_address: 'Railway Station Road, Kanchipuram',
    district: 'Kanchipuram',
    latitude: 12.8342,
    longitude: 79.7036,
    languages: ['ta', 'en'],
    opd_timings: '10:00 AM - 04:00 PM',
    opd_room: 'Pediatric Specialty OPD-1',
    available_today: true,
    is_demo: true,
    verification_status: 'DEMO_UNVERIFIED',
    bio: 'Demonstration profile: Pediatric specialist handling child immunization, nutritional rehab, neonatal stabilization, and seasonal infection management across Kanchipuram district. Unverified demo data for prototype evaluation.',
  },
  {
    id: 11,
    doctor_id: 'DOC-10111',
    name: 'Dr. Priya Natarajan',
    specialization: 'General Medicine',
    qualification: 'MBBS (Demo Profile)',
    experience_years: 8,
    facility_id: 4,
    facility_name: 'Mobile Medical Unit Chengalpattu',
    facility_type: 'MOBILE_CLINIC',
    facility_address: 'Chengalpattu Coastal & Tribal Outreach Routes',
    district: 'Chengalpattu',
    latitude: 12.6920,
    longitude: 79.9800,
    languages: ['ta', 'en'],
    opd_timings: '08:30 AM - 03:30 PM',
    opd_room: 'Mobile Health Unit Consultation Bay',
    available_today: true,
    is_demo: true,
    verification_status: 'DEMO_UNVERIFIED',
    bio: 'Demonstration profile: Outreach medical officer delivering doorstep primary consultations, NCD monitoring, and fever triage for coastal and tribal hamlets. Unverified demo data for prototype evaluation.',
  },
]

export const SPECIALIZATION_FILTERS = [
  { id: 'all', key: 'all' },
  { id: 'General Medicine', key: 'generalMedicine' },
  { id: 'Pediatrics', key: 'pediatrics' },
  { id: 'Obstetrics & Gynecology', key: 'obgyn' },
  { id: 'Orthopedics', key: 'orthopedics' },
  { id: 'Dermatology', key: 'dermatology' },
  { id: 'Community Medicine', key: 'communityMedicine' },
]

export function filterDoctorsOffline(doctorsOrOptions = DOCTORS_DATA, maybeOptions = {}) {
  const doctors = Array.isArray(doctorsOrOptions) ? doctorsOrOptions : DOCTORS_DATA
  const options = Array.isArray(doctorsOrOptions) ? (maybeOptions || {}) : (doctorsOrOptions || {})
  const { specialization, facilityId, district } = options
  const search = options.search || options.query
  const availableToday = options.availableToday ?? options.onlyAvailableToday

  let list = [...doctors]

  if (facilityId) {
    list = list.filter((d) => d.facility_id === Number(facilityId))
  }

  if (district && district.trim()) {
    const distLower = district.trim().toLowerCase()
    list = list.filter((d) => (d.district || '').toLowerCase().includes(distLower))
  }

  if (specialization && specialization !== 'all') {
    const specLower = specialization.toLowerCase()
    list = list.filter((d) => (d.specialization || '').toLowerCase().includes(specLower))
  }

  if (availableToday === true) {
    list = list.filter((d) => d.available_today === true)
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase()
    list = list.filter((d) =>
      (d.name || '').toLowerCase().includes(q) ||
      (d.specialization || '').toLowerCase().includes(q) ||
      (d.facility_name || '').toLowerCase().includes(q) ||
      (d.district || '').toLowerCase().includes(q) ||
      (d.qualification || '').toLowerCase().includes(q) ||
      (d.opd_room || '').toLowerCase().includes(q) ||
      (d.languages || []).some((lang) => lang.toLowerCase().includes(q))
    )
  }

  return list
}

export default DOCTORS_DATA
