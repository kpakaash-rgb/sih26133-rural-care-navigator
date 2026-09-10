import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
data = json.load(open('backend/final_phase_gated_eval_results.json', encoding='utf-8'))
invoked = [r for r in data if r['model_invoked']]
print(f"Total invoked turns: {len(invoked)}\n")
for idx, r in enumerate(invoked):
    print(f"Turn #{idx+1} [Turn {r.get('scenario')}]:")
    print(f"  User Input : {r['user_input']}")
    print(f"  Phase      : {r['phase']}")
    print(f"  Generated  : {r['generated_response']}")
    print(f"  Accepted?  : {r['accepted']}")
    print(f"  Reason     : {r['rejection_reason']}")
    print(f"  Deterministic Fallback: {r['fallback_used']}")
    print(f"  Latency    : {r['latency_ms']} ms")
    print("-" * 50)
