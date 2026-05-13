"""
populate_images.py — Pexels-Powered Image Populator

Uses Pexels API (free, 200 req/hr) as primary source, with TheMealDB
as a fast first-pass for known dishes. Groups recipes by base dish
pattern to minimize API calls. Fully resumable via cache.
"""

import json
import os
import re
import sys
import time
import string
from pathlib import Path
from collections import defaultdict

from dotenv import load_dotenv

import httpx

# Load environment variables from backend/.env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
RECIPES_PATH = BASE_DIR / "app" / "recipes.json"
CACHE_PATH = BASE_DIR / "scripts" / "image_cache.json"
LOG_PATH = BASE_DIR / "scripts" / "populate_images.log"

PEXELS_KEY = os.environ.get("PEXELS_API_KEY")
PEXELS_URL = "https://api.pexels.com/v1/search"

if not PEXELS_KEY:
    print("\n❌ ERROR: PEXELS_API_KEY not found.")
    print("Please run: export PEXELS_API_KEY='your_key_here'\n")
    sys.exit(1)

PROTEINS = [
    "Chicken", "Beef", "Shrimp", "Tofu", "Fish", "Egg", "Mushroom",
    "Duck", "Lamb", "Salmon", "Sausage", "Turkey", "Paneer", "Mutton",
    "Prawn", "Crab", "Lobster", "Squid", "Lentil", "Lentils",
    "Bean", "Beans", "Chickpea", "Chickpeas", "Tempeh", "Seitan",
    "Soy", "Soya Chunks",
]


def log(msg: str):
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def extract_base_dish(title: str) -> str:
    base = title
    for p in sorted(PROTEINS, key=len, reverse=True):
        base = re.sub(r'\b' + re.escape(p) + r'\b', '', base)
    base = re.sub(r'\s+', ' ', base).strip()
    base = re.sub(r'^(and|or|with|in|of)\s+', '', base, flags=re.IGNORECASE)
    base = re.sub(r'\s+(and|or)$', '', base, flags=re.IGNORECASE)
    return base if base else title


def build_query(title: str, region: str) -> str:
    """Build a Pexels search query from a recipe title."""
    base = extract_base_dish(title)

    # Find protein
    protein = ""
    for p in PROTEINS:
        if p in title:
            protein = p.lower()
            break

    # Region hints
    region_map = {
        "Indian": "indian", "Chinese": "chinese", "Italian": "italian",
        "Mexican": "mexican", "American": "american", "European": "european",
        "Middle Eastern": "middle eastern", "Japanese": "japanese",
    }
    hint = region_map.get(region, "")

    # For generic patterns like "Roasted with Bread"
    if re.match(r'^(Roasted|Grilled|Baked|Braised|Stir-Fried|Pan-Seared|Spiced|Steamed|Smoked|Crispy Fried)', base):
        method = base.split()[0].lower()
        side = ""
        if "with " in base:
            side = base.split("with ")[-1].lower()
        parts = [hint, method, protein, side, "food"]
        return " ".join(p for p in parts if p)

    # For named dishes
    parts = [hint, base, "food"]
    return " ".join(p for p in parts if p)


def load_themealdb() -> dict[str, str]:
    log("Loading TheMealDB index...")
    index = {}
    client = httpx.Client(timeout=10)
    for letter in string.ascii_lowercase:
        try:
            r = client.get(f"https://www.themealdb.com/api/json/v1/1/search.php?f={letter}")
            if r.status_code == 200:
                for m in (r.json().get("meals") or []):
                    if m.get("strMealThumb"):
                        index[m["strMeal"].lower().strip()] = m["strMealThumb"]
        except Exception:
            pass
        time.sleep(0.2)
    client.close()
    log(f"  TheMealDB: {len(index)} dishes.")
    return index


def match_mealdb(title: str, index: dict) -> str | None:
    t = title.lower().strip()
    if t in index:
        return index[t]
    for name, url in index.items():
        if name in t or t in name:
            return url
    stop = {"with", "and", "the", "a", "food", "dish", "of", "in"}
    t_words = set(t.split()) - stop
    best, best_url = 0, None
    for name, url in index.items():
        overlap = len(t_words & (set(name.split()) - stop))
        if overlap >= 2 and overlap > best:
            best, best_url = overlap, url
    return best_url


