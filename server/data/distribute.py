import json
import random

COLLECTION_FILE = "/Users/tcy/Desktop/christian-chat-game/server/data/adventureCollection.json"
LOCATION_FILE = "/Users/tcy/Desktop/christian-chat-game/server/data/adventureLocations.json"

# Load collection
with open(COLLECTION_FILE, "r", encoding="utf-8") as file:
    collection = json.load(file)

# Load locations
with open(LOCATION_FILE, "r", encoding="utf-8") as file:
    locations = json.load(file)

# Get all collection IDs
collection_ids = [item["id"] for item in collection]

# Shuffle the IDs
random.shuffle(collection_ids)

# Clear existing collections
for location in locations:
    location["collection"] = []

# Randomly distribute IDs
for collection_id in collection_ids:
    location = random.choice(locations)
    location["collection"].append(collection_id)

# Save back to adventureLocations.json
with open(LOCATION_FILE, "w", encoding="utf-8") as file:
    json.dump(locations, file, ensure_ascii=False, indent=2)

print("✅ Collection distributed successfully!")
print(f"Total collection items: {len(collection_ids)}")
print(f"Total locations: {len(locations)}")

# Show distribution
print("\nDistribution:")
for location in locations:
    print(f'{location["name"]}: {len(location["collection"])}')