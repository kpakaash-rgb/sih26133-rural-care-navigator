import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Phone, Video, Send, 
  ChevronDown, ChevronUp, Activity, FileText, 
  CalendarDays, 
  LayoutDashboard, Users, UserCircle, BriefcaseMedical,
  Clock, ShieldAlert, Sparkles, RefreshCw
} from 'lucide-react';
import { getDoctorPatientClinicalSummary } from '../../services/api';

const ExpandableCard = ({ title, icon: Icon, children, defaultExpanded = false, alert = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className={`expandable-card ${alert ? 'alert-card' : ''}`}>
      <div 
        className="expandable-header" 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {Icon && <Icon size={18} className={alert ? "text-red-500" : "text-primary-blue"} />}
          <h3 className={`font-bold ${alert ? 'text-red-700' : 'text-gray-900'}`}>{title}</h3>
        </div>
        {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </div>
      {expanded && (
        <div className="expandable-content">
          {children}
        </div>
      )}
    </div>
  );
};

export default function PatientDetails({ 
  navigate, 
  _onLogout, 
  patientId, 
  appointmentId, 
  startConsultation, 
  startReferral 
}) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // If patientId not explicitly passed, fallback to 1 for demo
  const activeId = patientId || 1;

  const refreshSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDoctorPatientClinicalSummary(activeId);
      setSummary(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load patient clinical summary:', err);
      setError('Unable to load patient clinical summary. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const data = await getDoctorPatientClinicalSummary(activeId);
        if (!ignore) {
          setSummary(data);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load patient clinical summary:', err);
          setError('Unable to load patient clinical summary. Please try again.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => { ignore = true; };
  }, [activeId]);

  const patient = summary?.patient;
  const screening = summary?.screening;
  const aiTriage = summary?.ai_triage;
  const history = summary?.history;
  const voiceEncounter = summary?.voice_encounter;

  return (
    <div className="app-container pb-24 bg-gray-50">
      {/* Header */}
      <header className="global-header">
        <div className="header-left">
          <button 
            onClick={() => navigate('patients')} 
            className="text-gray-500 hover:text-gray-900"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeft size={24} />
          </button>
          <div className="header-brand">
            <BriefcaseMedical size={20} strokeWidth={2.5} />
            <span>Rural Care Navigator</span>
          </div>
        </div>
        <div className="header-actions">
          <button 
            onClick={refreshSummary} 
            title="Refresh record"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {error && (
        <div style={{
          background: '#fee2e2', color: '#b91c1c', padding: '0.75rem 1rem',
          margin: '1rem', borderRadius: '12px', fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Clock size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <p style={{ fontWeight: '600' }}>Loading patient clinical record...</p>
        </div>
      ) : (
        <div className="p-4 w-full flex flex-col gap-4">
          {/* Patient Demographics Profile Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 text-primary-blue rounded-full flex items-center justify-center font-bold text-2xl shrink-0">
              {patient?.name?.slice(0, 2).toUpperCase() || 'PT'}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h2 className="font-bold text-xl text-gray-900">{patient?.name || 'Patient'}</h2>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-md">
                  {patient?.age ? `${patient.age} yr` : 'Age N/A'} • {patient?.gender || 'N/A'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-1">
                {patient?.patient_code || `Patient #${patient?.id}`} • {patient?.village || 'Solapur Rural'}
              </p>
              {patient?.mobile && (
                <p className="text-sm text-gray-700 flex items-center gap-1.5 font-medium">
                  <Phone size={14} className="text-gray-400" /> +91 {patient.mobile}
                </p>
              )}
              {patient?.abha_number && (
                <p className="text-xs text-gray-500 mt-0.5">
                  ABHA: <strong>{patient.abha_number}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Primary Doctor Actions */}
          <div className="flex flex-col gap-2 mt-1 mb-1">
            <button 
              className="btn-primary" 
              onClick={() => startConsultation ? startConsultation(activeId, appointmentId) : navigate('consultation')}
              style={{ marginTop: 0 }}
            >
              <Video size={18} /> Start Consultation
            </button>
            <button 
              className="btn-outline" 
              onClick={() => startReferral ? startReferral(activeId, appointmentId) : navigate('create_referral')}
            >
              <Send size={18} /> Create Referral
            </button>
          </div>

          {/* Voice / AI Intake Card */}
          {voiceEncounter && (
            <div style={{
              background: voiceEncounter.is_emergency ? '#fef2f2' : '#f8fafc',
              border: `1.5px solid ${voiceEncounter.is_emergency ? '#f87171' : '#cbd5e1'}`,
              borderRadius: '16px',
              padding: '1.1rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={18} color={voiceEncounter.is_emergency ? '#dc2626' : '#2563eb'} />
                  <h3 style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a', margin: 0 }}>
                    Voice / AI Intake
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    padding: '3px 9px',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    background: voiceEncounter.is_emergency ? '#dc2626' : voiceEncounter.triage_urgency === 'urgent' ? '#ea580c' : voiceEncounter.triage_urgency === 'needs_attention' ? '#d97706' : '#16a34a',
                    color: '#fff'
                  }}>
                    {voiceEncounter.triage_urgency || 'ROUTINE'}
                  </span>
                </div>
              </div>

              {/* Clinical AI Disclaimer */}
              <div style={{
                fontSize: '0.73rem',
                fontWeight: '600',
                color: '#b45309',
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                padding: '4px 8px',
                borderRadius: '6px',
                marginBottom: '0.6rem'
              }}>
                ⚠️ AI-assisted intake — clinical assessment required.
              </div>

              {/* Patient Identity & Locality */}
              <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.4rem', lineHeight: 1.5, background: '#fff', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <strong>Patient:</strong> {voiceEncounter.patient_name || patient.name || 'Anonymous Caller'}
                  {voiceEncounter.age ? ` (${voiceEncounter.age} yrs` : ''}
                  {voiceEncounter.gender ? `, ${voiceEncounter.gender})` : voiceEncounter.age ? ')' : ''}
                  {voiceEncounter.locality ? ` • Locality: ${voiceEncounter.locality}` : ''}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  <strong>Caller Phone:</strong> {voiceEncounter.caller_phone || voiceEncounter.phone_number || 'Direct Voice Stream'}
                  {voiceEncounter.language ? ` • Language: ${voiceEncounter.language === 'hi' ? 'Hindi (hi-IN)' : 'English (en-IN)'}` : ''}
                  {voiceEncounter.created_at ? ` • Time: ${new Date(voiceEncounter.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </div>
              </div>

              {/* Symptoms, Duration & Severity */}
              <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.35rem', lineHeight: 1.45 }}>
                <strong>Reported Symptoms:</strong> {voiceEncounter.symptoms && voiceEncounter.symptoms.length > 0 ? voiceEncounter.symptoms.join(', ') : 'Reported verbally'}
                {voiceEncounter.symptom_duration ? ` • Duration: ${voiceEncounter.symptom_duration}` : ''}
                {voiceEncounter.severity ? ` • Severity: ${voiceEncounter.severity}` : ''}
              </div>

              {/* Additional Clinical Notes */}
              {voiceEncounter.additional_notes && (
                <div style={{ fontSize: '0.83rem', color: '#475569', marginBottom: '0.35rem', lineHeight: 1.4 }}>
                  <strong>Notes & History:</strong> {voiceEncounter.additional_notes}
                </div>
              )}

              {/* Triage Decision Support & Care Level */}
              <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.35rem', lineHeight: 1.4 }}>
                <strong>Triage Assessment:</strong> {voiceEncounter.triage_reason || 'Preliminary assessment completed'}
                {voiceEncounter.recommended_care_level ? ` • Care Level: ${voiceEncounter.recommended_care_level}` : ''}
              </div>

              {/* Assigned Facility & Booking Modality */}
              <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.35rem', lineHeight: 1.4 }}>
                <strong>Assigned Facility:</strong> {voiceEncounter.recommended_facility_name || voiceEncounter.facility_name || 'Nearest Health Centre'}
                {voiceEncounter.appointment_type ? ` • Modality: ${voiceEncounter.appointment_type}` : ''}
              </div>

              {voiceEncounter.appointment_id && (
                <div style={{ fontSize: '0.85rem', color: '#1d4ed8', fontWeight: '700', marginBottom: '0.35rem', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px' }}>
                  ✓ Voice-Booked Appointment #{voiceEncounter.appointment_id} ({voiceEncounter.appointment_type || 'TELECONSULTATION'})
                </div>
              )}

              {voiceEncounter.transcript_summary && (
                <div style={{ fontSize: '0.8rem', color: '#475569', background: 'rgba(255,255,255,0.95)', padding: '0.55rem', borderRadius: '8px', marginTop: '0.4rem', border: '1px solid #e2e8f0' }}>
                  <strong>Call Summary:</strong> {voiceEncounter.transcript_summary}
                </div>
              )}
            </div>
          )}

          {/* AI-Assisted Triage Decision Support */}
          {aiTriage && (
            <div style={{
              background: aiTriage.emergency ? '#fef2f2' : aiTriage.urgency === 'needs_attention' ? '#fffbeb' : '#f0fdf4',
              border: `1.5px solid ${aiTriage.emergency ? '#f87171' : aiTriage.urgency === 'needs_attention' ? '#fcd34d' : '#86efac'}`,
              borderRadius: '16px',
              padding: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} color={aiTriage.emergency ? '#dc2626' : '#2563eb'} />
                  <h3 style={{ fontWeight: '800', fontSize: '0.95rem', color: '#1e293b' }}>
                    AI-Assisted Triage Support
                  </h3>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  background: aiTriage.emergency ? '#dc2626' : aiTriage.urgency === 'needs_attention' ? '#d97706' : '#16a34a',
                  color: '#fff'
                }}>
                  {aiTriage.urgency}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                <strong>Recommended Care:</strong> {aiTriage.recommended_care}
              </div>

              {aiTriage.reason && (
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  <strong>Trigger Factor:</strong> {aiTriage.reason}
                </p>
              )}

              {/* Mandatory Clinical Disclaimer */}
              <div style={{
                background: 'rgba(255,255,255,0.7)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                color: '#64748b',
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                borderLeft: '3px solid var(--primary-blue)'
              }}>
                <ShieldAlert size={14} style={{ flexShrink: 0, color: 'var(--primary-blue)' }} />
                <span>{aiTriage.disclaimer}</span>
              </div>
            </div>
          )}

          {/* Worker Screening Vitals & Symptoms */}
          <ExpandableCard title="Frontline Worker Screening Vitals" icon={Activity} defaultExpanded={true}>
            {screening ? (
              <div>
                <div className="vitals-grid" style={{ marginBottom: '0.75rem' }}>
                  <div className="vital-card">
                    <span className="vital-label">BP</span>
                    <div className="vital-value">
                      {screening.blood_pressure || (screening.systolic_bp ? `${screening.systolic_bp}/${screening.diastolic_bp}` : 'N/A')}
                      <span className="vital-unit">mmHg</span>
                    </div>
                  </div>
                  <div className="vital-card">
                    <span className="vital-label">HR</span>
                    <div className="vital-value">
                      {screening.heart_rate || 'N/A'} <span className="vital-unit">bpm</span>
                    </div>
                  </div>
                  <div className="vital-card">
                    <span className="vital-label">Temp</span>
                    <div className="vital-value">
                      {screening.temperature ? `${screening.temperature}°` : 'N/A'} <span className="vital-unit">C</span>
                    </div>
                  </div>
                  <div className="vital-card">
                    <span className="vital-label">SpO₂</span>
                    <div className="vital-value">
                      {screening.spo2 ? `${screening.spo2}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '700', color: '#334155' }}>Reported Symptoms: </span>
                  {screening.symptoms && screening.symptoms.length > 0 ? (
                    <span style={{ color: '#0f172a' }}>{screening.symptoms.join(', ')}</span>
                  ) : (
                    <span style={{ color: '#64748b', fontStyle: 'italic' }}>None specified</span>
                  )}
                </div>

                {screening.notes && (
                  <div style={{ fontSize: '0.8rem', color: '#475569', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
                    <strong>Worker Notes:</strong> {screening.notes}
                  </div>
                )}

                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.5rem', textAlign: 'right' }}>
                  Screened by {screening.worker_id || 'ASHA Worker'} • {screening.screened_at ? new Date(screening.screened_at).toLocaleDateString() : 'Recent'}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No frontline field screening recorded for this patient.</p>
            )}
          </ExpandableCard>

          {/* Past Consultations */}
          <ExpandableCard title="Previous Doctor Consultations" icon={FileText} defaultExpanded={true}>
            {history?.consultations && history.consultations.length > 0 ? (
              <div className="space-y-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {history.consultations.map((c) => (
                  <div key={c.id} style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                    padding: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0f172a' }}>
                        {c.assessment || 'Consultation Record'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recorded'}
                      </span>
                    </div>
                    {c.notes && <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Notes: {c.notes}</p>}
                    {c.prescription && (
                      <p style={{ fontSize: '0.8rem', color: '#1e40af', background: '#eff6ff', padding: '0.25rem 0.5rem', borderRadius: '6px' }}>
                        Rx: {c.prescription}
                      </p>
                    )}
                    {c.follow_up_date && (
                      <p style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
                        Follow-up scheduled: {c.follow_up_date}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No previous consultation history on record.</p>
            )}
          </ExpandableCard>

          {/* Appointments & Referrals History */}
          <ExpandableCard title="Appointments & Care Referrals" icon={CalendarDays}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Appointments ({history?.appointments?.length || 0})
                </h4>
                {history?.appointments && history.appointments.length > 0 ? (
                  history.appointments.map((a) => (
                    <div key={a.id} style={{ fontSize: '0.8rem', color: '#334155', padding: '0.25rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      • {a.date} ({a.time}) — {a.service_name || 'General Medicine'} [{a.status}]
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No past appointments</p>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Referrals ({history?.referrals?.length || 0})
                </h4>
                {history?.referrals && history.referrals.length > 0 ? (
                  history.referrals.map((r) => (
                    <div key={r.id} style={{ fontSize: '0.8rem', color: '#334155', padding: '0.25rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      • {r.to_facility}: {r.reason} ({r.priority} - {r.status})
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No referral records</p>
                )}
              </div>
            </div>
          </ExpandableCard>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('dashboard'); }}>
          <LayoutDashboard size={24} />
          <span className="nav-label">Dashboard</span>
        </a>
        <a href="#" className="nav-item active" onClick={(e) => { e.preventDefault(); navigate('patients'); }}>
          <Users size={24} />
          <span className="nav-label">Patients</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('appointments'); }}>
          <CalendarDays size={24} />
          <span className="nav-label">Appointments</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate?.('profile'); }}>
          <UserCircle size={24} />
          <span className="nav-label">Profile</span>
        </a>
      </nav>
    </div>
  );
}
