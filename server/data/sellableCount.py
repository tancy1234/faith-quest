import json
from collections import Counter

# Load adventure collection
with open("/Users/tcy/Desktop/christian-chat-game/server/data/adventureCollection.json", "r", encoding="utf-8") as file:
    collection = json.load(file)

# Count sellable values
sellable_counts = Counter(item["sellable"] for item in collection)

print("Sellable Distribution")
print("---------------------")
print(f"Sellable:     {sellable_counts.get(True, 0)}")
print(f"Not Sellable: {sellable_counts.get(False, 0)}")
print("---------------------")
print(f"Total:        {len(collection)}")