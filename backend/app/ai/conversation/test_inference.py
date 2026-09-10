import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from backend.app.ai.conversation.model_service import LocalConversationModel

def main():
    model = LocalConversationModel.get_instance()
    assert model.is_ready, "Model must be loaded and ready!"

    test_sentences = [
        "I have fever and cough for three days.",
        "Mujhe teen din se bukhar aur khansi hai.",
        "Mujhe fever hai aur three days se cough bhi hai.",
        "Mera gaon Pandharpur hai.",
        "Doctor ko phone pe baat karna hai.",
        "Saans lene mein dikkat ho rahi hai.",
        "Haan ji.",
        "Nahi kuch nahi.",
        "Random gibberish blabla",
    ]

    for s in test_sentences:
        res = model.predict(s)
        print(f"INPUT: \"{s}\"")
        print(f"  -> INTENT: {res['intent']} (conf={res['confidence']}, lang={res['language']})")
        print(f"  -> symptoms={res['symptoms']} | duration={res['duration']} | locality={res['locality']} | emergency={res['emergency']}\n")

if __name__ == "__main__":
    main()
