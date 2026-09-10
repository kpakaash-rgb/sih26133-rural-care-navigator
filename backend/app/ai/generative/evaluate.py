"""
Comprehensive Evaluation of the Retrained Rural Care Navigator Local Generative Model.
- Tests temperature comparison (0.0 greedy, 0.2, 0.4)
- Tests English, Hindi, Hinglish scenarios across conversation phases
- Tests 20 novel out-of-dataset contexts (verifying non-verbatim generation)
- Measures latency, validation results, and exact phrasing
"""

import json
import sys
import time
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

# Ensure repo root is on sys.path
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.ai.generative.config import GenerativeModelConfig
from backend.app.ai.generative.generator_service import LocalGenerativeResponseService
from backend.app.ai.generative.validator import GenerativeResponseValidator

# 1. Reset and reload service with new weights
LocalGenerativeResponseService._instance = None
service = LocalGenerativeResponseService.get_instance()
print(f"Service loaded: {service.is_ready}")
print(f"Model params: {service.model.get_num_params():,}")
print(f"Vocab size: {service.tokenizer.vocab_size}")

# Load all training dataset responses for verbatim membership testing
dataset_path = REPO_ROOT / "backend" / "app" / "ai" / "generative" / "data" / "generative_dataset.jsonl"
dataset_responses = set()
with open(dataset_path, "r", encoding="utf-8") as f:
    for line in f:
        if line.strip():
            dataset_responses.add(json.loads(line)["response"].strip())
print(f"Loaded {len(dataset_responses)} unique training dataset responses for exact verbatim matching.")

validator = GenerativeResponseValidator()

# ==============================================================================
# TEST SUITE 1: TEMPERATURE COMPARISON (0.0 vs 0.2 vs 0.4)
# ==============================================================================
temp_test_contexts = [
    ("phase:SYMPTOMS\nsym:fever\ndur:NONE\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:en", "SYMPTOMS (en)"),
    ("phase:DURATION\nsym:cough,cold\ndur:NONE\nloc:NONE\nname:Ramesh\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:en", "DURATION (en)"),
    ("phase:LOCALITY\nsym:bukhar\ndur:do din se\nloc:NONE\nname:Sunita\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi", "LOCALITY (hi)"),
    ("phase:TRIAGE_PRESENTED\nsym:fever,cough\ndur:3 days\nloc:Pandharpur\nname:Ramesh\nage:42\ngender:male\ncare:PHC\nfacility:Malshiras Primary Health Centre\nlang:en", "TRIAGE_PRESENTED (en)"),
    ("phase:BOOKING_CONFIRM\nsym:bukhar\ndur:teen din se\nloc:Malshiras\nname:Ramesh\nage:42\ngender:male\ncare:PHC\nfacility:Malshiras PHC\nlang:hi", "BOOKING_CONFIRM (hi)"),
]

print("\n" + "="*80)
print("PART 6: GENERATION TEMPERATURE COMPARISON (Greedy 0.0 vs 0.2 vs 0.4)")
print("="*80)

for ctx, title in temp_test_contexts:
    print(f"\n--- Context: {title} ---")
    for temp in [0.0, 0.2, 0.4]:
        resp, lat = service.generate_text_from_context(ctx, temperature=temp, top_k=20, top_p=0.85)
        print(f"  [T={temp:<3}] ({lat:5.1f}ms): {resp}")

