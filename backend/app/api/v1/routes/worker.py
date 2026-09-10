"""
api/v1/routes/worker.py
=======================
Frontline Healthcare Worker routes.

Endpoints:
  GET /api/v1/worker/dashboard/stats — Live facility-isolated caseload and operational dashboard metrics
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AuthorizationError
from backend.app.core.response import success_response
from backend.app.core.security import TokenData, get_current_worker
from backend.app.database.connection import get_db
from backend.app.services.worker_service import WorkerService

router = APIRouter(prefix="/worker", tags=["Worker"])


def get_worker_service(db: Session = Depends(get_db)) -> WorkerService:
    """Dependency provider for WorkerService."""
    return WorkerService(db=db)


@router.get("/dashboard/stats", summary="Worker live dashboard statistics")
async def get_worker_dashboard_stats(
    current_worker: TokenData = Depends(get_current_worker),
    worker_service: WorkerService = Depends(get_worker_service),
):
    """
    Retrieve real operational statistics strictly isolated to the authenticated
    worker's assigned facility:
      - Total active registered patients
      - Pending follow-ups and referrals
      - Completed checkups today
      - Active urgent/emergency cases
      - High-risk emergency alert details
      - Top pending tasks queue
    """
    if not current_worker.facility_id:
        raise AuthorizationError("Worker is not assigned to a healthcare facility.")

    stats = worker_service.get_dashboard_stats(facility_id=current_worker.facility_id)
    return success_response(
        data=stats.model_dump(),
        message="Worker dashboard statistics retrieved successfully",
    )
