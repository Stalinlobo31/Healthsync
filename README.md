# HealthSync v3 — All Roles Fixed

This version keeps the visual style and layout of the supplied `healthsync_v3.zip`, but fixes the JavaScript so the role navigation actually works.

## Included roles

### Patient
- Overview
- My Reports
- My History
- Privacy
- Report detail view

### Licensed Doctor
- Overview
- Patients
- Reports
- Clinical Review
- Medical Knowledge
- Patient Messages

### Authorized Clinic
- Overview
- Patients
- Reports
- Access Log
- Clinic Team

### System Administrator
- Overview
- Users & Roles
- Doctor Verification
- Source Registry
- System Rules
- Audit Log

## Important
This is a static frontend prototype. Login/role switching is demo-only. Real authentication, authorization, encryption, OCR, report extraction, FastAPI, Supabase, trusted-source retrieval and AI/RAG are not implemented.

All health data shown is synthetic. The interface is not a diagnostic tool.

## Preview
Open `index.html` directly in a browser, or serve the folder with a local HTTP server.

## Production architecture target
Browser → FastAPI → Supabase Auth/Postgres/Storage → deterministic rule engine → approved evidence sources → AI/RAG.
