"""
Unit tests for estimators.py — FVL weight-aware calculations, concentrate multipliers, and confidence scoring.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from app.scoring.estimators import (
    estimate_fvl_percent,
    estimate_fvl_percent_with_confidence,
    _parse_ingredient_weight,
)


class TestFVLConcentratesAndConfidence:
    def test_parse_explicit_vs_fallback_units(self):
        name, weight, is_explicit = _parse_ingredient_weight("2 cups spinach")
        assert name == "spinach"
        assert weight == 480.0
        assert is_explicit is True

        name2, weight2, is_explicit2 = _parse_ingredient_weight("spinach")
        assert name2 == "spinach"
        assert weight2 == 100.0
        assert is_explicit2 is False

    def test_tomato_paste_concentrate_multiplier(self):
        """Tomato paste should get 2.0x multiplier under Nutri-Score 2023 rules."""
        fvl_pct_regular, _ = estimate_fvl_percent_with_confidence(["100g tomato", "100g flour"])
        fvl_pct_paste, _ = estimate_fvl_percent_with_confidence(["100g tomato paste", "100g flour"])

        assert fvl_pct_regular == 50.0
        # 100g paste * 2.0 = 200g FVL equivalent -> (200 / 200) * 100 = 100% (capped)
        assert fvl_pct_paste == 100.0

    def test_confidence_ratings(self):
        # All explicit units -> High confidence
        fvl_high, conf_high = estimate_fvl_percent_with_confidence(["200g spinach", "100g tomato", "1 cup rice"])
        assert conf_high == "high"

        # Partial explicit units -> Medium confidence
        fvl_med, conf_med = estimate_fvl_percent_with_confidence(["100g spinach", "tomato", "onion"])
        assert conf_med in ("medium", "low")

        # No explicit units -> Low confidence
        fvl_low, conf_low = estimate_fvl_percent_with_confidence(["spinach", "tomato", "onion", "garlic"])
        assert conf_low == "low"


if __name__ == "__main__":
    t = TestFVLConcentratesAndConfidence()
    t.test_parse_explicit_vs_fallback_units()
    t.test_tomato_paste_concentrate_multiplier()
    t.test_confidence_ratings()
    print("✅ All test_estimators.py tests passed!")
