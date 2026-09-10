# Rural Care Navigator - Local Conversational Understanding Model

> [!IMPORTANT]
> **This is a lightweight conversational understanding model. It is not a diagnostic model.**  
> Medical clinical urgency, triage tiers, emergency detection, and care level recommendations are exclusively determined by the deterministic `run_triage()` clinical decision-support engine.

---

## 1. Overview & Architecture

This package provides a **small, local, fully offline conversational intelligence model** designed for real-time telephone interactions over the Exotel voice bridge. It completely replaces any reliance on external LLM APIs (such as OpenAI, Gemini, Claude, Groq, etc.) while operating with zero cloud latency and zero recurring per-token costs.

### Speech & Telephony Integration Pipeline

```
Caller (Phone)
      │
      ▼
Exotel Bidirectional WebSocket (PCM S16LE, 8000 Hz, 100ms chunks)
      │
      ▼
Sarvam STT (Streaming multilingual speech-to-text: hi-IN / en-IN)
      │
      ▼
Rural Care Navigator LOCAL CONVERSATIONAL MODEL
      │ (Intent classification + Slot extraction)
      ▼
Structured Intent & Slots {intent, symptoms, duration, locality, appointment_type}
      │
      ├──────────────────────────────┐
      ▼                              ▼
run_triage() Clinical Engine    Facility & Availability Database Services
      │                              │
      └──────────────┬───────────────┘
                     ▼
             Response Generator
                     │
                     ▼
Sarvam TTS (Speech synthesis: bulbul:v1)
                     │
                     ▼ Resampled (22050 Hz -> 8000 Hz)
Exotel WebSocket -> Caller Earphone
```

---

## 2. Model Architecture & Specifications

1. **Subword & Word-Level Multilingual Vectorization**:
   - Word n-grams: `(1, 2)`
   - Subword character n-grams: `(2, 5)` (essential for handling colloquial variations, phonetic misspellings, and STT transcript noise).
   - Sublinear TF scaling with L2 normalization.

2. **Calibrated Probabilistic Intent Classifier**:
   - Dual-penalty Regularized Linear Support Vector Machine (`LinearSVC`) wrapped with **Isotonic / Sigmoid CalibratedClassifierCV**.
   - Outputs calibrated class probability distributions for confidence thresholding.
   - **Confidence Thresholding**: Predictions with maximum posterior probability below `0.40` automatically trigger `UNKNOWN` intent, prompting the conversational agent to politely request clarification rather than hallucinate.

3. **Multi-Label Slot Extraction Subsystem**:
   - Independent One-Vs-Rest probabilistic symptom classifiers trained across 25 rural medical complaint categories.
   - Multi-pattern duration extractor (canonicalizing expressions like *"teen din"*, *"three days"*, *"do hafte"*).
   - Dynamic locality parser extracting village/town names directly from speech (e.g., *"Mera gaon Pandharpur hai"* -> `Pandharpur`).
   - Appointment modality classifier (`phone` vs `offline`).

4. **Model Footprint & Latency**:
   - **Total Disk Footprint**: ~0.77 MB (`intent_pipeline.joblib` 491 KB, `slot_extractors.joblib` 300 KB).
   - **Average Inference Latency**: ~4.5 milliseconds per utterance on standard CPU.
   - **RAM Overhead**: Under 15 MB in memory.

---

## 3. Supported Languages & Speech Registers

The model natively handles:
- **English**: *"I have had fever and cough for three days."*
- **Standard Hindi (Devanagari)**: *"मुझे तीन दिन से बुखार और खांसी है।"*
- **Hinglish (Transliterated Hindi-English)**: *"Mujhe fever hai aur three days se cough bhi hai."*
- **Rural Colloquial / Imperfect Speech**:
  - *"bukhar chal raha hai"*
  - *"pet mein dard ho raha hai"*
  - *"gir gaya pair mein lag gaya"*
  - *"doctor se phone pe baat karni hai"*
  - *"hospital jaana hai"*

---

## 4. Dataset & Intents

The model is trained on `data/conversation_dataset.jsonl` comprising 609 curated examples balanced across 16 canonical dialogue intents:

1. `REPORT_SYMPTOMS`
2. `PROVIDE_DURATION`
3. `PROVIDE_SEVERITY`
4. `PROVIDE_LOCALITY`
5. `ANSWER_YES`
6. `ANSWER_NO`
7. `REQUEST_REPEAT`
8. `REQUEST_HELP`
9. `FACILITY_INFORMATION`
10. `BOOK_APPOINTMENT`
11. `CHANGE_APPOINTMENT_TYPE`
12. `CONFIRM_BOOKING`
13. `CANCEL_BOOKING`
14. `EMERGENCY`
15. `FINISH`
16. `UNKNOWN`

---

## 5. How to Retrain the Model

To generate the dataset and retrain the model locally:

```powershell
# 1. Regenerate dataset if new examples were added
python -m app.ai.conversation.data.create_dataset

# 2. Train and validate model artifacts
python -m app.ai.conversation.train
```

Artifacts are automatically evaluated and saved to `backend/app/ai/conversation/model/`:
- `intent_pipeline.joblib`
- `slot_extractors.joblib`
- `metadata.json`

---

## 6. How to Start the Voice System

1. **Start PostgreSQL & Backend**:
   ```powershell
   cd backend
   .\.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Expose WebSocket via ngrok**:
   ```powershell
   ngrok http 8000
   ```

3. **Configure Exotel Voice Applet**:
   - Set Stream URL to `wss://<your-ngrok-domain>/api/v1/ivr/exotel`.
