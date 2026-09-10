/**
 * services/api.js
 * ================
 * Shared API client for Rural Care Navigator frontend.
 * Provides a lightweight fetch wrapper for the FastAPI backend (/api/v1).
 *
 * Handles:
 * - JWT Authorization header injection from localStorage key "access_token"
 * - Consistent error unwrapping (Pydantic validation errors, backend messages)
 * - Automatic response data unwrapping
 * - Safe JSON parsing
 */

const API_BASE = '/api/v1';

/**
 * Make an HTTP request to the backend API.
 *
 * @param {string} endpoint - API route relative to /api/v1 (e.g. '/auth/me')
 * @param {RequestInit} [options={}] - Standard fetch options
 * @returns {Promise<any>} The unwrapped response data
 */
export async function apiRequest(endpoint, options = {}) {
  const token =
    localStorage.getItem('staff_token') ||
    localStorage.getItem('worker_token') ||
    localStorage.getItem('access_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr) {
    throw new Error(`Network connection error: Unable to reach backend service (${netErr.message})`);
  }

  let json = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch {
      // Non-parseable JSON fallback
    }
  }

  // Handle non-OK status or explicit backend success: false flag
  if (!response.ok || (json && json.success === false)) {
    const errorMsg =
      json?.data?.errors?.[0]?.message ||
      json?.message ||
      json?.detail ||
      `Request failed with status ${response.status} (${response.statusText})`;

    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = json?.data;
    throw error;
  }

  // Return unwrapped data payload if backend enveloped, else raw json
  if (json && json.data !== undefined) {
    return json.data;
  }

  return json;
}

// ─────────────────────────────────────────────────────────────
// Authentication API Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Request an OTP for patient mobile authentication.
 * @param {string} mobile - 10-digit mobile number
 */
export async function requestOtp(mobile) {
  return apiRequest('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile }),
  });
}

/**
 * Verify submitted OTP and retrieve JWT access token and patient profile.
 * @param {string} mobile - 10-digit mobile number
 * @param {string} otp - 6-digit OTP
 */
export async function verifyOtp(mobile, otp) {
  return apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile, otp }),
  });
}

/**
 * Retrieve authenticated patient profile from protected endpoint.
 */
export async function getMe() {
  return apiRequest('/auth/me');
}

/**
 * Retrieve authenticated patient appointments.
 */
export async function getAppointments() {
  return apiRequest('/appointments');
}

/**
 * Retrieve personalized relevant government healthcare schemes.
 */
export async function getRelevantSchemes() {
  return apiRequest('/schemes/relevant');
}

/**
 * Log out patient and clear stored tokens and profile state.
 */
export function clearPatientSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('patient');
}

// ─────────────────────────────────────────────────────────────
// AI Triage & Care Guidance Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Submit reported symptoms and description for rule-based triage.
 * @param {{ symptoms: string[], description?: string }} payload
 */
export async function triageSymptoms(payload) {
  return apiRequest('/triage', {
    method: 'POST',
    body: JSON.stringify({
      symptoms: payload.symptoms || [],
      description: payload.description || '',
    }),
  });
}

/**
 * Request AI-ranked hospital recommendations based on required services and location.
 * @param {{ required_services?: string[], latitude?: number, longitude?: number, max_results?: number }} payload
 */
export async function recommendHospitals(payload = {}) {
  return apiRequest('/hospital-recommendation', {
    method: 'POST',
    body: JSON.stringify({
      required_services: payload.required_services || [],
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      max_results: payload.max_results || 5,
    }),
  });
}

// ─────────────────────────────────────────────────────────────
// Healthcare Facilities Helpers
// ─────────────────────────────────────────────────────────────

/**
 * List & search healthcare facilities with optional district, type, or location filters.
 * @param {{ district?: string, type?: string, lat?: number, lon?: number }} [params={}]
 */
export async function getFacilities(params = {}) {
  const query = new URLSearchParams();
  if (params.district) query.set('district', params.district);
  if (params.type) query.set('type', params.type);
  if (params.lat != null) query.set('lat', params.lat.toString());
  if (params.lon != null) query.set('lon', params.lon.toString());

  const queryString = query.toString();
  const endpoint = queryString ? `/facilities?${queryString}` : '/facilities';
  return apiRequest(endpoint);
}

/**
 * Get detailed information for a specific healthcare facility.
 * @param {number|string} facilityId
 * @param {{ lat?: number, lon?: number }} [params={}]
 */
export async function getFacilityDetails(facilityId, params = {}) {
  const query = new URLSearchParams();
  if (params.lat != null) query.set('lat', params.lat.toString());
  if (params.lon != null) query.set('lon', params.lon.toString());

  const queryString = query.toString();
  const endpoint = queryString
    ? `/facilities/${facilityId}?${queryString}`
    : `/facilities/${facilityId}`;
  return apiRequest(endpoint);
}

