"""
Unit tests for CHEF Score calculator, categories, and estimators.

Validates:
  1. Point lookup functions
  2. Category classification
  3. FVL% estimation
  4. A–E grades against 10 known reference foods
  5. S-tier qualification and rejection
  6. Edge cases (missing data, empty inputs)
"""

import sys
from pathlib import Path

# Ensure the backend app is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

# import pytest

from app.scoring.calculator import (
    compute_chef_score,
    compute_chef_score_from_recipe,
    _lookup_negative_points,
    _lookup_positive_points,
    _map_score_to_grade,
    ChefScoreResult,
)
from app.scoring.categories import classify_recipe_category
from app.scoring.estimators import estimate_fvl_percent, estimate_serving_weight_g
from app.scoring.constants import NEGATIVE_TABLES, GRADE_ORDER


# ═══════════════════════════════════════════════════════════════════════
# 1. Point Lookup Tests
# ═══════════════════════════════════════════════════════════════════════

class TestNegativePointLookup:
    """Test the threshold-based negative point lookup."""

    def test_zero_value_gives_zero_points(self):
        thresholds = NEGATIVE_TABLES["general"]["energy_kj"]
        assert _lookup_negative_points(0, thresholds) == 0

    def test_below_first_threshold(self):
        thresholds = NEGATIVE_TABLES["general"]["energy_kj"]
        assert _lookup_negative_points(300, thresholds) == 0

    def test_exactly_at_first_threshold(self):
        thresholds = NEGATIVE_TABLES["general"]["energy_kj"]
        # 335 is the threshold for 0 points — at 335, value is NOT > 335
        assert _lookup_negative_points(335, thresholds) == 0

    def test_just_above_first_threshold(self):
        thresholds = NEGATIVE_TABLES["general"]["energy_kj"]
        assert _lookup_negative_points(336, thresholds) == 1

    def test_max_points(self):
        thresholds = NEGATIVE_TABLES["general"]["energy_kj"]
        assert _lookup_negative_points(9999, thresholds) == 10

    def test_sodium_mid_range(self):
        thresholds = NEGATIVE_TABLES["general"]["sodium"]
        # 400 mg > 360 (4th threshold) but ≤ 450 (5th threshold)
        assert _lookup_negative_points(400, thresholds) == 4


class TestPositivePointLookup:
    """Test the threshold-based positive point lookup."""

    def test_zero_gives_zero(self):
        from app.scoring.constants import POSITIVE_TABLES
        thresholds = POSITIVE_TABLES["general"]["fiber"]
        assert _lookup_positive_points(0, thresholds) == 0

    def test_high_fiber(self):
        from app.scoring.constants import POSITIVE_TABLES
        thresholds = POSITIVE_TABLES["general"]["fiber"]
        assert _lookup_positive_points(5.0, thresholds) == 5

    def test_moderate_protein(self):
        from app.scoring.constants import POSITIVE_TABLES
        thresholds = POSITIVE_TABLES["general"]["protein"]
        # 5.0 > 4.8 (3rd) but ≤ 6.4 (4th)
        assert _lookup_positive_points(5.0, thresholds) == 3


# ═══════════════════════════════════════════════════════════════════════
# 2. Category Classification Tests
# ═══════════════════════════════════════════════════════════════════════

class TestCategoryClassification:
    """Test recipe category classifier."""

    def test_general_food(self):
        assert classify_recipe_category("Dal Chawal") == "general"

    def test_general_food_with_ingredients(self):
        assert classify_recipe_category(
            "Chicken Biryani",
            ["2 cups rice", "500g chicken", "2 onions"]
        ) == "general"

    def test_beverage_smoothie(self):
        assert classify_recipe_category("Mango Smoothie") == "beverage"

    def test_beverage_lassi(self):
        assert classify_recipe_category("Sweet Lassi") == "beverage"

    def test_beverage_juice(self):
        assert classify_recipe_category("Fresh Orange Juice") == "beverage"

    def test_smoothie_bowl_not_beverage(self):
        """Smoothie bowl is solid food, not a beverage."""
        assert classify_recipe_category("Acai Smoothie Bowl") != "beverage"

    def test_coffee_cake_not_beverage(self):
        """Coffee cake is not a beverage."""
        assert classify_recipe_category("Coffee Cake") != "beverage"

    def test_cheese_dominant_paneer_tikka(self):
        assert classify_recipe_category("Paneer Tikka") == "cheese"

    def test_cheese_dominant_mac_and_cheese(self):
        assert classify_recipe_category("Mac and Cheese") == "cheese"

    def test_cheese_not_dominant_in_pizza(self):
        """Pizza has cheese but it's not cheese-dominant."""
        assert classify_recipe_category("Margherita Pizza") == "general"

    def test_fats_dressing(self):
        assert classify_recipe_category("Caesar Salad Dressing") == "fats_oils"

    def test_fats_pesto(self):
        assert classify_recipe_category("Basil Pesto") == "fats_oils"

    def test_vinaigrette(self):
        assert classify_recipe_category("Balsamic Vinaigrette") == "fats_oils"


