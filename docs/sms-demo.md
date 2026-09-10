# SIH 26133 — Two-Way SMS Healthcare Assistant Demo Guide

This document describes the live demonstration workflow for the **Two-Way SMS Healthcare Assistant** built for non-smartphone / feature-phone users in rural areas.

---

## 1. Overview & Architecture

The system enables any patient with a basic phone to send simple SMS messages to interact with Rural Care Navigator:
- **Zero App Required**: Works via standard GSM SMS.
- **Provider-Neutral Gateway**: Supports MSG91, DLT SMS gateways, and local simulation.
- **Unified Clinical Backend**: Directly executes the transparent, rule-based triage engine (`run_triage()`), searches PostgreSQL for nearby facilities with live queues, and schedules appointments via `AppointmentService`.

---

## 2. Live Demo Script (Step-by-Step)

You can test this flow via `POST /api/v1/sms/inbound/demo` or the live SMS webhook `POST /api/v1/sms/inbound`.

### Step 1: Start Conversation
**Patient SMS**:
```text
HI
```
**System Response**:
```text
Welcome to Rural Care Navigator. Please reply with your full name.
(Reply HI for Hindi, MR for Marathi)
```
*(Conversation State: `ASK_NAME`)*

---

### Step 2: Patient Name
**Patient SMS**:
```text
Ravi
```
**System Response**:
```text
Thank you Ravi. Please reply with your age.
```
*(Conversation State: `ASK_AGE`)*

---

### Step 3: Patient Age
**Patient SMS**:
```text
42
```
**System Response**:
```text
Please reply with your village or town name (e.g. Malshiras).
```
*(Conversation State: `ASK_LOCATION`)*

---

### Step 4: Patient Location / Village
**Patient SMS**:
```text
Malshiras
```
**System Response**:
```text
What symptoms are you experiencing? (e.g. fever, cough, stomach pain)
```
*(Conversation State: `ASK_SYMPTOMS`)*

---

### Step 5: Symptom Description
**Patient SMS**:
```text
Fever and cough
```
**System Response**:
```text
How many days have you had these symptoms? (e.g. 2 days)
```
*(Conversation State: `ASK_DURATION`)*

---

### Step 6: Duration, Triage, Facility & Queue
**Patient SMS**:
```text
3 days
```
**System Response**:
```text
Triage: Your symptoms should be assessed by a healthcare professional.

Recommended Facility:
PHC Malshiras
Queue: 5 patients (~25 min wait)

Available appointments:
1. 2026-09-12 10:30 AM (General Medicine)
2. 2026-09-12 11:00 AM (General Medicine)

Reply 1 or 2 to book, or 2 for Facility info.
```
*(Conversation State: `SELECT_SLOT`)*

---

### Step 7: Select Appointment Slot
**Patient SMS**:
```text
1
```
**System Response**:
```text
Confirm booking for:
PHC Malshiras (General Medicine)
2026-09-12 at 10:30 AM

Reply:
1 YES
2 NO
```
*(Conversation State: `CONFIRM_BOOKING`)*

---

### Step 8: Confirm Booking
**Patient SMS**:
```text
1
```
**System Response**:
```text
Appointment booked successfully.

PHC Malshiras
General Medicine
2026-09-12 10:30 AM
Reference: RC4821

Send: 2-Facility details, 4-Referral, 5-Followup
```
*(Conversation State: `BOOKED`)*

---

## 3. Compound / One-Shot Natural SMS Input

The assistant can also extract all demographics, symptoms, and duration from a single message:

**Patient SMS**:
```text
I am Ravi 42 from Malshiras. I have fever and cough for 3 days
```
**System Response**:
```text
Triage: Your symptoms should be assessed by a healthcare professional.

Recommended Facility:
PHC Malshiras
Queue: 5 patients (~25 min wait)

Available appointments:
1. 2026-09-12 10:30 AM (General Medicine)
2. 2026-09-12 11:00 AM (General Medicine)

Reply 1 or 2 to book, or 2 for Facility info.
```

---

## 4. Returning Registered Patient Recognition

When an existing patient with registered mobile `9876543210` sends an SMS:

**Patient SMS**:
```text
HI
```
**System Response**:
```text
Hello Ravi! Welcome to Rural Care Navigator.
Please reply with your symptoms (e.g. Fever for 2 days) or send:
1-Book, 2-Facility, 4-Referral, 5-Followup, 0-Emergency
```

---

## 5. Emergency Red-Flag Bypass

If an emergency condition is detected at **any point** in the conversation:

**Patient SMS**:
```text
severe chest pain and difficulty breathing
```
**System Response**:
```text
EMERGENCY:
Please seek immediate medical attention.
Call 108 for ambulance assistance.
Do not delay emergency care.
```
*(Conversation State: `EMERGENCY`)*

---

## 6. Self-Service Commands

| Command | Action | Example Output |
| :--- | :--- | :--- |
| `1` or `BOOK` | View available slots | Available appointments: 1. 2026-09-12 10:30 AM ... |
| `2` or `FACILITY` | Facility & Live Queue | PHC Malshiras, Malshiras, Solapur, Queue: 5 patients |
| `4` or `REFERRAL` | Patient's Active Referrals | Referral Status: Ref #12 (URGENT) to District Hospital |
| `5` or `FOLLOWUP` | Patient's Follow-up Status | Follow-Up Details: Date: 2026-09-15, Status: PENDING |
| `0` or `EMERGENCY`| Emergency Helpline | EMERGENCY: Call 108 for ambulance assistance |
| `HI` / `MR` / `EN` | Switch Language | भाषा हिन्दी पर सेट की गई है / भाषा मराठीवर सेट केली आहे |

---

## 7. Demo Sandbox vs. Real MSG91 Carrier Mode

### Demo Sandbox Mode (Zero Setup Needed)
- **Endpoint**: `POST /api/v1/sms/inbound/demo`
- **Request**:
  ```json
  {
    "mobile": "9000000000",
    "message": "Hi"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "demo_mode": true,
      "reply": "Welcome to Rural Care Navigator. Please reply with your full name.\n(Reply HI for Hindi, MR for Marathi)",
      "next_state": "ASK_NAME",
      "mobile": "9000000000"
    }
  }
  ```

### Real Carrier Mode (MSG91 / Gateway Webhook)
- **Endpoint**: `POST /api/v1/sms/inbound`
- **Environment variables**:
  - `SMS_ENABLED=True`
  - `SMS_PROVIDER=msg91` (or `provider`)
  - `MSG91_AUTH_KEY=<your_key>`
  - `MSG91_SENDER_ID=<your_sender_id>`
  - `MSG91_TEMPLATE_ID=<your_template_id>`
- The webhook parses the incoming sender mobile and message, executes the state machine, and dispatches the reply via `SMSService.send_sms()`.
