"""
models/otp.py
=============
SQLAlchemy ORM model for One-Time Password (OTP) records.

Stores hashed OTPs with expiry timestamps and attempt tracking.
OTPs are invalidated once verified or when max attempts are exceeded.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database.base import Base, TimestampMixin


class OTPRecord(Base, TimestampMixin):
    """
    One-Time Password record for mobile authentication.

    Attributes:
        id:         Unique primary key.
        mobile:     10-digit mobile number associated with this OTP request.
        otp_hash:   Cryptographic hash of the OTP (never stored in plain text).
        expires_at: Timestamp after which this OTP is invalid.
        attempts:   Number of failed verification attempts.
        used:       Whether the OTP has been successfully redeemed or invalidated.
    """

    __tablename__ = "otp_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mobile: Mapped[str] = mapped_column(String(15), index=True, nullable=False)
    otp_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:
        return f"<OTPRecord id={self.id} mobile={self.mobile} used={self.used}>"
