from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base, TimestampMixin


class HospitalQueue(Base, TimestampMixin):
    """
    Current queue status for a healthcare facility.

    This is prototype/live-status data used by the hospital
    recommendation engine.
    """

    __tablename__ = "hospital_queues"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    facility_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("facilities.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    waiting_patients: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    estimated_wait_minutes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="NORMAL",
        nullable=False,
    )

    last_updated: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    facility = relationship("Facility")