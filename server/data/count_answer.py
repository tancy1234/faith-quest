import json
from collections import Counter

# Load JSON
with open("server/data/bible_questions.json", "r", encoding="utf-8") as file:
    questions = json.load(file)

# Count correct answers
answer_count = Counter(q["answer"] for q in questions)

print("Correct Answer Distribution")
print("---------------------------")

for option in ["A", "B", "C", "D"]:
    print(f"{option}: {answer_count.get(option, 0)}")

print("---------------------------")
print(f"Total Questions: {len(questions)}")