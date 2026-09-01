"""
database/seed_data.py
=====================
Lightweight demo and prototype seed data for Rural Care Navigator.

NOTE: These records are realistic demonstration data for prototype evaluation
and testing. They do NOT represent live production medical facility availability.
"""

from __future__ import annotations

import logging
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.availability import AvailabilitySlot
from backend.app.models.facility import Facility, FacilityService
from backend.app.models.health_journey import HealthJourneyEvent
from backend.app.models.mobile_clinic import MobileClinic
from backend.app.models.patient import Patient
from backend.app.models.scheme import GovernmentScheme

logger = logging.getLogger(__name__)

DEMO_FACILITIES = [
    {
        "name": "PHC Malshiras",
        "type": "PRIMARY_HEALTH_CENTRE",
        "address": "Main Road, Malshiras Village, Taluka Malshiras",
        "district": "Solapur",
        "latitude": 17.8543,
        "longitude": 74.9082,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Primary outpatient consultation & fever clinic", "available": True},
            {"name": "Doctor", "description": "MBBS Medical Officer daily outpatient consultation", "available": True},
            {"name": "Basic Tests", "description": "Blood sugar, hemoglobin, BP, malaria/dengue rapid tests", "available": True},
            {"name": "Medicines", "description": "Essential generic drugs and maternal supplements", "available": True},
        ],
    },
    {
        "name": "CHC Akluj",
        "type": "COMMUNITY_HEALTH_CENTRE",
        "address": "Station Road, Akluj",
        "district": "Solapur",
        "latitude": 17.8872,
        "longitude": 75.0214,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "24x7 Emergency and general outpatient care", "available": True},
            {"name": "Doctor", "description": "Resident physicians and on-call specialists", "available": True},
            {"name": "Basic Tests", "description": "Routine diagnostic lab investigations", "available": True},
            {"name": "Advanced Tests", "description": "Digital X-Ray, ECG, ultrasound sonography", "available": True},
            {"name": "Medicines", "description": "Comprehensive institutional dispensary", "available": True},
            {"name": "Specialist Consultation", "description": "Gynecology, pediatrics, and surgical triage", "available": True},
        ],
    },
    {
        "name": "District Hospital Solapur",
        "type": "DISTRICT_HOSPITAL",
        "address": "Civil Hospital Road, Solapur City",
        "district": "Solapur",
        "latitude": 17.6599,
        "longitude": 75.9064,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Tertiary inpatient & outpatient medical departments", "available": True},
            {"name": "Doctor", "description": "Multi-speciality medical officers and registrars", "available": True},
            {"name": "Basic Tests", "description": "Central 24x7 clinical laboratory", "available": True},
            {"name": "Advanced Tests", "description": "CT Scan, MRI, automated biochemistry, microbiology", "available": True},
            {"name": "Medicines", "description": "Jan Aushadhi and government hospital pharmacy", "available": True},
            {"name": "Specialist Consultation", "description": "Cardiology, orthopedics, neurology, pediatrics, OB/GYN", "available": True},
        ],
    },
    {
        "name": "Mobile Medical Unit Pandharpur",
        "type": "MOBILE_CLINIC",
        "address": "Pandharpur Rural Route - Stops at designated Gram Panchayats",
        "district": "Solapur",
        "latitude": 17.6778,
        "longitude": 75.3242,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Mobile doorstep checkups and screening", "available": True},
            {"name": "Basic Tests", "description": "Point-of-care rapid testing kits", "available": True},
            {"name": "Medicines", "description": "Free medicine kit dispensation for common ailments", "available": True},
        ],
    },
]

