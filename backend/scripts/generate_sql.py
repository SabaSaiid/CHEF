import json
import os

recipes_path = "backend/app/recipes.json"
out_path = "backend/scripts/fix_db.sql"

with open(recipes_path, "r", encoding="utf-8") as f:
    recipes = json.load(f)

with open(out_path, "w", encoding="utf-8") as out:
    for r in recipes:
        img = r.get("image_url")
        if img:
            title_escaped = r["title"].replace("'", "''")
            img_escaped = img.replace("'", "''")
            out.write(f"UPDATE saved_recipes SET image_url='{img_escaped}' WHERE title='{title_escaped}';\n")

print(f"Generated {out_path}")
