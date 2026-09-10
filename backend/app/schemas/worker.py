"""
schemas/worker.py
=================
Pydantic schemas for Frontline Worker authentication and profiles.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class WorkerLoginRequest(BaseModel):
    """Payload for frontline worker authentication."""
    worker_id: Optional[str] = Field(None, description="Official worker ID (e.g., 'FHW-20841')")
    mobile: Optional[str] = Field(None, description="10-digit mobile number")
    password: str = Field(..., min_length=4, description="Password / MPIN")


class WorkerProfileResponse(BaseModel):
    """Public authenticated profile representation of a worker."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    worker_id: str
    name: str
    mobile: str
    role: str
    facility_id: int
    facility_name: Optional[str] = None


class WorkerAuthResponse(BaseModel):
    """Response containing JWT and worker details upon successful login."""
    access_token: str
    token_type: str = "bearer"
    role: str = "WORKER"
    worker: WorkerProfileResponse


class WorkerDashboardUrgentAlert(BaseModel):
    """Urgent emergency or high-risk alert details for the facility dashboard."""
    has_urgent: bool = False
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    triage_level: Optional[str] = None
    priority: Optional[str] = None
    reason: Optional[str] = None
    village: Optional[str] = None
    created_at: Optional[str] = None
    source_type: Optional[str] = None


class WorkerDashboardTask(BaseModel):
    """Single frontline task item for the dashboard view."""
    id: int
    task_type: str
    patient_id: int
    patient_name: str
    village: Optional[str] = None
    title: str
    desc: str
    time: str
    status: str
    status_color: str
    status_bg: str
    priority: Optional[str] = None


class WorkerDashboardStatsResponse(BaseModel):
    """Facility-scoped live operational metrics for the worker dashboard."""
    total_patients: int = 0
    pending_tasks: int = 0
    urgent_cases: int = 0
    completed_today: int = 0
    follow_ups_due: int = 0
    pending_referrals: int = 0
    today_screenings: int = 0
    urgent_alert: Optional[WorkerDashboardUrgentAlert] = None
    recent_tasks: List[WorkerDashboardTask] = []
