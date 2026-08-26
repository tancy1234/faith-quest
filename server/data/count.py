import json
from collections import Counter

# Load JSON file
with open("server/data/bible_questions.json", "r", encoding="utf-8") as file:
    questions = json.load(file)

# Count difficulty
difficulty_count = Counter(
    question["difficulty"] 
    for question in questions
)

# Display result
print("Difficulty Distribution:")
print("------------------------")

for difficulty in ["Easy", "Medium", "Hard", "Insane"]:
    print(f"{difficulty}: {difficulty_count.get(difficulty, 0)} questions")

# Optional: show total
print("------------------------")
print(f"Total: {len(questions)} questions")