/**
 * Get list of medical services offered at a healthcare facility.
 * @param {number|string} facilityId
 */
export async function getFacilityServices(facilityId) {
  return apiRequest(`/facilities/${facilityId}/services`);
}

/**
 * Get consultation availability slots for a healthcare facility.
 * @param {number|string} facilityId
 * @param {{ service_id?: number|string, date?: string, status?: string }} [params={}]
 */
export async function getFacilityAvailability(facilityId, params = {}) {
  const query = new URLSearchParams();
  if (params.service_id != null) query.set('service_id', params.service_id.toString());
  if (params.date) query.set('date', params.date);
  if (params.status) query.set('status', params.status);

  const queryString = query.toString();
  const endpoint = queryString
    ? `/facilities/${facilityId}/availability?${queryString}`
    : `/facilities/${facilityId}/availability`;
  return apiRequest(endpoint);
}

// ─────────────────────────────────────────────────────────────
// Appointments API Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Book an appointment consultation slot.
 * @param {{ facility_id: number, service_id: number, availability_slot_id: number }} payload
 */
export async function bookAppointment(payload) {
  return apiRequest('/appointments', {
    method: 'POST',
    body: JSON.stringify({
      facility_id: Number(payload.facility_id),
      service_id: Number(payload.service_id),
      availability_slot_id: Number(payload.availability_slot_id),
    }),
  });
}

/**
 * Retrieve details for a specific appointment.
 * @param {number|string} appointmentId
 */
export async function getAppointmentDetails(appointmentId) {
  return apiRequest(`/appointments/${appointmentId}`);
}

/**
 * Cancel an appointment and release its availability slot.
 * @param {number|string} appointmentId
 */
export async function cancelAppointment(appointmentId) {
  return apiRequest(`/appointments/${appointmentId}/cancel`, {
    method: 'POST',
  });
}

// ─────────────────────────────────────────────────────────────
// Referrals API Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Retrieve all referrals belonging to the authenticated patient.
 */
export async function getPatientReferrals() {
  return apiRequest('/referrals');
}

/**
 * Retrieve details for a specific referral.
 * @param {number|string} referralId
 */
export async function getReferralDetails(referralId) {
  return apiRequest(`/referrals/${referralId}`);
}

/**
 * Create a patient referral request.
 * @param {{ to_facility_id: number, reason: string, priority?: string, appointment_id?: number, from_facility_id?: number }} payload
 */
export async function createReferral(payload) {
  return apiRequest('/referrals', {
    method: 'POST',
    body: JSON.stringify({
      to_facility_id: Number(payload.to_facility_id),
      reason: payload.reason,
      priority: payload.priority || 'ROUTINE',
      appointment_id: payload.appointment_id ? Number(payload.appointment_id) : null,
      from_facility_id: payload.from_facility_id ? Number(payload.from_facility_id) : null,
    }),
  });
}

/**
 * Cancel a pending referral for the authenticated patient.
 * @param {number|string} referralId
 */
export async function cancelReferral(referralId) {
  return apiRequest(`/referrals/${referralId}/cancel`, {
    method: 'POST',
  });
}

// ─────────────────────────────────────────────────────────────
// Health Journey API Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Retrieve chronological care timeline events for the authenticated patient.
 * @param {string} [eventType] - Optional event type filter (REGISTRATION, APPOINTMENT, REFERRAL, FOLLOW_UP, CARE_COMPLETED)
 */
export async function getHealthJourney(eventType) {
  const query = eventType ? `?event_type=${encodeURIComponent(eventType)}` : '';
  return apiRequest(`/health-journey${query}`);
}

// ─────────────────────────────────────────────────────────────
// Follow-Ups API Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Retrieve all follow-up consultations for the authenticated patient.
 */
export async function getPatientFollowUps() {
  return apiRequest('/follow-ups');
}

/**
 * Schedule a follow-up consultation linked to an appointment or referral.
 * @param {{ follow_up_date: string, notes?: string, appointment_id?: number, referral_id?: number }} payload
 */
export async function createFollowUp(payload) {
  return apiRequest('/follow-ups', {
    method: 'POST',
    body: JSON.stringify({
      follow_up_date: payload.follow_up_date,
      notes: payload.notes || null,
      appointment_id: payload.appointment_id ? Number(payload.appointment_id) : null,
      referral_id: payload.referral_id ? Number(payload.referral_id) : null,
    }),
  });
}

/**
 * Mark a follow-up checkup as completed.
 * @param {number|string} followUpId
 */
export async function completeFollowUp(followUpId) {
  return apiRequest(`/follow-ups/${followUpId}/complete`, {
    method: 'POST',
  });
}

