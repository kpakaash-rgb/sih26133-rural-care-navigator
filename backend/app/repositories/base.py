"""
repositories/base.py
====================
Generic repository abstraction for the Rural Care Navigator backend.

Architecture:
  All domain repositories inherit from BaseRepository[T].
  Business services call repositories — they never use Session directly.
  This layer is the only place that knows about SQLAlchemy.

Replace policy:
  To replace SQLAlchemy with another ORM or data source:
    1. Create a new concrete repository class.
    2. Update the FastAPI dependency injection in the route file.
    3. Service and route code remains untouched.

Usage:
    class PatientRepository(BaseRepository[Patient]):
        # Inherit all CRUD methods automatically.
        # Add domain-specific methods here.
        def find_by_mobile(self, mobile: str) -> Optional[Patient]:
            return self.db.query(Patient).filter(
                Patient.mobile == mobile
            ).first()
"""

from __future__ import annotations

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database.base import Base

# T is the ORM model type (e.g., Patient, Appointment)
T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    """
    Generic CRUD repository for a single SQLAlchemy ORM model type.

    Provides standard create / read / update / delete operations.
    All database access in the application MUST go through a repository.
    """

    def __init__(self, model: Type[T], db: Session):
        """
        Args:
            model: The SQLAlchemy ORM model class (e.g., Patient).
            db:    The active SQLAlchemy session (injected via get_db dependency).
        """
        self.model = model
        self.db = db

    # ──────────────────────────────────────────────
    # Create
    # ──────────────────────────────────────────────

    def create(self, **kwargs) -> T:
        """
        Create and persist a new model instance.

        Args:
            **kwargs: Field names and values for the new record.

        Returns:
            The persisted model instance (with id populated after flush).
        """
        instance = self.model(**kwargs)
        self.db.add(instance)
        self.db.flush()    # Flush to get generated PK without committing
        self.db.refresh(instance)
        return instance

    # ──────────────────────────────────────────────
    # Read
    # ──────────────────────────────────────────────

    def get_by_id(self, record_id: Any) -> Optional[T]:
        """
        Fetch a single record by its primary key.

        Returns:
            Model instance or None if not found.
        """
        return self.db.get(self.model, record_id)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """
        Fetch all records with optional pagination.

        Args:
            skip:  Number of records to skip (offset).
            limit: Maximum number of records to return.

        Returns:
            List of model instances.
        """
        stmt = select(self.model).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count(self) -> int:
        """
        Count the total number of records in the table.

        Returns:
            Integer count.
        """
        from sqlalchemy import func as sa_func
        result = self.db.execute(
            select(sa_func.count()).select_from(self.model)
        )
        return result.scalar_one()

    def find_by(self, **filters) -> List[T]:
        """
        Fetch records matching all supplied keyword filters (AND logic).

        Example:
            repo.find_by(status="active", district="Pune")

        Args:
            **filters: Column name / value pairs to filter on.

        Returns:
            List of matching model instances.
        """
        stmt = select(self.model).filter_by(**filters)
        return list(self.db.scalars(stmt).all())

    def find_one_by(self, **filters) -> Optional[T]:
        """
        Fetch the first record matching the supplied filters.

        Returns:
            First matching model instance or None.
        """
        stmt = select(self.model).filter_by(**filters)
        return self.db.scalars(stmt).first()

    # ──────────────────────────────────────────────
    # Update
    # ──────────────────────────────────────────────

    def update(self, record_id: Any, **kwargs) -> Optional[T]:
        """
        Update fields on an existing record by primary key.

        Args:
            record_id: Primary key value.
            **kwargs:  Fields to update and their new values.

        Returns:
            Updated model instance or None if not found.
        """
        instance = self.get_by_id(record_id)
        if instance is None:
            return None

        for field, value in kwargs.items():
            if hasattr(instance, field):
                setattr(instance, field, value)

        self.db.flush()
        self.db.refresh(instance)
        return instance

    # ──────────────────────────────────────────────
    # Delete
    # ──────────────────────────────────────────────

    def delete(self, record_id: Any) -> bool:
        """
        Delete a record by primary key.

        Args:
            record_id: Primary key value.

        Returns:
            True if the record was found and deleted, False otherwise.
        """
        instance = self.get_by_id(record_id)
        if instance is None:
            return False

        self.db.delete(instance)
        self.db.flush()
        return True

    # ──────────────────────────────────────────────
    # Existence check
    # ──────────────────────────────────────────────

    def exists(self, record_id: Any) -> bool:
        """
        Check whether a record with the given primary key exists.

        Returns:
            True if the record exists, False otherwise.
        """
        return self.get_by_id(record_id) is not None
