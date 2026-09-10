"""
schemas/worker.py
=================
Pydantic schemas for Frontline Worker authentication and profiles.
"""

from __future__ import annotations

from typing import Optional
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