/**
 * Cancel a pending follow-up consultation.
 * @param {number|string} followUpId
 */
export async function cancelFollowUp(followUpId) {
  return apiRequest(`/follow-ups/${followUpId}/cancel`, {
    method: 'POST',
  });
}

// ─────────────────────────────────────────────────────────────
// Facility Queue API Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Retrieve the current live queue status for a healthcare facility.
 * @param {number|string} facilityId
 */
export async function getFacilityQueue(facilityId) {
  return apiRequest(`/facilities/${facilityId}/queue`);
}

/**
 * Update the queue status, waiting patients, and wait estimations for a facility.
 * @param {number|string} facilityId
 * @param {{ waiting_patients: number, estimated_wait_minutes: number, status: string }} payload
 */
export async function updateFacilityQueue(facilityId, payload) {
  return apiRequest(`/facilities/${facilityId}/queue`, {
    method: 'PUT',
    body: JSON.stringify({
      waiting_patients: Number(payload.waiting_patients),
      estimated_wait_minutes: Number(payload.estimated_wait_minutes),
      status: payload.status || 'NORMAL',
    }),
  });
}

// ─────────────────────────────────────────────────────────────
// Frontline Healthcare Worker API Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Log in a Frontline Healthcare Worker (ASHA / ANM).
 * @param {{ worker_id?: string, mobile?: string, password: string }} payload
 */
export async function loginWorker(payload) {
  const data = await apiRequest('/auth/worker/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (data?.access_token) {
    setWorkerSession(data.worker, data.access_token);
  }
  return data;
}

/**
 * Retrieve authenticated frontline worker profile.
 */
export async function getWorkerMe() {
  return apiRequest('/auth/worker/me');
}

/**
 * Retrieve authenticated doctor profile.
 */
export async function getDoctorMe() {
  return apiRequest('/auth/doctor/me');
}

/**
 * Authenticate healthcare staff member (Doctor or Frontline Worker).
 * @param {{ staff_id: string, password: string }} payload
 */
export async function loginStaff(payload) {
  const data = await apiRequest('/auth/staff/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (data?.access_token) {
    setStaffSession(data.user, data.access_token, data.role);
  }
  return data;
}

/**
 * Save staff profile, role, and token into localStorage.
 */
export function setStaffSession(user, token, role) {
  if (token) localStorage.setItem('staff_token', token);
  if (role) localStorage.setItem('staff_role', role);
  if (user) {
    localStorage.setItem('staff_user', JSON.stringify(user));
    if (role === 'WORKER') {
      localStorage.setItem('worker_token', token);
      localStorage.setItem('worker', JSON.stringify(user));
    }
  }
}

/**
 * Retrieve stored staff details from localStorage.
 */
export function getStaffSession() {
  try {
    const token = localStorage.getItem('staff_token') || localStorage.getItem('worker_token');
    const role = localStorage.getItem('staff_role') || (localStorage.getItem('worker') ? 'WORKER' : null);
    const rawUser = localStorage.getItem('staff_user') || localStorage.getItem('worker');
    const user = rawUser ? JSON.parse(rawUser) : null;
    if (!token || !role) return null;
    return { token, role, user };
  } catch {
    return null;
  }
}

/**
 * Clear stored staff session from localStorage.
 */
export function clearStaffSession() {
  localStorage.removeItem('staff_token');
  localStorage.removeItem('staff_role');
  localStorage.removeItem('staff_user');
  localStorage.removeItem('worker_token');
  localStorage.removeItem('worker');
}

/**
 * Save worker profile and authentication token into localStorage.
 */
export function setWorkerSession(worker, token) {
  if (token) {
    localStorage.setItem('worker_token', token);
    localStorage.setItem('staff_token', token);
  }
  if (worker) {
    localStorage.setItem('worker', JSON.stringify(worker));
    localStorage.setItem('staff_user', JSON.stringify(worker));
    localStorage.setItem('staff_role', 'WORKER');
  }
}

/**
 * Retrieve stored worker details from localStorage.
 */
export function getWorkerSession() {
  try {
    const raw = localStorage.getItem('worker');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.worker ? parsed : { worker: parsed };
  } catch {
    return null;
  }
}

/**
 * Clear stored worker session.
 */
export function clearWorkerSession() {
  clearStaffSession();
}

/**
 * Register a new patient into the rural health network (Worker only).
 * @param {{ full_name: string, mobile: string, age?: number, gender?: string, district?: string, village?: string, abha_number?: string }} payload
 */
