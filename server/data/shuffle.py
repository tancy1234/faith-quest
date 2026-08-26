import json
import random
import shutil

INPUT_FILE = "server/data/bible_questions.json"

# Backup original file
shutil.copy(INPUT_FILE, "questions_backup.json")
print("✅ Backup created: questions_backup.json")

# Load questions
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    questions = json.load(f)

for q in questions:
    options = q["options"]
    correct_answer = q["answer"]
    correct_text = options[correct_answer]

    # Get all option texts
    option_texts = list(options.values())

    # Shuffle them
    random.shuffle(option_texts)

    # Assign back to A-D
    new_options = {
        "A": option_texts[0],
        "B": option_texts[1],
        "C": option_texts[2],
        "D": option_texts[3]
    }

    # Find where the correct answer moved
    for key, value in new_options.items():
        if value == correct_text:
            new_answer = key
            break

    q["options"] = new_options
    q["answer"] = new_answer

# Save
with open(INPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(questions, f, ensure_ascii=False, indent=4)

print("✅ Questions shuffled successfully!")