import json
import sqlite3
import os

home = os.environ.get("HOME", "/Users/sabasaeed")
db_path = os.path.join(home, "chef.db")
recipes_path = "backend/app/recipes.json"

with open(recipes_path, "r", encoding="utf-8") as f:
    recipes = json.load(f)

c = sqlite3.connect(db_path)
u = 0
for x in recipes:
    if x.get("image_url"):
        c.execute("UPDATE saved_recipes SET image_url=? WHERE title=?", (x["image_url"], x["title"]))
        u += c.execute("SELECT changes()").fetchone()[0]

c.commit()
print(f"Fixed {u} images in the actual DB")
