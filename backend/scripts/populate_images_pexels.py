import json
import os
import re
import time
import urllib.request
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RECIPES_PATH = BASE_DIR / "app" / "recipes.json"
CACHE_PATH = BASE_DIR / "scripts" / "google_images_cache.json"

# Categorized fallbacks using high-quality free Unsplash food photos
CATEGORY_FALLBACKS = {
    "rice": "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600",
    "curry": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600",
    "biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600",
    "paneer": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600",
    "bread": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
    "salad": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600",
    "dessert": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600",
    "soup": "https://images.unsplash.com/photo-1547592165-e1d17fed6006?w=600",
    "breakfast": "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600",
    "noodles": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600",
    "chicken": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600",
    "default": "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600"
}

def is_valid_url(url):
    if not url:
        return False
    if "youtube.com" in url or "img.youtube.com" in url:
        return False
    if any(domain in url for domain in ["pexels.com", "unsplash.com", "themealdb.com", "gstatic.com", "google.com"]):
        return True
    return False

def search_google_images(query):
    # Search Google Images using a standard browser user agent
    query_encoded = urllib.parse.quote(query + " recipe food")
    url = f"https://www.google.com/search?q={query_encoded}&tbm=isch"
    req = urllib.request.Request(
        url, 
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode("latin1")
            # Find gstatic thumbnail URLs which are reliable, high-speed, and direct images
            links = re.findall(r'https://encrypted-tbn0\.gstatic\.com/images\?q=tbn:[a-zA-Z0-9_-]+', html)
            if links:
                # Return the first high-quality match
                return links[0]
    except Exception as e:
        print(f"Error querying Google Images for '{query}': {e}", flush=True)
    return None

def get_static_fallback(title, region, meal_type):
    title_lower = title.lower()
    if "biryani" in title_lower:
        return CATEGORY_FALLBACKS["biryani"]
    if "rice" in title_lower or "pulao" in title_lower or "chawal" in title_lower:
        return CATEGORY_FALLBACKS["rice"]
    if "paneer" in title_lower:
        return CATEGORY_FALLBACKS["paneer"]
    if "curry" in title_lower or "masala" in title_lower or "korma" in title_lower or "rogan josh" in title_lower:
        return CATEGORY_FALLBACKS["curry"]
    if "roti" in title_lower or "naan" in title_lower or "paratha" in title_lower or "bread" in title_lower:
        return CATEGORY_FALLBACKS["bread"]
    if "salad" in title_lower:
        return CATEGORY_FALLBACKS["salad"]
    if "soup" in title_lower or "shorba" in title_lower:
        return CATEGORY_FALLBACKS["soup"]
    if "noodle" in title_lower or "chow mein" in title_lower or "pasta" in title_lower:
        return CATEGORY_FALLBACKS["noodles"]
    if "chicken" in title_lower:
        return CATEGORY_FALLBACKS["chicken"]
    if meal_type and "breakfast" in meal_type.lower():
        return CATEGORY_FALLBACKS["breakfast"]
    if meal_type and "dessert" in meal_type.lower():
        return CATEGORY_FALLBACKS["dessert"]
    return CATEGORY_FALLBACKS["default"]

def update_dbs(title, image_url):
    import sqlite3
    dbs = []
    
    # Local DB
    local_db = BASE_DIR / "chef.db"
    if local_db.exists():
        dbs.append(local_db)
        
    # Home directory DB
    home = os.environ.get("HOME", "/Users/sabasaeed")
    home_db = Path(home) / "chef.db"
    if home_db.exists():
        dbs.append(home_db)
        
    for db_path in dbs:
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("UPDATE saved_recipes SET image_url = ? WHERE title = ?", (image_url, title))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error updating DB ({db_path}): {e}", flush=True)

def main():
    print("=" * 60)
    print("CHEF Image Populator — Google Images Integration")
    print("=" * 60)
    
    if not RECIPES_PATH.exists():
        print(f"Error: {RECIPES_PATH} does not exist.")
        return
        
    with open(RECIPES_PATH, "r", encoding="utf-8") as f:
        recipes = json.load(f)
        
    cache = {}
    if CACHE_PATH.exists():
        try:
            with open(CACHE_PATH, "r", encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            pass
            
    print(f"Loaded {len(recipes)} recipes from database.")
    
    to_update = []
    for r in recipes:
        if not is_valid_url(r.get("image_url")):
            to_update.append(r)
            
    print(f"Found {len(to_update)} recipes requiring image population.")
    if not to_update:
        print("All recipes already have valid images. Nothing to do!")
        return
        
    count = 0
    updated_recipes = 0
    
    try:
        for idx, r in enumerate(to_update):
            title = r["title"]
            region = r.get("region")
            meal_type = r.get("meal_type")
            
            # Check cache
            if title in cache and cache[title]:
                image_url = cache[title]
            else:
                print(f"[{idx+1}/{len(to_update)}] Seeding '{title}'...", flush=True)
                image_url = search_google_images(title)
                
                if image_url:
                    print(f"   ↳ Match found: {image_url}", flush=True)
                    cache[title] = image_url
                else:
                    image_url = get_static_fallback(title, region, meal_type)
                    print(f"   ↳ No match. Using category fallback: {image_url}", flush=True)
                    cache[title] = image_url
                
                # Polite sleep to stay friendly to Google (1.5 seconds)
                time.sleep(1.5)
                
            if image_url:
                r["image_url"] = image_url
                update_dbs(title, image_url)
                updated_recipes += 1
                
            count += 1
            
            # Periodically write progress
            if count % 20 == 0:
                with open(CACHE_PATH, "w", encoding="utf-8") as f:
                    json.dump(cache, f, indent=2)
                with open(RECIPES_PATH, "w", encoding="utf-8") as f:
                    json.dump(recipes, f, indent=2)
                print(f"--- Saved progress cache. Seeded {updated_recipes} images so far. ---", flush=True)
                
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Saving current progress...")
    finally:
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
        with open(RECIPES_PATH, "w", encoding="utf-8") as f:
            json.dump(recipes, f, indent=2)
        print(f"\nSeeding complete. Seeded {updated_recipes} new images successfully.")
        
if __name__ == "__main__":
    main()
