import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('backend/final_phase_gated_eval_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

invoked = [d for d in data if d['model_invoked']]
bypassed = [d for d in data if d['model_bypassed']]

print(f"Total turns: {len(data)}")
print(f"Total model invoked: {len(invoked)}")
print(f"Total model bypassed: {len(bypassed)}\n")

print("=" * 80)
print("DETAILED INVOCATION BREAKDOWN")
print("=" * 80)
for idx, d in enumerate(invoked, 1):
    status = "ACCEPTED" if d['accepted'] else f"REJECTED ({d['rejection_reason']})"
    print(f"[{idx}] {d['flow']} -> {d['scenario']}")
    print(f"    Phase: {d['phase']} | User: \"{d['user_input']}\"")
    print(f"    Status: {status}")
    print(f"    Generated Response: {d['generated_response']}")
    print(f"    Deterministic Fallback: {d['fallback_used']}")
    print(f"    Latency: {d['latency_ms']} ms")
    print("-" * 80)

print("\n" + "=" * 80)
print("BLOCKED PHASES BYPASS AUDIT (Sample 10)")
print("=" * 80)
for idx, d in enumerate(bypassed[:10], 1):
    print(f"[{idx}] {d['flow']} -> {d['scenario']}")
    print(f"    Phase: {d['phase']} (Blocked: {not d['is_allowed_phase']}, Emergency: {d['is_emergency']})")
    print(f"    Model Invoked: {d['model_invoked']} (Bypassed: {d['model_bypassed']})")
    print(f"    Deterministic Output: {d['deterministic_response']}")
    print("-" * 80)
