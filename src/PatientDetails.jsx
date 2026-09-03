import React, { useState } from 'react';
import { 
  ArrowLeft, MoreVertical, Phone, Video, Send, 
  ChevronDown, ChevronUp, Activity, FileText, 
  Pill, AlertTriangle, CalendarDays, Share2, 
  LayoutDashboard, Users, UserCircle, BriefcaseMedical
} from 'lucide-react';
import './index.css';

// Expandable Card Component
const ExpandableCard = ({ title, icon: Icon, children, defaultExpanded = false, alert = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className={`expandable-card ${alert ? 'alert-card' : ''}`}>
      <div 
        className="expandable-header" 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
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

export default function PatientDetails({ navigate, onLogout }) {
  return (
    <div className="app-container pb-24 bg-gray-50">
      {/* Header */}
      <header className="global-header">
        <div className="header-left">
          <button onClick={() => navigate('patients')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft size={24} />
          </button>
          <div className="header-brand">
            <BriefcaseMedical size={20} strokeWidth={2.5} />
            <span>Rural Care Navigator</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="text-gray-500 hover:text-gray-900">
            <MoreVertical size={24} />
          </button>
        </div>
      </header>

      <div className="p-4 w-full flex flex-col gap-4">
        {/* Patient Profile Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 text-primary-blue rounded-full flex items-center justify-center font-bold text-2xl shrink-0">
            AK
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h2 className="font-bold text-xl text-gray-900">Arun Kumar</h2>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-md">38 • Male</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">Patient #P1024</p>
            <p className="text-sm text-gray-700 flex items-center gap-1.5 font-medium">
              <Phone size={14} className="text-gray-400" /> +91 98765 43210
            </p>
          </div>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-col gap-2 mt-2 mb-2">
          <button className="btn-primary" onClick={() => navigate('consultation')} style={{marginTop: 0}}>
             <Video size={18} /> Start Consultation
          </button>
          <button className="btn-outline" onClick={() => navigate('create_referral')}>
             <Send size={18} /> Create Referral
          </button>
        </div>

        {/* Health Record Sections */}
        
        <ExpandableCard title="Symptoms" icon={Activity} defaultExpanded={true}>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 marker-primary-blue">
            <li>Fever</li>
            <li>Fatigue</li>
            <li>Mild headache</li>
          </ul>
        </ExpandableCard>

        <ExpandableCard title="Medical History" icon={FileText}>
          <p className="text-sm text-gray-600 italic">No major previous conditions recorded.</p>
        </ExpandableCard>

        <ExpandableCard title="Previous Visits" icon={CalendarDays} defaultExpanded={true}>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <p className="text-xs text-gray-500 font-bold mb-0.5">12 Aug 2026</p>
                <h4 className="text-sm font-bold text-gray-900">General Consultation</h4>
                <p className="text-sm text-gray-600">Follow-up recommended</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot bg-gray-300"></div>
              <div className="timeline-content">
                <p className="text-xs text-gray-500 font-bold mb-0.5">24 Jul 2026</p>
                <h4 className="text-sm font-bold text-gray-900">General Consultation</h4>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </div>
        </ExpandableCard>

        <ExpandableCard title="Current Medications" icon={Pill}>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Paracetamol 500mg</p>
              <p className="text-xs text-gray-500">1x Daily (As needed for fever)</p>
            </div>
          </div>
        </ExpandableCard>

        <ExpandableCard title="Allergies" icon={AlertTriangle}>
          <p className="text-sm text-gray-600 italic">No known allergies recorded.</p>
        </ExpandableCard>

        <ExpandableCard title="Referrals" icon={Share2}>
          <p className="text-sm text-gray-600 italic">No active referrals.</p>
        </ExpandableCard>
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
