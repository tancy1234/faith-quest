import json
import random

input_file = "/Users/tcy/Desktop/christian-chat-game/math_questions_shuffled.json"
output_file = "math_questions_shuffled.json"

with open(input_file, "r", encoding="utf-8") as f:
    questions = json.load(f)

for question in questions:

    old_options = question["options"]
    old_answer = question["answer"]

    # Get the correct option content
    correct_option = old_options[old_answer]

    # Shuffle all option contents
    option_values = list(old_options.values())
    random.shuffle(option_values)

    # Rebuild A/B/C/D
    new_options = {}

    for letter, option in zip(["A", "B", "C", "D"], option_values):
        new_options[letter] = option

        # Find where the correct answer moved
        if option == correct_option:
            new_answer = letter

    question["options"] = new_options
    question["answer"] = new_answer

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)

print(f"Done! Saved to {output_file}")