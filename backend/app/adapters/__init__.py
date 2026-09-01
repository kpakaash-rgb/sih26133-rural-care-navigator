"""
adapters/__init__.py
====================
Rural Care Navigator — External Integration Adapters package.

Adapters isolate external systems from business services.
Each integration type (SMS, AI, IVR, ABDM) has its own adapter module.

Replace policy:
  To swap providers, implement a new adapter class following the same interface.
  Services call adapter interfaces — never provider SDKs directly.

Structure (add as adapters are created in later phases):
    adapters/
    ├── sms/
    │   ├── base.py        (abstract interface)
    │   ├── mock.py        (mock implementation for tests)
    │   └── twilio.py      (real implementation — future)
    ├── ai/
    │   ├── base.py
    │   ├── mock.py
    │   └── gemini.py      (future)
    └── abdm/
        ├── base.py
        └── sandbox.py     (future)
"""