export async function registerPatient(payload) {
  return apiRequest('/patients', {
    method: 'POST',
    body: JSON.stringify({
      full_name: payload.full_name,
      mobile: payload.mobile,
      age: payload.age ? Number(payload.age) : null,
      gender: payload.gender || null,
      district: payload.district || null,
      village: payload.village || null,
      abha_number: payload.abha_number || null,
      consent: true,
    }),
  });
}

/**
 * Retrieve patients assigned to the worker's facility.
 * @param {string} [query] - Optional search text
 */
export async function getWorkerPatients(query = '') {
  const qStr = query ? `?q=${encodeURIComponent(query)}` : '';
  return apiRequest(`/patients${qStr}`);
}

/**
 * Retrieve patient profile by database ID.
 * @param {number|string} patientId
 */
export async function getPatientDetailsById(patientId) {
  return apiRequest(`/patients/${patientId}`);
}

/**
 * Record vitals and symptoms screening for a patient.
 * @param {number|string} patientId
 * @param {{ temperature?: number, systolic_bp?: number, diastolic_bp?: number, heart_rate?: number, spo2?: number, symptoms?: string[], notes?: string, triage_level?: string }} payload
 */
export async function savePatientScreening(patientId, payload) {
  return apiRequest(`/patients/${patientId}/screening`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Retrieve latest screening observations for a patient.
 * @param {number|string} patientId
 */
export async function getLatestScreening(patientId) {
  return apiRequest(`/patients/${patientId}/screening/latest`);
}

/**
 * Create a facility referral on behalf of a patient (Worker only).
 * @param {{ patient_id: number, to_facility_id: number, reason: string, priority?: string, appointment_id?: number }} payload
 */
export async function createWorkerReferral(payload) {
  return apiRequest('/referrals', {
    method: 'POST',
    body: JSON.stringify({
      patient_id: Number(payload.patient_id),
      to_facility_id: Number(payload.to_facility_id),
      reason: payload.reason,
      priority: payload.priority || 'ROUTINE',
      appointment_id: payload.appointment_id ? Number(payload.appointment_id) : null,
    }),
  });
}

// ─────────────────────────────────────────────────────────────
// Doctor Clinical Portal API Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Retrieve doctor dashboard metrics and facility stats.
 */
export async function getDoctorDashboard() {
  return apiRequest('/doctor/dashboard');
}

/**
 * Retrieve patients currently queued at the doctor's facility, sorted by urgency.
 */
export async function getDoctorQueue() {
  return apiRequest('/doctor/queue');
}

/**
 * Retrieve comprehensive clinical summary for a patient:
 * Demographics, field worker vitals, AI-assisted triage, and medical history.
 * @param {number|string} patientId
 */
export async function getDoctorPatientClinicalSummary(patientId) {
  return apiRequest(`/doctor/patients/${patientId}/clinical-summary`);
}

/**
 * Submit a doctor consultation record (findings, assessment, advice, prescription, follow-up).
 * @param {{ patient_id: number, appointment_id?: number, notes?: string, assessment?: string, advice?: string, prescription?: string, follow_up_required?: boolean, follow_up_date?: string }} payload
 */
export async function createDoctorConsultation(payload) {
  return apiRequest('/doctor/consultations', {
    method: 'POST',
    body: JSON.stringify({
      patient_id: Number(payload.patient_id),
      appointment_id: payload.appointment_id ? Number(payload.appointment_id) : null,
      notes: payload.notes || null,
      assessment: payload.assessment || null,
      advice: payload.advice || null,
      prescription: payload.prescription || null,
      follow_up_required: Boolean(payload.follow_up_required),
      follow_up_date: payload.follow_up_date || null,
    }),
  });
}

/**
 * Fetch a specific consultation by its database ID.
 * @param {number|string} consultationId
 */
export async function getDoctorConsultationById(consultationId) {
  return apiRequest(`/doctor/consultations/${consultationId}`);
}

/**
 * Fetch all previous consultations for a patient.
 * @param {number|string} patientId
 */
export async function getDoctorPatientConsultations(patientId) {
  return apiRequest(`/doctor/patients/${patientId}/consultations`);
}

/**
 * Create a patient referral from the doctor to another facility.
 * @param {{ patient_id: number, to_facility_id: number, reason: string, priority?: string, appointment_id?: number }} payload
 */
export async function createDoctorReferral(payload) {
  return apiRequest('/doctor/referrals', {
    method: 'POST',
    body: JSON.stringify({
      patient_id: Number(payload.patient_id),
      to_facility_id: Number(payload.to_facility_id),
      reason: payload.reason,
      priority: payload.priority || 'ROUTINE',
      appointment_id: payload.appointment_id ? Number(payload.appointment_id) : null,
    }),
  });
}

/**
 * Retrieve appointments scheduled at the doctor's facility.
 */
export async function getDoctorAppointments() {
  return apiRequest('/doctor/appointments');
}



