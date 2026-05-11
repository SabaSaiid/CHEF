import json
import os
import random

RECIPES_FILE = os.path.join(os.path.dirname(__file__), "..", "app", "recipes.json")

def main():
    if not os.path.exists(RECIPES_FILE):
        print(f"File not found: {RECIPES_FILE}")
        return

    with open(RECIPES_FILE, "r", encoding="utf-8") as f:
        recipes = json.load(f)

    # To penalize duplicates, track seen titles
    seen_titles = {}
    
    # Assign popularity
    for r in recipes:
        title = r.get("title", "")
        base_score = random.randint(30, 70)
        
        # Boost for having an image
        if r.get("image_url"):
            base_score += 20
            
        # Boost for having a video
        if r.get("video_url"):
            base_score += 15
            
        # Penalize duplicates heavily
        if title in seen_titles:
            seen_titles[title] += 1
            base_score -= (20 * seen_titles[title])  # Massive penalty for 2nd, 3rd, etc.
        else:
            seen_titles[title] = 1
            
        # Ensure it stays within a reasonable bound
        r["popularity"] = max(1, min(100, base_score))

    with open(RECIPES_FILE, "w", encoding="utf-8") as f:
        json.dump(recipes, f, indent=2)

    print("Successfully assigned popularity scores and penalized duplicates.")

if __name__ == "__main__":
    main()
