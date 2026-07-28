"""
Supplementary Nutritional Indicators for CHEF.

Computes non-scoring health metadata kept strictly separate from core Nutri-Score:
  1. Sodium-to-Potassium Ratio Badge (WHO target <= 1.0)
  2. NOVA-Style Ultra-Processed Food (UPF) Marker Heuristic
  3. Glycemic Load (GL) Estimator (with low_confidence flag)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from typing import Optional


UPF_INGREDIENT_MARKERS = [
    "hydrogenated", "partially hydrogenated", "high fructose corn syrup",
    "corn syrup", "artificial sweetener", "aspartame", "sucralose", "saccharin",
    "monosodium glutamate", "msg", "maltodextrin", "soy protein isolate",
    "whey protein isolate", "emulsifier", "polysorbate", "sodium benzoate",
    "potassium sorbate", "artificial flavor", "artificial color", "red 40",
    "yellow 5", "blue 1", "dextrose", "invert sugar", "carrageenan",
]


@dataclass
class NaKRatioBadge:
    ratio: Optional[float]
    status: str  # "optimal" (<= 1.0) | "moderate" (1.0 - 2.0) | "high_sodium" (> 2.0) | "unknown"
    label: str
    description: str


@dataclass
class NovaBadge:
    status: str  # "minimal_processing" | "ultra_processed"
    label: str
    detected_markers: list[str]


@dataclass
class GlycemicLoadBadge:
    estimated_gl: float
    status: str  # "low" (<= 10) | "medium" (11 - 19) | "high" (>= 20)
    label: str
    low_confidence: bool = True  # True due to cooking matrix variations


@dataclass
class SupplementaryBadgesResult:
    nak_ratio: NaKRatioBadge
    nova_upf: NovaBadge
    glycemic_load: GlycemicLoadBadge

    def to_dict(self) -> dict:
        return {
            "nak_ratio": asdict(self.nak_ratio),
            "nova_upf": asdict(self.nova_upf),
            "glycemic_load": asdict(self.glycemic_load),
        }


def compute_supplementary_badges(
    nutrition: dict[str, float],
    ingredients: list[str],
) -> SupplementaryBadgesResult:
    """
    Compute supplementary badges for a recipe given its nutrition dict and ingredient list.
    """
    sodium_mg = nutrition.get("sodium_mg", 0.0) or 0.0
    potassium_mg = nutrition.get("potassium_mg", 0.0) or 0.0

    # 1. Na/K Ratio Calculation
    if potassium_mg > 0:
        nak_val = round(sodium_mg / potassium_mg, 2)
        if nak_val <= 1.0:
            nak_status = "optimal"
            nak_label = f"Na/K Ratio {nak_val} (Optimal)"
            nak_desc = "Meets WHO recommended sodium-to-potassium balance (<= 1.0)."
        elif nak_val <= 2.0:
            nak_status = "moderate"
            nak_label = f"Na/K Ratio {nak_val} (Moderate)"
            nak_desc = "Moderate sodium relative to potassium."
        else:
            nak_status = "high_sodium"
            nak_label = f"Na/K Ratio {nak_val} (High Sodium)"
            nak_desc = "Sodium content significantly exceeds potassium."
    else:
        nak_val = None
        nak_status = "unknown"
        nak_label = "Na/K Ratio N/A"
        nak_desc = "Potassium data not available."

    nak_badge = NaKRatioBadge(
        ratio=nak_val,
        status=nak_status,
        label=nak_label,
        description=nak_desc,
    )

    # 2. NOVA Ultra-Processed Food Heuristic
    found_markers = []
    ing_text = " ".join(ingredients).lower()
    for marker in UPF_INGREDIENT_MARKERS:
        if marker in ing_text:
            found_markers.append(marker)

    if found_markers:
        nova_status = "ultra_processed"
        nova_label = "NOVA Group 4: Ultra-Processed"
    else:
        nova_status = "minimal_processing"
        nova_label = "Whole / Minimally Processed"

    nova_badge = NovaBadge(
        status=nova_status,
        label=nova_label,
        detected_markers=found_markers,
    )

    # 3. Glycemic Load Estimator
    carbs = nutrition.get("carbs_g", 0.0) or nutrition.get("carbohydrates", 0.0) or 0.0
    fiber = nutrition.get("fiber_g", 0.0) or 0.0
    net_carbs = max(0.0, carbs - fiber)

    # Heuristic GI (default 55 for mixed dishes)
    est_gi = 55.0
    est_gl = round((net_carbs * est_gi) / 100.0, 1)

    if est_gl <= 10.0:
        gl_status = "low"
        gl_label = f"Low Glycemic Load ({est_gl})"
    elif est_gl <= 19.0:
        gl_status = "medium"
        gl_label = f"Medium Glycemic Load ({est_gl})"
    else:
        gl_status = "high"
        gl_label = f"High Glycemic Load ({est_gl})"

    gl_badge = GlycemicLoadBadge(
        estimated_gl=est_gl,
        status=gl_status,
        label=gl_label,
        low_confidence=True,
    )

    return SupplementaryBadgesResult(
        nak_ratio=nak_badge,
        nova_upf=nova_badge,
        glycemic_load=gl_badge,
    )
