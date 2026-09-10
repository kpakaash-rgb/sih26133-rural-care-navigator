"""
backend/app/ai/conversation/stress_test.py
=========================================
Stress-test suite for Rural Care Navigator Local Conversation Model.
Directly evaluates LocalConversationModel.predict() against 50+ real-world utterances:
- English, Hindi, Hinglish, colloquial/rural phrasing
- STT-like noise and spelling variations
- Symptoms, durations, severities, localities, bookings, emergencies
"""

import json
from typing import Any, Dict, List, Optional
try:
    from backend.app.ai.conversation.model_service import LocalConversationModel
except ImportError:
    from app.ai.conversation.model_service import LocalConversationModel


TEST_CASES = [
    # ── Group 1: English Symptoms & Red Flags ──
    {
        "category": "English",
        "input": "I have fever",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever"],
    },
    {
        "category": "English",
        "input": "I have fever and cough",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever", "cough"],
    },
    {
        "category": "English",
        "input": "Been having fever for three days",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever"],
        "expected_duration": "3 days",
    },
    {
        "category": "English",
        "input": "My chest is hurting badly",
        "expected_intent": ["REPORT_SYMPTOMS", "EMERGENCY"],
        "expected_symptoms": ["chest pain"],
        "expected_severity": "severe",
        "expected_emergency": True,
    },
    {
        "category": "English",
        "input": "I can't breathe properly",
        "expected_intent": ["REPORT_SYMPTOMS", "EMERGENCY"],
        "expected_symptoms": ["breathing difficulty"],
        "expected_emergency": True,
    },
    {
        "category": "English",
        "input": "I hurt my leg when I fell",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["injury"],
    },
    {
        "category": "English",
        "input": "I want to speak to a doctor",
        "expected_intent": "BOOK_APPOINTMENT",
    },
    {
        "category": "English",
        "input": "I want a doctor on the phone",
        "expected_intent": "BOOK_APPOINTMENT",
        "expected_appointment_type": "phone",
    },
    {
        "category": "English",
        "input": "I want to visit the hospital",
        "expected_intent": "BOOK_APPOINTMENT",
        "expected_appointment_type": "offline",
    },
    {
        "category": "English",
        "input": "Tell me which hospital I should go to",
        "expected_intent": "FACILITY_INFORMATION",
    },

    # ── Group 2: Hindi Symptoms & Speech ──
    {
        "category": "Hindi",
        "input": "Mujhe bukhar hai",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever"],
    },
    {
        "category": "Hindi",
        "input": "Mujhe teen din se bukhar hai",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever"],
        "expected_duration": "3 days",
    },
    {
        "category": "Hindi",
        "input": "Mujhe bukhar aur khansi dono hai",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever", "cough"],
    },
    {
        "category": "Hindi",
        "input": "Pet mein dard ho raha hai",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["stomach problem", "pain"],
    },
    {
        "category": "Hindi",
        "input": "Seene mein bahut dard hai",
        "expected_intent": ["REPORT_SYMPTOMS", "EMERGENCY"],
        "expected_symptoms": ["chest pain"],
        "expected_severity": "severe",
        "expected_emergency": True,
    },
    {
        "category": "Hindi",
        "input": "Saans lene mein dikkat ho rahi hai",
        "expected_intent": ["REPORT_SYMPTOMS", "EMERGENCY"],
        "expected_symptoms": ["breathing difficulty"],
        "expected_emergency": True,
    },
    {
        "category": "Hindi",
        "input": "Main gir gaya pair mein chot lag gayi",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["injury"],
    },
    {
        "category": "Hindi",
        "input": "Doctor se phone pe baat karni hai",
        "expected_intent": "BOOK_APPOINTMENT",
        "expected_appointment_type": "phone",
    },
    {
        "category": "Hindi",
        "input": "Hospital jaana hai",
        "expected_intent": "BOOK_APPOINTMENT",
        "expected_appointment_type": "offline",
    },
    {
        "category": "Hindi",
        "input": "Haan ji",
        "expected_intent": "ANSWER_YES",
        "expected_confirmation": True,
    },
    {
        "category": "Hindi",
        "input": "Nahi kuch nahi",
        "expected_intent": "ANSWER_NO",
        "expected_confirmation": False,
    },
    {
        "category": "Hindi",
        "input": "Phir se batao",
        "expected_intent": "REQUEST_REPEAT",
    },

    # ── Group 3: Hinglish & Colloquial Speech ──
    {
        "category": "Hinglish",
        "input": "Meko 3 din se bukhar chalra hai",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever"],
        "expected_duration": "3 days",
    },
    {
        "category": "Hinglish",
        "input": "Fever hai bhai aur khansi ruk nahi rahi",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever", "cough"],
    },
    {
        "category": "Hinglish",
        "input": "Teen days se fever hai",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever"],
        "expected_duration": "3 days",
    },
    {
        "category": "Hinglish",
        "input": "Mera pair girne se lag gaya",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["injury"],
    },
    {
        "category": "Hinglish",
        "input": "Pet mein pain ho raha hai",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["stomach problem", "pain"],
    },
    {
        "category": "Hinglish",
        "input": "Doctor ko phone pe baat karwana hai",
        "expected_intent": "BOOK_APPOINTMENT",
        "expected_appointment_type": "phone",
    },
    {
        "category": "Hinglish",
        "input": "Hospital kidhar milega",
        "expected_intent": "FACILITY_INFORMATION",
    },
    {
        "category": "Hinglish",
        "input": "Mere gaon ke paas wala hospital batao",
        "expected_intent": "FACILITY_INFORMATION",
    },
    {
        "category": "Hinglish",
        "input": "Haan kar do",
        "expected_intent": "ANSWER_YES",
        "expected_confirmation": True,
    },
    {
        "category": "Hinglish",
        "input": "Nahi nahi appointment nahi chahiye",
        "expected_intent": ["ANSWER_NO", "CANCEL_BOOKING"],
        "expected_confirmation": False,
    },
    {
        "category": "Hinglish",
        "input": "No bas hospital batao",
        "expected_intent": ["FACILITY_INFORMATION", "ANSWER_NO"],
    },
    {
        "category": "Hinglish",
        "input": "Breathing mein problem ho rahi hai",
        "expected_intent": ["REPORT_SYMPTOMS", "EMERGENCY"],
        "expected_symptoms": ["breathing difficulty"],
        "expected_emergency": True,
    },

    # ── Group 4: STT Noise & Spelling Variations ──
    {
        "category": "STT Noise",
        "input": "bukhar",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever"],
    },
    {
        "category": "STT Noise",
        "input": "bukhaar",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever"],
    },
    {
        "category": "STT Noise",
        "input": "bukharrr",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever"],
    },
    {
        "category": "STT Noise",
        "input": "khasi",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["cough"],
    },
    {
        "category": "STT Noise",
        "input": "khashi",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["cough"],
    },
    {
        "category": "STT Noise",
        "input": "khansi",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["cough"],
    },
    {
        "category": "STT Noise",
        "input": "cough",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["cough"],
    },
    {
        "category": "STT Noise",
        "input": "fevr",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever"],
    },
    {
        "category": "STT Noise",
        "input": "fever",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["fever"],
    },
    {
        "category": "STT Noise",
        "input": "pet me dard",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["stomach problem", "pain"],
    },
    {
        "category": "STT Noise",
        "input": "pair me chot",
        "expected_intent": "REPORT_SYMPTOMS",
        "expected_symptoms": ["injury"],
    },
    {
        "category": "STT Noise",
        "input": "saans lene me dikat",
        "expected_intent": ["REPORT_SYMPTOMS", "EMERGENCY"],
        "expected_symptoms": ["breathing difficulty"],
        "expected_emergency": True,
    },

    # ── Group 5: Locality Variations ──
    {
        "category": "Locality",
        "input": "Mera gaon Pandharpur hai",
        "expected_intent": "PROVIDE_LOCALITY",
        "expected_locality": "Pandharpur",
    },
    {
        "category": "Locality",
        "input": "Main Pandharpur se hoon",
        "expected_intent": "PROVIDE_LOCALITY",
        "expected_locality": "Pandharpur",
    },
    {
        "category": "Locality",
        "input": "Pandharpur mein rehta hoon",
        "expected_intent": "PROVIDE_LOCALITY",
        "expected_locality": "Pandharpur",
    },
    {
        "category": "Locality",
        "input": "Village Pandharpur",
        "expected_intent": "PROVIDE_LOCALITY",
        "expected_locality": "Pandharpur",
    },
    {
        "category": "Locality",
        "input": "Pandharpur",
        "expected_intent": "PROVIDE_LOCALITY",
        "expected_locality": "Pandharpur",
    },
    {
        "category": "Locality",
        "input": "Akluj se hoon",
        "expected_intent": "PROVIDE_LOCALITY",
        "expected_locality": "Akluj",
    },
    {
        "category": "Locality",
        "input": "Malshiras",
        "expected_intent": "PROVIDE_LOCALITY",
        "expected_locality": "Malshiras",
    },

    # ── Group 6: Unknown & Edge Cases ──
    {
        "category": "Unknown",
        "input": "xyz qwerty blurp",
        "expected_intent": "UNKNOWN",
    },
    {
        "category": "Unknown",
        "input": "weather kaisa hai aaj",
        "expected_intent": "UNKNOWN",
    },
]


