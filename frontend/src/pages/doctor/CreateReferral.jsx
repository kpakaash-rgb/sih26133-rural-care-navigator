import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, PlusSquare, Send, CheckCircle2,
  AlertTriangle, Eye, X,
  BriefcaseMedical, LayoutDashboard, Users, CalendarDays, UserCircle
} from 'lucide-react';
import { 
  getFacilities, 
  getDoctorPatientClinicalSummary, 
  createDoctorReferral, 
  getStaffSession 
} from '../../services/api';

export default function CreateReferral({ navigate, patientId, appointmentId }) {
  const activePatientId = patientId || 1;
  const [facilities, setFacilities] = useState([]);
  const [patientData, setPatientData] = useState(null);
  const [destinationId, setDestinationId] = useState('');
  const [reason, setReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [priority, setPriority] = useState('Routine');
  const [isCreated, setIsCreated] = useState(false);
  const [createdReferral, setCreatedReferral] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const session = getStaffSession();
  const sourceFacilityName = session?.user?.facility_name || 'Primary Health Centre';

  const userFacilityId = session?.user?.facility_id || 1;

  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const [facList, patSummary] = await Promise.all([
          getFacilities().catch(() => []),
          getDoctorPatientClinicalSummary(activePatientId).catch(() => null),
        ]);
        if (isMounted) {
          setFacilities(Array.isArray(facList) ? facList : []);
          setPatientData(patSummary?.patient || null);
          // Pre-select first other facility if available
          const otherFacs = (facList || []).filter(f => f.id !== userFacilityId);
          if (otherFacs.length > 0) {
            setDestinationId(String(otherFacs[0].id));
          }
        }
      } catch (err) {
        console.error('Failed to load referral context:', err);
      }
    }
    loadInitialData();
    return () => { isMounted = false; };
  }, [activePatientId, userFacilityId]);

  const handleCreate = async () => {
    if (!destinationId) {
      setErrorMsg('Please select a destination healthcare facility.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Please state the clinical reason for referral.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const fullReason = additionalNotes.trim() ? `${reason.trim()}. Notes: ${additionalNotes.trim()}` : reason.trim();
      const payload = {
        patient_id: Number(activePatientId),
        to_facility_id: Number(destinationId),
        reason: fullReason,
        priority: priority.toUpperCase(),
        appointment_id: appointmentId ? Number(appointmentId) : null,
      };

      const res = await createDoctorReferral(payload);
      setCreatedReferral(res);
      setIsCreated(true);
    } catch (err) {
      console.error('Failed to create referral:', err);
      setErrorMsg(err.message || 'Unable to create referral. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDestinationName = 
    facilities.find(f => String(f.id) === String(destinationId))?.name || 'Specialty Centre';

  if (isCreated) {
    return (
      <div className="app-container bg-gray-50 flex flex-col justify-center min-h-screen p-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden max-w-sm mx-auto w-full">
          <button 
            onClick={() => navigate('patient_details')} 
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
          
          <div className="w-16 h-16 bg-blue-100 text-primary-blue rounded-full flex items-center justify-center mb-4 mt-2">
            <CheckCircle2 size={36} strokeWidth={2.5} />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">Referral Dispatched</h2>
          <p className="text-xs text-gray-500 mb-6">Patient health journey updated with referral event.</p>
          
          <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100 text-left mb-6">
            <h3 className="font-bold text-gray-900 mb-4">Referral Details</h3>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span className="text-sm text-gray-500">Patient</span>
              <span className="text-sm font-bold text-gray-900">{patientData?.name || `Patient #${activePatientId}`}</span>
            </div>
            
            <div className="flex justify-between items-start py-2 border-b border-gray-200 border-dashed gap-4" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span className="text-sm text-gray-500 shrink-0 mt-0.5">Destination Facility</span>
              <span className="text-sm font-medium text-gray-900 text-right">{selectedDestinationName}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span className="text-sm text-gray-500">Priority</span>
              {priority === 'Emergency' ? (
                 <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded">Emergency</span>
              ) : priority === 'Urgent' ? (
                 <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><AlertTriangle size={12}/> Urgent</span>
              ) : (
                 <span className="bg-blue-50 text-primary-blue text-xs font-bold px-2 py-1 rounded">Routine</span>
              )}
            </div>
            
            <div className="flex justify-between items-center py-2" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span className="text-sm text-gray-500">Status</span>
              <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                {createdReferral?.status || 'PENDING'}
              </span>
            </div>
          </div>
          
          <button 
            className="btn-primary w-full py-3 flex justify-center items-center gap-2" 
            onClick={() => navigate('patient_details')}
          >
             <Eye size={18} /> Return to Patient Chart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container pb-24 bg-white min-h-screen">
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
            <BriefcaseMedical size={20} strokeWidth={2.5} />
            <span>Rural Care Navigator</span>
          </div>
        </div>
      </header>

      <div className="p-4 w-full flex flex-col gap-5">
        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: '#fee2e2', color: '#b91c1c', padding: '0.75rem 1rem',
            borderRadius: '12px', fontSize: '0.875rem'
          }}>
            {errorMsg}
          </div>
        )}

        {/* Patient Profile Card (Compact) */}
        <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-blue text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0">
            {patientData?.name?.slice(0, 2).toUpperCase() || 'PT'}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900 text-base">{patientData?.name || `Patient #${activePatientId}`}</h2>
            <p className="text-xs text-gray-500">
              {patientData?.patient_code || `ID: #${activePatientId}`} • Age {patientData?.age || 'N/A'} • {patientData?.village || 'Solapur Rural'}
            </p>
          </div>
        </div>

        {/* Form Fields */}
        
        {/* Referral From */}
        <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Referral Originating Facility</label>
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <PlusSquare size={16} className="text-gray-400" /> {sourceFacilityName}
          </div>
        </div>

        {/* Referral To */}
        <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Destination Healthcare Facility *</label>
          <select 
            className="form-select border border-gray-300 rounded-lg p-3 text-sm text-gray-900 bg-white"
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            <option value="" disabled>Select Target Facility</option>
            {facilities.map((fac) => (
              <option key={fac.id} value={fac.id}>
                {fac.name} ({fac.type?.replace(/_/g, ' ') || 'Facility'}) — {fac.district}
              </option>
            ))}
          </select>
        </div>

        {/* Reason for Referral */}
        <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Clinical Reason for Referral *</label>
          <textarea 
            className="form-textarea border border-gray-300 bg-white" 
            placeholder="Clinical rationale (e.g. requires specialist echocardiography / obstetrics evaluation)..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          ></textarea>
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Referral Urgency</label>
          <div className="segmented-control bg-gray-100 p-1 rounded-xl flex" style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
            <button 
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${priority === 'Routine' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
              style={{
                flex: 1, padding: '0.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer',
                background: priority === 'Routine' ? 'var(--primary-blue)' : 'transparent',
                color: priority === 'Routine' ? '#fff' : '#475569',
                fontWeight: '700'
              }}
              onClick={() => setPriority('Routine')}
            >
              Routine
            </button>
            <button 
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${priority === 'Urgent' ? 'bg-yellow-100 text-yellow-800 shadow' : 'text-gray-600 hover:text-gray-900'}`}
              style={{
                flex: 1, padding: '0.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer',
                background: priority === 'Urgent' ? '#fef3c7' : 'transparent',
                color: priority === 'Urgent' ? '#92400e' : '#475569',
                fontWeight: '700'
              }}
              onClick={() => setPriority('Urgent')}
            >
              Urgent
            </button>
            <button 
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${priority === 'Emergency' ? 'bg-red-500 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
              style={{
                flex: 1, padding: '0.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer',
                background: priority === 'Emergency' ? '#dc2626' : 'transparent',
                color: priority === 'Emergency' ? '#fff' : '#475569',
                fontWeight: '700'
              }}
              onClick={() => setPriority('Emergency')}
            >
              Emergency
            </button>
          </div>
        </div>

        {/* Additional Clinical Notes */}
        <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Accompanying Observations / Regimen</label>
          <textarea 
            className="form-textarea border border-gray-300 bg-white" 
            placeholder="Preliminary medication given, vitals, transport instructions..."
            rows={2}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          ></textarea>
        </div>

        {/* Action Button */}
        <div className="mt-2 pb-4">
          <button 
            type="button"
            className="btn-primary w-full py-3.5 flex justify-center items-center gap-2 text-base shadow-sm"
            disabled={submitting}
            onClick={handleCreate}
            style={{ opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
             <Send size={18} /> {submitting ? 'Creating Referral...' : 'Dispatch Referral'}
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
