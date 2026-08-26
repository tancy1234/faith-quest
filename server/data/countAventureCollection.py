import json
from collections import Counter

# Load adventure collection
with open("/Users/tcy/Desktop/christian-chat-game/server/data/adventureCollection.json", "r", encoding="utf-8") as file:
    collection = json.load(file)

# Count items by type
type_counts = Counter(item["type"] for item in collection)

print("Adventure Collection Type Distribution")
print("--------------------------------------")

for item_type, count in sorted(type_counts.items()):
    print(f"{item_type}: {count}")

print("--------------------------------------")
print(f"Total: {len(collection)}")