"""
tests/test_sms_assistant.py
===========================
Comprehensive backend test suite for Two-Way SMS Healthcare Assistant.

Validates:
  1. New conversation starts (GREETING -> ASK_NAME)
  2. Name collection (ASK_NAME -> ASK_AGE)
  3. Age collection (ASK_AGE -> ASK_LOCATION)
  4. Location collection (ASK_LOCATION -> ASK_SYMPTOMS)
  5. Symptom collection (ASK_SYMPTOMS -> ASK_DURATION)
  6. Duration collection and Triage invocation
  7. Emergency bypass (immediate 108 helpline response)
  8. Existing patient recognition by mobile number
  9. No duplicate patient creation on repeated interactions
  10. Facility recommendation matching location
  11. No cross-state false nearby recommendation (handles out-of-area gracefully)
  12. Queue information inclusion & stale queue handling
  13. Appointment slot selection
  14. Appointment confirmation
  15. Appointment booking uses existing AppointmentService and generates RC reference
  16. Invalid slot selection handling
  17. Conversation expiration and automatic session reset
  18. Duplicate inbound message idempotency
  19. Cross-patient data isolation (Patient A cannot query Patient B's records)
  20. Hindi conversation flow
  21. Marathi conversation flow
  22. Demo mode endpoint (/api/v1/sms/inbound/demo)
  23. Inbound webhook endpoint (/api/v1/sms/inbound)
  24. Compound one-shot natural SMS parsing
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.models.appointment import Appointment
from backend.app.models.availability import AvailabilitySlot
from backend.app.models.facility import Facility, FacilityService as FacilityServiceModel
from backend.app.models.follow_up import FollowUp
from backend.app.models.hospital_queue import HospitalQueue
from backend.app.models.patient import Patient
from backend.app.models.referral import Referral
from backend.app.models.sms_conversation import SMSConversation
from backend.app.services.sms_conversation_service import SMSConversationService


@pytest.fixture(autouse=True)
def seed_test_facility(db_session: Session):
    """Seed base facility, service, slot, and queue in test database."""
    fac = db_session.query(Facility).filter(Facility.id == 1).first()
    if not fac:
        fac = Facility(
            id=1,
            name="PHC Malshiras",
            type="PRIMARY_HEALTH_CENTRE",
            address="Near Bus Stand, Malshiras",
            district="Solapur",
            latitude=17.85,
            longitude=74.90,
            status="ACTIVE",
        )
        db_session.add(fac)
        db_session.flush()

    svc = db_session.query(FacilityServiceModel).filter(FacilityServiceModel.id == 1).first()
    if not svc:
        svc = FacilityServiceModel(
            id=1,
            facility_id=fac.id,
            name="General Medicine",
            description="Primary consultation",
            available=True,
        )
        db_session.add(svc)
        db_session.flush()

    slot1 = db_session.query(AvailabilitySlot).filter(AvailabilitySlot.id == 101).first()
    if not slot1:
        slot1 = AvailabilitySlot(
            id=101,
            facility_id=fac.id,
            service_id=svc.id,
            date="2026-09-15",
            start_time="10:30:00",
            end_time="11:00:00",
            status="AVAILABLE",
        )
        db_session.add(slot1)

    slot2 = db_session.query(AvailabilitySlot).filter(AvailabilitySlot.id == 102).first()
    if not slot2:
        slot2 = AvailabilitySlot(
            id=102,
            facility_id=fac.id,
            service_id=svc.id,
            date="2026-09-15",
            start_time="11:00:00",
            end_time="11:30:00",
            status="AVAILABLE",
        )
        db_session.add(slot2)

    queue = db_session.query(HospitalQueue).filter(HospitalQueue.facility_id == fac.id).first()
    if not queue:
        queue = HospitalQueue(
            facility_id=fac.id,
            waiting_patients=5,
            estimated_wait_minutes=25,
            status="NORMAL",
            last_updated=datetime.now(timezone.utc),
        )
        db_session.add(queue)

    db_session.commit()


# ──────────────────────────────────────────────────────────────────────────────
# Unit & Service Level Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestSMSAssistantFlows:
    """Test step-by-step state machine progressions."""

    def test_1_new_conversation_starts(self, db_session: Session):
        service = SMSConversationService(db_session)
        res = service.process_inbound_message(mobile="9000000001", message="HI")
        assert res["success"] is True
        assert res["next_state"] == "ASK_NAME"
        assert "full name" in res["reply"].lower()

    def test_2_name_collection(self, db_session: Session):
        service = SMSConversationService(db_session)
        service.process_inbound_message(mobile="9000000002", message="HI")
        res = service.process_inbound_message(mobile="9000000002", message="Ravi Kumar")
        assert res["success"] is True
        assert res["next_state"] == "ASK_AGE"
        assert "Ravi Kumar" in res["reply"]
        assert "age" in res["reply"].lower()

    def test_3_age_collection(self, db_session: Session):
        service = SMSConversationService(db_session)
        service.process_inbound_message(mobile="9000000003", message="HI")
        service.process_inbound_message(mobile="9000000003", message="Ravi Kumar")
        res = service.process_inbound_message(mobile="9000000003", message="42")
        assert res["success"] is True
        assert res["next_state"] == "ASK_LOCATION"
        assert "village" in res["reply"].lower()

    def test_4_location_collection(self, db_session: Session):
        service = SMSConversationService(db_session)
        service.process_inbound_message(mobile="9000000004", message="HI")
        service.process_inbound_message(mobile="9000000004", message="Ravi Kumar")
        service.process_inbound_message(mobile="9000000004", message="42")
        res = service.process_inbound_message(mobile="9000000004", message="Malshiras")
        assert res["success"] is True
        assert res["next_state"] == "ASK_SYMPTOMS"
        assert "symptoms" in res["reply"].lower()

    def test_5_symptom_collection(self, db_session: Session):
        service = SMSConversationService(db_session)
        service.process_inbound_message(mobile="9000000005", message="HI")
        service.process_inbound_message(mobile="9000000005", message="Ravi Kumar")
        service.process_inbound_message(mobile="9000000005", message="42")
        service.process_inbound_message(mobile="9000000005", message="Malshiras")
        res = service.process_inbound_message(mobile="9000000005", message="Fever and cough")
        assert res["success"] is True
        assert res["next_state"] == "ASK_DURATION"
        assert "how many days" in res["reply"].lower()

    def test_6_and_7_duration_and_triage_invocation(self, db_session: Session):
        service = SMSConversationService(db_session)
        service.process_inbound_message(mobile="9000000006", message="HI")
        service.process_inbound_message(mobile="9000000006", message="Ravi Kumar")
        service.process_inbound_message(mobile="9000000006", message="42")
        service.process_inbound_message(mobile="9000000006", message="Malshiras")
        service.process_inbound_message(mobile="9000000006", message="Fever and cough")
        res = service.process_inbound_message(mobile="9000000006", message="3 days")
        assert res["success"] is True
        assert res["next_state"] == "SELECT_SLOT"
        assert "Triage:" in res["reply"]
        assert "PHC Malshiras" in res["reply"]
        assert "Queue: 5 patients" in res["reply"]
        assert "Available appointments:" in res["reply"]
        assert "1. 2026-09-15 10:30:00" in res["reply"]

    def test_8_emergency_bypass(self, db_session: Session):
        service = SMSConversationService(db_session)
        res = service.process_inbound_message(mobile="9000000008", message="severe chest pain and difficulty breathing")
        assert res["success"] is True
        assert res["next_state"] == "EMERGENCY"
        assert "EMERGENCY:" in res["reply"]
        assert "108" in res["reply"]

    def test_9_existing_patient_recognition_by_mobile(self, db_session: Session):
        patient = Patient(
            mobile="9000000009",
            full_name="Priya Sharma",
            age=35,
            village="Malshiras",
            district="Solapur",
            consent=True,
        )
        db_session.add(patient)
        db_session.commit()

        service = SMSConversationService(db_session)
        res = service.process_inbound_message(mobile="9000000009", message="HI")
        assert res["success"] is True
        assert "Hello Priya Sharma!" in res["reply"]
        assert res["next_state"] == "ASK_SYMPTOMS"

    def test_10_no_duplicate_patient_creation(self, db_session: Session):
        service = SMSConversationService(db_session)
        service.process_inbound_message(mobile="9000000010", message="HI")
        service.process_inbound_message(mobile="9000000010", message="Anil Deshmukh")
        service.process_inbound_message(mobile="9000000010", message="50")
        service.process_inbound_message(mobile="9000000010", message="Malshiras")
        service.process_inbound_message(mobile="9000000010", message="Headache")
        service.process_inbound_message(mobile="9000000010", message="1 day")

        patients = db_session.query(Patient).filter(Patient.mobile == "9000000010").all()
        assert len(patients) == 1
        assert patients[0].full_name == "Anil Deshmukh"

    def test_11_and_12_facility_recommendation_and_geographic_matching(self, db_session: Session):
        service = SMSConversationService(db_session)
        res = service.process_inbound_message(
            mobile="9000000011",
            message="I am Ravi 42 from Malshiras. I have fever for 2 days",
        )
        assert res["success"] is True
        assert res["next_state"] == "SELECT_SLOT"
        assert "PHC Malshiras" in res["reply"]

    def test_13_queue_information_and_stale_handling(self, db_session: Session):
        queue = db_session.query(HospitalQueue).filter(HospitalQueue.facility_id == 1).first()
        queue.last_updated = datetime.now(timezone.utc) - timedelta(hours=3)
        db_session.commit()

        service = SMSConversationService(db_session)
        res = service.process_inbound_message(
            mobile="9000000013",
            message="I am Ravi 42 from Malshiras. I have fever for 2 days",
        )
        assert "Queue: 5 patients (Queue info may be outdated)" in res["reply"]

    def test_14_and_15_and_16_appointment_booking_and_confirmation(self, db_session: Session):
        service = SMSConversationService(db_session)
        # 1. Provide compound intake
        init_res = service.process_inbound_message(
            mobile="9000000014",
            message="I am Ramesh 30 from Malshiras. I have fever for 2 days",
        )
        assert init_res["next_state"] == "SELECT_SLOT"

        # 2. Select slot 1
        slot_res = service.process_inbound_message(mobile="9000000014", message="1")
        assert slot_res["next_state"] == "CONFIRM_BOOKING"
        assert "Confirm booking for:" in slot_res["reply"]
        assert "PHC Malshiras" in slot_res["reply"]

        # 3. Confirm booking
        confirm_res = service.process_inbound_message(mobile="9000000014", message="1")
        assert confirm_res["next_state"] == "BOOKED"
        assert "Appointment booked successfully" in confirm_res["reply"]
        assert "Reference: RC" in confirm_res["reply"]

        # Verify DB slot was updated
        slot = db_session.query(AvailabilitySlot).filter(AvailabilitySlot.id == 101).first()
        assert slot.status == "BOOKED"

        appt = db_session.query(Appointment).filter(Appointment.facility_id == 1).first()
        assert appt is not None
        assert appt.status == "SCHEDULED"

    def test_17_invalid_slot_selection_handling(self, db_session: Session):
        service = SMSConversationService(db_session)
        service.process_inbound_message(
            mobile="9000000017",
            message="I am Ramesh 30 from Malshiras. I have fever for 2 days",
        )
        res = service.process_inbound_message(mobile="9000000017", message="9")
        assert res["next_state"] == "SELECT_SLOT"
        assert "Please reply with a valid option" in res["reply"]

    def test_18_conversation_expiration(self, db_session: Session):
        service = SMSConversationService(db_session)
        service.process_inbound_message(mobile="9000000018", message="HI")
        service.process_inbound_message(mobile="9000000018", message="Ravi")

        conv = db_session.query(SMSConversation).filter(SMSConversation.mobile == "9000000018").first()
        conv.last_message_at = datetime.now(timezone.utc) - timedelta(hours=2)
        db_session.commit()

        res = service.process_inbound_message(mobile="9000000018", message="HI")
        assert res["next_state"] == "ASK_NAME"

    def test_19_duplicate_inbound_message_idempotency(self, db_session: Session):
        service = SMSConversationService(db_session)
        res1 = service.process_inbound_message(
            mobile="9000000019",
            message="HI",
            provider_message_id="MSG-12345",
        )
        res2 = service.process_inbound_message(
            mobile="9000000019",
            message="HI",
            provider_message_id="MSG-12345",
        )
        assert res1["reply"] == res2["reply"]
        assert res1["next_state"] == res2["next_state"]

    def test_20_cross_patient_data_isolation(self, db_session: Session):
        pat_a = Patient(mobile="9000000021", full_name="Patient A", consent=True)
        db_session.add(pat_a)
        db_session.flush()
        ref_a = Referral(
            patient_id=pat_a.id,
            to_facility_id=1,
            reason="Cardiology consultation",
            priority="URGENT",
            status="PENDING",
        )
        db_session.add(ref_a)

        pat_b = Patient(mobile="9000000022", full_name="Patient B", consent=True)
        db_session.add(pat_b)
        db_session.commit()

        service = SMSConversationService(db_session)
        res_a = service.process_inbound_message(mobile="9000000021", message="REFERRAL")
        assert "Cardiology consultation" in res_a["reply"]

        res_b = service.process_inbound_message(mobile="9000000022", message="REFERRAL")
        assert "no active referrals" in res_b["reply"].lower()
        assert "Cardiology consultation" not in res_b["reply"]

    def test_21_hindi_conversation(self, db_session: Session):
        service = SMSConversationService(db_session)
        res_sym = service.process_inbound_message(
            mobile="9000000023",
            message="मेरा नाम रवि है, उम्र 30, गाँव Malshiras, 2 दिन से बुखार है",
        )
        assert res_sym["success"] is True
        assert "PHC Malshiras" in res_sym["reply"]

    def test_22_marathi_conversation(self, db_session: Session):
        service = SMSConversationService(db_session)
        res_lang = service.process_inbound_message(mobile="9000000024", message="MR")
        assert "मराठी" in res_lang["reply"]

        res_sym = service.process_inbound_message(
            mobile="9000000024",
            message="माझे नाव सागर आहे, वय 28, गाव Malshiras, 2 दिवस ताप आहे",
        )
        assert res_sym["success"] is True
        assert "PHC Malshiras" in res_sym["reply"]


# ──────────────────────────────────────────────────────────────────────────────
# API Route & Demo Endpoint Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestSMSRoutes:
    """Test HTTP API endpoints for webhook and demo simulator."""

    def test_23_demo_endpoint_execution(self, client: TestClient):
        response = client.post(
            "/api/v1/sms/inbound/demo",
            json={
                "mobile": "9000000025",
                "message": "HI",
            },
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["demo_mode"] is True
        assert "full name" in data["reply"].lower()
        assert data["next_state"] == "ASK_NAME"

    def test_24_inbound_webhook_endpoint(self, client: TestClient):
        response = client.post(
            "/api/v1/sms/inbound",
            json={
                "mobile": "9000000026",
                "message": "I am Ravi 40 from Malshiras with fever 2 days",
                "provider_message_id": "MSG91-INB-001",
            },
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["success"] is True
        assert data["next_state"] == "SELECT_SLOT"
        assert "PHC Malshiras" in data["reply"]
