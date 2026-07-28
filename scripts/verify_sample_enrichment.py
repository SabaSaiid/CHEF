"""
Sample enrichment verification script — runs Phase 1 scoring on 20 representative recipes
and outputs a comparison report showing before/after grades, FVL%, and confidence scores.
"""

import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.scoring.calculator import compute_nutri_score_from_recipe

recipes_path = Path(__file__).resolve().parent.parent / "backend" / "app" / "recipes.json"

with open(recipes_path, encoding="utf-8") as f:
    recipes = json.load(f)

# Take 20 diverse recipes
sample = recipes[:20]

print("=" * 80)
print(f"{'Recipe Title':<35} | {'Old Grade':<9} | {'New Grade':<9} | {'FVL %':<7} | {'Confidence':<10}")
print("=" * 80)

deltas = 0
for r in sample:
    old_score = r.get("nutri_score") or r.get("chef_score") or {}
    old_grade = old_score.get("grade", "N/A")
    
    new_res = compute_nutri_score_from_recipe(r)
    new_grade = new_res.grade
    fvl_pct = new_res.breakdown.fvl_pct
    conf = new_res.breakdown.confidence
    
    if old_grade != new_grade:
        deltas += 1
        diff_flag = " ⚡"
    else:
        diff_flag = ""
        
    title = (r.get("title", "")[:32] + "...") if len(r.get("title", "")) > 35 else r.get("title", "")
    print(f"{title:<35} | {old_grade:<9} | {new_grade + diff_flag:<9} | {fvl_pct:<7.1f} | {conf:<10}")

print("=" * 80)
print(f"Sample size: {len(sample)} recipes | Grade deltas: {deltas}")
print("=" * 80)
