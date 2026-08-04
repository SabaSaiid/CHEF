import json
import os
import sqlite3
from collections import Counter
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RECIPES_JSON = str(BASE_DIR / "app" / "recipes.json")

CATEGORY_FALLBACKS = {
    "https://images.unsplash.com/photo-1596797038530-2c107229654b": "Rice Fallback",
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe": "Curry Fallback",
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8": "Biryani Fallback",
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7": "Paneer Fallback",
    "https://images.unsplash.com/photo-1509440159596-0249088772ff": "Bread Fallback",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd": "Salad Fallback",
    "https://images.unsplash.com/photo-1551024601-bec78aea704b": "Dessert Fallback",
    "https://images.unsplash.com/photo-1547592165-e1d17fed6006": "Soup Fallback",
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543": "Breakfast Fallback",
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624": "Noodles Fallback",
    "https://images.unsplash.com/photo-1604503468506-a8da13d82791": "Chicken Fallback",
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352": "Default Fallback"
}

def load_json_recipes():
    if os.path.exists(RECIPES_JSON):
        with open(RECIPES_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [x for x in data if isinstance(x, dict)]
    return []

def main():
    recipes = load_json_recipes()
    print(f"Total recipes in recipes.json: {len(recipes)}")

    domains = Counter()
    fallback_counts = Counter()
    specific_images = 0
    ai_generated_images = 0
    missing_images = 0

    for r in recipes:
        raw_url = r.get("image_url")
        url = raw_url.strip() if isinstance(raw_url, str) else ""
        
        if not url:
            missing_images += 1
            continue
        
        if "pollinations.ai" in url:
            domain = "AI Generated (Pollinations AI)"
            ai_generated_images += 1
        elif "unsplash.com" in url:
            domain = "Unsplash"
        elif "gstatic.com" in url or "google.com" in url:
            domain = "Google Gstatic"
        elif "pexels.com" in url:
            domain = "Pexels"
        elif "spoonacular.com" in url:
            domain = "Spoonacular"
        elif "wikimedia.org" in url or "wikipedia.org" in url:
            domain = "Wikimedia"
        elif "themealdb.com" in url:
            domain = "TheMealDB"
        else:
            domain = "Other"
        domains[domain] += 1

        is_fallback = False
        for fb_url, fb_name in CATEGORY_FALLBACKS.items():
            if fb_url in url:
                is_fallback = True
                fallback_counts[fb_name] += 1
                break
        
        if not is_fallback and "pollinations.ai" not in url:
            specific_images += 1

    print("\n--- Domain Distribution ---")
    for d, count in domains.most_common():
        print(f"  {d}: {count}")

    print("\n--- Breakdown ---")
    print(f"  Pexels / TheMealDB / Unsplash Specific Images: {specific_images}")
    print(f"  AI-Generated Dish-Specific Images: {ai_generated_images}")
    print(f"  Generic Fallback Images: {sum(fallback_counts.values())}")
    print(f"  Missing Images: {missing_images}")
    print(f"  Total Coverage: {((len(recipes) - missing_images) / len(recipes)) * 100:.2f}%")

if __name__ == "__main__":
    main()
