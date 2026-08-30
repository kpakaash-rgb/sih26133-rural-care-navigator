# Rural Care Navigator - System Architecture

## Problem Statement
**SIH Problem Statement 26133**: "Accessibility and quality of public healthcare services, particularly in rural and underserved areas."

## Architectural Overview
A lightweight, modular healthcare access and care coordination platform designed to function reliably in low-bandwidth, rural healthcare environments.

### Core Modules
1. **Frontend (`/frontend`)**: Multi-role web interface supporting Patient, ASHA Worker, Doctor, and Administrative workflows.
2. **Backend Core (`/backend`)**: High-performance RESTful API powering core clinical flows, dispatch, triage routing, and records.
3. **AI Layer (`/ai`)**:
   - **Triage**: Symptom-based priority assessment & risk classification.
   - **Navigator**: Patient guidance, facility matching, and scheme eligibility.
   - **Suitability**: Doctor-facility matching based on equipment, specialist availability, and travel distance.
4. **Integrations (`/integrations`)**:
   - **ABDM**: Ayushman Bharat Digital Mission (ABHA creation, health record linking).
   - **SMS**: Low-connectivity notifications & follow-up reminders via SMS gateways.
   - **IVR**: Voice-driven access for non-smartphone / low-literacy users.
5. **Database (`/database`)**: Schema management, migrations, and synthetic seed datasets.
6. **Mock Data (`/mock-data`)**: Offline development datasets and rural healthcare fixtures.
