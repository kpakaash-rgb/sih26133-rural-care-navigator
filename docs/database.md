# Rural Care Navigator - Database Design

## Schema Strategy
The database is structured to support relational integrity with future support for offline-first replication (for ASHA field visits).

## Key Entities
1. **Users & Roles**:
   - Patients, ASHA workers, Doctors, System Admins
2. **Healthcare Facilities**:
   - Primary Health Centres (PHC), Community Health Centres (CHC), District Hospitals (DH), Sub-Centres (SC)
   - Capabilities, active medical inventory, beds, specialist availability
3. **Clinical & Triage Encounters**:
   - Vitals, reported symptoms, triage risk tier, diagnostic recommendations
4. **Appointments & Referrals**:
   - Telemedicine sessions, physical visit referrals, transport coordination
5. **Care Continuity & Records**:
   - ABHA ID references, prescriptions, immunization records, follow-up logs
