"""
models/scheme.py
================
SQLAlchemy ORM model for Government Healthcare Schemes.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database.base import Base, TimestampMixin


class GovernmentScheme(Base, TimestampMixin):
    """
    Government healthcare welfare and insurance scheme.

    Attributes:
        id:                  Unique primary key ID.
        name:                Official scheme name.
        short_description:   Brief 1-2 sentence overview.
        description:         Detailed scheme objectives.
        eligibility:         Standard eligibility guidelines.
        benefits:            Coverage and financial benefits provided.
        application_process: Step-by-step application directions.
        official_link:       Official government portal URL.
        state:               State scope or 'National'.
        active:              Whether the scheme is currently active.
    """

    __tablename__ = "government_schemes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    short_description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    eligibility: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    benefits: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    application_process: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    official_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    state: Mapped[str] = mapped_column(String(100), default="National", nullable=False, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<GovernmentScheme id={self.id} name={self.name!r} state={self.state!r}>"
