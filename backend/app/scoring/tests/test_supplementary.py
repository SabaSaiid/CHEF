"""
Unit tests for supplementary.py — Na/K ratio, NOVA UPF heuristic, and Glycemic Load estimation.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from app.scoring.supplementary import compute_supplementary_badges


def test_nak_ratio_optimal():
    res = compute_supplementary_badges(
        nutrition={"sodium_mg": 200, "potassium_mg": 400},
        ingredients=["1 cup spinach", "1 tomato"],
    )
    assert res.nak_ratio.ratio == 0.5
    assert res.nak_ratio.status == "optimal"


def test_nak_ratio_high_sodium():
    res = compute_supplementary_badges(
        nutrition={"sodium_mg": 1200, "potassium_mg": 300},
        ingredients=["salted chips"],
    )
    assert res.nak_ratio.ratio == 4.0
    assert res.nak_ratio.status == "high_sodium"


def test_nova_upf_detection():
    # Minimally processed
    res_clean = compute_supplementary_badges(
        nutrition={"calories": 100},
        ingredients=["2 eggs", "1 tsp butter"],
    )
    assert res_clean.nova_upf.status == "minimal_processing"
    assert len(res_clean.nova_upf.detected_markers) == 0

    # Ultra-processed
    res_upf = compute_supplementary_badges(
        nutrition={"calories": 300},
        ingredients=["bread with high fructose corn syrup", "soy protein isolate", "emulsifier"],
    )
    assert res_upf.nova_upf.status == "ultra_processed"
    assert "high fructose corn syrup" in res_upf.nova_upf.detected_markers


def test_glycemic_load():
    res = compute_supplementary_badges(
        nutrition={"carbs_g": 50, "fiber_g": 10},
        ingredients=["oats"],
    )
    # Net carbs = 40 -> GL = (40 * 55) / 100 = 22.0
    assert res.glycemic_load.estimated_gl == 22.0
    assert res.glycemic_load.status == "high"
    assert res.glycemic_load.low_confidence is True


if __name__ == "__main__":
    test_nak_ratio_optimal()
    test_nak_ratio_high_sodium()
    test_nova_upf_detection()
    test_glycemic_load()
    print("✅ All test_supplementary.py tests passed!")