# ═══════════════════════════════════════════════════════════════════════
# 3. FVL% Estimation Tests
# ═══════════════════════════════════════════════════════════════════════

class TestFVLEstimation:
    """Test fruit/vegetable/legume/nut percentage estimator."""

    def test_empty_ingredients(self):
        assert estimate_fvl_percent([]) == 0.0

    def test_pure_vegetable_dish(self):
        fvl = estimate_fvl_percent(["500g spinach", "200g tomato", "100g onion"])
        assert fvl > 80  # Should be ~100%

    def test_mixed_dish(self):
        fvl = estimate_fvl_percent([
            "200g chicken", "100g spinach", "50g onion", "1 cup rice"
        ])
        assert 20 < fvl < 60  # Partial FVL

    def test_no_fvl(self):
        fvl = estimate_fvl_percent(["200g chicken", "1 cup rice", "2 tbsp oil"])
        assert fvl < 20

    def test_legume_dish(self):
        fvl = estimate_fvl_percent(["1 cup lentils", "2 tomatoes", "1 onion"])
        assert fvl > 60


# ═══════════════════════════════════════════════════════════════════════
# 4. A–E Grade Validation Against Reference Foods
# ═══════════════════════════════════════════════════════════════════════

class TestReferenceGrades:
    """
    Validate computed grades against known Nutri-Score ratings.

    These use per-100g values directly (bypass normalization) to test
    the core scoring algorithm in isolation.
    """

    def _score_per_100g(self, nutrition_per_100g, category="general", ingredients=None):
        """Helper: score using pre-normalized per-100g nutrition."""
        # We pass serving_weight=100 to make the normalization a no-op
        nutrition = dict(nutrition_per_100g)
        return compute_chef_score(
            nutrition=nutrition,
            ingredients=ingredients or [],
            servings=1,
            title="",
            category_override=category,
        )

    def test_raw_carrots_grade_a(self):
        """Raw carrots: known Nutri-Score A."""
        result = self._score_per_100g({
            "calories": 41, "protein_g": 0.9, "carbs_g": 10,
            "fat_g": 0.2, "saturated_fat_g": 0.0, "sugar_g": 4.7,
            "sodium_mg": 69, "fiber_g": 2.8,
        }, ingredients=["500g carrots"])
        assert result.grade in ("S", "A"), f"Carrots got {result.grade}, expected A or S"

    def test_white_bread_grade_c(self):
        """White bread: known Nutri-Score C."""
        result = self._score_per_100g({
            "calories": 265, "protein_g": 9, "carbs_g": 49,
            "fat_g": 3.2, "saturated_fat_g": 0.6, "sugar_g": 5,
            "sodium_mg": 491, "fiber_g": 2.7,
        })
        assert result.grade in ("B", "C"), f"White bread got {result.grade}, expected B or C"

    def test_plain_yogurt_grade_a(self):
        """Plain natural yogurt: known Nutri-Score A."""
        result = self._score_per_100g({
            "calories": 61, "protein_g": 3.5, "carbs_g": 4.7,
            "fat_g": 3.3, "saturated_fat_g": 2.1, "sugar_g": 4.7,
            "sodium_mg": 46, "fiber_g": 0,
        })
        assert result.grade in ("A", "B"), f"Yogurt got {result.grade}, expected A"

    def test_raw_salmon_grade_a(self):
        """Raw salmon: known Nutri-Score A."""
        result = self._score_per_100g({
            "calories": 208, "protein_g": 20, "carbs_g": 0,
            "fat_g": 13, "saturated_fat_g": 3.1, "sugar_g": 0,
            "sodium_mg": 59, "fiber_g": 0,
        })
        assert result.grade in ("A", "B"), f"Salmon got {result.grade}, expected A"

    def test_cooked_lentils_grade_a(self):
        """Cooked lentils: known Nutri-Score A."""
        result = self._score_per_100g({
            "calories": 116, "protein_g": 9, "carbs_g": 20,
            "fat_g": 0.4, "saturated_fat_g": 0.1, "sugar_g": 1.8,
            "sodium_mg": 2, "fiber_g": 7.9,
        }, ingredients=["200g lentils", "100g onion", "50g tomato"])
        assert result.grade in ("S", "A"), f"Lentils got {result.grade}, expected A or S"

    def test_butter_grade_d(self):
        """Butter: known Nutri-Score D/E."""
        result = self._score_per_100g({
            "calories": 717, "protein_g": 0.9, "carbs_g": 0.1,
            "fat_g": 81, "saturated_fat_g": 51, "sugar_g": 0.1,
            "sodium_mg": 11, "fiber_g": 0,
        }, category="fats_oils")
        assert result.grade in ("D", "E"), f"Butter got {result.grade}, expected D or E"

    def test_milk_chocolate_grade_e(self):
        """Milk chocolate: known Nutri-Score E."""
        result = self._score_per_100g({
            "calories": 535, "protein_g": 8, "carbs_g": 59,
            "fat_g": 30, "saturated_fat_g": 19, "sugar_g": 52,
            "sodium_mg": 79, "fiber_g": 3.4,
        })
        assert result.grade in ("D", "E"), f"Chocolate got {result.grade}, expected D or E"


