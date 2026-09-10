"""
models/worker.py
================
SQLAlchemy ORM model for Frontline Healthcare Workers (ASHA / ANM).
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base, TimestampMixin


class Worker(Base, TimestampMixin):
    """
    Frontline Healthcare Worker entity (e.g., ASHA, ANM).

    Attributes:
        id:            Unique primary key ID.
        worker_id:     Official worker identifier (e.g., 'FHW-20841').
        name:          Full name of the frontline worker.
        mobile:        Registered mobile number.
        role:          Role designation ('WORKER', 'ASHA', 'ANM').
        facility_id:   Primary Healthcare Centre (PHC) association.
        password_hash: Optional hashed password for worker portal authentication.
    """

    __tablename__ = "workers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    worker_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    mobile: Mapped[str] = mapped_column(String(15), unique=True, index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(30), default="WORKER", nullable=False)
    facility_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    facility = relationship("Facility")

    def __repr__(self) -> str:
        return f"<Worker id={self.id} worker_id={self.worker_id} name={self.name} facility_id={self.facility_id}>"
