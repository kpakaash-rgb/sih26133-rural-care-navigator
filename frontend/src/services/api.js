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
  const token = localStorage.getItem('access_token');

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
