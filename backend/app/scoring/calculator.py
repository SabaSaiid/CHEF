"""
Nutri-Score Calculator — core scoring engine.

Implements the FSA-NPS algorithm (2023/2024 revision) with a 6th S-tier
extension for exceptionally clean recipes. Takes per-serving recipe nutrition
and ingredient lists, normalizes to per-100g, computes negative/positive points,
applies the conditional protein rule, and maps the final score to a 6-tier grade.

Public API:
    compute_nutri_score(nutrition, ingredients, servings, ...) → NutriScoreResult
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from app.scoring.constants import (
    NEGATIVE_TABLES,
    POSITIVE_TABLES,
    GRADE_THRESHOLDS,
    S_TIER_MAX_SCORE,
    S_TIER_MAX_NEGATIVE_TOTAL,
    S_TIER_MIN_POSITIVE_TOTAL,
    PROTEIN_EXCLUSION_NEG_THRESHOLD,
    PROTEIN_EXCLUSION_FVL_THRESHOLD,
    TIER_COLORS,
    TIER_DESCRIPTIONS,
    GRADE_BONUS,
)
from app.scoring.categories import classify_recipe_category
from app.scoring.estimators import (
    estimate_fvl_percent,
    estimate_serving_weight_g,
    normalize_to_per_100g,
    enrich_missing_nutrients,
)


# ── Result dataclass ────────────────────────────────────────────────────

@dataclass
class NutriScoreBreakdown:
    """Detailed point breakdown for explainability."""
    # Negative component points (0–10 each)
    neg_energy: int = 0
    neg_saturated_fat: int = 0
    neg_sugars: int = 0
    neg_sodium: int = 0
    # Positive component points (0–5 each)
    pos_fiber: int = 0
    pos_protein: int = 0
    pos_fvl: int = 0
    # Whether the protein exclusion rule was applied
    protein_excluded: bool = False
    # Estimated values
    fvl_pct: float = 0.0
    estimated_serving_weight_g: float = 300.0
    # Per-100g values used for scoring (for debugging / transparency)
    energy_kj_per_100g: float = 0.0
    sat_fat_per_100g: float = 0.0
    sugars_per_100g: float = 0.0
    sodium_per_100g: float = 0.0
    fiber_per_100g: float = 0.0
    protein_per_100g: float = 0.0
    # Data completeness
    nutrients_estimated: bool = False  # True if any nutrient was gap-filled


ChefScoreBreakdown = NutriScoreBreakdown


@dataclass
class NutriScoreResult:
    """Complete Nutri-Score result."""
    grade: str                              # "S", "A", "B", "C", "D", or "E"
    numeric_score: int                      # Final NPS score (neg - pos)
    negative_total: int                     # Sum of negative points (0–40)
    positive_total: int                     # Sum of positive points (0–15)
    category: str                           # "general", "beverage", "fats_oils", "cheese"
    breakdown: NutriScoreBreakdown = field(default_factory=NutriScoreBreakdown)
    # Visual metadata (convenience for API responses)
    color_bg: str = ""
    color_text: str = ""
    label: str = ""
    description: str = ""

    def __post_init__(self):
        tier = TIER_COLORS.get(self.grade, TIER_COLORS["C"])
        self.color_bg = tier["background"]
        self.color_text = tier["text"]
        self.label = tier["label"]
        self.description = TIER_DESCRIPTIONS.get(self.grade, "")

    @property
    def grade_bonus(self) -> float:
        """Numeric bonus value for diet planner integration."""
        return GRADE_BONUS.get(self.grade, 0.0)

    def to_dict(self) -> dict:
        """Serialize to a plain dict for JSON responses."""
        return {
            "grade": self.grade,
            "numeric_score": self.numeric_score,
            "negative_total": self.negative_total,
            "positive_total": self.positive_total,
            "category": self.category,
            "color_bg": self.color_bg,
            "color_text": self.color_text,
            "label": self.label,
            "description": self.description,
            "breakdown": {
                "neg_energy": self.breakdown.neg_energy,
                "neg_saturated_fat": self.breakdown.neg_saturated_fat,
                "neg_sugars": self.breakdown.neg_sugars,
                "neg_sodium": self.breakdown.neg_sodium,
                "pos_fiber": self.breakdown.pos_fiber,
                "pos_protein": self.breakdown.pos_protein,
                "pos_fvl": self.breakdown.pos_fvl,
                "protein_excluded": self.breakdown.protein_excluded,
                "fvl_pct": self.breakdown.fvl_pct,
                "nutrients_estimated": self.breakdown.nutrients_estimated,
            },
        }


ChefScoreResult = NutriScoreResult


# ── Point lookup ────────────────────────────────────────────────────────

def _lookup_negative_points(value: float, thresholds: list[float]) -> int:
    """
    Look up negative points for a nutrient value against a threshold list.

    Points range from 0 to 10.  Point N is awarded when the value
    exceeds threshold[N-1].
    """
    points = 0
    for threshold in thresholds:
        if value > threshold:
            points += 1
        else:
            break
    return points


def _lookup_positive_points(value: float, thresholds: list[float]) -> int:
    """
    Look up positive points for a nutrient value against a threshold list.

    Points range from 0 to 5.  Point N is awarded when the value
    exceeds threshold[N-1].
    """
    points = 0
    for threshold in thresholds:
        if value > threshold:
            points += 1
        else:
            break
    return points


# ── Core scoring function ───────────────────────────────────────────────

def compute_nutri_score(
    nutrition: dict[str, float],
    ingredients: list[str] | None = None,
    servings: int = 1,
    title: str = "",
    meal_type: str | None = None,
    category_override: str | None = None,
    is_per_100g: bool = False,
) -> NutriScoreResult:
    """
    Compute the Nutri-Score for a recipe.

    Args:
        nutrition: Per-SERVING nutrition dict (or per-100g if is_per_100g=True).
            Expected keys:
            - "calories" (kcal)
            - "protein_g"
            - "carbs_g"
            - "fat_g"
            Optional (will be estimated if missing):
            - "saturated_fat_g"
            - "sugar_g"
            - "sodium_mg"
            - "fiber_g"
        ingredients: List of raw ingredient strings.
        servings: Number of servings the nutrition values represent.
        title: Recipe title (used for category classification).
        meal_type: Optional meal type hint.
        category_override: Force a specific category instead of auto-detecting.
        is_per_100g: If True, nutrition values are already per-100g and
                     normalization is skipped.

    Returns:
        NutriScoreResult with grade, score, and full breakdown.
    """
    ingredients = ingredients or []

    # ── Step 0: Determine category ──────────────────────────────────
    if category_override and category_override in NEGATIVE_TABLES:
        category = category_override
    else:
        category = classify_recipe_category(title, ingredients)

    # ── Step 1: Estimate serving weight and normalize to per-100g ───
    if is_per_100g:
        serving_weight_g = 100.0
    else:
        serving_weight_g = estimate_serving_weight_g(ingredients, servings, meal_type)

    # Build per-serving nutrition dict with safe defaults
    per_serving = {
        "calories": nutrition.get("calories", 0) or 0,
        "protein_g": nutrition.get("protein_g", 0) or 0,
        "carbs_g": nutrition.get("carbs_g", 0) or 0,
        "fat_g": nutrition.get("fat_g", 0) or 0,
        "saturated_fat_g": nutrition.get("saturated_fat_g"),
        "sugar_g": nutrition.get("sugar_g"),
        "sodium_mg": nutrition.get("sodium_mg"),
        "fiber_g": nutrition.get("fiber_g"),
    }

    # Normalize to per-100g
    # Only normalize fields that have numeric values
    numeric_fields = {k: v for k, v in per_serving.items() if v is not None}
    per_100g = normalize_to_per_100g(numeric_fields, serving_weight_g)

    # Re-attach None fields for enrichment
    for k, v in per_serving.items():
        if v is None:
            per_100g[k] = None

    # ── Step 2: Enrich missing micronutrients ──────────────────────
    nutrients_estimated = any(
        per_100g.get(f) is None
        for f in ("saturated_fat_g", "sugar_g", "sodium_mg", "fiber_g")
    )
    per_100g = enrich_missing_nutrients(per_100g, ingredients)

    # ── Step 3: Convert energy to kJ ───────────────────────────────
    energy_kj = per_100g.get("calories", 0) * 4.184

    # ── Step 4: Compute negative points ────────────────────────────
    neg_table = NEGATIVE_TABLES[category]

    neg_energy = _lookup_negative_points(energy_kj, neg_table["energy_kj"])
    neg_sat_fat = _lookup_negative_points(
        per_100g.get("saturated_fat_g", 0), neg_table["saturated_fat"]
    )
    neg_sugars = _lookup_negative_points(
        per_100g.get("sugar_g", 0), neg_table["sugars"]
    )
    neg_sodium = _lookup_negative_points(
        per_100g.get("sodium_mg", 0), neg_table["sodium"]
    )
    negative_total = neg_energy + neg_sat_fat + neg_sugars + neg_sodium

    # ── Step 5: Compute positive points ────────────────────────────
    pos_table = POSITIVE_TABLES[category]

    fvl_pct = estimate_fvl_percent(ingredients)
    pos_fiber = _lookup_positive_points(
        per_100g.get("fiber_g", 0), pos_table["fiber"]
    )
    pos_protein = _lookup_positive_points(
        per_100g.get("protein_g", 0), pos_table["protein"]
    )
    pos_fvl = _lookup_positive_points(fvl_pct, pos_table["fvl"])

    # ── Step 6: Apply conditional protein rule ─────────────────────
    protein_excluded = False
    if (
        negative_total >= PROTEIN_EXCLUSION_NEG_THRESHOLD
        and pos_fvl < PROTEIN_EXCLUSION_FVL_THRESHOLD
    ):
        # Protein points are NOT counted
        positive_total = pos_fiber + pos_fvl
        protein_excluded = True
    else:
        positive_total = pos_fiber + pos_protein + pos_fvl

    # ── Step 7: Final score ────────────────────────────────────────
    final_score = negative_total - positive_total

    # ── Step 8: Map to grade ───────────────────────────────────────
    grade = _map_score_to_grade(final_score, negative_total, positive_total, category)

    # ── Build result ───────────────────────────────────────────────
    breakdown = NutriScoreBreakdown(
        neg_energy=neg_energy,
        neg_saturated_fat=neg_sat_fat,
        neg_sugars=neg_sugars,
        neg_sodium=neg_sodium,
        pos_fiber=pos_fiber,
        pos_protein=pos_protein,
        pos_fvl=pos_fvl,
        protein_excluded=protein_excluded,
        fvl_pct=fvl_pct,
        estimated_serving_weight_g=serving_weight_g,
        energy_kj_per_100g=round(energy_kj, 1),
        sat_fat_per_100g=round(per_100g.get("saturated_fat_g", 0), 2),
        sugars_per_100g=round(per_100g.get("sugar_g", 0), 2),
        sodium_per_100g=round(per_100g.get("sodium_mg", 0), 1),
        fiber_per_100g=round(per_100g.get("fiber_g", 0), 2),
        protein_per_100g=round(per_100g.get("protein_g", 0), 2),
        nutrients_estimated=nutrients_estimated,
    )

    return NutriScoreResult(
        grade=grade,
        numeric_score=final_score,
        negative_total=negative_total,
        positive_total=positive_total,
        category=category,
        breakdown=breakdown,
    )


compute_chef_score = compute_nutri_score


def _map_score_to_grade(
    score: int,
    negative_total: int,
    positive_total: int,
    category: str,
) -> str:
    """
    Map a numeric NPS score to a 6-tier grade.

    Checks S-tier qualification first, then falls through to standard
    A–E thresholds.
    """
    # ── S-tier check ───────────────────────────────────────────────
    if (
        score <= S_TIER_MAX_SCORE
        and negative_total <= S_TIER_MAX_NEGATIVE_TOTAL
        and positive_total >= S_TIER_MIN_POSITIVE_TOTAL
    ):
        return "S"

    # ── Standard A–E thresholds ────────────────────────────────────
    thresholds = GRADE_THRESHOLDS.get(category, GRADE_THRESHOLDS["general"])

    for upper_bound, grade in thresholds:
        if score <= upper_bound:
            return grade

    # If no threshold matched, it's E
    return "E"


# ── Convenience: compute from minimal recipe dict ───────────────────────

def compute_nutri_score_from_recipe(recipe: dict) -> NutriScoreResult:
    """
    Compute Nutri-Score from a raw recipe dict (as loaded from recipes.json).

    Convenience wrapper that extracts nutrition, ingredients, servings,
    and title from a standard recipe dict structure.
    """
    nutrition = recipe.get("nutrition", {})
    if not nutrition or not nutrition.get("calories"):
        # Cannot score without at least calorie data
        return NutriScoreResult(
            grade="C",
            numeric_score=5,
            negative_total=5,
            positive_total=0,
            category="general",
            breakdown=NutriScoreBreakdown(nutrients_estimated=True),
        )

    return compute_nutri_score(
        nutrition=nutrition,
        ingredients=recipe.get("ingredients", []),
        servings=recipe.get("servings", 1) or 1,
        title=recipe.get("title", ""),
        meal_type=recipe.get("meal_type"),
    )


compute_chef_score_from_recipe = compute_nutri_score_from_recipe