DEMO_SCHEMES = [
    {
        "name": "Ayushman Bharat - PM-JAY (Prototype Record)",
        "short_description": "National health protection scheme covering secondary and tertiary hospital care up to Rs 5 lakh/family/year.",
        "description": "Comprehensive cashless coverage at empaneled public and private hospitals across India for eligible rural and urban households.",
        "eligibility": "SECC-listed rural households, RSBY cardholders, and economically vulnerable families.",
        "benefits": "Cashless hospitalization coverage up to Rs 5,00,000 per family per year.",
        "application_process": "Visit an Ayushman Mitra desk at any empaneled government hospital or CSC center with Aadhaar/Ration Card.",
        "official_link": "https://pmjay.gov.in",
        "state": "National",
        "active": True,
    },
    {
        "name": "Mahatma Jyotirao Phule Jan Arogya Yojana - MJPJAY (Maharashtra Prototype Record)",
        "short_description": "Maharashtra state flagship health insurance scheme for comprehensive medical treatments and surgeries.",
        "description": "Cashless healthcare coverage for identified critical illnesses and surgical procedures across Maharashtra.",
        "eligibility": "Families holding Yellow/Orange ration cards or Annapurna/Antyodaya cards in Maharashtra.",
        "benefits": "Cashless treatment coverage up to Rs 1,50,000 per family per year across 996 identified procedures.",
        "application_process": "Contact Arogyamitra at district/sub-district hospitals or network hospitals with Ration Card and Photo ID.",
        "official_link": "https://www.jeevandayee.gov.in",
        "state": "Maharashtra",
        "active": True,
    },
    {
        "name": "National Health Mission - Free Essential Drugs & Diagnostics (Prototype Record)",
        "short_description": "Government initiative ensuring zero-cost essential medicines and diagnostic tests at public health centres.",
        "description": "Guarantees free generic medicines, maternal nutritional supplements, and diagnostic test batteries at all Sub-Centres, PHCs, and CHCs.",
        "eligibility": "All citizens visiting public healthcare centres (Sub-Centres, PHCs, CHCs, District Hospitals).",
        "benefits": "100% free generic medicines and point-of-care lab investigations.",
        "application_process": "Automatic entitlement upon OPD registration at any public health facility.",
        "official_link": "https://nhm.gov.in",
        "state": "National",
        "active": True,
    },
]

DEMO_MOBILE_CLINICS = [
    {
        "name": "Solapur Rural Mobile Medical Unit 1 (Demo MMU)",
        "organization": "District Health Society, Solapur",
        "district": "Solapur",
        "address": "Malshiras & Karmala Taluka Routes",
        "latitude": 17.8540,
        "longitude": 74.9080,
        "service_area": "Malshiras, Velapur, Natepute, Barsi Rural Villages",
        "services": "General checkup, blood sugar, hemoglobin, antenatal screening, free medicine dispensation",
        "schedule": "Monday to Friday: 09:00 AM - 04:00 PM (Weekly village rotation)",
        "contact": "+91-217-2731000",
        "status": "ACTIVE",
    },
    {
        "name": "Pandharpur Pilgrim & Outreach Van (Demo MMU)",
        "organization": "Maharashtra NHM Mobile Health Mission",
        "district": "Solapur",
        "address": "Pandharpur Rural Hub",
        "latitude": 17.6775,
        "longitude": 75.3240,
        "service_area": "Pandharpur rural settlements, temple routes, riverside villages",
        "services": "First aid, chronic disease screening, pediatric immunization, maternal checkups",
        "schedule": "Daily: 08:30 AM - 03:30 PM",
        "contact": "+91-217-2732000",
        "status": "ACTIVE",
    },
    {
        "name": "Akluj Farm-Worker Mobile Health Van (Demo MMU)",
        "organization": "Rural Community Health Trust",
        "district": "Solapur",
        "address": "Akluj Sugar Belt Route",
        "latitude": 17.8870,
        "longitude": 75.0210,
        "service_area": "Akluj sugar factory colonies, migratory agricultural worker settlements",
        "services": "Occupational health checkups, dehydration care, skin screening, emergency triage",
        "schedule": "Tuesday, Thursday, Saturday: 09:00 AM - 05:00 PM",
        "contact": "+91-217-2733000",
        "status": "ACTIVE",
    },
]

