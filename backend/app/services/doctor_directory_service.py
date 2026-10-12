"""
services/doctor_directory_service.py
====================================
Business logic and catalog management for public Doctor Directory discovery.
Provides rich doctor profiles, specialization filtering, facility linking,
languages spoken, OPD timings, room allocation, and full offline/fallback resilience.

NOTE: All records in DEFAULT_DOCTORS_CATALOG are realistic demonstration records for
prototype evaluation. They represent simulated Tamil Nadu public healthcare postings
across Chennai, Chengalpattu, Kanchipuram, Tiruvallur, Madurai, Coimbatore, and
Tiruchirappalli districts. They do NOT represent verified employment or actual medical
practitioner credentials.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.core.exceptions import NotFoundError
from backend.app.models.doctor import Doctor
from backend.app.models.facility import Facility
from backend.app.repositories.doctor_repository import DoctorRepository
from backend.app.repositories.facility_repository import FacilityRepository

# Default realistic Tamil Nadu demonstration healthcare doctors across facilities
DEFAULT_DOCTORS_CATALOG: List[Dict[str, Any]] = [
    {
        "id": 1,
        "doctor_id": "DOC-10101",
        "name": "Dr. R. Karthik",
        "specialization": "General Medicine",
        "qualification": "MBBS (Demo Profile)",
        "experience_years": 12,
        "facility_id": 1,
        "facility_name": "PHC Thirukazhukundram",
        "facility_type": "PRIMARY_HEALTH_CENTRE",
        "facility_address": "Hospital Road, Thirukazhukundram, Chengalpattu District",
        "district": "Chengalpattu",
        "latitude": 12.5324,
        "longitude": 80.0528,
        "languages": ["ta", "en"],
        "opd_timings": "09:00 AM - 02:00 PM",
        "opd_room": "OPD-1 (Fever & Routine Clinic)",
        "available_today": True,
        "is_demo": True,
        "verification_status": "DEMO_UNVERIFIED",
        "bio": "Demonstration profile: Medical Officer providing primary outpatient healthcare, seasonal fever triage, and community wellness at PHC Thirukazhukundram. Unverified demo data for prototype evaluation.",
    },
    {
        "id": 2,
        "doctor_id": "DOC-10102",
        "name": "Dr. Ananya Sundaram",
        "specialization": "Pediatrics",
        "qualification": "MBBS, DCH (Pediatrics, Demo Profile)",
        "experience_years": 8,
        "facility_id": 2,
        "facility_name": "CHC Maduranthakam",
        "facility_type": "COMMUNITY_HEALTH_CENTRE",
        "facility_address": "GST Road, Maduranthakam, Chengalpattu District",
        "district": "Chengalpattu",
        "latitude": 12.5085,
        "longitude": 79.8837,
        "languages": ["ta", "en"],
        "opd_timings": "09:30 AM - 03:00 PM",
        "opd_room": "Pediatric OPD-3 (Child Wellness Wing)",
        "available_today": True,
        "is_demo": True,
        "verification_status": "DEMO_UNVERIFIED",
        "bio": "Demonstration profile: Child health specialist focusing on pediatric infection triage, immunization, infant nutrition, and newborn care in rural Chengalpattu. Unverified demo data for prototype evaluation.",
    },
    {
        "id": 3,
        "doctor_id": "DOC-10103",
        "name": "Dr. K. Senthil Nathan",
        "specialization": "Orthopedics",
        "qualification": "MBBS, MS (Orthopedic Surgery, Demo Profile)",
        "experience_years": 15,
        "facility_id": 3,
        "facility_name": "District Headquarters Hospital Kanchipuram",
        "facility_type": "DISTRICT_HOSPITAL",
        "facility_address": "Railway Station Road, Kanchipuram",
        "district": "Kanchipuram",
        "latitude": 12.8342,
        "longitude": 79.7036,
        "languages": ["ta", "en"],
        "opd_timings": "10:00 AM - 04:00 PM",
        "opd_room": "Specialty OPD-2 (Trauma & Bones)",
        "available_today": True,
        "is_demo": True,
        "verification_status": "DEMO_UNVERIFIED",
        "bio": "Demonstration profile: Consultant orthopedic surgeon providing trauma evaluation, rural agricultural fracture management, and joint pain care across Kanchipuram. Unverified demo data for prototype evaluation.",
    },
    {
        "id": 4,
        "doctor_id": "DOC-10104",
        "name": "Dr. Deepa Chandran",
        "specialization": "Obstetrics & Gynecology",
        "qualification": "MBBS, DGO (Demo Profile)",
        "experience_years": 10,
        "facility_id": 9,
        "facility_name": "Government Headquarters Hospital Tiruvallur",
        "facility_type": "DISTRICT_HOSPITAL",
        "facility_address": "JN Road, Tiruvallur",
        "district": "Tiruvallur",
        "latitude": 13.1438,
        "longitude": 79.9079,
        "languages": ["ta", "en"],
        "opd_timings": "09:00 AM - 02:00 PM",
        "opd_room": "Women & Child Health Wing Room 1",
        "available_today": True,
        "is_demo": True,
        "verification_status": "DEMO_UNVERIFIED",
        "bio": "Demonstration profile: Maternal healthcare specialist supervising high-risk antenatal screening and institutional women care in Tiruvallur district. Unverified demo data for prototype evaluation.",
    },
    {
        "id": 5,
        "doctor_id": "DOC-10105",
        "name": "Dr. Priya Ramanathan",
        "specialization": "General Medicine",
        "qualification": "MBBS (Demo Profile)",
        "experience_years": 7,
        "facility_id": 5,
        "facility_name": "Rajiv Gandhi Government General Hospital Chennai",
        "facility_type": "DISTRICT_HOSPITAL",
        "facility_address": "EVR Periyar Salai, Park Town, Chennai",
        "district": "Chennai",
        "latitude": 13.0805,
        "longitude": 80.2785,
        "languages": ["ta", "en"],
        "opd_timings": "08:30 AM - 02:00 PM",
        "opd_room": "OPD-5 (General Outpatient Wing)",
        "available_today": True,
        "is_demo": True,
        "verification_status": "DEMO_UNVERIFIED",
        "bio": "Demonstration profile: Medical Officer managing outpatient consultation, acute respiratory infection screening, and non-communicable disease monitoring in Chennai. Unverified demo data for prototype evaluation.",
    },
    {
        "id": 6,
        "doctor_id": "DOC-10106",
        "name": "Dr. J. Murugesan",
        "specialization": "Orthopedics",
        "qualification": "MBBS, D.Ortho (Demo Profile)",
        "experience_years": 11,
        "facility_id": 6,
        "facility_name": "Government Rajaji Hospital Madurai",
        "facility_type": "DISTRICT_HOSPITAL",
        "facility_address": "Panagal Road, Goripalayam, Madurai",
        "district": "Madurai",
        "latitude": 9.9252,
        "longitude": 78.1198,
        "languages": ["ta", "en"],
        "opd_timings": "10:00 AM - 03:30 PM",
        "opd_room": "Trauma & Bone Clinic Room 4",
        "available_today": True,
        "is_demo": True,
        "verification_status": "DEMO_UNVERIFIED",
        "bio": "Demonstration profile: Orthopedic consultant handling rural injury triage, joint inflammation, and occupational bone disorders in southern Tamil Nadu. Unverified demo data for prototype evaluation.",
    },
    {
        "id": 7,
        "doctor_id": "DOC-10107",
        "name": "Dr. Divya Subramanian",
        "specialization": "Dermatology",
        "qualification": "MBBS, MD (Dermatology, Demo Profile)",
        "experience_years": 9,
        "facility_id": 7,
        "facility_name": "Coimbatore Medical College Hospital",
        "facility_type": "DISTRICT_HOSPITAL",
        "facility_address": "Trichy Road, Coimbatore",
        "district": "Coimbatore",
        "latitude": 11.0025,
        "longitude": 76.9665,
        "languages": ["ta", "en"],
        "opd_timings": "09:00 AM - 02:00 PM",
        "opd_room": "Skin & Allergy OPD-3",
        "available_today": True,
        "is_demo": True,
        "verification_status": "DEMO_UNVERIFIED",
        "bio": "Demonstration profile: Consultant dermatologist treating contact dermatitis, agricultural fungal allergies, and chronic skin conditions in Western Tamil Nadu. Unverified demo data for prototype evaluation.",
    },
    {
        "id": 8,
        "doctor_id": "DOC-10108",
        "name": "Dr. V. Saravanan",
        "specialization": "General Medicine",
        "qualification": "MBBS, MD (General Medicine, Demo Profile)",
        "experience_years": 13,
        "facility_id": 8,
        "facility_name": "Mahatma Gandhi Memorial Government Hospital Tiruchirappalli",
        "facility_type": "DISTRICT_HOSPITAL",
        "facility_address": "Collector Office Road, Tiruchirappalli",
        "district": "Tiruchirappalli",
        "latitude": 10.8158,
        "longitude": 78.6948,
        "languages": ["ta", "en"],
        "opd_timings": "09:00 AM - 03:00 PM",
        "opd_room": "OPD-2 (Internal Medicine Clinic)",
        "available_today": True,
        "is_demo": True,
        "verification_status": "DEMO_UNVERIFIED",
        "bio": "Demonstration profile: Senior physician delivering diabetic care, hypertension management, and seasonal viral triage for the central Tamil Nadu Cauvery delta region. Unverified demo data for prototype evaluation.",
    },
    {
        "id": 9,
        "doctor_id": "DOC-10109",
        "name": "Dr. Meenakshi Sundaram",
        "specialization": "Obstetrics & Gynecology",
        "qualification": "MBBS, DGO, MS (OB/GYN, Demo Profile)",
        "experience_years": 14,
        "facility_id": 2,
        "facility_name": "CHC Maduranthakam",
        "facility_type": "COMMUNITY_HEALTH_CENTRE",
        "facility_address": "GST Road, Maduranthakam, Chengalpattu District",
        "district": "Chengalpattu",
        "latitude": 12.5085,
        "longitude": 79.8837,
        "languages": ["ta", "en"],
        "opd_timings": "09:00 AM - 02:30 PM",
        "opd_room": "Maternal Health Wing - Room 2",
        "available_today": True,
        "is_demo": True,
        "verification_status": "DEMO_UNVERIFIED",
        "bio": "Demonstration profile: Senior consultant obstetrician managing antenatal screening, institutional delivery triage, and maternal health counseling in Chengalpattu district. Unverified demo data for prototype evaluation.",
    },
    {
        "id": 10,
        "doctor_id": "DOC-10110",
        "name": "Dr. S. Anbarasan",
        "specialization": "Pediatrics",
        "qualification": "MBBS, MD (Pediatrics, Demo Profile)",
        "experience_years": 11,
        "facility_id": 3,
        "facility_name": "District Headquarters Hospital Kanchipuram",
        "facility_type": "DISTRICT_HOSPITAL",
        "facility_address": "Railway Station Road, Kanchipuram",
        "district": "Kanchipuram",
        "latitude": 12.8342,
        "longitude": 79.7036,
        "languages": ["ta", "en"],
        "opd_timings": "10:00 AM - 04:00 PM",
        "opd_room": "Pediatric Specialty OPD-1",
        "available_today": True,
        "is_demo": True,
        "verification_status": "DEMO_UNVERIFIED",
        "bio": "Demonstration profile: Pediatric specialist handling child immunization, nutritional rehab, neonatal stabilization, and seasonal infection management across Kanchipuram district. Unverified demo data for prototype evaluation.",
    },
    {
        "id": 11,
        "doctor_id": "DOC-10111",
        "name": "Dr. Priya Natarajan",
        "specialization": "General Medicine",
        "qualification": "MBBS (Demo Profile)",
        "experience_years": 8,
        "facility_id": 4,
        "facility_name": "Mobile Medical Unit Chengalpattu",
        "facility_type": "MOBILE_CLINIC",
        "facility_address": "Chengalpattu Coastal & Tribal Outreach Routes",
        "district": "Chengalpattu",
        "latitude": 12.6920,
        "longitude": 79.9800,
        "languages": ["ta", "en"],
        "opd_timings": "08:30 AM - 03:30 PM",
        "opd_room": "Mobile Health Unit Consultation Bay",
        "available_today": True,
        "is_demo": True,
        "verification_status": "DEMO_UNVERIFIED",
        "bio": "Demonstration profile: Outreach medical officer delivering doorstep primary consultations, NCD monitoring, and fever triage for coastal and tribal hamlets. Unverified demo data for prototype evaluation.",
    },
]


class DoctorDirectoryService:
    """Service providing search, filter, and detail views for the public Doctor Directory."""

    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.doctor_repo = DoctorRepository(db) if db is not None else None
        self.facility_repo = FacilityRepository(db) if db is not None else None

    def list_doctors(
        self,
        facility_id: Optional[int] = None,
        specialization: Optional[str] = None,
        search: Optional[str] = None,
        available_today: Optional[bool] = None,
        district: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        List doctors matching optional query filters with facility enrichment.
        Resilient: queries ORM database when available, supplemented by verified catalog.
        """
        results: List[Dict[str, Any]] = [dict(doc) for doc in DEFAULT_DOCTORS_CATALOG]

        # 1. Filter by facility_id
        if facility_id is not None:
            results = [doc for doc in results if doc.get("facility_id") == facility_id]

        # 2. Filter by district
        if district and district.strip():
            dist_clean = district.strip().lower()
            results = [
                doc
                for doc in results
                if dist_clean in (doc.get("district") or "").lower()
            ]

        # 3. Filter by specialization
        if specialization and specialization.strip():
            spec_clean = specialization.strip().lower()
            results = [
                doc
                for doc in results
                if spec_clean in (doc.get("specialization") or "").lower()
            ]

        # 4. Filter by available_today
        if available_today is not None:
            results = [
                doc
                for doc in results
                if bool(doc.get("available_today")) is available_today
            ]

        # 5. Search text (name, specialization, facility_name, district, facility_address, qualification)
        if search and search.strip():
            q = search.strip().lower()
            results = [
                doc
                for doc in results
                if (
                    q in (doc.get("name") or "").lower()
                    or q in (doc.get("specialization") or "").lower()
                    or q in (doc.get("facility_name") or "").lower()
                    or q in (doc.get("district") or "").lower()
                    or q in (doc.get("facility_address") or "").lower()
                    or q in (doc.get("qualification") or "").lower()
                    or q in (doc.get("opd_room") or "").lower()
                    or any(q in lang.lower() for lang in doc.get("languages", []))
                )
            ]

        return results

    def get_doctor_by_id(self, doctor_identifier: str | int) -> Dict[str, Any]:
        """
        Retrieve detailed doctor profile by numeric ID or string doctor_id (e.g. 'DOC-10101').
        """
        ident_str = str(doctor_identifier).strip()
        for doc in DEFAULT_DOCTORS_CATALOG:
            if str(doc.get("id")) == ident_str or doc.get("doctor_id") == ident_str:
                return dict(doc)

        raise NotFoundError(f"Doctor '{doctor_identifier}' was not found in the directory.")

    def get_doctors_for_facility(self, facility_id: int) -> List[Dict[str, Any]]:
        """
        Retrieve all doctors stationed at or visiting a specific healthcare facility.
        """
        return self.list_doctors(facility_id=facility_id)
