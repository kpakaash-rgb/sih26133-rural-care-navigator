"""
repositories/otp_repository.py
==============================
Data access operations for OTPRecord entities.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from backend.app.models.otp import OTPRecord
from backend.app.repositories.base import BaseRepository


class OTPRepository(BaseRepository[OTPRecord]):
    """Repository handling database operations for OTP verification records."""

    def __init__(self, db: Session):
        super().__init__(OTPRecord, db)

    def get_latest_active_otp(self, mobile: str) -> Optional[OTPRecord]:
        """
        Fetch the most recent unused OTP for the specified mobile number.

        Args:
            mobile: Normalized 10-digit mobile number.

        Returns:
            Latest active OTPRecord or None.
        """
        stmt = (
            select(OTPRecord)
            .where(OTPRecord.mobile == mobile, OTPRecord.used.is_(False))
            .order_by(OTPRecord.id.desc())
        )
        return self.db.scalars(stmt).first()

    def invalidate_otps_for_mobile(self, mobile: str) -> int:
        """
        Mark all previous active OTPs for this mobile number as used/invalidated.

        Args:
            mobile: Normalized 10-digit mobile number.

        Returns:
            Count of invalidated records.
        """
        stmt = (
            update(OTPRecord)
            .where(OTPRecord.mobile == mobile, OTPRecord.used.is_(False))
            .values(used=True)
        )
        result = self.db.execute(stmt)
        self.db.flush()
        return result.rowcount

    def create_otp(
        self,
        mobile: str,
        otp_hash: str,
        expires_at: datetime,
    ) -> OTPRecord:
        """
        Persist a newly issued hashed OTP.

        Args:
            mobile:     Recipient mobile number.
            otp_hash:   Hashed OTP value.
            expires_at: Timestamp when OTP becomes invalid.

        Returns:
            Newly created OTPRecord instance.
        """
        return self.create(
            mobile=mobile,
            otp_hash=otp_hash,
            expires_at=expires_at,
            attempts=0,
            used=False,
        )

    def increment_attempts(self, otp_record: OTPRecord) -> OTPRecord:
        """Increment failed attempts counter on an OTP record."""
        otp_record.attempts += 1
        self.db.flush()
        self.db.refresh(otp_record)
        return otp_record

    def mark_used(self, otp_record: OTPRecord) -> OTPRecord:
        """Mark an OTP record as redeemed/used."""
        otp_record.used = True
        self.db.flush()
        self.db.refresh(otp_record)
        return otp_record
