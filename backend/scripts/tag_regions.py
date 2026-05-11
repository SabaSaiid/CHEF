import json
import os

RECIPES_FILE = os.path.join(os.path.dirname(__file__), "..", "app", "recipes.json")

# Keywords for detecting regions
REGION_KEYWORDS = {
    "Indian": ["curry", "masala", "paneer", "dal", "tikka", "chutney", "naan", "tandoori", "samosa", "biryani", "roti", "chana", "aloo", "gobi", "palak", "korma", "bhaji", "dosa", "idli", "chokha", "sattu", "indian"],
    "Mexican": ["taco", "burrito", "enchilada", "quesadilla", "salsa", "guacamole", "tortilla", "fajita", "jalapeno", "mexican"],
    "Italian": ["pasta", "pizza", "risotto", "ravioli", "lasagna", "gnocchi", "pesto", "marinara", "parmesan", "mozzarella", "italian"],
    "Chinese": ["stir fry", "fried rice", "dumpling", "chow mein", "lo mein", "wonton", "soy sauce", "hoisin", "szechuan", "kung pao", "chinese"],
    "Japanese": ["sushi", "ramen", "udon", "teriyaki", "miso", "matcha", "tempura", "soba", "japanese"],
    "Middle Eastern": ["hummus", "falafel", "shawarma", "kebab", "tahini", "pita", "baba ganoush", "za'atar", "middle eastern", "lebanese"],
    "European": ["french", "spanish", "german", "paella", "baguette", "croissant", "crepe", "schnitzel", "european"],
    "American": ["burger", "hot dog", "bbq", "mac and cheese", "brownie", "pancake", "american"]
}

def detect_region(title, ingredients):
    title_lower = title.lower()
    ingredients_str = " ".join([i.lower() for i in ingredients])
    text = title_lower + " " + ingredients_str
    
    # Simple score based on keyword occurrence
    scores = {region: 0 for region in REGION_KEYWORDS}
    for region, keywords in REGION_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                scores[region] += 1
                
    # Get the top scoring region
    best_region = max(scores, key=scores.get)
    if scores[best_region] > 0:
        return best_region
    return None

def main():
    if not os.path.exists(RECIPES_FILE):
        print(f"Recipes file not found at {RECIPES_FILE}")
        return

    with open(RECIPES_FILE, "r", encoding="utf-8") as f:
        recipes = json.load(f)
        
    tagged_count = 0
    for r in recipes:
        # If it already has a region and it's not None, keep it
        if "region" not in r or not r["region"]:
            title = r.get("title", "")
            ingredients = r.get("ingredients", [])
            region = detect_region(title, ingredients)
            if region:
                r["region"] = region
                tagged_count += 1
            else:
                r["region"] = "Global" # Default fallback

    with open(RECIPES_FILE, "w", encoding="utf-8") as f:
        json.dump(recipes, f, indent=2)
        
    print(f"Successfully tagged {tagged_count} recipes with regions. Remaining assigned to 'Global'.")

if __name__ == "__main__":
    main()