def run_stress_test():
    print("=" * 70)
    print("RURAL CARE NAVIGATOR LOCAL CONVERSATION MODEL - STRESS TEST")
    print("=" * 70)

    model = LocalConversationModel.get_instance()

    total_tests = len(TEST_CASES)
    passed_count = 0
    failed_count = 0
    review_count = 0

    category_stats = {}
    symptom_tests = 0
    symptom_passed = 0
    locality_tests = 0
    locality_passed = 0
    booking_tests = 0
    booking_passed = 0
    emergency_tests = 0
    emergency_passed = 0

    failed_cases = []
    review_cases = []

    for idx, tc in enumerate(TEST_CASES, 1):
        cat = tc["category"]
        category_stats.setdefault(cat, {"total": 0, "pass": 0, "fail": 0, "review": 0})
        category_stats[cat]["total"] += 1

        text = tc["input"]
        res = model.predict(text)

        pred_intent = res.get("intent")
        conf = res.get("confidence", 0.0)
        lang = res.get("language")
        symptoms = res.get("symptoms", [])
        duration = res.get("duration")
        severity = res.get("severity")
        locality = res.get("locality")
        appt_type = res.get("appointment_type")
        conf_bool = res.get("confirmation")
        emergency = res.get("emergency", False)

        # ── Evaluation Logic ──
        status = "PASS"
        reasons = []

        # Intent check
        exp_int = tc.get("expected_intent")
        if isinstance(exp_int, list):
            if pred_intent not in exp_int:
                status = "FAIL"
                reasons.append(f"Intent mismatch: got '{pred_intent}', expected one of {exp_int}")
        elif exp_int and pred_intent != exp_int:
            # Check if intent is acceptable or review
            if pred_intent == "UNKNOWN" and conf < 0.40:
                status = "REVIEW"
                reasons.append(f"Low confidence UNKNOWN (conf={conf:.2f})")
            else:
                status = "FAIL"
                reasons.append(f"Intent mismatch: got '{pred_intent}', expected '{exp_int}'")

        # Symptoms check
        if "expected_symptoms" in tc:
            symptom_tests += 1
            exp_syms = tc["expected_symptoms"]
            matched = any(s in symptoms for s in exp_syms)
            if matched:
                symptom_passed += 1
            else:
                if status == "PASS":
                    status = "FAIL"
                reasons.append(f"Symptoms missing: got {symptoms}, expected {exp_syms}")

        # Duration check
        if "expected_duration" in tc:
            if duration != tc["expected_duration"]:
                status = "REVIEW" if status == "PASS" else status
                reasons.append(f"Duration difference: got '{duration}', expected '{tc['expected_duration']}'")

        # Severity check
        if "expected_severity" in tc:
            if severity != tc["expected_severity"]:
                status = "REVIEW" if status == "PASS" else status
                reasons.append(f"Severity difference: got '{severity}', expected '{tc['expected_severity']}'")

        # Locality check
        if "expected_locality" in tc:
            locality_tests += 1
            if locality == tc["expected_locality"]:
                locality_passed += 1
            else:
                status = "FAIL"
                reasons.append(f"Locality missing: got '{locality}', expected '{tc['expected_locality']}'")

        # Booking check
        if "expected_appointment_type" in tc:
            booking_tests += 1
            if appt_type == tc["expected_appointment_type"]:
                booking_passed += 1
            else:
                if status == "PASS":
                    status = "REVIEW"
                reasons.append(f"Appointment type: got '{appt_type}', expected '{tc['expected_appointment_type']}'")
        elif exp_int == "BOOK_APPOINTMENT":
            booking_tests += 1
            if pred_intent == "BOOK_APPOINTMENT":
                booking_passed += 1

        # Emergency check
        if tc.get("expected_emergency"):
            emergency_tests += 1
            if emergency or pred_intent == "EMERGENCY":
                emergency_passed += 1
            else:
                if status == "PASS":
                    status = "FAIL"
                reasons.append(f"Emergency not detected: emergency={emergency}, intent={pred_intent}")

        # Tally results
        if status == "PASS":
            passed_count += 1
            category_stats[cat]["pass"] += 1
        elif status == "REVIEW":
            review_count += 1
            category_stats[cat]["review"] += 1
            review_cases.append({"index": idx, "input": text, "result": res, "reasons": reasons})
        else:
            failed_count += 1
            category_stats[cat]["fail"] += 1
            failed_cases.append({"index": idx, "input": text, "result": res, "reasons": reasons})

        # Print detailed item
        print(f"\n--- [Test {idx:02d}/{total_tests}] [{cat}] ---")
        print(f"INPUT:            {text}")
        print(f"PREDICTED INTENT: {pred_intent}")
        print(f"CONFIDENCE:       {conf:.4f}")
        print(f"LANGUAGE:         {lang}")
        print(f"SYMPTOMS:         {symptoms}")
        print(f"DURATION:         {duration}")
        print(f"SEVERITY:         {severity}")
        print(f"LOCALITY:         {locality}")
        print(f"APPOINTMENT TYPE: {appt_type}")
        print(f"PASS/FAIL:        {status}")
        if reasons:
            print(f"DETAILS:          {'; '.join(reasons)}")

    # ── Summary Report ──
    print("\n" + "=" * 70)
    print("STRESS TEST SUMMARY REPORT")
    print("=" * 70)
    print(f"Total Utterances Tested: {total_tests}")
    print(f"Passed:                  {passed_count} ({passed_count / total_tests * 100:.1f}%)")
    print(f"Reviews/Ambiguous:       {review_count} ({review_count / total_tests * 100:.1f}%)")
    print(f"Failed:                  {failed_count} ({failed_count / total_tests * 100:.1f}%)")
    overall_strict_rate = (passed_count / total_tests) * 100
    print(f"Overall Strict Pass Rate: {overall_strict_rate:.1f}%")

    print("\n--- Category Breakdown ---")
    for cat, stats in category_stats.items():
        tot = stats["total"]
        pas = stats["pass"]
        rate = (pas / tot) * 100 if tot else 0
        print(f"  {cat:15s}: {pas}/{tot} passed ({rate:.1f}%) [Fail: {stats['fail']}, Review: {stats['review']}]")

    print("\n--- Functional Extraction Rates ---")
    if symptom_tests:
        print(f"  Symptom Extraction:  {symptom_passed}/{symptom_tests} ({symptom_passed/symptom_tests*100:.1f}%)")
    if locality_tests:
        print(f"  Locality Extraction: {locality_passed}/{locality_tests} ({locality_passed/locality_tests*100:.1f}%)")
    if booking_tests:
        print(f"  Booking Intent:      {booking_passed}/{booking_tests} ({booking_passed/booking_tests*100:.1f}%)")
    if emergency_tests:
        print(f"  Emergency Rate:      {emergency_passed}/{emergency_tests} ({emergency_passed/emergency_tests*100:.1f}%)")

    if failed_cases:
        print("\n--- FAILED CASES ---")
        for fc in failed_cases:
            print(f"  [{fc['index']}] \"{fc['input']}\" -> {fc['reasons']}")

    if review_cases:
        print("\n--- REVIEW CASES ---")
        for rc in review_cases:
            print(f"  [{rc['index']}] \"{rc['input']}\" -> {rc['reasons']}")
    print("=" * 70)

    return {
        "total": total_tests,
        "passed": passed_count,
        "failed": failed_count,
        "review": review_count,
        "pass_rate": overall_strict_rate,
        "failed_cases": failed_cases,
        "review_cases": review_cases,
    }


if __name__ == "__main__":
    run_stress_test()
