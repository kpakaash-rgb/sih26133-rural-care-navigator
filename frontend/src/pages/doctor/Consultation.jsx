import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Asterisk, Sparkles, Plus, X, 
  LayoutDashboard, Users, CalendarDays, UserCircle,
  CheckCircle2, ShieldAlert
} from 'lucide-react';
import { getDoctorPatientClinicalSummary, createDoctorConsultation } from '../../services/api';

export default function Consultation({ 
  navigate, 
  _onLogout, 
  patientId, 
  appointmentId, 
  startReferral 
}) {
  const activePatientId = patientId || 1;
  const [patientSummary, setPatientSummary] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(true);

  // Form states
  const [notes, setNotes] = useState('');
  const [assessment, setAssessment] = useState('');
  const [advice, setAdvice] = useState('');
  const [prescription, setPrescription] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [showAddSymptom, setShowAddSymptom] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await getDoctorPatientClinicalSummary(activePatientId);
        if (isMounted && data) {
          setPatientSummary(data);
          if (data.screening?.symptoms && Array.isArray(data.screening.symptoms)) {
            setSymptoms(data.screening.symptoms);
          }
          // Default follow-up date to 7 days from now
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          setFollowUpDate(nextWeek.toISOString().split('T')[0]);
        }
      } catch (err) {
        console.error('Failed to load patient summary for consultation:', err);
      } finally {
        if (isMounted) setLoadingPatient(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [activePatientId]);

  const removeSymptom = (sym) => {
    setSymptoms(symptoms.filter(s => s !== sym));
  };

  const handleAddSymptom = (e) => {
    e.preventDefault();
    if (newSymptom.trim() && !symptoms.includes(newSymptom.trim())) {
      setSymptoms([...symptoms, newSymptom.trim()]);
      setNewSymptom('');
      setShowAddSymptom(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!assessment.trim() && !notes.trim()) {
      setErrorMsg('Please enter clinical assessment or consultation notes.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        patient_id: Number(activePatientId),
        appointment_id: appointmentId ? Number(appointmentId) : null,
        notes: notes.trim() ? (symptoms.length > 0 ? `[Symptoms: ${symptoms.join(', ')}] ${notes}` : notes) : null,
        assessment: assessment.trim() || 'Clinical evaluation completed',
        advice: advice.trim() || null,
        prescription: prescription.trim() || null,
        follow_up_required: followUpRequired,
        follow_up_date: followUpRequired ? followUpDate : null,
      };

      await createDoctorConsultation(payload);
      setSuccessMsg('Consultation completed successfully! Health journey updated.');

      setTimeout(() => {
        navigate('dashboard');
      }, 1500);
    } catch (err) {
      console.error('Failed to save consultation:', err);
      setErrorMsg(err.message || 'Unable to record consultation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const patient = patientSummary?.patient;
  const screening = patientSummary?.screening;
  const aiTriage = patientSummary?.ai_triage;

  return (
    <div className="app-container pb-24 bg-gray-50">
      {/* Header */}
      <header className="global-header">
        <div className="header-left">
          <button 
            onClick={() => navigate('patient_details')} 
            className="text-gray-500 hover:text-gray-900"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeft size={24} />
          </button>
          <div className="header-brand">
            <img
              src="/mythri-icon.png"
              alt="Mythri"
              width="22"
              height="22"
              style={{ objectFit: 'contain', borderRadius: '4px' }}
            />
            <span>Mythri</span>
          </div>
        </div>
        <div className="header-actions">
          <Asterisk size={24} className="text-red-600" />
        </div>
      </header>

      <div className="p-4 w-full flex flex-col gap-4">
        {/* Status Alerts */}
        {errorMsg && (
          <div style={{
            background: '#fee2e2', color: '#b91c1c', padding: '0.75rem 1rem',
            borderRadius: '12px', fontSize: '0.875rem'
          }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0',
            padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.875rem'
          }}>
            <CheckCircle2 size={20} className="text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Patient Profile Card (Compact) */}
        {loadingPatient ? (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center text-sm text-gray-500">
            Loading patient chart & clinical data...
          </div>
        ) : (
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-primary-blue rounded-full flex items-center justify-center font-bold text-lg shrink-0">
              {patient?.name?.slice(0, 2).toUpperCase() || 'PT'}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-0.5">
                <h2 className="font-bold text-gray-900 text-base">{patient?.name || 'Patient Chart'}</h2>
                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Active Consultation
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {patient?.patient_code || `ID: #${activePatientId}`} • Age {patient?.age || 'N/A'} • {patient?.gender || 'Patient'}
              </p>
            </div>
          </div>
        )}

        {/* AI-Assisted Triage Support Card */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 text-primary-blue">
              <Sparkles size={18} />
              <h3 className="font-bold text-sm">AI-Assisted Triage Support</h3>
            </div>
            {aiTriage?.urgency && (
              <span style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '8px',
                background: aiTriage.emergency ? '#fee2e2' : '#e0e7ff',
                color: aiTriage.emergency ? '#b91c1c' : '#3730a3',
                textTransform: 'uppercase'
              }}>
                {aiTriage.urgency}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-700 relative z-10">
            <strong>Care Guidance:</strong> {aiTriage?.recommended_care || 'Evaluate patient complaints and routine vitals.'}
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '6px',
            padding: '0.35rem 0.6rem',
            fontSize: '0.72rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <ShieldAlert size={13} style={{ flexShrink: 0, color: 'var(--primary-blue)' }} />
            <span>AI-assisted triage. Final clinical decision remains with the healthcare professional.</span>
          </div>
        </div>

        {/* Vitals Summary from Worker */}
        {screening && (
          <div className="form-section">
            <label className="section-label">Field Worker Screening Vitals</label>
            <div className="vitals-grid">
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
                <div className="vital-value">{screening.spo2 ? `${screening.spo2}%` : 'N/A'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Symptoms Tags */}
        <div className="form-section">
          <label className="section-label">Reported Symptoms</label>
          <div className="flex flex-wrap gap-2 mb-2" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {symptoms.map(symptom => (
              <div key={symptom} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium border border-gray-200" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {symptom}
                <button onClick={() => removeSymptom(symptom)} className="text-gray-400 hover:text-gray-600 rounded-full" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <X size={14} />
                </button>
              </div>
            ))}
            {!showAddSymptom ? (
              <button 
                type="button"
                onClick={() => setShowAddSymptom(true)}
                className="flex items-center gap-1 bg-white text-primary-blue border border-dashed border-primary-blue px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                <Plus size={16} /> Add
              </button>
            ) : (
              <form onSubmit={handleAddSymptom} style={{ display: 'flex', gap: '4px' }}>
                <input 
                  type="text" 
                  value={newSymptom} 
                  onChange={(e) => setNewSymptom(e.target.value)}
                  placeholder="New symptom..."
                  autoFocus
                  style={{
                    padding: '4px 8px', borderRadius: '14px', border: '1px solid var(--primary-blue)',
                    fontSize: '0.85rem'
                  }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>Add</button>
                <button type="button" onClick={() => setShowAddSymptom(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
              </form>
            )}
          </div>
        </div>

        {/* Doctor Notes / Observations */}
        <div className="form-section">
          <label className="section-label">Doctor's Clinical Notes</label>
          <textarea 
            className="form-textarea" 
            placeholder="Document examination observations, history of present illness..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          ></textarea>
        </div>

        {/* Clinical Assessment / Diagnosis */}
        <div className="form-section">
          <label className="section-label">Clinical Assessment & Diagnosis *</label>
          <textarea 
            className="form-textarea" 
            placeholder="Provisional or confirmed diagnosis (e.g., Acute Bronchitis, Hypertension Stage 1)..."
            rows={2}
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            required
          ></textarea>
        </div>

        {/* Advice & Lifestyle Plan */}
        <div className="form-section">
          <label className="section-label">Advice & Patient Instructions</label>
          <textarea 
            className="form-textarea" 
            placeholder="Dietary instructions, rest, red flag warning signs..."
            rows={2}
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
          ></textarea>
        </div>

        {/* Prescription & Medications */}
        <div className="form-section">
          <label className="section-label">Prescription & Medication Regimen</label>
          <textarea 
            className="form-textarea" 
            placeholder="Drug name, dosage, frequency, and duration (e.g. Tab Paracetamol 500mg TDS x 3 days)..."
            rows={3}
            value={prescription}
            onChange={(e) => setPrescription(e.target.value)}
          ></textarea>
        </div>

        {/* Follow-Up Scheduling */}
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>
            <input 
              type="checkbox" 
              checked={followUpRequired} 
              onChange={(e) => setFollowUpRequired(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            Schedule Follow-Up Consultation
          </label>

          {followUpRequired && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingTop: '0.25rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Scheduled Follow-Up Date:</span>
              <input 
                type="date" 
                value={followUpDate} 
                onChange={(e) => setFollowUpDate(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                  fontSize: '0.9rem', color: '#1e293b'
                }}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-3 mb-8" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button 
            type="button" 
            className="btn-outline text-gray-700 py-3" 
            onClick={() => startReferral ? startReferral(activePatientId, appointmentId) : navigate('create_referral')}
          >
            Create Facility Referral
          </button>
          
          <button 
            type="button" 
            className="btn-primary py-3" 
            disabled={submitting}
            onClick={handleSubmit}
            style={{ opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Saving Consultation...' : 'Complete Consultation & Save Record'}
          </button>
        </div>
      </div>

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
