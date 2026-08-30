# Team Rules & Collaboration Guidelines

## Branching & Workflow
1. **Main Branch (`main`)**: Production-ready code only.
2. **Development Branch (`develop`)**: Integration branch for all tested feature branches.
3. **Feature Branches**:
   - `feature/frontend-<role/feature>`
   - `feature/backend-<module>`
   - `feature/ai-<triage|navigator|suitability>`
   - `feature/integrations-<abdm|sms|ivr>`
   - `feature/database-<migration>`

## Modular Ownership
To ensure seamless collaboration among team members:
- **Developer 1 (Frontend)**: Work strictly inside `/frontend` without cross-modifying backend or AI directly.
- **Developer 2 (Backend Core & API)**: Work inside `/backend`.
- **Developer 3 (AI & Decision Support)**: Work inside `/ai`.
- **Developer 4 (Integrations)**: Work inside `/integrations` (ABDM, SMS, IVR connectors).
- **Developer 5 (Data & DevOps)**: Work inside `/database` and `/mock-data`.

## Code Guidelines
- Keep all modules loosely coupled through clearly defined API contracts in `docs/api.md`.
- No direct hardcoded credentials or database URLs; always use `.env` patterns.
- Ensure all offline / low-connectivity edge cases are considered during design.
