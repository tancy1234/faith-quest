import json
from collections import Counter

with open("/Users/tcy/Desktop/christian-chat-game/server/data/adventureCollection.json", "r", encoding="utf-8") as file:
    collection = json.load(file)

ids = [item["id"] for item in collection]
id_counts = Counter(ids)

duplicates = {
    item_id: count
    for item_id, count in id_counts.items()
    if count > 1
}

print("ID Check")
print("---------------------")
print(f"Total items: {len(ids)}")
print(f"Unique IDs:  {len(set(ids))}")
print(f"Duplicate IDs: {len(duplicates)}")
print("---------------------")

if duplicates:
    print("Duplicate IDs found:")
    for item_id, count in duplicates.items():
        print(f"- {item_id}: {count} times")
else:
    print("✅ All IDs are distinct.")


print("All IDs")
print("---------------------")

for index, item in enumerate(collection, start=1):
    print(f"{index}. {item['id']}")

print("---------------------")
print(f"Total: {len(collection)}")