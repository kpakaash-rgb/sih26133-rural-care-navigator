import React, { useState } from 'react';
import { 
  ArrowLeft, Asterisk, Sparkles, Plus, X, 
  LayoutDashboard, Users, CalendarDays, UserCircle, BriefcaseMedical
} from 'lucide-react';
import './index.css';

export default function Consultation({ navigate, onLogout }) {
  const [symptoms, setSymptoms] = useState(['Fever', 'Fatigue', 'Headache']);

  const removeSymptom = (symptom) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
  };

  return (
    <div className="app-container pb-24 bg-gray-50">
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
        <div className="header-actions">
          <Asterisk size={24} className="text-red-600" />
        </div>
      </header>

      <div className="p-4 w-full flex flex-col gap-4">
        {/* Patient Profile Card (Compact) */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 text-primary-blue rounded-full flex items-center justify-center font-bold text-lg shrink-0">
            AK
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-0.5">
              <h2 className="font-bold text-gray-900 text-base">Arun Kumar</h2>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">In Consultation</span>
            </div>
            <p className="text-xs text-gray-500">Patient #P1024 • Age 38 • General Consultation</p>
          </div>
        </div>

        {/* AI Support Card */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-2 shadow-sm relative overflow-hidden">
          <div className="absolute right--2 bottom--4 opacity-10">
             <Sparkles size={80} />
          </div>
          <div className="flex items-center gap-2 text-primary-blue relative z-10">
            <Sparkles size={20} />
            <h3 className="font-bold">AI-assisted triage support</h3>
          </div>
          <p className="text-xs text-gray-500 italic relative z-10">Decision support only. Clinical decisions remain with the healthcare professional.</p>
        </div>

        {/* Clinical Documentation Sections */}
        
        {/* Chief Complaint */}
        <div className="form-section">
          <label className="section-label">Chief Complaint</label>
          <textarea 
            className="form-textarea" 
            placeholder="Enter patient's main concern..."
            rows={2}
          ></textarea>
        </div>

        {/* Symptoms */}
        <div className="form-section">
          <label className="section-label">Symptoms</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {symptoms.map(symptom => (
              <div key={symptom} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium border border-gray-200">
                {symptom}
                <button onClick={() => removeSymptom(symptom)} className="text-gray-400 hover:text-gray-600 rounded-full">
                  <X size={14} />
                </button>
              </div>
            ))}
            <button className="flex items-center gap-1 bg-white text-primary-blue border border-dashed border-primary-blue px-3 py-1.5 rounded-full text-sm font-medium hover-bg-gray-100">
              <Plus size={16} /> Add
            </button>
          </div>
          <textarea 
            className="form-textarea" 
            placeholder="Additional symptom details..."
            rows={2}
          ></textarea>
        </div>

        {/* Vitals */}
        <div className="form-section">
          <label className="section-label">Vitals</label>
          <div className="vitals-grid">
            <div className="vital-card">
              <span className="vital-label">BP</span>
              <div className="vital-value">120/80 <span className="vital-unit">mmHg</span></div>
            </div>
            <div className="vital-card">
              <span className="vital-label">HR</span>
              <div className="vital-value">82 <span className="vital-unit">bpm</span></div>
            </div>
            <div className="vital-card">
              <span className="vital-label">Temp</span>
              <div className="vital-value">38.1 <span className="vital-unit">°C</span></div>
            </div>
            <div className="vital-card">
              <span className="vital-label">SpO₂</span>
              <div className="vital-value">98 <span className="vital-unit">%</span></div>
            </div>
            <div className="vital-card col-span-2">
              <span className="vital-label">Weight</span>
              <div className="vital-value">68 <span className="vital-unit">kg</span></div>
            </div>
          </div>
        </div>

        {/* Medical History */}
        <div className="form-section">
          <label className="section-label">Medical History</label>
          <textarea 
            className="form-textarea" 
            placeholder="Add relevant medical history..."
            rows={2}
          ></textarea>
        </div>

        {/* Doctor Notes */}
        <div className="form-section">
          <label className="section-label">Doctor Notes</label>
          <textarea 
            className="form-textarea" 
            placeholder="Document clinical observations and notes..."
            rows={4}
          ></textarea>
        </div>

        {/* Assessment */}
        <div className="form-section">
          <label className="section-label">Assessment</label>
          <textarea 
            className="form-textarea" 
            placeholder="Enter clinical assessment..."
            rows={3}
          ></textarea>
        </div>

        {/* Plan */}
        <div className="form-section">
          <label className="section-label">Plan</label>
          <textarea 
            className="form-textarea" 
            placeholder="Document care plan, follow-up, or next steps..."
            rows={3}
          ></textarea>
        </div>

        {/* Actions Area */}
        <div className="flex flex-col gap-3 mt-4 mb-8">
          <button className="btn-outline text-gray-700 py-3" onClick={() => navigate('create_referral')}>
             Create Referral
          </button>
          <button className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded-xl text-sm hover-bg-gray-300 transition-colors">
             Save Consultation
          </button>
          <button className="btn-primary py-3" onClick={() => { alert('Consultation marked as complete.'); navigate('dashboard'); }}>
             Mark Consultation Complete
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
