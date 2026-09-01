"""
schemas/scheme.py
=================
Pydantic schemas for Government Healthcare Scheme discovery and relevance matching.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class GovernmentSchemeResponse(BaseModel):
    """Response representation of a government healthcare welfare scheme."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    short_description: Optional[str] = None
    description: Optional[str] = None
    eligibility: Optional[str] = None
    benefits: Optional[str] = None
    application_process: Optional[str] = None
    official_link: Optional[str] = None
    state: str
    active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RelevantSchemeResponse(BaseModel):
    """Scheme relevance summary for patient profile matching."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    short_description: Optional[str] = None
    state: str
    relevance: str = "Potentially relevant"
