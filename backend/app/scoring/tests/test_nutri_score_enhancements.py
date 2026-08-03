"""
Unit tests for enhanced Nutri-Score features:
- Tier progression (next_tier, points_to_next_tier)
- Upgrade recommendations generator
- Daily aggregate Nutri-Score computation
"""

import unittest
from app.scoring.calculator import (
    compute_nutri_score,
    compute_daily_nutri_score,
    NutriScoreResult,
)

class TestNutriScoreEnhancements(unittest.TestCase):

    def test_nutri_score_upgrade_recommendations(self):
        # Recipe high in sodium and low in fiber (e.g., Grade C or D)
        nutrition = {
            "calories": 450,
            "protein_g": 12,
            "carbs_g": 50,
            "fat_g": 20,
            "saturated_fat_g": 6.0,
            "sugar_g": 10.0,
            "sodium_mg": 850.0,
            "fiber_g": 1.0,
        }
        ingredients = ["processed noodles", "salt", "palm oil", "flavoring"]
        
        result = compute_nutri_score(nutrition, ingredients)
        
        self.assertIsInstance(result, NutriScoreResult)
        self.assertIsNotNone(result.next_tier)
        self.assertGreaterEqual(result.points_to_next_tier, 1)
        self.assertGreater(len(result.upgrade_recommendations), 0)
        recs_text = " ".join(result.upgrade_recommendations).lower()
        self.assertTrue(any(k in recs_text for k in ["sodium", "saturated fat", "fiber"]))

    def test_s_tier_recommendation(self):
        # Superior clean recipe (Grade S)
        nutrition = {
            "calories": 120,
            "protein_g": 8.0,
            "carbs_g": 15.0,
            "fat_g": 1.5,
            "saturated_fat_g": 0.2,
            "sugar_g": 2.0,
            "sodium_mg": 50.0,
            "fiber_g": 6.0,
        }
        ingredients = ["spinach", "kale", "chickpeas", "lemon juice", "olive oil"]
        
        result = compute_nutri_score(nutrition, ingredients)
        self.assertEqual(result.grade, "S")
        self.assertIsNone(result.next_tier)
        self.assertEqual(result.points_to_next_tier, 0)
        self.assertIn("Superior", result.upgrade_recommendations[0])

    def test_daily_nutri_score_aggregation(self):
        meal_1 = compute_nutri_score(
            {"calories": 250, "protein_g": 12, "carbs_g": 30, "fat_g": 4, "saturated_fat_g": 0.5, "sugar_g": 2, "sodium_mg": 120, "fiber_g": 5},
            ["oats", "chia seeds", "berries"]
        ).to_dict()

        meal_2 = compute_nutri_score(
            {"calories": 400, "protein_g": 25, "carbs_g": 40, "fat_g": 8, "saturated_fat_g": 1.2, "sugar_g": 4, "sodium_mg": 300, "fiber_g": 6},
            ["grilled chicken", "brown rice", "broccoli"]
        ).to_dict()

        daily_summary = compute_daily_nutri_score([meal_1, meal_2])

        self.assertIn("grade", daily_summary)
        self.assertEqual(daily_summary["meal_count"], 2)
        self.assertIn(daily_summary["grade"], ["S", "A", "B"])


if __name__ == "__main__":
    unittest.main()
