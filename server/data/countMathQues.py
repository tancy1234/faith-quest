import json
from collections import Counter

with open("/Users/tcy/Desktop/christian-chat-game/server/data/mathQuestion.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

field_counts = Counter(
    question["field"]["id"]
    for question in questions
)

print("Field Distribution:")
print("-------------------")

for field, count in sorted(field_counts.items()):
    print(f"{field}: {count}")

print("-------------------")
print(f"Total: {len(questions)}")