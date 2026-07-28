#!/usr/bin/env python3
"""
Enrich recipes.json with precomputed CHEF Scores.

Reads all recipes from the local dataset, computes a CHEF Score for each,
and writes the enriched data back.  Also prints distribution statistics
for validation.

Usage:
    cd backend
    python scripts/enrich_chef_scores.py
"""

import json
import sys
from pathlib import Path
from collections import Counter

# Ensure the backend app is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.scoring.calculator import compute_chef_score_from_recipe


def main():
    recipes_path = Path(__file__).resolve().parent.parent / "app" / "recipes.json"

    if not recipes_path.exists():
        print(f"ERROR: recipes.json not found at {recipes_path}")
        sys.exit(1)

    print(f"Loading recipes from {recipes_path}...")
    with open(recipes_path, encoding="utf-8") as f:
        recipes = json.load(f)

    print(f"Loaded {len(recipes)} recipes. Computing CHEF Scores...")

    grade_counts = Counter()
    score_values = []
    category_counts = Counter()
    errors = 0

    for i, recipe in enumerate(recipes):
        try:
            result = compute_chef_score_from_recipe(recipe)

            score_dict = {
                "grade": result.grade,
                "numeric_score": result.numeric_score,
                "label": result.label,
                "color_bg": result.color_bg,
                "color_text": result.color_text,
                "description": result.description,
                "category": result.category,
                "negative_total": result.negative_total,
                "positive_total": result.positive_total,
            }
            recipe["nutri_score"] = score_dict
            recipe["chef_score"] = score_dict

            grade_counts[result.grade] += 1
            score_values.append(result.numeric_score)
            category_counts[result.category] += 1

        except Exception as e:
            errors += 1
            # Assign a default C grade on error
            recipe["chef_score"] = {
                "grade": "C",
                "numeric_score": 5,
                "label": "C",
                "color_bg": "#FECB02",
                "color_text": "#1a1a1a",
                "description": "Average nutritional quality",
                "category": "general",
                "negative_total": 5,
                "positive_total": 0,
            }
            if errors <= 5:
                print(f"  WARNING: Error scoring recipe '{recipe.get('title', '?')}': {e}")

    # ── Write back ──────────────────────────────────────────────────
    print(f"\nWriting enriched data to {recipes_path}...")
    with open(recipes_path, "w", encoding="utf-8") as f:
        json.dump(recipes, f, ensure_ascii=False, indent=2)

    # ── Print statistics ────────────────────────────────────────────
    total = len(recipes)
    print(f"\n{'═' * 50}")
    print(f" CHEF Score Enrichment — Distribution Report")
    print(f"{'═' * 50}")
    print(f" Total recipes: {total}")
    print(f" Errors: {errors}")
    print()

    grade_order = ["S", "A", "B", "C", "D", "E"]
    print(" Grade Distribution:")
    for grade in grade_order:
        count = grade_counts.get(grade, 0)
        pct = (count / total * 100) if total > 0 else 0
        bar = "█" * int(pct / 2)
        print(f"   {grade}: {count:5d} ({pct:5.1f}%) {bar}")

    print()
    print(" Category Distribution:")
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        pct = (count / total * 100) if total > 0 else 0
        print(f"   {cat:12s}: {count:5d} ({pct:5.1f}%)")

    if score_values:
        print()
        print(f" Score Statistics:")
        print(f"   Min score:  {min(score_values)}")
        print(f"   Max score:  {max(score_values)}")
        print(f"   Mean score: {sum(score_values) / len(score_values):.1f}")
        print(f"   Median:     {sorted(score_values)[len(score_values) // 2]}")

    print(f"\n{'═' * 50}")
    print(" ✅ Done! CHEF Scores added to recipes.json")
    print(f"{'═' * 50}")


if __name__ == "__main__":
    main()
