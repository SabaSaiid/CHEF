"""
CHEF Score constants — point tables, grade thresholds, and tier metadata.

Based on the 2023/2024 revision of the FSA-NPS (Nutri-Score) algorithm,
extended with a CHEF-exclusive S-tier.

References:
  - Santé publique France, Nutri-Score algorithm 2023 update
  - Regulation (EU) 2024/xxx harmonised front-of-pack nutrition labelling
"""

from __future__ import annotations

ALGORITHM_VERSION = "1.0.0"

# ── Negative-point threshold tables ─────────────────────────────────────
#
# Each list contains 11 threshold values corresponding to points 0–10.
# Point N is awarded when the nutrient value *exceeds* threshold[N-1]
# (threshold[0] is the ceiling for 0 points).

NEGATIVE_TABLES: dict[str, dict[str, list[float]]] = {
    # ── General solid foods (per 100 g) ────────────────────────────────
    "general": {
        "energy_kj":    [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350],
        "saturated_fat": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "sugars":        [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34],
        "sodium":        [90, 180, 270, 360, 450, 540, 630, 720, 810, 900],
    },
    # ── Beverages (per 100 ml) ─────────────────────────────────────────
    "beverage": {
        "energy_kj":    [30, 60, 90, 120, 150, 180, 210, 240, 270, 300],
        "saturated_fat": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "sugars":        [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5],
        "sodium":        [90, 180, 270, 360, 450, 540, 630, 720, 810, 900],
    },
    # ── Fats / oils / nuts / seeds (per 100 g) ─────────────────────────
    # Uses same base as general but with fat thresholds adjusted for
    # the sat-fat-to-total-fat ratio rather than absolute sat-fat.
    # For simplicity we keep the same absolute tables (2023 revision
    # still uses absolute g/100g for fats category in practice).
    "fats_oils": {
        "energy_kj":    [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350],
        "saturated_fat": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "sugars":        [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34],
        "sodium":        [90, 180, 270, 360, 450, 540, 630, 720, 810, 900],
    },
    # ── Cheese (per 100 g) ─────────────────────────────────────────────
    "cheese": {
        "energy_kj":    [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350],
        "saturated_fat": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "sugars":        [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34],
        "sodium":        [90, 180, 270, 360, 450, 540, 630, 720, 810, 900],
    },
}


# ── Positive-point threshold tables ─────────────────────────────────────
#
# Each list contains 5 threshold values corresponding to points 1–5.
# Point N is awarded when the nutrient value *exceeds* threshold[N-1].

POSITIVE_TABLES: dict[str, dict[str, list[float]]] = {
    "general": {
        "fiber":   [0.9, 1.9, 2.8, 3.7, 4.7],
        "protein": [1.6, 3.2, 4.8, 6.4, 8.0],
        "fvl":     [40, 60, 67, 75, 80],  # fruit/veg/legume/nut percentage
    },
    "beverage": {
        "fiber":   [0.9, 1.9, 2.8, 3.7, 4.7],
        "protein": [1.6, 3.2, 4.8, 6.4, 8.0],
        "fvl":     [40, 60, 67, 75, 80],
    },
    "fats_oils": {
        "fiber":   [0.9, 1.9, 2.8, 3.7, 4.7],
        "protein": [1.6, 3.2, 4.8, 6.4, 8.0],
        "fvl":     [40, 60, 67, 75, 80],
    },
    "cheese": {
        "fiber":   [0.9, 1.9, 2.8, 3.7, 4.7],
        "protein": [1.6, 3.2, 4.8, 6.4, 8.0],
        "fvl":     [40, 60, 67, 75, 80],
    },
}


# ── Score → Grade threshold mappings ────────────────────────────────────
#
# Each entry is a list of (max_score_inclusive, grade) tuples, checked in
# order.  The S-tier has additional constraints checked separately.
#
# Format: [(upper_bound, grade), ...] — first match wins.

GRADE_THRESHOLDS: dict[str, list[tuple[int, str]]] = {
    "general": [
        (-1, "A"),
        (2,  "B"),
        (10, "C"),
        (18, "D"),
        # Everything above 18 → E
    ],
    "beverage": [
        (1,  "A"),
        (5,  "B"),
        (9,  "C"),
        (13, "D"),
    ],
    "fats_oils": [
        (-6, "A"),
        (2,  "B"),
        (10, "C"),
        (18, "D"),
    ],
    "cheese": [
        (-1, "A"),
        (2,  "B"),
        (10, "C"),
        (18, "D"),
    ],
}


