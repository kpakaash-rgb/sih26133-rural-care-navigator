"""
database/base.py
================
SQLAlchemy declarative base and shared mixins for the Rural Care Navigator.

All ORM models MUST inherit from Base (and optionally TimestampMixin).
This is the only file that imports from sqlalchemy.orm directly —
the rest of the codebase uses this abstraction.

Replace policy:
  If switching from SQLAlchemy to another ORM, only this file and
  connection.py need changing. Models remain structurally identical.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """
    SQLAlchemy 2.0 declarative base class.

    All database models inherit from this class:
        class Patient(Base):
            __tablename__ = "patients"
            ...
    """
    pass


class TimestampMixin:
    """
    Mixin that adds created_at and updated_at columns to any model.

    Usage:
        class Appointment(Base, TimestampMixin):
            __tablename__ = "appointments"
            ...

    Both columns are timezone-aware UTC datetimes managed by the database.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
