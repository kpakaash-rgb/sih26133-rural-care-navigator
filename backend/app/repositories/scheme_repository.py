"""
repositories/scheme_repository.py
=================================
Data access operations for Government Healthcare Schemes.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.models.scheme import GovernmentScheme
from backend.app.repositories.base import BaseRepository


class SchemeRepository(BaseRepository[GovernmentScheme]):
    """Repository handling database queries for Government Healthcare Schemes."""

    def __init__(self, db: Session):
        super().__init__(GovernmentScheme, db)

    def list_active(
        self,
        state: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[GovernmentScheme]:
        """
        List active schemes, with optional filtering by state and keyword search.

        Case-insensitive keyword search against name, short_description, and benefits.
        """
        stmt = select(GovernmentScheme).where(GovernmentScheme.active.is_(True))

        if state:
            stmt = stmt.where(
                or_(
                    GovernmentScheme.state.ilike(f"%{state}%"),
                    GovernmentScheme.state.ilike("National"),
                )
            )

        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    GovernmentScheme.name.ilike(pattern),
                    GovernmentScheme.short_description.ilike(pattern),
                    GovernmentScheme.description.ilike(pattern),
                    GovernmentScheme.benefits.ilike(pattern),
                    GovernmentScheme.eligibility.ilike(pattern),
                )
            )

        stmt = stmt.order_by(GovernmentScheme.name.asc())
        return list(self.db.scalars(stmt).all())

    def create_scheme(
        self,
        name: str,
        short_description: Optional[str] = None,
        description: Optional[str] = None,
        eligibility: Optional[str] = None,
        benefits: Optional[str] = None,
        application_process: Optional[str] = None,
        official_link: Optional[str] = None,
        state: str = "National",
        active: bool = True,
    ) -> GovernmentScheme:
        """Create and persist a new Government Scheme record."""
        return self.create(
            name=name,
            short_description=short_description,
            description=description,
            eligibility=eligibility,
            benefits=benefits,
            application_process=application_process,
            official_link=official_link,
            state=state,
            active=active,
        )
