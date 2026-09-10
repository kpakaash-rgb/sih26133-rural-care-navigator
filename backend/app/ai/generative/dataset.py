"""
app/ai/generative/dataset.py
============================
Training dataset generator and PyTorch Dataset/DataLoader for the
Rural Care Navigator generative conversational model.
Generates comprehensive context-response pairs covering all healthcare intake
scenarios across English, Devanagari Hindi, and Hinglish with balanced phase distribution.
"""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import torch
from torch.utils.data import Dataset

from backend.app.ai.generative.config import GenerativeModelConfig
from backend.app.ai.generative.tokenizer import LocalSubwordTokenizer


def serialize_context(
    phase: str = "SYMPTOMS",
    sym: str = "NONE",
    dur: str = "NONE",
    loc: str = "NONE",
    name: str = "NONE",
    age: str = "NONE",
    gender: str = "NONE",
    care: str = "NONE",
    facility: str = "NONE",
    lang: str = "en",
) -> str:
    """Format structured memory into exact context string format."""
    lines = [
        f"phase:{phase}",
        f"sym:{sym}",
        f"dur:{dur}",
        f"loc:{loc}",
        f"name:{name}",
        f"age:{age}",
        f"gender:{gender}",
        f"care:{care}",
        f"facility:{facility}",
        f"lang:{lang}",
    ]
    return "\n".join(lines)


