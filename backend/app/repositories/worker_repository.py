"""
repositories/worker_repository.py
=================================
Data access operations for Worker entities (ASHA / ANM).
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.worker import Worker
from backend.app.repositories.base import BaseRepository


class WorkerRepository(BaseRepository[Worker]):
    """Repository handling database operations for Worker records."""

    def __init__(self, db: Session):
        super().__init__(Worker, db)

    def find_by_worker_id(self, worker_id: str) -> Optional[Worker]:
        """Look up worker by official worker_id string."""
        stmt = select(Worker).where(Worker.worker_id == worker_id)
        return self.db.scalars(stmt).first()

    def find_by_mobile(self, mobile: str) -> Optional[Worker]:
        """Look up worker by registered mobile number."""
        stmt = select(Worker).where(Worker.mobile == mobile)
        return self.db.scalars(stmt).first()

    def create_worker(
        self,
        worker_id: str,
        name: str,
        mobile: str,
        facility_id: int,
        role: str = "WORKER",
        password_hash: Optional[str] = None,
    ) -> Worker:
        """Create and persist a new frontline worker record."""
        return self.create(
            worker_id=worker_id,
            name=name,
            mobile=mobile,
            facility_id=facility_id,
            role=role,
            password_hash=password_hash,
        )

    def get_or_create_demo_worker(self) -> Worker:
        """Retrieve or seed the standard demo worker for SIH integration testing."""
        worker = self.find_by_worker_id("FHW-20841")
        if not worker:
            worker = self.find_by_mobile("9842182000")
        if not worker:
            worker = self.create_worker(
                worker_id="FHW-20841",
                name="Meena Devi",
                mobile="9842182000",
                facility_id=1,
                role="WORKER",
            )
        return worker