def search_pexels(query: str, client: httpx.Client) -> str | None:
    """Search Pexels for a food photo."""
    try:
        r = client.get(PEXELS_URL, params={
            "query": query, "per_page": 3,
            "orientation": "landscape", "size": "medium",
        })
        if r.status_code == 429:
            log("  ⏳ Rate limited. Waiting 90s...")
            time.sleep(90)
            return search_pexels(query, client)
        if r.status_code == 200:
            photos = r.json().get("photos", [])
            if photos:
                return photos[0]["src"]["medium"]
    except Exception as e:
        log(f"  Pexels error: {e}")
    return None


def main():
    log("=" * 60)
    log("CHEF Image Populator — Pexels + TheMealDB")
    log("=" * 60)

    with open(RECIPES_PATH, "r", encoding="utf-8") as f:
        recipes = json.load(f)

    cache: dict = {}
    if CACHE_PATH.exists():
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            cache = json.load(f)
        # Clear old failures to retry
        good = {k: v for k, v in cache.items() if v is not None}
        log(f"Loaded cache: {len(good)} hits, {len(cache)-len(good)} old fails cleared.")
        cache = good

    mealdb = load_themealdb()

    needs = [r for r in recipes if not r.get("image_url")]
    log(f"Total: {len(recipes)} | Done: {len(recipes)-len(needs)} | Need: {len(needs)}")

    # Group by search query to minimize API calls
    groups: dict[str, list] = defaultdict(list)
    for r in needs:
        q = build_query(r["title"], r.get("region", "Global"))
        groups[q].append(r)

    total_groups = len(groups)
    cached = sum(1 for q in groups if q in cache)
    log(f"Unique queries: {total_groups} | Already cached: {cached}")
    log("-" * 60)

    pexels = httpx.Client(
        timeout=15, headers={"Authorization": PEXELS_KEY},
        follow_redirects=True,
    )

    assigned = 0
    pexels_calls = 0
    failed = 0

    for i, (query, group) in enumerate(groups.items()):
        # Cache hit
        if query in cache:
            for r in group:
                r["image_url"] = cache[query]
                assigned += 1
            continue

        sample_title = group[0]["title"]
        log(f"[{i+1}/{total_groups}] ({len(group)} recipes) {sample_title[:50]}")

        img = None

        # 1. TheMealDB (instant, no rate limit)
        img = match_mealdb(sample_title, mealdb)
        if img:
            log(f"  ✅ TheMealDB")

        # 2. Pexels API
        if not img:
            img = search_pexels(query, pexels)
            pexels_calls += 1
            if img:
                log(f"  ✅ Pexels: '{query[:40]}'")
            else:
                # Try simpler query
                simple = extract_base_dish(sample_title)
                if simple != query.replace(" food", ""):
                    img = search_pexels(simple + " food", pexels)
                    pexels_calls += 1
                    if img:
                        log(f"  ✅ Pexels (simple): '{simple[:40]}'")

        if img:
            for r in group:
                r["image_url"] = img
                assigned += 1
            cache[query] = img
        else:
            failed += 1
            cache[query] = None
            log(f"  ❌ No image")

        # Checkpoint every 30
        if (i + 1) % 30 == 0:
            _save(recipes, cache)
            pct = 100 * assigned / len(needs) if needs else 0
            log(f"  💾 Saved. {assigned}/{len(needs)} ({pct:.0f}%) done. "
                f"{pexels_calls} Pexels calls, {failed} failed.")

        # Rate limit: Pexels allows 200/hr ≈ 1 every 18s
        # With TheMealDB hits we skip many, so 10s is safe
        if not img or pexels_calls > 0:
            time.sleep(10)

    pexels.close()
    _save(recipes, cache)

    still = sum(1 for r in recipes if not r.get("image_url"))
    log("=" * 60)
    log(f"DONE! Assigned: {assigned} | Failed: {failed} | Still missing: {still}")
    log(f"Pexels API calls made: {pexels_calls}")
    if still == 0:
        log("🎉 All recipes have images!")
    log("=" * 60)


def _save(recipes, cache):
    with open(RECIPES_PATH, "w", encoding="utf-8") as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
