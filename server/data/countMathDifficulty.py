import json
from collections import Counter

with open("/Users/tcy/Desktop/christian-chat-game/server/data/mathQuestion.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

difficulty_counts = Counter(
    question["difficulty"]
    for question in questions
)

for difficulty in ["easy", "medium", "hard"]:
    print(f"{difficulty}: {difficulty_counts[difficulty]}")

print(f"Total: {len(questions)}")