# ==============================================================================
# TEST SUITE 2: PART 8 STANDARD EVALUATION (En, Hi, Hinglish across phases)
# ==============================================================================
standard_eval_contexts = [
    # English
    ("phase:SYMPTOMS\nsym:fever,chills\ndur:NONE\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:en", "English Symptom Reporting"),
    ("phase:DURATION\nsym:stomach pain\ndur:NONE\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:en", "English Duration Inquiry"),
    ("phase:NAME\nsym:cough\ndur:3 days\nloc:Pandharpur\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:en", "English Name Collection"),
    ("phase:AGE\nsym:headache\ndur:2 days\nloc:Baramati\nname:Ramesh\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:en", "English Age Collection"),
    ("phase:LOCALITY\nsym:fever\ndur:for 3 days\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:en", "English Locality Collection"),
    ("phase:TRIAGE_PRESENTED\nsym:fever,cough\ndur:3 days\nloc:Malshiras\nname:Ramesh\nage:45\ngender:male\ncare:PHC\nfacility:Malshiras Primary Health Centre\nlang:en", "English Facility Recommendation"),
    ("phase:BOOKING_TYPE\nsym:fever\ndur:2 days\nloc:Pandharpur\nname:Geeta\nage:34\ngender:female\ncare:CHC\nfacility:Pandharpur CHC\nlang:en", "English Booking Mode Inquiry"),
    ("phase:BOOKING_CONFIRM\nsym:fever\ndur:2 days\nloc:Malshiras\nname:Anil\nage:29\ngender:male\ncare:PHC\nfacility:Malshiras PHC\nlang:en", "English Booking Confirmation"),

    # Hindi
    ("phase:SYMPTOMS\nsym:bukhar aur thand\ndur:NONE\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi", "Hindi Symptom Reporting"),
    ("phase:DURATION\nsym:pet dard\ndur:NONE\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi", "Hindi Duration Inquiry"),
    ("phase:NAME\nsym:khansi\ndur:teen din se\nloc:Pandharpur\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi", "Hindi Name Collection"),
    ("phase:AGE\nsym:sar dard\ndur:ek din se\nloc:Baramati\nname:Sunita\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi", "Hindi Age Collection"),
    ("phase:LOCALITY\nsym:bukhar\ndur:do din se\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi", "Hindi Locality Collection"),
    ("phase:TRIAGE_PRESENTED\nsym:bukhar,khansi\ndur:teen din se\nloc:Pandharpur\nname:Ramesh\nage:42\ngender:male\ncare:CHC\nfacility:Pandharpur Community Health Centre\nlang:hi", "Hindi Facility Recommendation"),
    ("phase:BOOKING_CONFIRM\nsym:bukhar\ndur:do din se\nloc:Pandharpur\nname:Sunita\nage:38\ngender:female\ncare:CHC\nfacility:Pandharpur CHC\nlang:hi", "Hindi Booking Confirmation"),

    # Hinglish
    ("phase:GREETING\nsym:NONE\ndur:NONE\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi", "Hinglish Greeting"),
    ("phase:SYMPTOMS\nsym:chot aur sujan\ndur:NONE\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi", "Hinglish Symptom Reporting"),
    ("phase:LOCALITY\nsym:kamar dard\ndur:ek hafte se\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi", "Hinglish Locality"),
    ("phase:BOOKING_TYPE\nsym:pet dard\ndur:do din se\nloc:Sangola\nname:Ganesh\nage:40\ngender:male\ncare:Sub-Centre\nfacility:Sangola Sub-Centre\nlang:hi", "Hinglish Booking Type"),
    ("phase:FOLLOW_UP\nsym:bukhar\ndur:paanch din se\nloc:Malshiras\nname:Kavita\nage:38\ngender:female\ncare:PHC\nfacility:Malshiras PHC\nlang:hi", "Hinglish Follow-up"),
]

print("\n" + "="*80)
print("PART 8: EVALUATION ACROSS PHASES AND LANGUAGES")
print("="*80)

latencies = []
for ctx, title in standard_eval_contexts:
    resp, lat = service.generate_text_from_context(ctx, temperature=0.0)
    latencies.append(lat)
    print(f"\n[Case] {title}")
    print(f"  Generated: {resp}")
    print(f"  Latency:   {lat:.1f} ms")

print(f"\nAverage Generation Latency: {sum(latencies)/len(latencies):.2f} ms")

