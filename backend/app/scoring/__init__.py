"""
Nutri-Score — 6-tier nutritional rating system.

Based on the European Nutri-Score (FSA-NPS) methodology, extended with
an S-tier for exceptionally clean recipes.

Public API:
    compute_nutri_score(nutrition_per_100g, ingredients, category_override)
    classify_recipe_category(title, ingredients)
    NutriScoreResult  (dataclass)
"""

from app.scoring.calculator import (
    compute_nutri_score,
    compute_nutri_score_from_recipe,
    NutriScoreResult,
    NutriScoreBreakdown,
)
from app.scoring.categories import classify_recipe_category

__all__ = [
    "compute_nutri_score",
    "compute_nutri_score_from_recipe",
    "NutriScoreResult",
    "NutriScoreBreakdown",
    "classify_recipe_category",
]
