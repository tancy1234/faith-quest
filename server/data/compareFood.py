import json

FILE_1 = "/Users/tcy/Desktop/christian-chat-game/server/data/adventureCollection.json"
FILE_2 = "/Users/tcy/Desktop/christian-chat-game/server/data/foods.json"

# Load JSON files
with open(FILE_1, "r", encoding="utf-8") as file:
    data1 = json.load(file)

with open(FILE_2, "r", encoding="utf-8") as file:
    data2 = json.load(file)

# Get IDs from file 1
ids1 = {item["id"] for item in data1}

# Get IDs from file 2
ids2 = {item["id"] for item in data2}

# Compare
same_ids = ids1 & ids2
only_file1 = ids1 - ids2
only_file2 = ids2 - ids1

print("================================")
print("ID Comparison")
print("================================")

print(f"File 1 IDs: {len(ids1)}")
print(f"File 2 IDs: {len(ids2)}")
print(f"Same IDs:   {len(same_ids)}")

print("\nSame IDs:")
for item_id in sorted(same_ids):
    print(f"- {item_id}")

print("\nOnly in File 1:")
for item_id in sorted(only_file1):
    print(f"- {item_id}")

print("\nOnly in File 2:")
for item_id in sorted(only_file2):
    print(f"- {item_id}")