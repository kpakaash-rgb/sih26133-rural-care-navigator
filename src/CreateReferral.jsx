import React, { useState } from 'react';
import { 
  ArrowLeft, PlusSquare, Send, CheckCircle2,
  AlertTriangle, Eye, X,
  BriefcaseMedical, LayoutDashboard, Users, CalendarDays, UserCircle
} from 'lucide-react';
import './index.css';

export default function CreateReferral({ navigate }) {
  const [isCreated, setIsCreated] = useState(false);
  const [priority, setPriority] = useState('Routine');
  const [destination, setDestination] = useState('');

  const handleCreate = () => {
    if (!destination) {
      alert("Please select a destination facility.");
      return;
    }
    setIsCreated(true);
  };

  if (isCreated) {
    return (
      <div className="app-container bg-gray-50 flex flex-col justify-center min-h-screen p-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden max-w-sm mx-auto w-full">
          <button onClick={() => navigate('patient_details')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
          
          <div className="w-16 h-16 bg-blue-100 text-primary-blue rounded-full flex items-center justify-center mb-4 mt-2">
            <CheckCircle2 size={36} strokeWidth={2.5} />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-6">Referral Created</h2>
          
          <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100 text-left mb-6">
            <h3 className="font-bold text-gray-900 mb-4">Referral Details</h3>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed">
              <span className="text-sm text-gray-500">Referral ID</span>
              <span className="text-sm font-bold text-gray-900">REF-2026-00482</span>
            </div>
            
            <div className="flex justify-between items-start py-2 border-b border-gray-200 border-dashed gap-4">
              <span className="text-sm text-gray-500 shrink-0 mt-0.5">Destination<br/>Facility</span>
              <span className="text-sm font-medium text-gray-900 text-right">{destination || "District Government Hospital"}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-200 border-dashed">
              <span className="text-sm text-gray-500">Priority</span>
              {priority === 'Emergency' ? (
                 <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded">Emergency</span>
              ) : priority === 'Urgent' ? (
                 <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><AlertTriangle size={12}/> Urgent</span>
              ) : (
                 <span className="bg-blue-50 text-primary-blue text-xs font-bold px-2 py-1 rounded">Routine</span>
              )}
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">Status</span>
              <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">Pending</span>
            </div>
          </div>
          
          <button className="btn-primary w-full py-3 flex justify-center items-center gap-2" onClick={() => navigate('patient_details')}>
             <Eye size={18} /> View Referral
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
          <button onClick={() => navigate('patient_details')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft size={24} />
          </button>
          <div className="header-brand">
            <BriefcaseMedical size={20} strokeWidth={2.5} />
            <span>Rural Care Navigator</span>
          </div>
        </div>
      </header>

      <div className="p-4 w-full flex flex-col gap-5">
        {/* Patient Profile Card (Compact) */}
        <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-blue text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0">
            AK
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900 text-base">Arun Kumar</h2>
            <p className="text-xs text-gray-500">Patient #P1024 • Age 38</p>
          </div>
        </div>

        {/* Form Fields */}
        
        {/* Referral From */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Referral From</label>
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 flex items-center gap-2">
             <PlusSquare size={16} className="text-gray-400" /> Rural Care Health Centre
          </div>
        </div>

        {/* Referral To */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Referral To <span className="text-red-500">*</span></label>
          <select 
            className="form-select border border-gray-300 rounded-lg p-3 text-sm text-gray-900 bg-white"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="" disabled>Select Facility</option>
            <option value="District Government Hospital">District Government Hospital</option>
            <option value="Community Health Centre">Community Health Centre</option>
            <option value="Regional Specialty Hospital">Regional Specialty Hospital</option>
          </select>
        </div>

        {/* Reason for Referral */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reason for Referral <span className="text-red-500">*</span></label>
          <textarea 
            className="form-textarea border border-gray-300 bg-white" 
            placeholder="Enter reason for referral..."
            rows={4}
          ></textarea>
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</label>
          <div className="segmented-control bg-gray-100 p-1 rounded-xl flex">
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${priority === 'Routine' ? 'bg-primary-blue text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
              onClick={() => setPriority('Routine')}
            >
              Routine
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${priority === 'Urgent' ? 'bg-yellow-100 text-yellow-800 shadow' : 'text-gray-600 hover:text-gray-900'}`}
              onClick={() => setPriority('Urgent')}
            >
              Urgent
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${priority === 'Emergency' ? 'bg-red-500 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
              onClick={() => setPriority('Emergency')}
            >
              Emergency
            </button>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Additional Notes</label>
          <textarea 
            className="form-textarea border border-gray-300 bg-white" 
            placeholder="Add any relevant clinical notes, current treatments, etc..."
            rows={3}
          ></textarea>
        </div>

        {/* Actions Area */}
        <div className="mt-4 pb-4">
          <button className="btn-primary w-full py-3.5 flex justify-center items-center gap-2 text-base shadow-sm" onClick={handleCreate}>
             <Send size={18} /> Create Referral
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
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate && navigate('profile'); }}>
          <UserCircle size={24} />
          <span className="nav-label">Profile</span>
        </a>
      </nav>
    </div>
  );
}
