import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('backend/final_phase_gated_eval_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("ALL 12 INVOKED TURNS:")
for idx, d in enumerate(data):
    if d['model_invoked']:
        print(f"Index {idx+1}: {d['scenario']} ({d['phase']})")
        print(f"  Input: {d['user_input']}")
        print(f"  Status: {'ACCEPTED' if d['accepted'] else 'REJECTED: ' + str(d['rejection_reason'])}")
        print(f"  Generated: {d['generated_response']}")
        print(f"  Deterministic: {d['deterministic_response']}")
        print()