# ── S-tier qualification criteria ───────────────────────────────────────
#
# CHEF-exclusive bonus tier: all three conditions must be met.

S_TIER_MAX_SCORE = -4           # final_score must be ≤ this
S_TIER_MAX_NEGATIVE_TOTAL = 1   # sum of all negative points must be ≤ this
S_TIER_MIN_POSITIVE_TOTAL = 5   # sum of all positive points must be ≥ this


# ── Conditional protein rule ────────────────────────────────────────────
#
# 2023 revision: if negative_total >= 11 AND fvl_points < 5, protein
# points are NOT counted in positive_total.

PROTEIN_EXCLUSION_NEG_THRESHOLD = 11
PROTEIN_EXCLUSION_FVL_THRESHOLD = 5


# ── Tier visual metadata ───────────────────────────────────────────────

TIER_COLORS: dict[str, dict[str, str]] = {
    "S": {"background": "#DAA520", "text": "#1a1a1a", "label": "★ S"},
    "A": {"background": "#038141", "text": "#ffffff", "label": "A"},
    "B": {"background": "#85BB2F", "text": "#1a1a1a", "label": "B"},
    "C": {"background": "#FECB02", "text": "#1a1a1a", "label": "C"},
    "D": {"background": "#EE8100", "text": "#ffffff", "label": "D"},
    "E": {"background": "#E63E11", "text": "#ffffff", "label": "E"},
}

TIER_DESCRIPTIONS: dict[str, str] = {
    "S": "Exceptionally clean",
    "A": "Excellent nutritional quality",
    "B": "Good nutritional quality",
    "C": "Average nutritional quality",
    "D": "Poor nutritional quality",
    "E": "Very poor nutritional quality",
}

# Grade ordering for comparisons and filtering (lower index = better)
GRADE_ORDER: list[str] = ["S", "A", "B", "C", "D", "E"]

# Grade → numeric bonus for diet planner integration (0.0 – 1.0)
GRADE_BONUS: dict[str, float] = {
    "S": 1.0,
    "A": 0.85,
    "B": 0.65,
    "C": 0.4,
    "D": 0.15,
    "E": 0.0,
}

# Next tier progression mapping (for upgrade advice)
NEXT_TIER_MAP: dict[str, Optional[str]] = {
    "E": "D",
    "D": "C",
    "C": "B",
    "B": "A",
    "A": "S",
    "S": None,
}

# Health condition penalty multipliers for optional personalized scoring
HEALTH_CONDITION_WEIGHTS: dict[str, dict[str, float]] = {
    "Hypertension": {"sodium": 1.5, "saturated_fat": 1.1},
    "High Blood Pressure": {"sodium": 1.5, "saturated_fat": 1.1},
    "Diabetes": {"sugars": 1.5, "energy_kj": 1.2},
    "Type 2 Diabetes": {"sugars": 1.5, "energy_kj": 1.2},
    "High Cholesterol": {"saturated_fat": 1.5},
    "Fatty Liver": {"sugars": 1.3, "saturated_fat": 1.3},
}


# ── Penalty-biased defaults for missing nutrients ──────────────────────
#
# When a recipe is missing specific micronutrient data, these conservative
# defaults are used.  They deliberately lean toward assigning more negative
# points to avoid over-rating unverifiable recipes.

DEFAULT_NUTRIENTS_PER_100G: dict[str, float] = {
    "saturated_fat_g": 5.0,   # moderate — will score ~5 negative points
    "sugar_g":         8.0,   # moderate — will score ~3 negative points
    "sodium_mg":       400.0, # moderate — will score ~4 negative points
    "fiber_g":         3.0,   # moderate — will score ~3 positive points
}


# ── Serving weight fallbacks ───────────────────────────────────────────
#
# When serving weight cannot be estimated from ingredients.

FALLBACK_SERVING_WEIGHT_G: dict[str, float] = {
    "main":      350.0,
    "snack":     200.0,
    "beverage":  250.0,
    "default":   300.0,
}

