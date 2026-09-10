"""
services/worker_service.py
==========================
Frontline Worker operational service.

Provides real, facility-isolated dashboard statistics, caseload overviews,
and prioritized queue metrics for community healthcare workers (ASHA/ANM).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.models.facility import Facility
from backend.app.models.follow_up import FollowUp
from backend.app.models.patient import Patient
from backend.app.models.referral import Referral
from backend.app.models.screening import Screening
from backend.app.repositories.follow_up_repository import FollowUpRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.referral_repository import ReferralRepository
from backend.app.repositories.screening_repository import ScreeningRepository
from backend.app.schemas.worker import (
    WorkerDashboardStatsResponse,
    WorkerDashboardTask,
    WorkerDashboardUrgentAlert,
)


class WorkerService:
    """Business logic for Frontline Healthcare Worker workflows and dashboard metrics."""

    def __init__(
        self,
        db: Session,
        patient_repo: Optional[PatientRepository] = None,
        follow_up_repo: Optional[FollowUpRepository] = None,
        referral_repo: Optional[ReferralRepository] = None,
        screening_repo: Optional[ScreeningRepository] = None,
    ):
        self.db = db
        self.patient_repo = patient_repo or PatientRepository(db)
        self.follow_up_repo = follow_up_repo or FollowUpRepository(db)
        self.referral_repo = referral_repo or ReferralRepository(db)
        self.screening_repo = screening_repo or ScreeningRepository(db)

    def get_dashboard_stats(self, facility_id: int) -> WorkerDashboardStatsResponse:
        """
        Calculate and aggregate real operational statistics strictly isolated
        to the authenticated worker's assigned facility.

        Args:
            facility_id: Mandatory facility identifier from authenticated worker JWT.

        Returns:
            WorkerDashboardStatsResponse with validated live figures.
        """
        now_utc = datetime.now(timezone.utc)
        today_date = now_utc.date()
        today_str = now_utc.strftime("%Y-%m-%d")

        # 1. Real Patients associated with this facility
        total_patients = (
            self.db.query(func.count(Patient.id))
            .filter(Patient.facility_id == facility_id)
            .scalar()
            or 0
        )

        # 2. Facility Follow-Ups
        facility_follow_ups = self.follow_up_repo.get_follow_ups_by_facility(facility_id)
        pending_follow_ups = [f for f in facility_follow_ups if f.status == "PENDING"]
        follow_ups_due = len(pending_follow_ups)

        completed_today = len([
            f for f in facility_follow_ups
            if f.status == "COMPLETED"
            and (
                (f.updated_at and f.updated_at.date() == today_date)
                or f.follow_up_date == today_str
            )
        ])

        # 3. Facility Referrals
        facility_referrals = self.referral_repo.get_referrals_by_facility(facility_id)
        pending_referrals_list = [r for r in facility_referrals if r.status == "PENDING"]
        pending_referrals = len(pending_referrals_list)

        # 4. Screenings conducted today at this facility
        facility_screenings = list(
            self.db.scalars(
                select(Screening).where(Screening.facility_id == facility_id)
            ).all()
        )
        today_screenings = len([
            s for s in facility_screenings
            if s.screened_at and s.screened_at.date() == today_date
        ])

        # Total pending tasks
        pending_tasks = follow_ups_due + pending_referrals

        # 5. Urgent / Priority Cases
        urgent_referrals = [
            r for r in pending_referrals_list
            if r.priority in ("URGENT", "EMERGENCY")
        ]

        urgent_screenings = list(
            self.db.scalars(
                select(Screening)
                .where(
                    Screening.facility_id == facility_id,
                    Screening.triage_level.in_(["URGENT", "ATTENTION"]),
                )
                .order_by(Screening.screened_at.desc())
                .limit(10)
            ).all()
        )

        urgent_cases_count = len(urgent_referrals) + len(urgent_screenings)

        # 6. Urgent Alert Construction
        urgent_alert: Optional[WorkerDashboardUrgentAlert] = None
        if urgent_referrals:
            # Sort with EMERGENCY first
            sorted_urgent_refs = sorted(
                urgent_referrals,
                key=lambda r: (0 if r.priority == "EMERGENCY" else 1, -(r.id or 0)),
            )
            top_ref = sorted_urgent_refs[0]
            urgent_alert = WorkerDashboardUrgentAlert(
                has_urgent=True,
                patient_id=top_ref.patient_id,
                patient_name=top_ref.patient.full_name if top_ref.patient else f"Patient #{top_ref.patient_id}",
                triage_level="TRIAGE LEVEL 1" if top_ref.priority == "EMERGENCY" else "TRIAGE LEVEL 2",
                priority=top_ref.priority,
                reason=top_ref.reason or "Urgent specialized referral pending action",
                village=top_ref.patient.village if top_ref.patient else None,
                created_at=top_ref.created_at.isoformat() if top_ref.created_at else None,
                source_type="REFERRAL",
            )
        elif urgent_screenings:
            top_sc = urgent_screenings[0]
            urgent_alert = WorkerDashboardUrgentAlert(
                has_urgent=True,
                patient_id=top_sc.patient_id,
                patient_name=top_sc.patient.full_name if top_sc.patient else f"Patient #{top_sc.patient_id}",
                triage_level="TRIAGE LEVEL 1" if top_sc.triage_level == "URGENT" else "TRIAGE LEVEL 2",
                priority=top_sc.triage_level or "ATTENTION",
                reason=top_sc.notes or (f"High vitals / symptoms observed: {top_sc.symptoms}" if top_sc.symptoms else "High risk screening observed"),
                village=top_sc.patient.village if top_sc.patient else None,
                created_at=top_sc.screened_at.isoformat() if top_sc.screened_at else None,
                source_type="SCREENING",
            )
        else:
            urgent_alert = WorkerDashboardUrgentAlert(
                has_urgent=False,
                patient_id=None,
                patient_name=None,
                triage_level="NORMAL",
                priority="ROUTINE",
                reason="All community health patients in your sector are currently stable.",
                village=None,
                created_at=None,
                source_type=None,
            )

        # 7. Recent Tasks for "Today's Tasks"
        recent_tasks: List[WorkerDashboardTask] = []

        # Convert follow-ups
        for fu in pending_follow_ups[:4]:
            p_name = fu.patient.full_name if fu.patient else f"Patient #{fu.patient_id}"
            village = fu.patient.village if fu.patient else "Assigned Sector"
            recent_tasks.append(
                WorkerDashboardTask(
                    id=fu.id,
                    task_type="FOLLOW_UP",
                    patient_id=fu.patient_id,
                    patient_name=p_name,
                    village=village,
                    title="Patient follow-up",
                    desc=fu.notes or "Scheduled recovery & vitals monitoring check",
                    time=fu.follow_up_date or "Today",
                    status="Pending",
                    status_color="#D97706",
                    status_bg="#FFFBEB",
                    priority="ROUTINE",
                )
            )

        # Convert referrals
        for ref in pending_referrals_list[:4]:
            p_name = ref.patient.full_name if ref.patient else f"Patient #{ref.patient_id}"
            village = ref.patient.village if ref.patient else "Assigned Sector"
            is_urgent = ref.priority in ("URGENT", "EMERGENCY")
            recent_tasks.append(
                WorkerDashboardTask(
                    id=ref.id,
                    task_type="REFERRAL",
                    patient_id=ref.patient_id,
                    patient_name=p_name,
                    village=village,
                    title="Specialist referral follow-up",
                    desc=ref.reason or "Facility referral coordination",
                    time=ref.created_at.strftime("%I:%M %p") if ref.created_at else "Today",
                    status="Urgent" if is_urgent else "Pending",
                    status_color="#DC2626" if is_urgent else "#2563EB",
                    status_bg="#FEF2F2" if is_urgent else "#EFF6FF",
                    priority=ref.priority or "ROUTINE",
                )
            )

        # Sort tasks: Urgent tasks first, then others (limit 5)
        recent_tasks.sort(
            key=lambda t: (0 if t.priority in ("EMERGENCY", "URGENT") else 1, t.id),
        )
        recent_tasks = recent_tasks[:5]

        return WorkerDashboardStatsResponse(
            total_patients=total_patients,
            pending_tasks=pending_tasks,
            urgent_cases=urgent_cases_count,
            completed_today=completed_today,
            follow_ups_due=follow_ups_due,
            pending_referrals=pending_referrals,
            today_screenings=today_screenings,
            urgent_alert=urgent_alert,
            recent_tasks=recent_tasks,
        )
