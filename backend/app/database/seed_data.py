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
        "name": "PHC Thirukazhukundram",
        "type": "PRIMARY_HEALTH_CENTRE",
        "address": "Hospital Road, Thirukazhukundram, Chengalpattu District",
        "district": "Chengalpattu",
        "latitude": 12.5324,
        "longitude": 80.0528,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Primary outpatient fever and seasonal illness consultation", "available": True},
            {"name": "Doctor", "description": "MBBS Medical Officer daily outpatient consultation", "available": True},
            {"name": "Basic Tests", "description": "Blood sugar, hemoglobin, BP, dengue/chikungunya rapid testing", "available": True},
            {"name": "Medicines", "description": "Tamil Nadu Medical Services Corporation (TNMSC) essential drugs", "available": True},
        ],
    },
    {
        "name": "CHC Maduranthakam",
        "type": "COMMUNITY_HEALTH_CENTRE",
        "address": "GST Road, Maduranthakam, Chengalpattu District",
        "district": "Chengalpattu",
        "latitude": 12.5085,
        "longitude": 79.8837,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "24x7 Emergency and round-the-clock inpatient observation", "available": True},
            {"name": "Doctor", "description": "Emergency physicians and resident medical officers", "available": True},
            {"name": "Basic Tests", "description": "Automated hematology and clinical biochemistry", "available": True},
            {"name": "Advanced Tests", "description": "Digital X-Ray and ultrasound sonography", "available": True},
            {"name": "Medicines", "description": "TNMSC institutional pharmacy and emergency medicine supply", "available": True},
            {"name": "Specialist Consultation", "description": "Obstetrics & Gynecology and pediatric outpatient clinic", "available": True},
        ],
    },
    {
        "name": "District Headquarters Hospital Kanchipuram",
        "type": "DISTRICT_HOSPITAL",
        "address": "Railway Station Road, Kanchipuram",
        "district": "Kanchipuram",
        "latitude": 12.8342,
        "longitude": 79.7036,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Multi-departmental general and intensive care inpatient units", "available": True},
            {"name": "Doctor", "description": "Senior civil surgeons and specialist medical consultants", "available": True},
            {"name": "Basic Tests", "description": "24x7 Government hospital reference laboratory", "available": True},
            {"name": "Advanced Tests", "description": "CT Scan, ultrasound, automated diagnostics", "available": True},
            {"name": "Medicines", "description": "Comprehensive TNMSC drug counter and Jan Aushadhi Kendra", "available": True},
            {"name": "Specialist Consultation", "description": "Cardiology, Orthopedics, Pediatrics, OB/GYN, General Surgery", "available": True},
        ],
    },
    {
        "name": "Mobile Medical Unit Chengalpattu",
        "type": "MOBILE_CLINIC",
        "address": "Chengalpattu Coastal & Tribal Outreach Routes",
        "district": "Chengalpattu",
        "latitude": 12.6920,
        "longitude": 79.9800,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Doorstep screening, geriatric care, and non-communicable disease follow-up", "available": True},
            {"name": "Basic Tests", "description": "Point-of-care capillary glucose, hemoglobin, and rapid kits", "available": True},
            {"name": "Medicines", "description": "Free doorstep essential medicine kits", "available": True},
        ],
    },
    {
        "name": "Chengalpattu Government Medical College Hospital",
        "type": "DISTRICT_HOSPITAL",
        "address": "GST Road, Chengalpattu",
        "district": "Chengalpattu",
        "latitude": 12.6922,
        "longitude": 79.9804,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Tertiary inpatient & intensive care units", "available": True},
            {"name": "Doctor", "description": "Professors, resident doctors, and multi-specialists", "available": True},
            {"name": "Basic Tests", "description": "24x7 Central diagnostic pathology and biochemistry", "available": True},
            {"name": "Advanced Tests", "description": "CT Scan, MRI, ultrasound, echocardiogram", "available": True},
            {"name": "Medicines", "description": "TNMSC round-the-clock hospital dispensary", "available": True},
            {"name": "Specialist Consultation", "description": "Emergency medicine, surgery, obstetrics, pediatrics", "available": True},
        ],
    },
    {
        "name": "Rajiv Gandhi Government General Hospital Chennai",
        "type": "DISTRICT_HOSPITAL",
        "address": "EVR Periyar Salai, Park Town, Chennai",
        "district": "Chennai",
        "latitude": 13.0805,
        "longitude": 80.2785,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Major referral hospital with 24x7 trauma care", "available": True},
            {"name": "Doctor", "description": "Multi-speciality consultants and surgeons", "available": True},
            {"name": "Basic Tests", "description": "Comprehensive reference laboratory testing", "available": True},
            {"name": "Advanced Tests", "description": "CT Scan, MRI, advanced pathology, cath lab", "available": True},
            {"name": "Medicines", "description": "Central state medical services medicine dispensary", "available": True},
            {"name": "Specialist Consultation", "description": "Cardiology, neurology, nephrology, orthopedics, surgery", "available": True},
        ],
    },
    {
        "name": "Government Kilpauk Medical College Hospital Chennai",
        "type": "DISTRICT_HOSPITAL",
        "address": "Poonamallee High Road, Kilpauk, Chennai",
        "district": "Chennai",
        "latitude": 13.0784,
        "longitude": 80.2437,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Emergency medical and intensive observation care", "available": True},
            {"name": "Doctor", "description": "Senior physicians and resident medical officers", "available": True},
            {"name": "Basic Tests", "description": "Clinical hematology and microbiological screening", "available": True},
            {"name": "Advanced Tests", "description": "Digital X-Ray, ultrasonography, burns & trauma unit", "available": True},
            {"name": "Medicines", "description": "TNMSC essential drug store", "available": True},
            {"name": "Specialist Consultation", "description": "Dermatology, plastic surgery, burns, general medicine", "available": True},
        ],
    },
    {
        "name": "Government Headquarters Hospital Tiruvallur",
        "type": "DISTRICT_HOSPITAL",
        "address": "JN Road, Tiruvallur",
        "district": "Tiruvallur",
        "latitude": 13.1438,
        "longitude": 79.9079,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "District-level comprehensive inpatient and outpatient care", "available": True},
            {"name": "Doctor", "description": "Civil surgeons and medical specialists", "available": True},
            {"name": "Basic Tests", "description": "Automated clinical lab and blood bank", "available": True},
            {"name": "Advanced Tests", "description": "CT Scan, digital imaging, sonography", "available": True},
            {"name": "Medicines", "description": "Free generic medicine distribution center", "available": True},
            {"name": "Specialist Consultation", "description": "Pediatrics, gynecology, orthopedics, general surgery", "available": True},
        ],
    },
    {
        "name": "Government Rajaji Hospital Madurai",
        "type": "DISTRICT_HOSPITAL",
        "address": "Panagal Road, Goripalayam, Madurai",
        "district": "Madurai",
        "latitude": 9.9252,
        "longitude": 78.1198,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Apex tertiary care center for southern Tamil Nadu", "available": True},
            {"name": "Doctor", "description": "Professors, specialists, and civil surgeons", "available": True},
            {"name": "Basic Tests", "description": "24x7 automated diagnostic pathology", "available": True},
            {"name": "Advanced Tests", "description": "High-end CT Scan, MRI, ultrasound, dialysis", "available": True},
            {"name": "Medicines", "description": "TNMSC round-the-clock hospital pharmacy", "available": True},
            {"name": "Specialist Consultation", "description": "Cardiology, oncology, neurology, pediatrics, OB/GYN", "available": True},
        ],
    },
    {
        "name": "Tirumangalam Government Hospital Madurai",
        "type": "COMMUNITY_HEALTH_CENTRE",
        "address": "Madurai-Kanyakumari Road, Tirumangalam, Madurai",
        "district": "Madurai",
        "latitude": 9.8242,
        "longitude": 77.9860,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Round-the-clock primary and emergency outpatient triage", "available": True},
            {"name": "Doctor", "description": "Resident medical officers and emergency doctors", "available": True},
            {"name": "Basic Tests", "description": "Point-of-care glucose, hemoglobin, rapid diagnostics", "available": True},
            {"name": "Advanced Tests", "description": "Digital X-Ray and ultrasound sonography", "available": True},
            {"name": "Medicines", "description": "TNMSC drug dispensation center", "available": True},
        ],
    },
    {
        "name": "Coimbatore Medical College Hospital",
        "type": "DISTRICT_HOSPITAL",
        "address": "Trichy Road, Coimbatore",
        "district": "Coimbatore",
        "latitude": 11.0025,
        "longitude": 76.9665,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Tertiary referral healthcare for Western Tamil Nadu", "available": True},
            {"name": "Doctor", "description": "Senior professors and clinical consultants", "available": True},
            {"name": "Basic Tests", "description": "24x7 automated multi-discipline diagnostic laboratory", "available": True},
            {"name": "Advanced Tests", "description": "CT Scan, MRI, automated biochemistry, endoscopy", "available": True},
            {"name": "Medicines", "description": "Comprehensive government hospital drug repository", "available": True},
            {"name": "Specialist Consultation", "description": "Orthopedics, dermatology, pulmonary, cardiology", "available": True},
        ],
    },
    {
        "name": "Pollachi Sub-District Government Hospital",
        "type": "COMMUNITY_HEALTH_CENTRE",
        "address": "Coimbatore Road, Pollachi",
        "district": "Coimbatore",
        "latitude": 10.6609,
        "longitude": 77.0080,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Sub-district 24x7 inpatient and emergency care", "available": True},
            {"name": "Doctor", "description": "General physicians and visiting specialists", "available": True},
            {"name": "Basic Tests", "description": "Routine hematology and bio-chemical tests", "available": True},
            {"name": "Advanced Tests", "description": "X-Ray and obstetric sonography", "available": True},
            {"name": "Medicines", "description": "Free medicine distribution desk", "available": True},
        ],
    },
    {
        "name": "Mahatma Gandhi Memorial Government Hospital Tiruchirappalli",
        "type": "DISTRICT_HOSPITAL",
        "address": "Collector Office Road, Tiruchirappalli",
        "district": "Tiruchirappalli",
        "latitude": 10.8158,
        "longitude": 78.6948,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Apex government hospital for central delta region", "available": True},
            {"name": "Doctor", "description": "Specialist physicians, pediatricians, and surgeons", "available": True},
            {"name": "Basic Tests", "description": "Reference diagnostic laboratory", "available": True},
            {"name": "Advanced Tests", "description": "CT Scan, MRI, color doppler, cath lab", "available": True},
            {"name": "Medicines", "description": "TNMSC institutional pharmacy", "available": True},
            {"name": "Specialist Consultation", "description": "Diabetology, cardiology, pediatrics, OB/GYN, neurology", "available": True},
        ],
    },
    {
        "name": "Srirangam Government Hospital Tiruchirappalli",
        "type": "COMMUNITY_HEALTH_CENTRE",
        "address": "Gandhi Road, Srirangam, Tiruchirappalli",
        "district": "Tiruchirappalli",
        "latitude": 10.8625,
        "longitude": 78.6980,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Primary and urgent outpatient care for temple town", "available": True},
            {"name": "Doctor", "description": "Resident medical officers", "available": True},
            {"name": "Basic Tests", "description": "Routine diagnostic laboratory", "available": True},
            {"name": "Medicines", "description": "TNMSC essential drug store", "available": True},
        ],
    },
    {
        "name": "Valparai Government Hospital",
        "type": "PRIMARY_HEALTH_CENTRE",
        "address": "Main Road, Valparai Hill Station, Anamalai Hills",
        "district": "Coimbatore",
        "latitude": 10.3242,
        "longitude": 76.9558,
        "status": "ACTIVE",
        "services": [
            {"name": "General Medicine", "description": "Isolated hill-tract primary emergency and plantation worker clinic", "available": True},
            {"name": "Doctor", "description": "Medical officer and tribal outreach nurse", "available": True},
            {"name": "Basic Tests", "description": "Point-of-care rapid testing kits", "available": True},
            {"name": "Medicines", "description": "Essential hill-tract emergency medicine supplies", "available": True},
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
    {
        "name": "Chief Minister's Comprehensive Health Insurance Scheme - CMCHIS (Tamil Nadu)",
        "short_description": "Tamil Nadu state cashless health insurance scheme providing up to Rs 5 lakh per family per year.",
        "description": "Comprehensive cashless hospitalization coverage across public and empaneled private hospitals in Tamil Nadu for eligible resident families.",
        "eligibility": "Resident families in Tamil Nadu with annual family income below Rs 1,20,000, holding eligible Ration Card.",
        "benefits": "Cashless hospitalization coverage up to Rs 5,00,000 per family per year for covered procedures.",
        "application_process": "Apply at the District Collectorate CMCHIS kiosk or empaneled government hospital helpdesk with Ration Card, Aadhaar, and Income Certificate.",
        "official_link": "https://www.cmchistn.com",
        "state": "Tamil Nadu",
        "active": True,
    },
    {
        "name": "Dr. Muthulakshmi Reddy Maternity Benefit Scheme - MRMBS (Tamil Nadu)",
        "short_description": "Financial assistance of Rs 18,000 in cash and Amma Baby Care Kits for pregnant women in Tamil Nadu.",
        "description": "Tamil Nadu maternal welfare scheme offering phased financial assistance and nutritional support kits to ensure institutional delivery and maternal well-being.",
        "eligibility": "Pregnant mothers aged 19 and above below the poverty line registered on PICME portal in Tamil Nadu.",
        "benefits": "Financial benefit of Rs 18,000 disbursed across 5 installments plus nutrition kits for mother and child.",
        "application_process": "Register with the local Village Health Nurse (VHN) / Urban Health Nurse (UHN) at the nearby PHC within 12 weeks of pregnancy to obtain PICME RCH ID.",
        "official_link": "https://picme.tn.gov.in",
        "state": "Tamil Nadu",
        "active": True,
    },
    {
        "name": "Makkalai Thedi Maruthuvam (Tamil Nadu Doorstep Healthcare)",
        "short_description": "Doorstep healthcare scheme delivering screening and monthly medicines for hypertension and diabetes to rural households.",
        "description": "Pioneering community healthcare initiative delivering screening for hypertension, diabetes, palliative care, and chronic medications directly to citizens' homes.",
        "eligibility": "All residents in Tamil Nadu, particularly elderly citizens and chronic non-communicable disease patients in rural villages.",
        "benefits": "Free monthly home delivery of hypertension/diabetes medications, physiotherapy, and palliative care.",
        "application_process": "Women Health Volunteers (WHVs) visit households directly for door-to-door screening; no separate application required.",
        "official_link": "https://nhm.tn.gov.in",
        "state": "Tamil Nadu",
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
    {
        "name": "Chengalpattu Coastal & Tribal Mobile Health Van (Demo MMU)",
        "organization": "Tamil Nadu National Health Mission & District Health Society",
        "district": "Chengalpattu",
        "address": "Chengalpattu Rural & Coastal Belt Hub",
        "latitude": 12.6820,
        "longitude": 79.9850,
        "service_area": "Coastal fishing hamlets, rural agricultural villages, and Irula tribal settlements",
        "services": "NCD screening, hypertension/diabetes medicine refills, antenatal care, wound dressing, child growth monitoring",
        "schedule": "Monday to Saturday: 08:30 AM - 03:30 PM",
        "contact": "+91-44-27420001",
        "status": "ACTIVE",
    },
    {
        "name": "Kanchipuram Weaver & Farm Outreach Clinic (Demo MMU)",
        "organization": "Tamil Nadu Directorate of Public Health",
        "district": "Kanchipuram",
        "address": "Kanchipuram Rural Silk & Agricultural Block",
        "latitude": 12.8300,
        "longitude": 79.7100,
        "service_area": "Handloom weaver clusters, agrarian rural habitations, and peri-urban villages",
        "services": "Ergonomic & joint pain screening, blood pressure checks, diabetes monitoring, free generic drugs",
        "schedule": "Monday to Friday: 09:00 AM - 04:00 PM",
        "contact": "+91-44-27220002",
        "status": "ACTIVE",
    },
]

from datetime import date, timedelta

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


def get_dynamic_upcoming_dates(days: int = 7) -> list[str]:
    """Generate dynamic upcoming dates for the next N days starting from today."""
    today = date.today()
    return [(today + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(0, days)]


def ensure_active_availability_slots(db: Session, days_ahead: int = 7) -> None:
    """
    Ensure that active healthcare facilities have upcoming availability slots in PostgreSQL.
    If a facility has no future available slots, dynamically generates slots for its active services.
    """
    today_str = date.today().strftime("%Y-%m-%d")
    facilities = db.execute(select(Facility).where(Facility.status == "ACTIVE")).scalars().all()
    upcoming_dates = get_dynamic_upcoming_dates(days_ahead)

    for facility in facilities:
        services = facility.services or []
        if not services:
            continue

        future_slots = (
            db.execute(
                select(AvailabilitySlot).where(
                    AvailabilitySlot.facility_id == facility.id,
                    AvailabilitySlot.date >= today_str,
                    AvailabilitySlot.status == "AVAILABLE",
                )
            )
            .scalars()
            .all()
        )

        if len(future_slots) < 3:
            for date_str in upcoming_dates:
                existing_for_date = (
                    db.execute(
                        select(AvailabilitySlot).where(
                            AvailabilitySlot.facility_id == facility.id,
                            AvailabilitySlot.date == date_str,
                        )
                    )
                    .scalars()
                    .all()
                )
                if len(existing_for_date) == 0:
                    for idx, (start_time, end_time) in enumerate(DEMO_TIME_SLOTS):
                        service_id = services[idx % len(services)].id
                        slot = AvailabilitySlot(
                            facility_id=facility.id,
                            service_id=service_id,
                            date=date_str,
                            start_time=start_time,
                            end_time=end_time,
                            status="AVAILABLE",
                        )
                        db.add(slot)
    db.commit()


def seed_demo_data(db: Session) -> None:
    """
    Seed prototype facilities, services, schemes, mobile clinics, and demo patients.

    Safe to run repeatedly — checks existing records by name/mobile and ensures active availability slots.
    """
    logger.info("Checking and seeding demonstration healthcare facilities, schemes, clinics, and patients...")

    for fac_data in DEMO_FACILITIES:
        existing_fac = db.scalars(select(Facility).where(Facility.name == fac_data["name"])).first()
        if existing_fac is not None:
            continue

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

        # Create realistic dynamic upcoming availability slots for each date
        upcoming_dates = get_dynamic_upcoming_dates(7)
        for date_str in upcoming_dates:
            for idx, (start_time, end_time) in enumerate(DEMO_TIME_SLOTS):
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
        existing_sch = db.scalars(select(GovernmentScheme).where(GovernmentScheme.name == sch_data["name"])).first()
        if existing_sch is not None:
            continue

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
        existing_clinic = db.scalars(select(MobileClinic).where(MobileClinic.name == mc_data["name"])).first()
        if existing_clinic is not None:
            continue

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

    # Seed demo patient Ramesh Kumar (Maharashtra / Solapur)
    existing_patient_1 = db.scalars(select(Patient).where(Patient.mobile == "9876543210")).first()
    if not existing_patient_1:
        patient1 = Patient(
            mobile="9876543210",
            full_name="Ramesh Kumar",
            district="Solapur",
            abha_number="14-1234-5678-9012",
            consent=True,
        )
        db.add(patient1)
        db.flush()

        db.add(
            HealthJourneyEvent(
                patient_id=patient1.id,
                event_type="REGISTRATION",
                title="Patient Registration",
                description="Profile registered on Rural Care Navigator",
                event_date="2026-09-01",
            )
        )

    # Seed demo patient Murugan P (Tamil Nadu / Chengalpattu)
    existing_patient_2 = db.scalars(select(Patient).where(Patient.mobile == "9876543211")).first()
    if not existing_patient_2:
        patient2 = Patient(
            mobile="9876543211",
            full_name="Murugan P",
            district="Chengalpattu",
            abha_number="14-9876-5432-1098",
            consent=True,
        )
        db.add(patient2)
        db.flush()

        db.add(
            HealthJourneyEvent(
                patient_id=patient2.id,
                event_type="REGISTRATION",
                title="Patient Registration",
                description="Profile registered on Rural Care Navigator",
                event_date="2026-09-02",
            )
        )

    ensure_active_availability_slots(db)
    db.commit()
    logger.info("Demonstration data seeded and verified successfully.")


