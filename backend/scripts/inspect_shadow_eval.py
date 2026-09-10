import json
import sys

# Ensure UTF-8 output on Windows console
sys.stdout.reconfigure(encoding='utf-8')

with open('backend/shadow_eval_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total turns evaluated: {len(data)}")
rejected = [d for d in data if d['rejected']]
print(f"Total rejected: {len(rejected)}\n")

print("=" * 80)
print("ALL REJECTED RESPONSES INSPECTION")
print("=" * 80)
for idx, d in enumerate(rejected, 1):
    print(f"[{idx}] {d['flow']} -> {d['scenario']}")
    print(f"    Phase: {d['phase']} | User: \"{d['user_input']}\"")
    print(f"    Generated: {d['generated_response']}")
    print(f"    Rejection Reason: {d['rejection_reason']}")
    print(f"    Fallback Used: {d['fallback_response']}")
    print("-" * 80)

accepted = [d for d in data if d['accepted']]
print("\n" + "=" * 80)
print(f"SAMPLE ACCEPTED RESPONSES (Total {len(accepted)})")
print("=" * 80)
for idx, d in enumerate(accepted, 1):
    print(f"[{idx}] {d['flow']} -> {d['scenario']}")
    print(f"    Phase: {d['phase']} | User: \"{d['user_input']}\"")
    print(f"    Generated: {d['generated_response']}")
    print(f"    Fallback Alternative: {d['fallback_response']}")
    print("-" * 80)
