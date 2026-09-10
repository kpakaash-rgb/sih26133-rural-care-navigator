"""
app/ai/conversation/data/create_dataset.py
=========================================
Generates the comprehensive training dataset for the Rural Care Navigator
multilingual conversation model.
"""

from __future__ import annotations
import json
from pathlib import Path

DATASET_PATH = Path(__file__).resolve().parent / "conversation_dataset.jsonl"

RAW_DATA = [
    # =========================================================================
    # 1. REPORT_SYMPTOMS
    # =========================================================================
    # English
    {"text": "I have fever", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever"], "language": "en"},
    {"text": "I have a cough", "intent": "REPORT_SYMPTOMS", "symptoms": ["cough"], "language": "en"},
    {"text": "I have fever and cough", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever", "cough"], "language": "en"},
    {"text": "I've got fever and cough", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever", "cough"], "language": "en"},
    {"text": "I've had fever and cough for three days", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever", "cough"], "duration": "3 days", "language": "en"},
    {"text": "I have had fever for three days", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever"], "duration": "3 days", "language": "en"},
    {"text": "My head is hurting badly", "intent": "REPORT_SYMPTOMS", "symptoms": ["headache"], "severity": "severe", "language": "en"},
    {"text": "I have severe headache", "intent": "REPORT_SYMPTOMS", "symptoms": ["headache"], "severity": "severe", "language": "en"},
    {"text": "My stomach hurts", "intent": "REPORT_SYMPTOMS", "symptoms": ["stomach ache"], "language": "en"},
    {"text": "I injured my leg", "intent": "REPORT_SYMPTOMS", "symptoms": ["injury"], "language": "en"},
    {"text": "I fell down and hurt my hand", "intent": "REPORT_SYMPTOMS", "symptoms": ["injury"], "language": "en"},
    {"text": "I have been coughing for three days", "intent": "REPORT_SYMPTOMS", "symptoms": ["cough"], "duration": "3 days", "language": "en"},
    {"text": "I have body pain and fever since yesterday", "intent": "REPORT_SYMPTOMS", "symptoms": ["body ache", "fever"], "duration": "yesterday", "language": "en"},
    {"text": "I have sore throat and cold", "intent": "REPORT_SYMPTOMS", "symptoms": ["cold", "sore throat"], "language": "en"},
    {"text": "I am vomiting and have loose motions", "intent": "REPORT_SYMPTOMS", "symptoms": ["vomiting", "diarrhea"], "language": "en"},
    {"text": "My knee is swollen after a fall", "intent": "REPORT_SYMPTOMS", "symptoms": ["injury", "swelling"], "language": "en"},
    {"text": "I have back pain for two weeks", "intent": "REPORT_SYMPTOMS", "symptoms": ["back pain"], "duration": "2 weeks", "language": "en"},
    {"text": "High fever with chills and shivering", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever", "chills"], "severity": "severe", "language": "en"},
    {"text": "Persistent dry cough and mild fever", "intent": "REPORT_SYMPTOMS", "symptoms": ["cough", "fever"], "severity": "mild", "language": "en"},
    {"text": "I feel dizzy and weak since morning", "intent": "REPORT_SYMPTOMS", "symptoms": ["dizziness", "weakness"], "duration": "morning", "language": "en"},
    {"text": "My eye is red and burning", "intent": "REPORT_SYMPTOMS", "symptoms": ["eye irritation"], "language": "en"},
    {"text": "Got a cut on my finger and bleeding", "intent": "REPORT_SYMPTOMS", "symptoms": ["injury"], "language": "en"},
    {"text": "I have joint pain in both legs", "intent": "REPORT_SYMPTOMS", "symptoms": ["joint pain"], "language": "en"},
    {"text": "Chest congestion and constant coughing", "intent": "REPORT_SYMPTOMS", "symptoms": ["cough"], "language": "en"},
    {"text": "Ear pain since two days", "intent": "REPORT_SYMPTOMS", "symptoms": ["ear pain"], "duration": "2 days", "language": "en"},

    # Hindi (Devanagari)
    {"text": "मुझे बुखार है", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever"], "language": "hi"},
    {"text": "मुझे खांसी है", "intent": "REPORT_SYMPTOMS", "symptoms": ["cough"], "language": "hi"},
    {"text": "मुझे बुखार और खांसी है", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever", "cough"], "language": "hi"},
    {"text": "मुझे तीन दिन से बुखार है", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever"], "duration": "3 days", "language": "hi"},
    {"text": "मुझे बुखार और खांसी दोनों है", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever", "cough"], "language": "hi"},
    {"text": "पेट में दर्द है", "intent": "REPORT_SYMPTOMS", "symptoms": ["stomach ache"], "language": "hi"},
    {"text": "सिर में बहुत तेज दर्द हो रहा है", "intent": "REPORT_SYMPTOMS", "symptoms": ["headache"], "severity": "severe", "language": "hi"},
    {"text": "मैं गिर गया और पैर में चोट लग गई", "intent": "REPORT_SYMPTOMS", "symptoms": ["injury"], "language": "hi"},
    {"text": "हाथ कट गया है खून बह रहा है", "intent": "REPORT_SYMPTOMS", "symptoms": ["injury"], "language": "hi"},
    {"text": "दो दिन से उल्टी और दस्त हो रहे हैं", "intent": "REPORT_SYMPTOMS", "symptoms": ["vomiting", "diarrhea"], "duration": "2 days", "language": "hi"},
    {"text": "गले में खराश है और ठंड लग रही है", "intent": "REPORT_SYMPTOMS", "symptoms": ["sore throat", "chills"], "language": "hi"},
    {"text": "कल से बदन दर्द और तेज बुखार है", "intent": "REPORT_SYMPTOMS", "symptoms": ["body ache", "fever"], "duration": "yesterday", "severity": "severe", "language": "hi"},
    {"text": "घुटने में सूजन और दर्द है", "intent": "REPORT_SYMPTOMS", "symptoms": ["joint pain", "swelling"], "language": "hi"},
    {"text": "चक्कर आ रहे हैं और कमजोरी लग रही है", "intent": "REPORT_SYMPTOMS", "symptoms": ["dizziness", "weakness"], "language": "hi"},

    # Hinglish & Colloquial Hindi
    {"text": "Mujhe bukhar hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever"], "language": "hi"},
    {"text": "Mujhe khansi hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["cough"], "language": "hi"},
    {"text": "Mujhe bukhar aur khansi dono hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever", "cough"], "language": "hi"},
    {"text": "Mujhe teen din se bukhar hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever"], "duration": "3 days", "language": "hi"},
    {"text": "Mujhe teen din se bukhar aur khansi hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever", "cough"], "duration": "3 days", "language": "hi"},
    {"text": "Mujhe fever hai aur three days se cough bhi hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever", "cough"], "duration": "3 days", "language": "hi"},
    {"text": "Teen din se bukhar chal raha hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever"], "duration": "3 days", "language": "hi"},
    {"text": "Teen din se fever chal raha hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever"], "duration": "3 days", "language": "hi"},
    {"text": "Khansi bhi ho rahi hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["cough"], "language": "hi"},
    {"text": "Pet mein dard hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["stomach ache"], "language": "hi"},
    {"text": "Mera haath lag gaya", "intent": "REPORT_SYMPTOMS", "symptoms": ["injury"], "language": "hi"},
    {"text": "Main gir gaya aur pair mein chot lagi", "intent": "REPORT_SYMPTOMS", "symptoms": ["injury"], "language": "hi"},
    {"text": "bukhar chal raha hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever"], "language": "hi"},
    {"text": "bukhaar hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever"], "language": "hi"},
    {"text": "fever aa raha", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever"], "language": "hi"},
    {"text": "khansi ho rahi", "intent": "REPORT_SYMPTOMS", "symptoms": ["cough"], "language": "hi"},
    {"text": "pet mein dard", "intent": "REPORT_SYMPTOMS", "symptoms": ["stomach ache"], "language": "hi"},
    {"text": "pair mein chot lagi", "intent": "REPORT_SYMPTOMS", "symptoms": ["injury"], "language": "hi"},
    {"text": "gir gaya pair mein lag gaya", "intent": "REPORT_SYMPTOMS", "symptoms": ["injury"], "language": "hi"},
    {"text": "Sir me bohot tez dard ho raha hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["headache"], "severity": "severe", "language": "hi"},
    {"text": "Do din se ulti aur dast ho rahe hain", "intent": "REPORT_SYMPTOMS", "symptoms": ["vomiting", "diarrhea"], "duration": "2 days", "language": "hi"},
    {"text": "Gale me kharash hai aur thand lag rahi hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["sore throat", "chills"], "language": "hi"},
    {"text": "Kal se badan dard aur tez bukhar hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["body ache", "fever"], "duration": "yesterday", "severity": "severe", "language": "hi"},
    {"text": "Ghutne me sujan aur dard hai girne ke baad", "intent": "REPORT_SYMPTOMS", "symptoms": ["injury", "swelling"], "language": "hi"},
    {"text": "Chakkar aa rahe hain aur kamzori lag rahi hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["dizziness", "weakness"], "language": "hi"},
    {"text": "Haath cut gaya hai khoon nikal raha hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["injury"], "language": "hi"},
    {"text": "Bohot tej bukhar aur thand", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever", "chills"], "severity": "severe", "language": "hi"},
    {"text": "Knee me pain hai do din se", "intent": "REPORT_SYMPTOMS", "symptoms": ["joint pain"], "duration": "2 days", "language": "hi"},
    {"text": "Pet kharab ho gaya hai ulti aa rahi hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["stomach ache", "vomiting"], "language": "hi"},
    {"text": "Aankh lal ho gayi hai jalan ho rahi hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["eye irritation"], "language": "hi"},
    {"text": "Pichle char din se khansi nahi ruk rahi", "intent": "REPORT_SYMPTOMS", "symptoms": ["cough"], "duration": "4 days", "language": "hi"},
    {"text": "Subah se tabiyat theek nahi hai bukhar lag raha hai", "intent": "REPORT_SYMPTOMS", "symptoms": ["fever"], "duration": "morning", "language": "hi"},

    # =========================================================================
    # 2. PROVIDE_DURATION
    # =========================================================================
    # English
    {"text": "Three days", "intent": "PROVIDE_DURATION", "duration": "3 days", "language": "en"},
    {"text": "For three days", "intent": "PROVIDE_DURATION", "duration": "3 days", "language": "en"},
    {"text": "Since three days", "intent": "PROVIDE_DURATION", "duration": "3 days", "language": "en"},
    {"text": "Two days", "intent": "PROVIDE_DURATION", "duration": "2 days", "language": "en"},
    {"text": "Since yesterday", "intent": "PROVIDE_DURATION", "duration": "yesterday", "language": "en"},
    {"text": "For 4 days now", "intent": "PROVIDE_DURATION", "duration": "4 days", "language": "en"},
    {"text": "One week", "intent": "PROVIDE_DURATION", "duration": "1 week", "language": "en"},
    {"text": "About five days", "intent": "PROVIDE_DURATION", "duration": "5 days", "language": "en"},
    {"text": "Since this morning", "intent": "PROVIDE_DURATION", "duration": "morning", "language": "en"},
    {"text": "Just started today", "intent": "PROVIDE_DURATION", "duration": "today", "language": "en"},
    {"text": "Almost a week now", "intent": "PROVIDE_DURATION", "duration": "1 week", "language": "en"},
    {"text": "Last two days", "intent": "PROVIDE_DURATION", "duration": "2 days", "language": "en"},
    {"text": "Past four or five days", "intent": "PROVIDE_DURATION", "duration": "5 days", "language": "en"},

    # Hindi (Devanagari)
    {"text": "तीन दिन से", "intent": "PROVIDE_DURATION", "duration": "3 days", "language": "hi"},
    {"text": "दो दिन से", "intent": "PROVIDE_DURATION", "duration": "2 days", "language": "hi"},
    {"text": "कल से", "intent": "PROVIDE_DURATION", "duration": "yesterday", "language": "hi"},
    {"text": "एक हफ्ते से", "intent": "PROVIDE_DURATION", "duration": "1 week", "language": "hi"},
    {"text": "आज सुबह से", "intent": "PROVIDE_DURATION", "duration": "morning", "language": "hi"},
    {"text": "चार दिनों से", "intent": "PROVIDE_DURATION", "duration": "4 days", "language": "hi"},
    {"text": "पांच दिन हो गए", "intent": "PROVIDE_DURATION", "duration": "5 days", "language": "hi"},

    # Hinglish & Colloquial
    {"text": "Teen din se", "intent": "PROVIDE_DURATION", "duration": "3 days", "language": "hi"},
    {"text": "Do din se", "intent": "PROVIDE_DURATION", "duration": "2 days", "language": "hi"},
    {"text": "Kal se ho raha hai", "intent": "PROVIDE_DURATION", "duration": "yesterday", "language": "hi"},
    {"text": "Last 3 days se", "intent": "PROVIDE_DURATION", "duration": "3 days", "language": "hi"},
    {"text": "Pichle do din se", "intent": "PROVIDE_DURATION", "duration": "2 days", "language": "hi"},
    {"text": "One week ho gaya", "intent": "PROVIDE_DURATION", "duration": "1 week", "language": "hi"},
    {"text": "Aaj subah se ho raha hai", "intent": "PROVIDE_DURATION", "duration": "morning", "language": "hi"},
    {"text": "teen din se aisa hai", "intent": "PROVIDE_DURATION", "duration": "3 days", "language": "hi"},
    {"text": "Char din se", "intent": "PROVIDE_DURATION", "duration": "4 days", "language": "hi"},
    {"text": "Pichle paanch din se", "intent": "PROVIDE_DURATION", "duration": "5 days", "language": "hi"},
    {"text": "Lagbhag ek hafta ho gaya", "intent": "PROVIDE_DURATION", "duration": "1 week", "language": "hi"},
    {"text": "Bas kal raat se", "intent": "PROVIDE_DURATION", "duration": "yesterday", "language": "hi"},

    # =========================================================================
    # 3. PROVIDE_SEVERITY
    # =========================================================================
    # English
    {"text": "It is very severe", "intent": "PROVIDE_SEVERITY", "severity": "severe", "language": "en"},
    {"text": "It's mild pain", "intent": "PROVIDE_SEVERITY", "severity": "mild", "language": "en"},
    {"text": "Moderate severity", "intent": "PROVIDE_SEVERITY", "severity": "moderate", "language": "en"},
    {"text": "Extremely bad and unbearable", "intent": "PROVIDE_SEVERITY", "severity": "severe", "language": "en"},
    {"text": "Not too bad, manageable", "intent": "PROVIDE_SEVERITY", "severity": "mild", "language": "en"},
    {"text": "High fever very intense", "intent": "PROVIDE_SEVERITY", "severity": "severe", "language": "en"},
    {"text": "Slight discomfort only", "intent": "PROVIDE_SEVERITY", "severity": "mild", "language": "en"},

    # Hindi (Devanagari)
    {"text": "बहुत तेज दर्द है", "intent": "PROVIDE_SEVERITY", "severity": "severe", "language": "hi"},
    {"text": "हल्का सा दर्द है", "intent": "PROVIDE_SEVERITY", "severity": "mild", "language": "hi"},
    {"text": "बहुत ज्यादा तकलीफ हो रही है", "intent": "PROVIDE_SEVERITY", "severity": "severe", "language": "hi"},
    {"text": "सहन नहीं हो रहा", "intent": "PROVIDE_SEVERITY", "severity": "severe", "language": "hi"},
    {"text": "मध्यम है ज्यादा नहीं", "intent": "PROVIDE_SEVERITY", "severity": "moderate", "language": "hi"},

    # Hinglish & Colloquial
    {"text": "Bohot jyada hai", "intent": "PROVIDE_SEVERITY", "severity": "severe", "language": "hi"},
    {"text": "Halka bukhar hai", "intent": "PROVIDE_SEVERITY", "severity": "mild", "language": "hi"},
    {"text": "Severe hai bohot", "intent": "PROVIDE_SEVERITY", "severity": "severe", "language": "hi"},
    {"text": "Thoda sa dard hai", "intent": "PROVIDE_SEVERITY", "severity": "mild", "language": "hi"},
    {"text": "Bohot tez pain hai", "intent": "PROVIDE_SEVERITY", "severity": "severe", "language": "hi"},
    {"text": "Normal hai zyada nahi", "intent": "PROVIDE_SEVERITY", "severity": "moderate", "language": "hi"},
    {"text": "Bardasht se bahar hai", "intent": "PROVIDE_SEVERITY", "severity": "severe", "language": "hi"},

    # =========================================================================
    # 4. PROVIDE_LOCALITY
    # =========================================================================
    # English
    {"text": "Pandharpur", "intent": "PROVIDE_LOCALITY", "locality": "Pandharpur", "language": "en"},
    {"text": "I live in Pandharpur", "intent": "PROVIDE_LOCALITY", "locality": "Pandharpur", "language": "en"},
    {"text": "My locality is Malshiras", "intent": "PROVIDE_LOCALITY", "locality": "Malshiras", "language": "en"},
    {"text": "Malshiras", "intent": "PROVIDE_LOCALITY", "locality": "Malshiras", "language": "en"},
    {"text": "Akluj", "intent": "PROVIDE_LOCALITY", "locality": "Akluj", "language": "en"},
    {"text": "I am in Akluj village", "intent": "PROVIDE_LOCALITY", "locality": "Akluj", "language": "en"},
    {"text": "Solapur", "intent": "PROVIDE_LOCALITY", "locality": "Solapur", "language": "en"},
    {"text": "I am calling from Solapur", "intent": "PROVIDE_LOCALITY", "locality": "Solapur", "language": "en"},
    {"text": "Sangola", "intent": "PROVIDE_LOCALITY", "locality": "Sangola", "language": "en"},
    {"text": "Kurduvadi town", "intent": "PROVIDE_LOCALITY", "locality": "Kurduvadi", "language": "en"},
    {"text": "Karmala", "intent": "PROVIDE_LOCALITY", "locality": "Karmala", "language": "en"},
    {"text": "Mohol", "intent": "PROVIDE_LOCALITY", "locality": "Mohol", "language": "en"},
    {"text": "Barshi", "intent": "PROVIDE_LOCALITY", "locality": "Barshi", "language": "en"},
    {"text": "My village is near Pandharpur", "intent": "PROVIDE_LOCALITY", "locality": "Pandharpur", "language": "en"},

    # Hindi (Devanagari)
    {"text": "पंढरपुर", "intent": "PROVIDE_LOCALITY", "locality": "Pandharpur", "language": "hi"},
    {"text": "मैं पंढरपुर में रहता हूँ", "intent": "PROVIDE_LOCALITY", "locality": "Pandharpur", "language": "hi"},
    {"text": "मेरा गांव मालशिरस है", "intent": "PROVIDE_LOCALITY", "locality": "Malshiras", "language": "hi"},
    {"text": "मालशिरस", "intent": "PROVIDE_LOCALITY", "locality": "Malshiras", "language": "hi"},
    {"text": "अकलूज", "intent": "PROVIDE_LOCALITY", "locality": "Akluj", "language": "hi"},
    {"text": "सोलापुर", "intent": "PROVIDE_LOCALITY", "locality": "Solapur", "language": "hi"},
    {"text": "सांगोला", "intent": "PROVIDE_LOCALITY", "locality": "Sangola", "language": "hi"},
    {"text": "करमाला गांव", "intent": "PROVIDE_LOCALITY", "locality": "Karmala", "language": "hi"},

    # Hinglish & Colloquial
    {"text": "Mera gaon Pandharpur hai", "intent": "PROVIDE_LOCALITY", "locality": "Pandharpur", "language": "hi"},
    {"text": "Pandharpur se bol raha hu", "intent": "PROVIDE_LOCALITY", "locality": "Pandharpur", "language": "hi"},
    {"text": "Malshiras village", "intent": "PROVIDE_LOCALITY", "locality": "Malshiras", "language": "hi"},
    {"text": "Main Malshiras me rehta hu", "intent": "PROVIDE_LOCALITY", "locality": "Malshiras", "language": "hi"},
    {"text": "Hum Akluj ke paas rehte hain", "intent": "PROVIDE_LOCALITY", "locality": "Akluj", "language": "hi"},
    {"text": "Solapur shahar", "intent": "PROVIDE_LOCALITY", "locality": "Solapur", "language": "hi"},
    {"text": "Kurduvadi gaon", "intent": "PROVIDE_LOCALITY", "locality": "Kurduvadi", "language": "hi"},
    {"text": "Mera gaon Sangola hai", "intent": "PROVIDE_LOCALITY", "locality": "Sangola", "language": "hi"},
    {"text": "Mohol me", "intent": "PROVIDE_LOCALITY", "locality": "Mohol", "language": "hi"},
    {"text": "Barshi me", "intent": "PROVIDE_LOCALITY", "locality": "Barshi", "language": "hi"},

    # =========================================================================
    # 5. ANSWER_YES
    # =========================================================================
    # English
    {"text": "Yes", "intent": "ANSWER_YES", "confirmation": True, "language": "en"},
    {"text": "Yeah", "intent": "ANSWER_YES", "confirmation": True, "language": "en"},
    {"text": "Yes please", "intent": "ANSWER_YES", "confirmation": True, "language": "en"},
    {"text": "Sure", "intent": "ANSWER_YES", "confirmation": True, "language": "en"},
    {"text": "Okay", "intent": "ANSWER_YES", "confirmation": True, "language": "en"},
    {"text": "Yes that's correct", "intent": "ANSWER_YES", "confirmation": True, "language": "en"},
    {"text": "Correct", "intent": "ANSWER_YES", "confirmation": True, "language": "en"},
    {"text": "Right", "intent": "ANSWER_YES", "confirmation": True, "language": "en"},
    {"text": "Yes do that", "intent": "ANSWER_YES", "confirmation": True, "language": "en"},
    {"text": "Yes I agree", "intent": "ANSWER_YES", "confirmation": True, "language": "en"},
    {"text": "Definitely yes", "intent": "ANSWER_YES", "confirmation": True, "language": "en"},

    # Hindi (Devanagari)
    {"text": "हाँ", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "हाँ जी", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "हाँ बिल्कुल", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "ठीक है", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "ज़रूर", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "हाँ कर दो", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "सही बात है", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},

    # Hinglish & Colloquial
    {"text": "haan", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "haan ji", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "Haan please", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "Theek hai ji", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "Haan bilkul", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "Haan kar dijiye", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "Sure kar do", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "Haan theek hai", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},
    {"text": "Sahi hai", "intent": "ANSWER_YES", "confirmation": True, "language": "hi"},

    # =========================================================================
    # 6. ANSWER_NO
    # =========================================================================
    # English
    {"text": "No", "intent": "ANSWER_NO", "confirmation": False, "language": "en"},
    {"text": "Nope", "intent": "ANSWER_NO", "confirmation": False, "language": "en"},
    {"text": "No, nothing else", "intent": "ANSWER_NO", "confirmation": False, "language": "en"},
    {"text": "No nothing else", "intent": "ANSWER_NO", "confirmation": False, "language": "en"},
    {"text": "No thanks", "intent": "ANSWER_NO", "confirmation": False, "language": "en"},
    {"text": "Not needed", "intent": "ANSWER_NO", "confirmation": False, "language": "en"},
    {"text": "No I don't want that", "intent": "ANSWER_NO", "confirmation": False, "language": "en"},
    {"text": "No other symptoms", "intent": "ANSWER_NO", "confirmation": False, "language": "en"},
    {"text": "Negative", "intent": "ANSWER_NO", "confirmation": False, "language": "en"},
    {"text": "No that's all", "intent": "ANSWER_NO", "confirmation": False, "language": "en"},

    # Hindi (Devanagari)
    {"text": "नहीं", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},
    {"text": "नहीं जी", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},
    {"text": "नहीं कुछ और नहीं", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},
    {"text": "कुछ नहीं", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},
    {"text": "नहीं चाहिए", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},
    {"text": "नहीं बस इतना ही", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},

    # Hinglish & Colloquial
    {"text": "nahi kuch nahi", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},
    {"text": "Nahi", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},
    {"text": "Nahi ji", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},
    {"text": "Nahi kuch aur nahi", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},
    {"text": "Kuch nahi bas itna hi", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},
    {"text": "Nahi nahi", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},
    {"text": "No nahi", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},
    {"text": "Aisa kuch nahi hai", "intent": "ANSWER_NO", "confirmation": False, "language": "hi"},

    # =========================================================================
    # 7. REQUEST_REPEAT
    # =========================================================================
    # English
    {"text": "Repeat that", "intent": "REQUEST_REPEAT", "language": "en"},
    {"text": "Can you repeat please?", "intent": "REQUEST_REPEAT", "language": "en"},
    {"text": "Say that again", "intent": "REQUEST_REPEAT", "language": "en"},
    {"text": "I didn't understand", "intent": "REQUEST_REPEAT", "language": "en"},
    {"text": "I didn't hear you properly", "intent": "REQUEST_REPEAT", "language": "en"},
    {"text": "Could you repeat that once more?", "intent": "REQUEST_REPEAT", "language": "en"},
    {"text": "Pardon please", "intent": "REQUEST_REPEAT", "language": "en"},

    # Hindi (Devanagari)
    {"text": "फिर से बताओ", "intent": "REQUEST_REPEAT", "language": "hi"},
    {"text": "दोबारा बोलिए", "intent": "REQUEST_REPEAT", "language": "hi"},
    {"text": "समझ नहीं आया", "intent": "REQUEST_REPEAT", "language": "hi"},
    {"text": "सुनाई नहीं दिया", "intent": "REQUEST_REPEAT", "language": "hi"},
    {"text": "एक बार फिर से कहिए", "intent": "REQUEST_REPEAT", "language": "hi"},

    # Hinglish & Colloquial
    {"text": "phir se bolo", "intent": "REQUEST_REPEAT", "language": "hi"},
    {"text": "Phir se batao", "intent": "REQUEST_REPEAT", "language": "hi"},
    {"text": "Samajh nahi aaya", "intent": "REQUEST_REPEAT", "language": "hi"},
    {"text": "Dobara bolo please", "intent": "REQUEST_REPEAT", "language": "hi"},
    {"text": "Awaaz cut rahi hai dobara boliye", "intent": "REQUEST_REPEAT", "language": "hi"},
    {"text": "Ek aur baar repeat karo", "intent": "REQUEST_REPEAT", "language": "hi"},

    # =========================================================================
    # 8. REQUEST_HELP
    # =========================================================================
    # English
    {"text": "I need help", "intent": "REQUEST_HELP", "language": "en"},
    {"text": "Can you help me?", "intent": "REQUEST_HELP", "language": "en"},
    {"text": "What should I do?", "intent": "REQUEST_HELP", "language": "en"},
    {"text": "Help me please", "intent": "REQUEST_HELP", "language": "en"},
    {"text": "I don't know what to do", "intent": "REQUEST_HELP", "language": "en"},
    {"text": "Please guide me", "intent": "REQUEST_HELP", "language": "en"},

    # Hindi (Devanagari)
    {"text": "मुझे मदद चाहिए", "intent": "REQUEST_HELP", "language": "hi"},
    {"text": "मेरी मदद करो", "intent": "REQUEST_HELP", "language": "hi"},
    {"text": "मुझे क्या करना चाहिए?", "intent": "REQUEST_HELP", "language": "hi"},
    {"text": "कृपया मार्गदर्शन करें", "intent": "REQUEST_HELP", "language": "hi"},

    # Hinglish & Colloquial
    {"text": "Help chahiye", "intent": "REQUEST_HELP", "language": "hi"},
    {"text": "Meri madad karo", "intent": "REQUEST_HELP", "language": "hi"},
    {"text": "Kya karun main batao", "intent": "REQUEST_HELP", "language": "hi"},
    {"text": "Please meri help kijiye", "intent": "REQUEST_HELP", "language": "hi"},

    # =========================================================================
    # 9. FACILITY_INFORMATION
    # =========================================================================
    # English
    {"text": "Actually, I don't want to book. Just tell me where I should go.", "intent": "FACILITY_INFORMATION", "language": "en"},
    {"text": "Where is the nearest hospital?", "intent": "FACILITY_INFORMATION", "language": "en"},
    {"text": "Tell me the hospital location", "intent": "FACILITY_INFORMATION", "language": "en"},
    {"text": "Where should I go for treatment?", "intent": "FACILITY_INFORMATION", "language": "en"},
    {"text": "Which clinic is open nearby?", "intent": "FACILITY_INFORMATION", "language": "en"},
    {"text": "Give me the address of the PHC", "intent": "FACILITY_INFORMATION", "language": "en"},
    {"text": "Just tell me where to go", "intent": "FACILITY_INFORMATION", "language": "en"},

    # Hindi (Devanagari)
    {"text": "मुझे अस्पताल का स्थान बताओ", "intent": "FACILITY_INFORMATION", "language": "hi"},
    {"text": "नजदीकी अस्पताल कहाँ है?", "intent": "FACILITY_INFORMATION", "language": "hi"},
    {"text": "मुझे कहाँ जाना चाहिए?", "intent": "FACILITY_INFORMATION", "language": "hi"},
    {"text": "स्वास्थ्य केंद्र का पता बताइए", "intent": "FACILITY_INFORMATION", "language": "hi"},

    # Hinglish & Colloquial
    {"text": "Mujhe actually hospital ka location batao", "intent": "FACILITY_INFORMATION", "language": "hi"},
    {"text": "Hospital kahan hai batao", "intent": "FACILITY_INFORMATION", "language": "hi"},
    {"text": "Nearest dispensary kahan hai", "intent": "FACILITY_INFORMATION", "language": "hi"},
    {"text": "Book nahi karna bas address bata do hospital ka", "intent": "FACILITY_INFORMATION", "language": "hi"},
    {"text": "Mujhe kahan jana hoga clinic ka naam batao", "intent": "FACILITY_INFORMATION", "language": "hi"},

    # =========================================================================
    # 10. BOOK_APPOINTMENT
    # =========================================================================
    # English
    {"text": "I need to see a doctor", "intent": "BOOK_APPOINTMENT", "appointment_type": "offline", "language": "en"},
    {"text": "I want to talk to a doctor", "intent": "BOOK_APPOINTMENT", "language": "en"},
    {"text": "I want a doctor on the phone", "intent": "BOOK_APPOINTMENT", "appointment_type": "phone", "language": "en"},
    {"text": "I want to talk to a doctor on the phone", "intent": "BOOK_APPOINTMENT", "appointment_type": "phone", "language": "en"},
    {"text": "I want to visit the hospital", "intent": "BOOK_APPOINTMENT", "appointment_type": "offline", "language": "en"},
    {"text": "Book me a doctor", "intent": "BOOK_APPOINTMENT", "language": "en"},
    {"text": "I want to book an appointment", "intent": "BOOK_APPOINTMENT", "language": "en"},
    {"text": "Book an offline appointment", "intent": "BOOK_APPOINTMENT", "appointment_type": "offline", "language": "en"},
    {"text": "Can I get a phone consultation?", "intent": "BOOK_APPOINTMENT", "appointment_type": "phone", "language": "en"},
    {"text": "I want an in-person clinic visit", "intent": "BOOK_APPOINTMENT", "appointment_type": "offline", "language": "en"},
    {"text": "Schedule a doctor consultation", "intent": "BOOK_APPOINTMENT", "language": "en"},

    # Hindi (Devanagari)
    {"text": "मुझे डॉक्टर से बात करनी है", "intent": "BOOK_APPOINTMENT", "language": "hi"},
    {"text": "डॉक्टर को फोन पे बात करना है", "intent": "BOOK_APPOINTMENT", "appointment_type": "phone", "language": "hi"},
    {"text": "अस्पताल जाना है", "intent": "BOOK_APPOINTMENT", "appointment_type": "offline", "language": "hi"},
    {"text": "अपॉइंटमेंट चाहिए", "intent": "BOOK_APPOINTMENT", "language": "hi"},
    {"text": "डॉक्टर की अपॉइंटमेंट बुक कर दीजिए", "intent": "BOOK_APPOINTMENT", "language": "hi"},
    {"text": "मुझे फोन पर डॉक्टर से परामर्श लेना है", "intent": "BOOK_APPOINTMENT", "appointment_type": "phone", "language": "hi"},

    # Hinglish & Colloquial
    {"text": "Mujhe doctor se baat karni hai", "intent": "BOOK_APPOINTMENT", "language": "hi"},
    {"text": "doctor ko phone pe baat karna hai", "intent": "BOOK_APPOINTMENT", "appointment_type": "phone", "language": "hi"},
    {"text": "Doctor ko phone pe baat karna hai", "intent": "BOOK_APPOINTMENT", "appointment_type": "phone", "language": "hi"},
    {"text": "hospital jaana hai", "intent": "BOOK_APPOINTMENT", "appointment_type": "offline", "language": "hi"},
    {"text": "Hospital jaana hai", "intent": "BOOK_APPOINTMENT", "appointment_type": "offline", "language": "hi"},
    {"text": "Appointment chahiye", "intent": "BOOK_APPOINTMENT", "language": "hi"},
    {"text": "Doctor se milna hai hospital me", "intent": "BOOK_APPOINTMENT", "appointment_type": "offline", "language": "hi"},
    {"text": "Phone consultation karwa do", "intent": "BOOK_APPOINTMENT", "appointment_type": "phone", "language": "hi"},
    {"text": "Doctor ka appointment book karo", "intent": "BOOK_APPOINTMENT", "language": "hi"},
    {"text": "Offline visit book karo", "intent": "BOOK_APPOINTMENT", "appointment_type": "offline", "language": "hi"},

    # =========================================================================
    # 11. CHANGE_APPOINTMENT_TYPE
    # =========================================================================
    # English
    {"text": "Actually, I want to visit.", "intent": "CHANGE_APPOINTMENT_TYPE", "appointment_type": "offline", "language": "en"},
    {"text": "I changed my mind, I want phone consultation", "intent": "CHANGE_APPOINTMENT_TYPE", "appointment_type": "phone", "language": "en"},
    {"text": "Change it to offline visit", "intent": "CHANGE_APPOINTMENT_TYPE", "appointment_type": "offline", "language": "en"},
    {"text": "Can I switch to phone instead of visit?", "intent": "CHANGE_APPOINTMENT_TYPE", "appointment_type": "phone", "language": "en"},
    {"text": "I want to visit the clinic in person instead", "intent": "CHANGE_APPOINTMENT_TYPE", "appointment_type": "offline", "language": "en"},

    # Hindi (Devanagari)
    {"text": "फोन नहीं, मुझे अस्पताल जाकर दिखाना है", "intent": "CHANGE_APPOINTMENT_TYPE", "appointment_type": "offline", "language": "hi"},
    {"text": "फोन पर परामर्श में बदल दीजिए", "intent": "CHANGE_APPOINTMENT_TYPE", "appointment_type": "phone", "language": "hi"},
    {"text": "मुझे खुद जाकर दिखाना है", "intent": "CHANGE_APPOINTMENT_TYPE", "appointment_type": "offline", "language": "hi"},

    # Hinglish & Colloquial
    {"text": "Actually clinic visit karna hai phone nahi", "intent": "CHANGE_APPOINTMENT_TYPE", "appointment_type": "offline", "language": "hi"},
    {"text": "Change karke phone consultation kar do", "intent": "CHANGE_APPOINTMENT_TYPE", "appointment_type": "phone", "language": "hi"},
    {"text": "Clinic jana hai offline kar do", "intent": "CHANGE_APPOINTMENT_TYPE", "appointment_type": "offline", "language": "hi"},
    {"text": "Phone pe baat karni hai switch karo", "intent": "CHANGE_APPOINTMENT_TYPE", "appointment_type": "phone", "language": "hi"},

    # =========================================================================
    # 12. CONFIRM_BOOKING
    # =========================================================================
    # English
    {"text": "Please confirm the booking", "intent": "CONFIRM_BOOKING", "language": "en"},
    {"text": "Confirm this appointment slot", "intent": "CONFIRM_BOOKING", "language": "en"},
    {"text": "Yes confirm my booking", "intent": "CONFIRM_BOOKING", "language": "en"},
    {"text": "Lock this time slot", "intent": "CONFIRM_BOOKING", "language": "en"},
    {"text": "Book this slot please", "intent": "CONFIRM_BOOKING", "language": "en"},

    # Hindi (Devanagari)
    {"text": "बुकिंग पक्की कर दीजिए", "intent": "CONFIRM_BOOKING", "language": "hi"},
    {"text": "हाँ यह स्लॉट कन्फर्म करो", "intent": "CONFIRM_BOOKING", "language": "hi"},
    {"text": "अपॉइंटमेंट पक्की कर दो", "intent": "CONFIRM_BOOKING", "language": "hi"},

    # Hinglish & Colloquial
    {"text": "Booking confirm kar do", "intent": "CONFIRM_BOOKING", "language": "hi"},
    {"text": "Haan slot confirm karo please", "intent": "CONFIRM_BOOKING", "language": "hi"},
    {"text": "Appointment pakka kar do", "intent": "CONFIRM_BOOKING", "language": "hi"},
    {"text": "Ye time book kar dijiye", "intent": "CONFIRM_BOOKING", "language": "hi"},

    # =========================================================================
    # 13. CANCEL_BOOKING
    # =========================================================================
    # English
    {"text": "Cancel my booking", "intent": "CANCEL_BOOKING", "language": "en"},
    {"text": "I want to cancel the appointment", "intent": "CANCEL_BOOKING", "language": "en"},
    {"text": "Don't book it, cancel", "intent": "CANCEL_BOOKING", "language": "en"},
    {"text": "Drop this booking", "intent": "CANCEL_BOOKING", "language": "en"},

    # Hindi (Devanagari)
    {"text": "बुकिंग रद्द कर दीजिए", "intent": "CANCEL_BOOKING", "language": "hi"},
    {"text": "अपॉइंटमेंट कैंसिल कर दो", "intent": "CANCEL_BOOKING", "language": "hi"},
    {"text": "मुझे बुकिंग नहीं करानी रद्द करो", "intent": "CANCEL_BOOKING", "language": "hi"},

    # Hinglish & Colloquial
    {"text": "Booking cancel kar do", "intent": "CANCEL_BOOKING", "language": "hi"},
    {"text": "Appointment cancel karna hai", "intent": "CANCEL_BOOKING", "language": "hi"},
    {"text": "Mat karo book cancel karo", "intent": "CANCEL_BOOKING", "language": "hi"},

    # =========================================================================
    # 14. EMERGENCY
    # =========================================================================
    # English
    {"text": "I can't breathe properly", "intent": "EMERGENCY", "symptoms": ["breathing difficulty"], "emergency": True, "language": "en"},
    {"text": "My chest is hurting badly", "intent": "EMERGENCY", "symptoms": ["chest pain"], "emergency": True, "language": "en"},
    {"text": "Severe chest pain and sweating", "intent": "EMERGENCY", "symptoms": ["chest pain"], "emergency": True, "language": "en"},
    {"text": "This is an emergency", "intent": "EMERGENCY", "emergency": True, "language": "en"},
    {"text": "Patient is unconscious and not responding", "intent": "EMERGENCY", "symptoms": ["unconscious"], "emergency": True, "language": "en"},
    {"text": "Heavy bleeding and cannot stop it", "intent": "EMERGENCY", "symptoms": ["heavy bleeding"], "emergency": True, "language": "en"},
    {"text": "Severe head injury with blood loss", "intent": "EMERGENCY", "symptoms": ["head injury"], "emergency": True, "language": "en"},
    {"text": "Call an ambulance immediately", "intent": "EMERGENCY", "emergency": True, "language": "en"},
    {"text": "Difficulty in breathing chest tightness", "intent": "EMERGENCY", "symptoms": ["breathing difficulty", "chest pain"], "emergency": True, "language": "en"},

    # Hindi (Devanagari)
    {"text": "सांस लेने में दिक्कत हो रही है", "intent": "EMERGENCY", "symptoms": ["breathing difficulty"], "emergency": True, "language": "hi"},
    {"text": "सीने में बहुत दर्द है", "intent": "EMERGENCY", "symptoms": ["chest pain"], "emergency": True, "language": "hi"},
    {"text": "यह आपातकाल है", "intent": "EMERGENCY", "emergency": True, "language": "hi"},
    {"text": "मरीज बेहोश हो गया है", "intent": "EMERGENCY", "symptoms": ["unconscious"], "emergency": True, "language": "hi"},
    {"text": "बहुत ज्यादा खून बह रहा है", "intent": "EMERGENCY", "symptoms": ["heavy bleeding"], "emergency": True, "language": "hi"},
    {"text": "एंबुलेंस भेजिए तुरंत", "intent": "EMERGENCY", "emergency": True, "language": "hi"},

    # Hinglish & Colloquial
    {"text": "saans lene mein dikkat ho rahi hai", "intent": "EMERGENCY", "symptoms": ["breathing difficulty"], "emergency": True, "language": "hi"},
    {"text": "Saans lene mein dikkat ho rahi hai", "intent": "EMERGENCY", "symptoms": ["breathing difficulty"], "emergency": True, "language": "hi"},
    {"text": "seene mein bahut दर्द hai", "intent": "EMERGENCY", "symptoms": ["chest pain"], "emergency": True, "language": "hi"},
    {"text": "Seene mein bahut dard hai", "intent": "EMERGENCY", "symptoms": ["chest pain"], "emergency": True, "language": "hi"},
    {"text": "Chhati me bohot tez dard ho raha hai", "intent": "EMERGENCY", "symptoms": ["chest pain"], "emergency": True, "language": "hi"},
    {"text": "Saans nahi aa rahi bohot ghabrahat hai", "intent": "EMERGENCY", "symptoms": ["breathing difficulty"], "emergency": True, "language": "hi"},
    {"text": "Emergency hai patient behosh ho gaya", "intent": "EMERGENCY", "symptoms": ["unconscious"], "emergency": True, "language": "hi"},
    {"text": "Bohot khoon beh raha hai accident hua hai", "intent": "EMERGENCY", "symptoms": ["heavy bleeding", "injury"], "emergency": True, "language": "hi"},
    {"text": "Chest pain ho raha hai jaldi help chahiye", "intent": "EMERGENCY", "symptoms": ["chest pain"], "emergency": True, "language": "hi"},

    # =========================================================================
    # 15. FINISH
    # =========================================================================
    # English
    {"text": "Goodbye", "intent": "FINISH", "language": "en"},
    {"text": "Thank you goodbye", "intent": "FINISH", "language": "en"},
    {"text": "Thanks that is all", "intent": "FINISH", "language": "en"},
    {"text": "Bye", "intent": "FINISH", "language": "en"},
    {"text": "Have a good day", "intent": "FINISH", "language": "en"},

    # Hindi (Devanagari)
    {"text": "नमस्ते", "intent": "FINISH", "language": "hi"},
    {"text": "धन्यवाद", "intent": "FINISH", "language": "hi"},
    {"text": "शुक्रिया बस इतना ही", "intent": "FINISH", "language": "hi"},
    {"text": "अलविदा", "intent": "FINISH", "language": "hi"},

    # Hinglish & Colloquial
    {"text": "Dhanyawad namaste", "intent": "FINISH", "language": "hi"},
    {"text": "Thank you bye", "intent": "FINISH", "language": "hi"},
    {"text": "Bas itna hi tha shukriya", "intent": "FINISH", "language": "hi"},
    {"text": "Namaste", "intent": "FINISH", "language": "hi"},

    # =========================================================================
    # 16. UNKNOWN
    # =========================================================================
    {"text": "The sky is blue today", "intent": "UNKNOWN", "language": "en"},
    {"text": "What is the weather in Delhi?", "intent": "UNKNOWN", "language": "en"},
    {"text": "Play some Bollywood music", "intent": "UNKNOWN", "language": "en"},
    {"text": "Tell me a joke", "intent": "UNKNOWN", "language": "en"},
    {"text": "Who is the prime minister?", "intent": "UNKNOWN", "language": "en"},
    {"text": "Cricket score kya hai", "intent": "UNKNOWN", "language": "hi"},
    {"text": "Gaana chalao", "intent": "UNKNOWN", "language": "hi"},
    {"text": "Aaj mausam kaisa hai", "intent": "UNKNOWN", "language": "hi"},
    {"text": "asdfghjkl zxcvbnm", "intent": "UNKNOWN", "language": "en"},
    {"text": "kuch bhi random bol raha hu", "intent": "UNKNOWN", "language": "hi"},
]

def expand_dataset(base_data: list) -> list:
    """Generate systematic permutations, noisy speech variations, and colloquial expressions."""
    expanded = list(base_data)

    symptom_combos = [
        (["fever", "cough"], "bukhar aur khansi", "fever and cough"),
        (["fever", "headache"], "bukhar aur sir dard", "fever and headache"),
        (["cough", "cold"], "khansi aur j जुकाम", "cough and cold"),
        (["stomach ache", "vomiting"], "pet dard aur ulti", "stomach pain and vomiting"),
        (["vomiting", "diarrhea"], "ulti aur dast", "vomiting and loose motions"),
        (["injury", "swelling"], "chot aur sujan", "injury and swelling"),
        (["joint pain", "body ache"], "jodon me dard aur badan dard", "joint pain and body ache"),
    ]

    durations = [
        ("1 day", "ek din se", "since one day"),
        ("2 days", "do din se", "for two days"),
        ("3 days", "teen din se", "for 3 days"),
        ("4 days", "char din se", "for four days"),
        ("5 days", "paanch din se", "five days now"),
        ("1 week", "ek hafte se", "for one week"),
        ("yesterday", "kal se", "since yesterday"),
        ("morning", "aaj subah se", "since this morning"),
    ]

    localities = [
        "Pandharpur", "Malshiras", "Akluj", "Solapur", "Sangola",
        "Karmala", "Kurduvadi", "Mohol", "Barshi", "Mangalvedha"
    ]

    # Expand Symptoms + Durations
    for sym_list, sym_hi, sym_en in symptom_combos:
        for dur_val, dur_hi, dur_en in durations[:4]:
            expanded.append({
                "text": f"Mujhe {dur_hi} {sym_hi} hai",
                "intent": "REPORT_SYMPTOMS",
                "symptoms": sym_list,
                "duration": dur_val,
                "language": "hi",
            })
            expanded.append({
                "text": f"{dur_hi} {sym_hi} chal raha hai",
                "intent": "REPORT_SYMPTOMS",
                "symptoms": sym_list,
                "duration": dur_val,
                "language": "hi",
            })
            expanded.append({
                "text": f"I have had {sym_en} {dur_en}",
                "intent": "REPORT_SYMPTOMS",
                "symptoms": sym_list,
                "duration": dur_val,
                "language": "en",
            })
            expanded.append({
                "text": f"Suffering from {sym_en} {dur_en}",
                "intent": "REPORT_SYMPTOMS",
                "symptoms": sym_list,
                "duration": dur_val,
                "language": "en",
            })

    # Expand Localities
    for loc in localities:
        expanded.append({"text": loc, "intent": "PROVIDE_LOCALITY", "locality": loc, "language": "en"})
        expanded.append({"text": f"Mera gaon {loc} hai", "intent": "PROVIDE_LOCALITY", "locality": loc, "language": "hi"})
        expanded.append({"text": f"Main {loc} se bol raha hu", "intent": "PROVIDE_LOCALITY", "locality": loc, "language": "hi"})
        expanded.append({"text": f"I live in {loc}", "intent": "PROVIDE_LOCALITY", "locality": loc, "language": "en"})
        expanded.append({"text": f"Hum {loc} me rehte hain", "intent": "PROVIDE_LOCALITY", "locality": loc, "language": "hi"})
        expanded.append({"text": f"Calling from {loc} village", "intent": "PROVIDE_LOCALITY", "locality": loc, "language": "en"})

    # Expand Booking
    for loc in localities[:4]:
        expanded.append({"text": f"{loc} me doctor se baat karni hai", "intent": "BOOK_APPOINTMENT", "locality": loc, "language": "hi"})
        expanded.append({"text": f"I want to see a doctor in {loc}", "intent": "BOOK_APPOINTMENT", "locality": loc, "language": "en"})

    # Expand Yes / No variants
    yes_variants = [
        "haan kar dijiye", "ji haan", "haan ji confirm karo", "theek hai book karo",
        "haan slot lock karo", "yes confirm please", "yes lock the appointment", "yeah book it", "okay go ahead"
    ]
    for y in yes_variants:
        expanded.append({"text": y, "intent": "ANSWER_YES", "confirmation": True, "language": "hi" if "haan" in y or "theek" in y or "ji" in y else "en"})

    no_variants = [
        "nahi nahi rehne do", "kuch nahi chahiye", "nahi aur koi takleef nahi hai", "nahi bilkul nahi",
        "no that is all", "no don't book", "no other symptoms to report", "nope nothing"
    ]
    for n in no_variants:
        expanded.append({"text": n, "intent": "ANSWER_NO", "confirmation": False, "language": "hi" if "nahi" in n or "kuch" in n else "en"})

    # Expand Emergency variants
    em_variants = [
        ("Severe chest pain radiating to left arm", ["chest pain"], "en"),
        ("Seene me bohot jalan aur tez dard ho raha hai", ["chest pain"], "hi"),
        ("Patient behosh pada hai uth nahi raha", ["unconscious"], "hi"),
        ("Severe head trauma with non-stop bleeding", ["head injury", "heavy bleeding"], "en"),
        ("Chhati me dard aur saans lene me behad dikkat", ["chest pain", "breathing difficulty"], "hi"),
        ("Bohot blood loss ho raha hai jaldi gaadi bhejo", ["heavy bleeding"], "hi"),
        ("Sudden collapse and breathless", ["breathing difficulty", "unconscious"], "en"),
    ]
    for text, sym, lang in em_variants:
        expanded.append({"text": text, "intent": "EMERGENCY", "symptoms": sym, "emergency": True, "language": lang})

    # Expand Repeat
    repeat_variants = [
        "can you say that once more", "say that again please", "phir se kahiye",
        "ek baar phir bolo", "samajh nahi paaya dobara bolo", "phir se batao kya kaha",
        "repeat please", "dobara batao", "pardon please repeat", "awaaz nahi aayi ek baar aur bolo"
    ]
    for r in repeat_variants:
        expanded.append({"text": r, "intent": "REQUEST_REPEAT", "language": "hi" if ("bolo" in r or "kahiye" in r or "batao" in r or "paaya" in r) else "en"})

    # Expand Help
    help_variants = [
        "mujhe samajh nahi aa raha kya karun", "kripya guide kijiye", "kripya madad karein",
        "please guide what should I do", "guide me on next steps", "I need assistance",
        "madad ki jarurat hai", "kuch samajh nahi aa raha help me"
    ]
    for h in help_variants:
        expanded.append({"text": h, "intent": "REQUEST_HELP", "language": "hi" if ("madad" in h or "kripya" in h or "kuch" in h) else "en"})

    # Expand Confirm Booking
    confirm_variants = [
        "haan confirm kar dijiye", "booking pakki kar do", "slot lock kar dijiye",
        "is time pe book karo", "yes please confirm", "confirm the slot",
        "lock this booking", "haan is samay par book kar do", "yes lock this appointment"
    ]
    for c in confirm_variants:
        expanded.append({"text": c, "intent": "CONFIRM_BOOKING", "language": "hi" if ("karo" in c or "dijiye" in c or "haan" in c) else "en"})

    # Expand Cancel Booking
    cancel_variants = [
        "booking cancel karni hai", "appointment radd karo", "mujhe book nahi karna cancel kar do",
        "cancel this appointment", "drop the booking", "mujhe nahi karwani booking", "cancel it please"
    ]
    for can in cancel_variants:
        expanded.append({"text": can, "intent": "CANCEL_BOOKING", "language": "hi" if ("karni" in can or "radd" in can or "kar do" in can) else "en"})

    # Expand Unknown
    unknown_variants = [
        "who won the match yesterday", "tum kaun ho", "what is artificial intelligence",
        "order some food", "kitne baje hain time batao", "hello who is this", "ghoomne kahan jayein",
        "today is very sunny", "play a movie for me", "random chatter blabla"
    ]
    for u in unknown_variants:
        expanded.append({"text": u, "intent": "UNKNOWN", "language": "hi" if ("kaun" in u or "baje" in u or "jayein" in u) else "en"})

    return expanded


def generate():
    expanded = expand_dataset(RAW_DATA)
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DATASET_PATH, "w", encoding="utf-8") as f:
        for entry in expanded:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    print(f"Generated {len(expanded)} training examples at: {DATASET_PATH}")


if __name__ == "__main__":
    generate()