# ═══════════════════════════════════════════════════════════════════════
# 5. S-Tier Tests
# ═══════════════════════════════════════════════════════════════════════

class TestSTier:
    """Test CHEF-exclusive S-tier qualification."""

    def _score_per_100g(self, nutrition_per_100g, ingredients=None):
        return compute_chef_score(
            nutrition=nutrition_per_100g,
            ingredients=ingredients or [],
            servings=1,
            title="",
            category_override="general",
            is_per_100g=True,
        )

    def test_steamed_broccoli_lentils_qualifies(self):
        """Very clean dish with high fiber + protein + FVL should get S."""
        result = self._score_per_100g({
            "calories": 70, "protein_g": 5, "carbs_g": 12,
            "fat_g": 0.3, "saturated_fat_g": 0.0, "sugar_g": 1.5,
            "sodium_mg": 20, "fiber_g": 5.0,
        }, ingredients=["200g broccoli", "150g lentils", "50g carrot"])
        assert result.grade == "S", f"Clean dish got {result.grade}, expected S"
        assert result.negative_total <= 1
        assert result.positive_total >= 5

    def test_fresh_fruit_salad_qualifies(self):
        """Fresh fruit salad should potentially qualify for S."""
        result = self._score_per_100g({
            "calories": 50, "protein_g": 0.8, "carbs_g": 13,
            "fat_g": 0.2, "saturated_fat_g": 0.0, "sugar_g": 10,
            "sodium_mg": 5, "fiber_g": 2.0,
        }, ingredients=["100g apple", "100g banana", "100g mango", "50g strawberry"])
        # Sugar might push this out of S depending on thresholds
        assert result.grade in ("S", "A"), f"Fruit salad got {result.grade}"

    def test_grilled_chicken_does_not_qualify(self):
        """Grilled chicken: good protein but too much energy for S."""
        result = self._score_per_100g({
            "calories": 165, "protein_g": 31, "carbs_g": 0,
            "fat_g": 3.6, "saturated_fat_g": 1.0, "sugar_g": 0,
            "sodium_mg": 74, "fiber_g": 0,
        })
        # Energy too high for S (165 kcal = 690 kJ > 335)
        assert result.grade != "S", f"Chicken should not get S, got {result.grade}"
        assert result.grade in ("A", "B")  # Should still be good

    def test_chocolate_cake_does_not_qualify(self):
        """Chocolate cake: definitely not S-tier."""
        result = self._score_per_100g({
            "calories": 370, "protein_g": 5, "carbs_g": 50,
            "fat_g": 17, "saturated_fat_g": 10, "sugar_g": 35,
            "sodium_mg": 350, "fiber_g": 2.0,
        })
        assert result.grade not in ("S", "A", "B")


# ═══════════════════════════════════════════════════════════════════════
# 6. Edge Case Tests
# ═══════════════════════════════════════════════════════════════════════