DEMO_DATES = ["2026-09-02", "2026-09-03", "2026-09-04"]
DEMO_TIME_SLOTS = [
    ("09:00", "09:30"),
    ("09:30", "10:00"),
    ("10:00", "10:30"),
    ("10:30", "11:00"),
    ("11:00", "11:30"),
    ("11:30", "12:00"),
    ("14:00", "14:30"),
    ("14:30", "15:00"),
    ("15:00", "15:30"),
    ("15:30", "16:00"),
]


def seed_demo_data(db: Session) -> None:
    """
    Seed initial prototype facilities, services, schemes, mobile clinics, and availability slots.

    Safe to run repeatedly — only seeds when facilities table has 0 records.
    """
    existing_count = db.execute(select(Facility)).first()
    if existing_count is not None:
        logger.info("Demo data already seeded.")
        return

    logger.info("Seeding demonstration healthcare facilities, schemes, and availability slots...")

    for fac_data in DEMO_FACILITIES:
        services_data = fac_data["services"]
        facility = Facility(
            name=fac_data["name"],
            type=fac_data["type"],
            address=fac_data["address"],
            district=fac_data["district"],
            latitude=fac_data["latitude"],
            longitude=fac_data["longitude"],
            status=fac_data["status"],
        )
        db.add(facility)
        db.flush()

        created_services = []
        for s_data in services_data:
            service = FacilityService(
                facility_id=facility.id,
                name=s_data["name"],
                description=s_data["description"],
                available=s_data["available"],
            )
            db.add(service)
            db.flush()
            created_services.append(service)

        # Create realistic demo availability slots for each date
        for date_str in DEMO_DATES:
            for idx, (start_time, end_time) in enumerate(DEMO_TIME_SLOTS):
                # Distribute slots across services
                service_id = created_services[idx % len(created_services)].id
                slot = AvailabilitySlot(
                    facility_id=facility.id,
                    service_id=service_id,
                    date=date_str,
                    start_time=start_time,
                    end_time=end_time,
                    status="AVAILABLE",
                )
                db.add(slot)

    # Seed demo government schemes
    for sch_data in DEMO_SCHEMES:
        scheme = GovernmentScheme(
            name=sch_data["name"],
            short_description=sch_data["short_description"],
            description=sch_data["description"],
            eligibility=sch_data["eligibility"],
            benefits=sch_data["benefits"],
            application_process=sch_data["application_process"],
            official_link=sch_data["official_link"],
            state=sch_data["state"],
            active=sch_data["active"],
        )
        db.add(scheme)

    # Seed demo mobile clinics
    for mc_data in DEMO_MOBILE_CLINICS:
        clinic = MobileClinic(
            name=mc_data["name"],
            organization=mc_data["organization"],
            district=mc_data["district"],
            address=mc_data["address"],
            latitude=mc_data["latitude"],
            longitude=mc_data["longitude"],
            service_area=mc_data["service_area"],
            services=mc_data["services"],
            schedule=mc_data["schedule"],
            contact=mc_data["contact"],
            status=mc_data["status"],
        )
        db.add(clinic)

    # Seed demo patient for authentication and profile testing
    existing_patient = db.scalars(select(Patient).where(Patient.mobile == "9876543210")).first()
    if not existing_patient:
        patient = Patient(
            mobile="9876543210",
            full_name="Ramesh Kumar",
            district="Solapur",
            abha_number="14-1234-5678-9012",
            consent=True,
        )
        db.add(patient)
        db.flush()

        db.add(
            HealthJourneyEvent(
                patient_id=patient.id,
                event_type="REGISTRATION",
                title="Patient Registration",
                description="Profile registered on Rural Care Navigator",
                event_date="2026-09-01",
            )
        )

    db.commit()
    logger.info("Demonstration data seeded successfully.")