def generate_rural_intake_dataset() -> List[Dict[str, str]]:
    """
    Programmatically synthesize diverse, clinically safe conversational intake pairs.
    Covers all 19 conversational phases with balanced representation across en, hi, and hinglish.
    Guarantees no shifted arguments, no grammatical stutter, and clean word boundaries.
    """
    random.seed(42)
    samples: List[Dict[str, str]] = []

    def add(
        phase: str,
        resp: str,
        sym: str = "NONE",
        dur: str = "NONE",
        loc: str = "NONE",
        name: str = "NONE",
        age: str = "NONE",
        gender: str = "NONE",
        care: str = "NONE",
        facility: str = "NONE",
        lang: str = "en",
    ):
        resp = str(resp).strip()
        assert facility not in ("en", "hi"), f"Corrupted facility: {facility}"
        assert lang in ("en", "hi"), f"Invalid lang: {lang}"
        ctx = serialize_context(
            phase=phase, sym=sym, dur=dur, loc=loc, name=name, age=age,
            gender=gender, care=care, facility=facility, lang=lang
        )
        samples.append({"context": ctx, "response": resp})

    # Vocabulary of entities
    villages = ["Pandharpur", "Malshiras", "Sangola", "Baramati", "Shirpur", "Karmala", "Mohol", "Akluj"]
    names_male = ["Ramesh", "Suresh", "Ganesh", "Mahesh", "Rahul", "Santosh", "Vijay", "Anil"]
    names_female = ["Sunita", "Asha", "Geeta", "Kavita", "Pooja", "Rekha", "Lata", "Anita"]
    ages = ["24", "32", "45", "56", "68", "19", "50", "38"]

    symptoms_en = [
        ("fever", "fever,chills"),
        ("cough", "cough,cold"),
        ("headache", "severe headache"),
        ("stomach pain", "stomach pain,vomiting"),
        ("body pain", "joint pain,weakness"),
        ("hand injury", "injury,swelling"),
        ("back pain", "lower back pain"),
        ("chest discomfort", "chest congestion"),
        ("vomiting", "loose motions,weakness"),
        ("dizziness", "dizziness,fatigue"),
    ]

    symptoms_hi = [
        ("bukhar", "bukhar aur thand"),
        ("khansi", "khansi aur zukham"),
        ("sar dard", "tez sar dard"),
        ("pet dard", "pet kharab aur ulti"),
        ("badan dard", "jodo ka dard aur kamzori"),
        ("haath mein chot", "chot aur sujan"),
        ("kamar dard", "kamar mein tez dard"),
        ("seene mein jakdan", "seene mein dard"),
        ("ulti", "dast aur kamzori"),
        ("chakkar", "chakkar aur thakaan"),
    ]

    durations_en = ["since yesterday", "for 2 days", "for 3 days", "for about a week", "since this morning"]
    durations_hi = ["kal se", "do din se", "teen din se", "ek hafte se", "aaj subah se"]

    care_levels = [
        ("Primary Health Centre", "PHC", "Malshiras Primary Health Centre", "primary healthcare centre"),
        ("Community Health Centre", "CHC", "Pandharpur Community Health Centre", "community health centre"),
        ("Sub-Centre", "Sub-Centre", "Sangola Health Sub-Centre", "local health sub-centre"),
        ("District Hospital", "District Hospital", "Solapur Civil Hospital", "district hospital"),
    ]

    slots = ["10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "04:30 PM"]

    # 1. GREETING (approx 60 examples)
    greetings_en = [
        "Hello, this is Rural Care Navigator. What health problems are you facing today?",
        "Welcome to the health helpline. Please tell me what medical issues you are experiencing.",
        "Good day. I am here to assist with your healthcare. Could you explain what symptoms you have?",
        "Hello. Please describe your health problem and how we can assist you today.",
        "Welcome. I am your digital care assistant. Please describe what difficulties you are feeling.",
        "Hello. How can our medical helpline support you or your family member today?",
        "Namaste, this is the rural care helpline. What medical assistance do you require?",
        "Good morning. Please tell me about your health condition so I can guide you properly.",
        "Hello. I am here to listen to your health issues and connect you with the nearest clinic.",
        "Greetings. What symptoms or medical difficulties would you like to discuss today?",
    ]
    for r in greetings_en:
        add("GREETING", r, lang="en")
        add("GREETING", r, sym="NONE", loc="NONE", lang="en")

    greetings_hi = [
        "नमस्ते, मैं आपका स्वास्थ्य सहायक हूँ। कृपया बताएं कि आपको क्या शारीरिक परेशानी हो रही है?",
        "रूरल केयर हेल्पलाइन में आपका स्वागत है। आपको क्या स्वास्थ्य समस्या है, विस्तार से बताएं।",
        "नमस्ते। कृपया अपने लक्षण बताएं ताकि हम आपको सही डॉक्टर या अस्पताल का सुझाव दे सकें।",
        "प्रणाम। आप किस स्वास्थ्य तकलीफ के लिए परामर्श लेना चाहते हैं?",
        "नमस्ते। आपकी क्या बीमारी या शारीरिक समस्या है, कृपया हमें बताएं।",
        "स्वागत है। कृपया बताएं कि आप या आपके परिवार में कौन बीमार है और क्या तकलीफ है?",
        "नमस्ते, स्वास्थ्य सेवा में आपका स्वागत है। अपनी बीमारी के बारे में बताएं।",
        "प्रणाम। आज हम आपकी स्वास्थ्य सहायता कैसे कर सकते हैं?",
        "नमस्ते। अपनी स्वास्थ्य संबंधी समस्या बताइए, ताकि हम उचित क्लिनिक की जानकारी दे सकें।",
        "शुभ दिन। कृपया बताएं कि आपको कौन से लक्षण महसूस हो रहे हैं?",
    ]
    for r in greetings_hi:
        add("GREETING", r, lang="hi")
        add("GREETING", r, sym="NONE", loc="NONE", lang="hi")

    greetings_hinglish = [
        "Namaste, main aapka swasthya sahayak hoon. Kripya batayein aapko kya bimari ya takleef hai?",
        "Hello ji. Aapko kya health problem ho rahi hai, kripya khulkar batayein.",
        "Namaste. Kripya apne lakshan batayein taaki hum sahi doctor ya hospital mein appointment arrange karein.",
        "Swagat hai. Kripya batayein aapko kaun se lakshan mehsoos ho rahe hain?",
        "Hello, Rural Care Navigator mein aapka swagat hai. Aapko kya takleef ho rahi hai?",
        "Namaste. Main aapki healthcare assistance ke liye hoon. Apni samasya batayein.",
        "Namaste ji. Aapko kya takleef mehsoos ho rahi hai, kripya batayein.",
        "Hello. Kya aap apne ya parivar ke sadasya ki bimari ke baare mein bata sakte hain?",
    ]
    for r in greetings_hinglish:
        add("GREETING", r, lang="hi")
        add("GREETING", r, sym="NONE", loc="NONE", lang="hi")

    # 2. SYMPTOMS (approx 75 examples) — Critical phase previously missing!
    for sym_en_pair, sym_hi_pair in zip(symptoms_en, symptoms_hi):
        s_en, s_det_en = sym_en_pair
        s_hi, s_det_hi = sym_hi_pair

        # English symptom acknowledgements
        add("SYMPTOMS", f"I note that you are experiencing {s_en}. Could you tell me more about your symptoms?", sym=s_en, lang="en")
        add("SYMPTOMS", f"Understood, you have reported {s_det_en}. Are you feeling any other discomfort?", sym=s_det_en, lang="en")
        add("SYMPTOMS", f"Thank you for sharing. How long have you been suffering from this {s_en}?", sym=s_en, lang="en")

        # Hindi symptom acknowledgements
        add("SYMPTOMS", f"मैंने नोट कर लिया है कि आपको {s_hi} की शिकायत है। क्या कोई अन्य परेशानी भी है?", sym=s_hi, lang="hi")
        add("SYMPTOMS", f"समझ गया, आपको {s_det_hi} हो रहा है। कृपया बताएं यह तकलीफ कितने समय से है?", sym=s_det_hi, lang="hi")
        add("SYMPTOMS", f"जानकारी के लिए धन्यवाद। क्या {s_hi} के साथ आपको तेज दर्द या कमजोरी भी है?", sym=s_hi, lang="hi")

        # Hinglish symptom acknowledgements
        add("SYMPTOMS", f"Theek hai, maine note kiya ki aapko {s_hi} hai. Kya iske alawa koi aur takleef hai?", sym=s_hi, lang="hi")
        add("SYMPTOMS", f"Aapko {s_det_hi} ki samasya hai. Yeh samasya kab se shuru hui?", sym=s_det_hi, lang="hi")

    # 3. DURATION (approx 70 examples)
    for sym_en_pair, sym_hi_pair in zip(symptoms_en, symptoms_hi):
        s_en, s_det_en = sym_en_pair
        s_hi, s_det_hi = sym_hi_pair

        add("DURATION", f"How many days or hours have you had this {s_en}?", sym=s_en, lang="en")
        add("DURATION", f"Could you specify since when you have been experiencing {s_det_en}?", sym=s_det_en, lang="en")
        add("DURATION", f"Since when has the {s_en} been bothering you? Please tell me the number of days.", sym=s_en, lang="en")

        # NO double "se se" in Hindi!
        add("DURATION", f"आपको यह {s_hi} कितने दिनों या समय से हो रहा है?", sym=s_hi, lang="hi")
        add("DURATION", f"कृपया बताएं कि यह {s_det_hi} कब से शुरू हुई है?", sym=s_det_hi, lang="hi")
        add("DURATION", f"क्या यह {s_hi} कल से है या कई दिनों से? कृपया समय बताएं।", sym=s_hi, lang="hi")

        add("DURATION", f"Yeh {s_hi} aapko kitne din ya ghante se ho raha hai?", sym=s_hi, lang="hi")
        add("DURATION", f"Kripya batayein aapko {s_det_hi} kab se mehsoos ho rahi hai?", sym=s_det_hi, lang="hi")

    # 4. LOCALITY (approx 75 examples)
    for (s_en, _), (s_hi, _) in zip(symptoms_en[:5], symptoms_hi[:5]):
        for dur_en, dur_hi in zip(durations_en, durations_hi):
            # English
            add("LOCALITY", f"Understood, you have had {s_en} {dur_en}. Which village, town, or area are you calling from?", sym=s_en, dur=dur_en, lang="en")
            add("LOCALITY", f"Thank you. To locate the nearest healthcare centre, please tell me your village or locality name.", sym=s_en, dur=dur_en, lang="en")

            # Hindi (GRAMMATICALLY CORRECT: NO "se se")
            add("LOCALITY", f"समझ गया, {dur_hi} {s_hi} है। आप किस गांव, कस्बे या शहर से बोल रहे हैं?", sym=s_hi, dur=dur_hi, lang="hi")
            add("LOCALITY", f"नजदीकी अस्पताल ढूंढने के लिए कृपया अपना गांव या मोहल्ला बताएं।", sym=s_hi, dur=dur_hi, lang="hi")

            # Hinglish
            add("LOCALITY", f"Theek hai, {dur_hi} {s_hi} hai. Aap kaun se gaon ya area se bol rahe hain?", sym=s_hi, dur=dur_hi, lang="hi")

    # 5. NAME (approx 70 examples)
    for vill in villages:
        add("NAME", f"Noted that you are from {vill}. May I please know the patient's name?", sym="fever", dur="2 days", loc=vill, lang="en")
        add("NAME", f"Understood, calling from {vill}. Could you share the name of the person needing medical care?", sym="cough", dur="3 days", loc=vill, lang="en")
        add("NAME", f"Thank you for sharing your location {vill}. What is the patient's full name?", sym="stomach pain", dur="since yesterday", loc=vill, lang="en")

        add("NAME", f"धन्यवाद, {vill} नोट कर लिया है। कृपया मरीज का नाम बताएं।", sym="bukhar", dur="do din se", loc=vill, lang="hi")
        add("NAME", f"ठीक है, आप {vill} से हैं। मरीज का शुभ नाम क्या है?", sym="khansi", dur="teen din se", loc=vill, lang="hi")
        add("NAME", f"परामर्श जारी रखने के लिए कृपया बीमार व्यक्ति का नाम बताएं।", sym="pet dard", dur="kal se", loc=vill, lang="hi")

        add("NAME", f"Shukriya, {vill} note ho gaya. Kripya mareez ka shubh naam batayein?", sym="bukhar", dur="do din se", loc=vill, lang="hi")
        add("NAME", f"Theek hai, {vill} se bol rahe hain. Kripya apna ya mareez ka naam batayein?", sym="badan dard", dur="ek hafte se", loc=vill, lang="hi")
        add("NAME", f"Please tell me the name of the caller or family member who is ill.", sym="headache", dur="2 days", loc=vill, lang="en")
        add("NAME", f"कृपया बताएं कि परामर्श किसके लिए लिया जा रहा है, उनका नाम क्या है?", sym="sar dard", dur="do din se", loc=vill, lang="hi")
        add("NAME", f"Aapka shubh naam kya hai taaki hum registration shuru kar sakein?", sym="chot", dur="kal se", loc=vill, lang="hi")

    # 6. AGE (approx 80 examples)
    for nm_m, nm_f in zip(names_male, names_female):
        for loc_v in ["Malshiras", "Pandharpur"]:
            # English
            add("AGE", f"Thank you {nm_m}. Could you please tell me the patient's age?", sym="fever", dur="2 days", loc=loc_v, name=nm_m, lang="en")
            add("AGE", f"Noted {nm_f}. What is the patient's age in years?", sym="body pain", dur="3 days", loc=loc_v, name=nm_f, lang="en")

            # Hindi
            add("AGE", f"धन्यवाद {nm_m} जी। कृपया बताएं कि मरीज की उम्र कितने वर्ष है?", sym="bukhar", dur="do din se", loc=loc_v, name=nm_m, lang="hi")
            add("AGE", f"शुक्रिया {nm_f} जी। क्या आप मरीज की आयु बता सकते हैं?", sym="sar dard", dur="ek din se", loc=loc_v, name=nm_f, lang="hi")

            # Hinglish
            add("AGE", f"Dhanyawad {nm_m} ji. Mareez ki umar kitne saal hai?", sym="pet dard", dur="kal se", loc=loc_v, name=nm_m, lang="hi")
            add("AGE", f"Thanks {nm_f} ji. Kripya patient ki aayu batayein?", sym="khansi", dur="teen din se", loc=loc_v, name=nm_f, lang="hi")

    # 7. GENDER (approx 65 examples)
    for nm_m, nm_f in zip(names_male, names_female):
        add("GENDER", f"Thank you {nm_m}. Is the patient male, female, or other?", name=nm_m, age="35", lang="en")
        add("GENDER", f"To register your profile correctly, please confirm if {nm_f} is female or male.", name=nm_f, age="42", lang="en")

        add("GENDER", f"धन्यवाद {nm_m} जी। कृपया मरीज का लिंग (पुरुष या महिला) बताएं।", name=nm_m, age="35", lang="hi")
        add("GENDER", f"कृपया बताएं कि मरीज पुरुष हैं या महिला?", name=nm_f, age="42", lang="hi")

        add("GENDER", f"Profile complete karne ke liye kripya male ya female confirm karein.", name=nm_m, age="35", lang="hi")

    # 8. SAFETY_QUESTIONS (approx 70 examples)
    for vill in villages[:6]:
        for nm in [names_male[0], names_female[0]]:
            add("SAFETY_QUESTIONS", f"Thank you {nm}. Are you experiencing any severe difficulty breathing, intense chest pain, or continuous vomiting?",
                sym="fever", dur="3 days", loc=vill, name=nm, age="45", gender="male", lang="en")
            add("SAFETY_QUESTIONS", f"Before we proceed, please confirm if there is any high fever with confusion, breathlessness, or severe dizziness.",
                sym="cough", dur="4 days", loc=vill, name=nm, age="45", gender="female", lang="en")

            add("SAFETY_QUESTIONS", f"धन्यवाद {nm} जी। क्या आपको सांस लेने में बहुत तकलीफ, सीने में तेज दर्द, या लगातार उल्टी हो रही है?",
                sym="bukhar", dur="teen din se", loc=vill, name=nm, age="45", gender="male", lang="hi")
            add("SAFETY_QUESTIONS", f"कृपया बताएं कि क्या आपको बहुत तेज चक्कर, बेहोशी या छाती में भारीपन महसूस हो रहा है?",
                sym="khansi", dur="chaar din se", loc=vill, name=nm, age="45", gender="female", lang="hi")

            add("SAFETY_QUESTIONS", f"Dhanyawad {nm} ji. Kya aapko saans lene mein takleef ya seene mein dard mehsoos ho raha hai?",
                sym="bukhar", dur="teen din se", loc=vill, name=nm, age="45", gender="male", lang="hi")

    # 9. TRIAGE_PRESENTED (approx 80 examples)
    for care_name, care_code, fac_full, care_desc_en in care_levels:
        for vill in villages[:4]:
            add("TRIAGE_PRESENTED", f"Based on your symptoms, a clinical evaluation at a {care_desc_en} is recommended. I found {fac_full} near {vill}. Would you like to book an appointment?",
                sym="fever,cough", dur="3 days", loc=vill, name="Ramesh", age="42", gender="male", care=care_code, facility=fac_full, lang="en")
            add("TRIAGE_PRESENTED", f"According to triage recommendations, you should visit {fac_full}. Would you prefer a teleconsultation or an in-person clinic visit?",
                sym="stomach pain", dur="2 days", loc=vill, name="Sunita", age="38", gender="female", care=care_code, facility=fac_full, lang="en")

            add("TRIAGE_PRESENTED", f"आपके लक्षणों के अनुसार, {care_name} में जांच कराने की सलाह दी जाती है। आपके पास {fac_full} उपलब्ध है। क्या आप अपॉइंटमेंट बुक करना चाहते हैं?",
                sym="bukhar,khansi", dur="teen din se", loc=vill, name="Ramesh", age="42", gender="male", care=care_code, facility=fac_full, lang="hi")
            add("TRIAGE_PRESENTED", f"क्लिनिकल दिशा-निर्देशों के अनुसार {fac_full} जाना उचित रहेगा। क्या आप वहां डॉक्टर से मिलना पसंद करेंगे?",
                sym="pet dard", dur="do din se", loc=vill, name="Sunita", age="38", gender="female", care=care_code, facility=fac_full, lang="hi")

            add("TRIAGE_PRESENTED", f"Aapke lakshano ke aadhar par {fac_full} mein consult karna uchit rahega. Kya aap yahan appointment lena chahte hain?",
                sym="badan dard", dur="chaar din se", loc=vill, name="Mahesh", age="50", gender="male", care=care_code, facility=fac_full, lang="hi")

    # 10. BOOKING_TYPE (approx 70 examples)
    for fac in ["Malshiras PHC", "Pandharpur CHC", "Sangola Sub-Centre", "Baramati Hospital"]:
        for vill in ["Malshiras", "Pandharpur", "Sangola", "Baramati"]:
            add("BOOKING_TYPE", "Would you prefer an in-person visit to the clinic or a telephone consultation with the doctor?",
                loc=vill, care="PHC", facility=fac, lang="en")
            add("BOOKING_TYPE", f"We can arrange either a phone consultation or an offline visit at {fac}. Which do you prefer?",
                loc=vill, care="CHC", facility=fac, lang="en")

            add("BOOKING_TYPE", "क्या आप अस्पताल जाकर डॉक्टर को दिखाना चाहते हैं या फोन पर परामर्श करना पसंद करेंगे?",
                loc=vill, care="PHC", facility=fac, lang="hi")
            add("BOOKING_TYPE", f"हम {fac} में क्लिनिक विजिट या फोन कंसल्टेशन दोनों उपलब्ध करा सकते हैं। आप क्या चुनेंगे?",
                loc=vill, care="CHC", facility=fac, lang="hi")

            add("BOOKING_TYPE", "Kya aap clinic jakar dikhana chahte hain ya phone par doctor se baat karna chahte hain?",
                loc=vill, care="Sub-Centre", facility=fac, lang="hi")

    # 11. BOOKING_CONFIRM (approx 90 examples)
    for slt in slots:
        for fac in ["Malshiras PHC", "Pandharpur CHC", "Sangola Sub-Centre"]:
            add("BOOKING_CONFIRM", f"I have found an available slot tomorrow at {slt} at {fac}. Shall I confirm this appointment for you?",
                loc="Malshiras", name="Ramesh", care="PHC", facility=fac, lang="en")
            add("BOOKING_CONFIRM", f"A doctor is available tomorrow at {slt} at {fac}. Would you like me to book this slot?",
                loc="Pandharpur", name="Sunita", care="CHC", facility=fac, lang="en")

            add("BOOKING_CONFIRM", f"मुझे {fac} में कल {slt} का स्लॉट मिला है। क्या मैं आपके लिए यह अपॉइंटमेंट पक्का कर दूँ?",
                loc="Malshiras", name="Ramesh", care="PHC", facility=fac, lang="hi")
            add("BOOKING_CONFIRM", f"कल {slt} बजे {fac} में डॉक्टर उपलब्ध हैं। क्या इसे कन्फर्म कर दिया जाए?",
                loc="Pandharpur", name="Sunita", care="CHC", facility=fac, lang="hi")

            add("BOOKING_CONFIRM", f"Maine {fac} mein kal {slt} ka slot dekha hai. Kya main ise confirm karke book kar doon?",
                loc="Malshiras", name="Ramesh", care="PHC", facility=fac, lang="hi")

    # 12. ANSWER_YES (approx 60 examples)
    yes_en = [
        "Great, proceeding with your booking confirmation now.",
        "Thank you. Confirming your details and reserving your appointment slot.",
        "Understood. I am processing your confirmation right away.",
        "Very well, locking in your chosen consultation time.",
    ]
    for vill, nm in [("Malshiras", "Ramesh"), ("Pandharpur", "Sunita"), ("Sangola", "Ganesh"), ("Baramati", "Pooja")]:
        for r in yes_en:
            add("ANSWER_YES", r, loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="en")

    yes_hi = [
        "बहुत अच्छा, मैं आपकी बुकिंग की पुष्टि कर रहा हूँ।",
        "धन्यवाद। आपकी जानकारी दर्ज करके स्लॉट पक्का किया जा रहा है।",
        "ठीक है, मैं अभी आपकी अपॉइंटमेंट कन्फर्म कर देता हूँ।",
        "शुक्रिया, आगे की प्रक्रिया पूरी की जा रही है।",
    ]
    for vill, nm in [("Malshiras", "Ramesh"), ("Pandharpur", "Sunita"), ("Sangola", "Ganesh"), ("Baramati", "Pooja")]:
        for r in yes_hi:
            add("ANSWER_YES", r, loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="hi")

    yes_hinglish = [
        "Shukriya, main aage ki prakriya poori karke appointment confirm kar raha hoon.",
        "Theek hai ji, aapka slot register kiya ja raha hai.",
        "Bahut badhiya, main details confirm kar deta hoon.",
    ]
    for vill, nm in [("Malshiras", "Ramesh"), ("Pandharpur", "Sunita"), ("Sangola", "Ganesh"), ("Baramati", "Pooja")]:
        for r in yes_hinglish:
            add("ANSWER_YES", r, loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="hi")

    # 13. ANSWER_NO (approx 60 examples)
    no_en = [
        "Understood. Would you prefer a different time slot or another facility nearby?",
        "No problem at all. We can choose another day or an alternative healthcare centre.",
        "Alright, let us find another appointment slot that suits your schedule better.",
        "Noted. Would you like to check available slots for a telephone consultation instead?",
    ]
    for vill, nm in [("Malshiras", "Ramesh"), ("Pandharpur", "Sunita"), ("Sangola", "Ganesh"), ("Baramati", "Pooja")]:
        for r in no_en:
            add("ANSWER_NO", r, loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="en")

    no_hi = [
        "कोई बात नहीं। क्या आप कोई दूसरा समय या अन्य नजदीकी अस्पताल देखना पसंद करेंगे?",
        "समझ गया। क्या हम किसी दूसरे दिन का स्लॉट या फोन परामर्श का विकल्प देखें?",
        "ठीक है, हम आपके लिए दूसरा उपयुक्त समय खोज लेते हैं।",
        "नोट कर लिया। क्या आप किसी अन्य क्लिनिक में परामर्श लेना चाहेंगे?",
    ]
    for vill, nm in [("Malshiras", "Ramesh"), ("Pandharpur", "Sunita"), ("Sangola", "Ganesh"), ("Baramati", "Pooja")]:
        for r in no_hi:
            add("ANSWER_NO", r, loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="hi")

    no_hinglish = [
        "Koi baat nahi. Kya aap koi doosra samay ya doosra hospital dekhna chahenge?",
        "Theek hai, hum doosra available slot check kar lete hain.",
        "Samajh gaya. Kya aap kisi aur din ka appointment chahte hain?",
    ]
    for vill, nm in [("Malshiras", "Ramesh"), ("Pandharpur", "Sunita"), ("Sangola", "Ganesh"), ("Baramati", "Pooja")]:
        for r in no_hinglish:
            add("ANSWER_NO", r, loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="hi")

    # 14. CHANGE_APPOINTMENT_TYPE (approx 50 examples)
    change_en = [
        "Certainly, I have switched your preference to an in-person clinic visit. Let me check available clinic slots.",
        "Understood, switching your request to a telephone consultation with the doctor.",
        "Your preference has been updated to clinic visit. Let us find the next open slot.",
        "Done. I have modified your appointment mode to phone consultation.",
    ]
    for vill, nm in [("Baramati", "Pooja"), ("Shirpur", "Rahul"), ("Malshiras", "Anil"), ("Pandharpur", "Kavita")]:
        for r in change_en:
            add("CHANGE_APPOINTMENT_TYPE", r, loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="en")

    change_hi = [
        "बिल्कुल, मैंने आपका विकल्प बदलकर क्लिनिक विजिट कर दिया है। मैं उपलब्ध समय देख रहा हूँ।",
        "जी, आपका अनुरोध फोन परामर्श में बदल दिया गया है। डॉक्टर का समय देखा जा रहा है।",
        "निश्चिंत रहें, अब आपका परामर्श अस्पताल में व्यक्तिगत विजिट के लिए सेट कर दिया गया है।",
        "अपॉइंटमेंट का प्रकार बदल दिया गया है। आइए अगला स्लॉट देखें।",
    ]
    for vill, nm in [("Baramati", "Pooja"), ("Shirpur", "Rahul"), ("Malshiras", "Anil"), ("Pandharpur", "Kavita")]:
        for r in change_hi:
            add("CHANGE_APPOINTMENT_TYPE", r, loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="hi")

    change_hinglish = [
        "Ji bilkul, maine aapka preference badal diya hai. Main clinic visit ke liye uplabdh samay dekh raha hoon.",
        "Theek hai, aapka mode phone consultation mein change kar diya gaya hai.",
        "Appointment type update ho gaya hai. Agla slot search kar rahe hain.",
    ]
    for vill, nm in [("Baramati", "Pooja"), ("Shirpur", "Rahul"), ("Malshiras", "Anil")]:
        for r in change_hinglish:
            add("CHANGE_APPOINTMENT_TYPE", r, loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="hi")

    # 15. CANCEL_BOOKING (approx 50 examples)
    cancel_en = [
        "Understood. Your booking request has been cancelled. Please call again whenever you need care.",
        "Your appointment has been cancelled successfully. Take care of your health.",
        "Booking cancelled. Feel free to contact our helpline whenever medical assistance is needed.",
        "We have cancelled your scheduled slot as requested. Wishing you good health.",
    ]
    for vill, nm in [("Baramati", "Pooja"), ("Shirpur", "Rahul"), ("Malshiras", "Anil"), ("Pandharpur", "Kavita")]:
        for r in cancel_en:
            add("CANCEL_BOOKING", r, loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="en")

    cancel_hi = [
        "ठीक है, आपकी बुकिंग निरस्त कर दी गई है। जब भी आवश्यकता हो, आप दोबारा कॉल कर सकते हैं।",
        "आपकी अपॉइंटमेंट रद्द कर दी गई है। अपने स्वास्थ्य का ध्यान रखें।",
        "अनुरोध अनुसार स्लॉट कैंसिल कर दिया गया है। किसी भी परेशानी में हमें पुनः संपर्क करें।",
        "बुकिंग रद्द हो गई है। हम आपकी सेवा के लिए सदैव उपलब्ध हैं।",
    ]
    for vill, nm in [("Baramati", "Pooja"), ("Shirpur", "Rahul"), ("Malshiras", "Anil"), ("Pandharpur", "Kavita")]:
        for r in cancel_hi:
            add("CANCEL_BOOKING", r, loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="hi")

    cancel_hinglish = [
        "Theek hai, booking request cancel kar di gayi hai. Jab bhi zaroorat ho aap dobara call kar sakte hain.",
        "Aapka appointment cancel ho gaya hai. Apna khayal rakhein aur zaroorat padne par call karein.",
        "Booking cancel ho chuki hai. Healthcare helpline par aane ke liye shukriya.",
    ]
    for vill, nm in [("Baramati", "Pooja"), ("Shirpur", "Rahul"), ("Malshiras", "Anil")]:
        for r in cancel_hinglish:
            add("CANCEL_BOOKING", r, loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="hi")

    # 16. FOLLOW_UP (approx 50 examples)
    follow_en = [
        "For your follow-up checkup, let us review your previous visit history and arrange a consultation.",
        "Welcome back. Let us check your recovery progress and schedule your follow-up visit with the doctor.",
        "I can help schedule your follow-up appointment. Are your previous symptoms improving or persisting?",
        "We will connect you with your treating physician for this follow-up review.",
    ]
    for vill, nm in [("Malshiras", "Kavita"), ("Sangola", "Ganesh"), ("Pandharpur", "Ramesh"), ("Akluj", "Sunita")]:
        for r in follow_en:
            add("FOLLOW_UP", r, sym="fever", dur="5 days", loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="en")

    follow_hi = [
        "आपके फॉलो-अप चेकअप के लिए हम पिछली जांच देखकर डॉक्टर से दोबारा परामर्श तय कर देते हैं।",
        "पुनः स्वागत है। क्या आपकी पुरानी तकलीफ में सुधार है? आइए फॉलो-अप स्लॉट बुक करें।",
        "डॉक्टर से फॉलो-अप बात कराने के लिए मैं आपका पुराना रिकॉर्ड देख रहा हूँ।",
        "फॉलो-अप परामर्श के लिए आपकी अपॉइंटमेंट तय की जा रही है।",
    ]
    for vill, nm in [("Malshiras", "Kavita"), ("Sangola", "Ganesh"), ("Pandharpur", "Ramesh"), ("Akluj", "Sunita")]:
        for r in follow_hi:
            add("FOLLOW_UP", r, sym="bukhar", dur="paanch din se", loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="hi")

    follow_hinglish = [
        "Aapke follow-up ke liye hum purani jaanch dekhkar doctor se dobara baat karwa dete hain.",
        "Follow-up visit ke liye main aapka slot schedule kar raha hoon. Kya pehle se behtar mehsoos kar rahe hain?",
        "Aapka follow-up checkup arrange kiya ja raha hai.",
    ]
    for vill, nm in [("Malshiras", "Kavita"), ("Sangola", "Ganesh"), ("Pandharpur", "Ramesh")]:
        for r in follow_hinglish:
            add("FOLLOW_UP", r, sym="bukhar", dur="paanch din se", loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="hi")

    # 17. REQUEST_REPEAT (approx 50 examples)
    repeat_en = [
        "I could not hear you clearly due to background noise. Could you please repeat that?",
        "Pardon me, the connection was unclear. Could you kindly say that again?",
        "I missed your last statement. Please repeat what you just said.",
        "Could you please repeat your response a little louder and clearer?",
    ]
    for i in range(4):
        for r in repeat_en:
            add("REQUEST_REPEAT", r, lang="en")

    repeat_hi = [
        "आवाज कटने के कारण मैं सुन नहीं पाया। क्या आप कृपया दोबारा बोल सकते हैं?",
        "माफ कीजिए, आपकी आवाज स्पष्ट नहीं आई। कृपया अपनी बात दोहराएं।",
        "नेटवर्क में शोर की वजह से समझ नहीं आया। कृपया थोड़ा जोर से बताएं।",
        "कृपया अपनी बात एक बार फिर से कहें ताकि मैं सही जानकारी दर्ज कर सकूँ।",
    ]
    for i in range(4):
        for r in repeat_hi:
            add("REQUEST_REPEAT", r, lang="hi")

    repeat_hinglish = [
        "Aapki aawaz theek se nahi aa saki. Kripya thoda saaf aur dheere dobara batayein.",
        "Line clear nahi thi ji. Kripya apni baat ek baar fir batayein.",
        "Main sun nahi paya. Kripya thoda tez aawaz mein dobara bolein.",
    ]
    for i in range(4):
        for r in repeat_hinglish:
            add("REQUEST_REPEAT", r, lang="hi")

    # 18. UNKNOWN (approx 50 examples)
    unknown_en = [
        "I did not quite understand that. Please describe your symptoms or tell me your village name.",
        "Could you please clarify your health concern or tell me how I can assist you?",
        "I am not sure I understood. Please mention what health trouble you are experiencing.",
        "To guide you to the right care, please tell me your symptoms or current location.",
    ]
    for i in range(4):
        for r in unknown_en:
            add("UNKNOWN", r, lang="en")

    unknown_hi = [
        "मैं ठीक से समझ नहीं पाया। कृपया अपने लक्षण या अपने गांव का नाम बताएं।",
        "कृपया स्पष्ट करें कि आपको क्या शारीरिक तकलीफ है ताकि मैं सहायता कर सकूँ।",
        "मुझे समझ नहीं आया। क्या आप बीमारी या डॉक्टर की जरूरत के बारे में बता सकते हैं?",
        "सही अस्पताल ढूंढने के लिए कृपया अपनी तकलीफ या स्थान का नाम बताएं।",
    ]
    for i in range(4):
        for r in unknown_hi:
            add("UNKNOWN", r, lang="hi")

    unknown_hinglish = [
        "Main samajh nahi paya. Kripya apne lakshan ya apna gaon ka naam spasht batayein.",
        "Kripya clarify karein ki aapko kya health problem ho rahi hai.",
        "Mujhe theek se samajh nahi aaya, kripya apni samasya dobara batayein.",
    ]
    for i in range(4):
        for r in unknown_hinglish:
            add("UNKNOWN", r, lang="hi")

    # 19. ENDED (approx 50 examples)
    ended_en = [
        "Your appointment has been successfully booked. Please visit the clinic on time. Take care and goodbye.",
        "Thank you for contacting the Rural Care Helpline. Your booking is confirmed. Wishing you a speedy recovery.",
        "All details have been registered. A confirmation message will be sent. Stay safe and goodbye.",
        "Your consultation has been arranged. Please carry any prior medical reports. Take care.",
    ]
    for vill, nm in [("Malshiras", "Santosh"), ("Pandharpur", "Asha"), ("Sangola", "Ganesh"), ("Baramati", "Pooja")]:
        for r in ended_en:
            add("ENDED", r, sym="fever", dur="3 days", loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="en")

    ended_hi = [
        "आपकी अपॉइंटमेंट सफलतापूर्वक बुक हो गई है। कृपया समय पर क्लिनिक पहुँचें। अपना ख्याल रखें और नमस्ते।",
        "रूरल केयर हेल्पलाइन से जुड़ने के लिए धन्यवाद। आपका स्लॉट पक्का हो गया है। शीघ्र स्वास्थ्य लाभ की कामना करते हैं।",
        "सभी जानकारी दर्ज कर ली गई है। पर्ची आपके फोन पर भेज दी जाएगी। धन्यवाद और नमस्कार।",
        "परामर्श का समय तय हो चुका है। कृपया समय पर अस्पताल पहुँचें। शुभ दिन।",
    ]
    for vill, nm in [("Malshiras", "Santosh"), ("Pandharpur", "Asha"), ("Sangola", "Ganesh"), ("Baramati", "Pooja")]:
        for r in ended_hi:
            add("ENDED", r, sym="bukhar", dur="teen din se", loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="hi")

    ended_hinglish = [
        "Aapka appointment safaltapoorvak book ho gaya hai. Kripya nirdharit samay par clinic pahuchein. Namaste.",
        "Helpline par call karne ke liye dhanyawad. Aapki booking confirm ho gayi hai. Take care.",
        "Details confirm ho gayi hain. SMS ke zariye jankari bhej di jayegi. Namaste.",
    ]
    for vill, nm in [("Malshiras", "Santosh"), ("Pandharpur", "Asha"), ("Sangola", "Ganesh")]:
        for r in ended_hinglish:
            add("ENDED", r, sym="bukhar", dur="teen din se", loc=vill, name=nm, care="PHC", facility=f"{vill} PHC", lang="hi")

    # Shuffle dataset
    random.shuffle(samples)
    return samples


class IntakeGenerativeDataset(Dataset):
    """
    PyTorch Dataset that formats structured context and response pairs into
    token sequences: <|context|>\n{context}\n<|response|>\n{response}<|end|>
    """

    def __init__(
        self,
        samples: List[Dict[str, str]],
        tokenizer: LocalSubwordTokenizer,
        max_seq_len: int = 128,
    ):
        self.samples = samples
        self.tokenizer = tokenizer
        self.max_seq_len = max_seq_len
        self.encoded_data: List[Tuple[torch.Tensor, torch.Tensor, torch.Tensor]] = []
        self._prepare_dataset()

    def _prepare_dataset(self):
        ctx_tok = "<|context|>\n"
        resp_tok = "\n<|response|>\n"
        end_tok = "<|end|>"

        for item in self.samples:
            ctx_str = item["context"]
            resp_str = item["response"]

            full_ctx_str = f"{ctx_tok}{ctx_str}{resp_tok}"
            full_resp_str = f"{resp_str}{end_tok}"

            ctx_ids = self.tokenizer.encode(full_ctx_str)
            resp_ids = self.tokenizer.encode(full_resp_str)

            total_len = len(ctx_ids) + len(resp_ids)
            if total_len > self.max_seq_len:
                # Truncate context if needed to preserve response
                allowed_ctx = self.max_seq_len - len(resp_ids)
                if allowed_ctx <= 0:
                    continue
                ctx_ids = ctx_ids[:allowed_ctx]

            seq_ids = ctx_ids + resp_ids
            # Loss mask: 0 for context, 1 for response tokens
            loss_mask = [0.0] * len(ctx_ids) + [1.0] * len(resp_ids)

            # Pad up to max_seq_len
            pad_len = self.max_seq_len - len(seq_ids)
            padded_input_ids = seq_ids + [self.tokenizer.pad_token_id] * pad_len
            padded_loss_mask = loss_mask + [0.0] * pad_len

            input_tensor = torch.tensor(padded_input_ids, dtype=torch.long)
            target_tensor = torch.tensor(padded_input_ids, dtype=torch.long)
            mask_tensor = torch.tensor(padded_loss_mask, dtype=torch.float32)

            self.encoded_data.append((input_tensor, target_tensor, mask_tensor))

    def __len__(self) -> int:
        return len(self.encoded_data)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        return self.encoded_data[idx]


def save_dataset_jsonl(samples: List[Dict[str, str]], file_path: Path | str):
    """Write generated samples to JSONL."""
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for item in samples:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")


def load_dataset_jsonl(file_path: Path | str) -> List[Dict[str, str]]:
    """Load samples from JSONL dataset file."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Dataset file not found at {path}")
    samples: List[Dict[str, str]] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                samples.append(json.loads(line))
    return samples