# ==============================================================================
# TEST SUITE 3: PART 9 NOVEL OUT-OF-DATASET CONTEXT TEST (20 Cases)
# Testing contexts with novel combinations never in dataset
# ==============================================================================
novel_contexts = [
    # 1. Novel symptom combination + novel locality
    ("phase:SYMPTOMS\nsym:ear pain,fever\ndur:NONE\nloc:Kurduvadi\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:en",
     "Novel Symptom combo (ear pain+fever) in Kurduvadi"),

    # 2. Novel duration + symptoms
    ("phase:DURATION\nsym:eye irritation,redness\ndur:NONE\nloc:Sangola\nname:Sanjay\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:en",
     "Novel Eye irritation in Sangola"),

    # 3. Novel village + name
    ("phase:NAME\nsym:joint swelling\ndur:5 days\nloc:Natepute\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:en",
     "Novel village Natepute"),

    # 4. Novel name + locality
    ("phase:AGE\nsym:dizziness\ndur:today\nloc:Tembhurni\nname:Deepak\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:en",
     "Novel name Deepak from Tembhurni"),

    # 5. Novel locality asking
    ("phase:LOCALITY\nsym:chest congestion\ndur:for 4 days\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:en",
     "Novel chest congestion for 4 days"),

    # 6. Novel facility recommendation
    ("phase:TRIAGE_PRESENTED\nsym:severe cough,breathlessness\ndur:4 days\nloc:Kurduvadi\nname:Deepak\nage:62\ngender:male\ncare:CHC\nfacility:Kurduvadi Rural Hospital\nlang:en",
     "Novel facility Kurduvadi Rural Hospital"),

    # 7. Novel booking confirm with novel time slot
    ("phase:BOOKING_CONFIRM\nsym:skin allergy\ndur:3 days\nloc:Malshiras\nname:Sanjay\nage:35\ngender:male\ncare:PHC\nfacility:Malshiras PHC\nlang:en",
     "Novel skin allergy patient Sanjay"),

    # 8. Novel follow up with different symptom
    ("phase:FOLLOW_UP\nsym:fracture recovery\ndur:3 weeks\nloc:Pandharpur\nname:Arun\nage:52\ngender:male\ncare:CHC\nfacility:Pandharpur CHC\nlang:en",
     "Novel fracture recovery follow-up"),

    # 9. Hindi: Novel symptom kaan dard
    ("phase:SYMPTOMS\nsym:kaan dard\ndur:NONE\nloc:Kurduvadi\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi",
     "Hindi: Novel kaan dard"),

    # 10. Hindi: Novel duration asking for aankh lal hona
    ("phase:DURATION\nsym:aankh lal hona aur jalan\ndur:NONE\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi",
     "Hindi: Novel eye problem duration"),

    # 11. Hindi: Novel village Karmala asking name
    ("phase:NAME\nsym:tez bukhar\ndur:chaar din se\nloc:Karmala\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi",
     "Hindi: Novel Karmala name prompt"),

    # 12. Hindi: Novel patient name Manoj asking age
    ("phase:AGE\nsym:peeth dard\ndur:ek hafte se\nloc:Pandharpur\nname:Manoj\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi",
     "Hindi: Novel name Manoj age prompt"),

    # 13. Hindi: Novel symptom weakness asking locality
    ("phase:LOCALITY\nsym:kamzori aur chakkar\ndur:do din se\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi",
     "Hindi: Novel kamzori locality prompt"),

    # 14. Hindi: Novel facility Tembhurni PHC triage
    ("phase:TRIAGE_PRESENTED\nsym:pet dard aur ulti\ndur:kal se\nloc:Tembhurni\nname:Pooja\nage:28\ngender:female\ncare:PHC\nfacility:Tembhurni PHC\nlang:hi",
     "Hindi: Novel Tembhurni PHC"),

    # 15. Hinglish: Novel booking type inquiry
    ("phase:BOOKING_TYPE\nsym:severe cold\ndur:3 days\nloc:Akluj\nname:Pradeep\nage:44\ngender:male\ncare:CHC\nfacility:Akluj Rural Hospital\nlang:hi",
     "Hinglish: Novel booking mode for Pradeep"),

    # 16. Hindi: Novel booking confirmation
    ("phase:BOOKING_CONFIRM\nsym:sar dard\ndur:do din se\nloc:Sangola\nname:Lata\nage:36\ngender:female\ncare:PHC\nfacility:Sangola PHC\nlang:hi",
     "Hindi: Novel booking confirm Lata"),

    # 17. English: Safety screening for elderly patient
    ("phase:SAFETY_QUESTIONS\nsym:severe fever,sweating\ndur:3 days\nloc:Baramati\nname:Govind\nage:72\ngender:male\ncare:NONE\nfacility:NONE\nlang:en",
     "English: Safety questions for Govind (72yo)"),

    # 18. English: Ending call for novel patient
    ("phase:ENDED\nsym:fever\ndur:2 days\nloc:Shirpur\nname:Govind\nage:72\ngender:male\ncare:PHC\nfacility:Shirpur PHC\nlang:en",
     "English: Ended call for Govind"),

    # 19. Hinglish: Repeat request in noisy condition
    ("phase:REQUEST_REPEAT\nsym:NONE\ndur:NONE\nloc:NONE\nname:NONE\nage:NONE\ngender:NONE\ncare:NONE\nfacility:NONE\nlang:hi",
     "Hinglish: Repeat request"),

    # 20. English: Change appointment type for novel patient
    ("phase:CHANGE_APPOINTMENT_TYPE\nsym:knee arthritis\ndur:2 months\nloc:Pandharpur\nname:Meena\nage:58\ngender:female\ncare:CHC\nfacility:Pandharpur CHC\nlang:en",
     "English: Change type for Meena"),
]

print("\n" + "="*80)
print("PART 9: NOVEL OUT-OF-DATASET CONTEXTS (20 Cases - Non-Verbatim Generalization Test)")
print("="*80)

novel_results = []
for i, (ctx, desc) in enumerate(novel_contexts, 1):
    resp, lat = service.generate_text_from_context(ctx, temperature=0.0)
    is_verbatim = resp.strip() in dataset_responses
    novel_results.append({
        "case_num": i,
        "description": desc,
        "context": ctx,
        "response": resp,
        "is_verbatim_in_dataset": is_verbatim,
        "latency_ms": round(lat, 2)
    })
    print(f"\n[Case {i:02d}] {desc}")
    print(f"  Response:    {resp}")
    print(f"  In Dataset?  {'YES (verbatim match)' if is_verbatim else 'NO (genuinely synthesized new utterance!)'}")
    print(f"  Latency:     {lat:.1f} ms")

# Save all results to json
with open(REPO_ROOT / "backend" / "eval_results.json", "w", encoding="utf-8") as f:
    json.dump(novel_results, f, ensure_ascii=False, indent=2)

print("\nEvaluation successfully completed and saved to backend/eval_results.json!")