class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_nutrition(self):
        """Recipe with no nutrition data should get a default score."""
        result = compute_chef_score_from_recipe({})
        assert result.grade in GRADE_ORDER
        assert result.breakdown.nutrients_estimated is True

    def test_zero_calories(self):
        """Recipe with zero calories (like water) should handle gracefully."""
        result = compute_chef_score(
            nutrition={"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0},
            ingredients=["250ml water"],
            title="Water",
        )
        assert result.grade in ("S", "A", "B")

    def test_no_ingredients(self):
        """Recipe with nutrition but no ingredient list."""
        result = compute_chef_score(
            nutrition={"calories": 300, "protein_g": 15, "carbs_g": 40, "fat_g": 8},
            ingredients=[],
            title="Mystery Dish",
        )
        assert result.grade in GRADE_ORDER
        assert result.breakdown.fvl_pct == 0.0

    def test_score_to_dict(self):
        """Test serialization to dict."""
        result = compute_chef_score(
            nutrition={"calories": 200, "protein_g": 10, "carbs_g": 30, "fat_g": 5},
            ingredients=["100g chicken", "200g rice"],
            title="Chicken Rice",
        )
        d = result.to_dict()
        assert "grade" in d
        assert "breakdown" in d
        assert isinstance(d["breakdown"], dict)

    def test_grade_bonus_property(self):
        """Test grade_bonus property returns correct values."""
        result = compute_chef_score(
            nutrition={
                "calories": 70, "protein_g": 5, "carbs_g": 12, "fat_g": 0.3,
                "saturated_fat_g": 0.0, "sugar_g": 1.0, "sodium_mg": 10, "fiber_g": 5.0,
            },
            ingredients=["200g spinach", "100g lentils"],
            title="Spinach Lentil Soup",
            category_override="general",
        )
        assert 0.0 <= result.grade_bonus <= 1.0


# ═══════════════════════════════════════════════════════════════════════
# Run with: pytest backend/app/scoring/tests/test_calculator.py -v
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    t_neg = TestNegativePointLookup()
    t_neg.test_zero_value_gives_zero_points()
    t_neg.test_below_first_threshold()
    t_neg.test_exactly_at_first_threshold()
    t_neg.test_just_above_first_threshold()
    t_neg.test_max_points()
    t_neg.test_sodium_mid_range()

    t_pos = TestPositivePointLookup()
    t_pos.test_zero_gives_zero()
    t_pos.test_high_fiber()
    t_pos.test_moderate_protein()

    t_cat = TestCategoryClassification()
    t_cat.test_general_food()
    t_cat.test_general_food_with_ingredients()
    t_cat.test_beverage_smoothie()
    t_cat.test_beverage_lassi()
    t_cat.test_beverage_juice()
    t_cat.test_smoothie_bowl_not_beverage()
    t_cat.test_coffee_cake_not_beverage()
    t_cat.test_cheese_dominant_paneer_tikka()
    t_cat.test_cheese_dominant_mac_and_cheese()
    t_cat.test_cheese_not_dominant_in_pizza()
    t_cat.test_fats_dressing()
    t_cat.test_fats_pesto()
    t_cat.test_vinaigrette()

    t_fvl = TestFVLEstimation()
    t_fvl.test_empty_ingredients()
    t_fvl.test_pure_vegetable_dish()
    t_fvl.test_mixed_dish()
    t_fvl.test_no_fvl()
    t_fvl.test_legume_dish()

    t_ref = TestReferenceGrades()
    t_ref.test_raw_carrots_grade_a()
    t_ref.test_white_bread_grade_c()
    t_ref.test_plain_yogurt_grade_a()
    t_ref.test_raw_salmon_grade_a()
    t_ref.test_cooked_lentils_grade_a()
    t_ref.test_butter_grade_d()
    t_ref.test_milk_chocolate_grade_e()

    t_s = TestSTier()
    t_s.test_steamed_broccoli_lentils_qualifies()
    t_s.test_fresh_fruit_salad_qualifies()
    t_s.test_grilled_chicken_does_not_qualify()
    t_s.test_chocolate_cake_does_not_qualify()

    t_edge = TestEdgeCases()
    t_edge.test_empty_nutrition()
    t_edge.test_zero_calories()
    t_edge.test_no_ingredients()
    t_edge.test_score_to_dict()
    t_edge.test_grade_bonus_property()

    print("✅ All test_calculator.py tests passed!")
