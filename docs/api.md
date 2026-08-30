# Rural Care Navigator - API Specifications

## Overview
This document outlines the API design conventions, planned endpoints, and contract guidelines across modules.

## Standard Conventions
- **Base URL**: `/api/v1`
- **Format**: JSON (UTF-8)
- **Authentication**: JWT / Bearer token
- **Response Structure**:
  ```json
  {
    "success": true,
    "data": {},
    "message": "Operation successful",
    "timestamp": "2026-08-30T18:00:00Z"
  }
  ```

## Planned Route Groups
- `/api/v1/auth`: Authentication & Role Management (Patient, ASHA, Doctor, Admin)
- `/api/v1/patients`: Patient registration, vitals, profile & ABHA link
- `/api/v1/triage`: Symptom evaluation, preliminary priority scoring
- `/api/v1/navigation`: Facility finder, service suitability, queue status
- `/api/v1/appointments`: Teleconsultation & physical visit booking
- `/api/v1/asha`: Field visits, offline cache sync, household registry
- `/api/v1/integrations`: ABDM / SMS / IVR webhook endpoints
