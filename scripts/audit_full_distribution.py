"""
Full dataset distribution audit script for CHEF recipes.json (all 5,250 recipes).
Prints grade distribution overall and by category (general, beverage, fats_oils, cheese).
"""

import json
from pathlib import Path

recipes_path = Path(__file__).resolve().parent.parent / "backend" / "app" / "recipes.json"

with open(recipes_path, encoding="utf-8") as f:
    recipes = json.load(f)

total_count = len(recipes)

# Overall grade counts
grade_counts = {"S": 0, "A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "Unknown": 0}

# Category-wise grade counts
categories = ["general", "beverage", "fats_oils", "cheese"]
cat_counts = {cat: {"total": 0, "grades": {"S": 0, "A": 0, "B": 0, "C": 0, "D": 0, "E": 0}} for cat in categories}

for r in recipes:
    score_obj = r.get("nutri_score") or r.get("chef_score") or {}
    grade = score_obj.get("grade", "Unknown")
    cat = score_obj.get("category", "general")
    if cat not in cat_counts:
        cat = "general"

    grade_counts[grade] = grade_counts.get(grade, 0) + 1
    cat_counts[cat]["total"] += 1
    if grade in cat_counts[cat]["grades"]:
        cat_counts[cat]["grades"][grade] += 1

print("=" * 70)
print(f" CHEF Nutri-Score Full Dataset Grade Distribution (Total: {total_count} recipes)")
print("=" * 70)
print(f"{'Grade':<8} | {'Count':<8} | {'Percentage':<12}")
print("-" * 35)
for g in ["S", "A", "B", "C", "D", "E"]:
    c = grade_counts[g]
    pct = (c / total_count) * 100
    bar = "█" * int(pct / 2)
    print(f"{g:<8} | {c:<8} | {pct:>6.2f}%    {bar}")

print("=" * 70)
print(" Breakdown by Category")
print("=" * 70)

for cat in categories:
    cat_total = cat_counts[cat]["total"]
    if cat_total == 0:
        continue
    cat_pct = (cat_total / total_count) * 100
    print(f"\nCategory: '{cat}' ({cat_total} recipes, {cat_pct:.1f}% of dataset)")
    print(f"  {'Grade':<6} | {'Count':<6} | {'% of Category':<15}")
    print("  " + "-" * 32)
    for g in ["S", "A", "B", "C", "D", "E"]:
        c = cat_counts[cat]["grades"][g]
        pct = (c / cat_total) * 100
        print(f"  {g:<6} | {c:<6} | {pct:>6.2f}%")

print("\n" + "=" * 70)
s_count = grade_counts["S"]
s_pct = (s_count / total_count) * 100
print(f"📌 KEY METRIC: S-Tier Frequency across ALL recipes = {s_count} / {total_count} ({s_pct:.2f}%)")
print("=" * 70)
