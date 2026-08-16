import unittest
from app.routers.nutrition import calculate_custom_recipe_endpoint
from app.schemas import RecipeCalculateRequest, RecipeCalculateIngredientItem


class TestRecipeCustomizerEngine(unittest.TestCase):
    def test_standard_vs_tweaked_protein_and_nutriscore(self):
        # 1. Base recipe: 250g chicken breast, 1 cup curd, 1 tsp salt (2 servings)
        base_req = RecipeCalculateRequest(
            title="Tandoori Chicken Bowl",
            servings=2.0,
            ingredients=[
                "250g chicken breast",
                "1 cup curd",
                "1 tsp salt"
            ]
        )
        base_res = calculate_custom_recipe_endpoint(base_req)
        self.assertAlmostEqual(base_res.per_serving_nutrition.calories, 279.4, delta=5.0)
        self.assertAlmostEqual(base_res.per_serving_nutrition.protein_g, 43.0, delta=3.0)
        self.assertIsNotNone(base_res.nutri_score)
        self.assertIn(base_res.nutri_score.grade, ['A', 'B', 'C', 'D', 'E'])

        # 2. Tweaked recipe: 500g chicken breast, 1.5 cup curd, 0.25 tsp salt (2 servings)
        tweaked_req = RecipeCalculateRequest(
            title="Tandoori Chicken Bowl",
            servings=2.0,
            ingredients=[
                RecipeCalculateIngredientItem(name="chicken breast", qty=500, unit="g"),
                RecipeCalculateIngredientItem(name="curd", qty=1.5, unit="cup"),
                RecipeCalculateIngredientItem(name="salt", qty=0.25, unit="tsp"),
            ]
        )
        tweaked_res = calculate_custom_recipe_endpoint(tweaked_req)
        
        # Protein and calories must increase significantly
        self.assertGreater(tweaked_res.per_serving_nutrition.protein_g, base_res.per_serving_nutrition.protein_g)
        self.assertGreater(tweaked_res.per_serving_nutrition.calories, base_res.per_serving_nutrition.calories)
        
        # Lower salt should result in lower sodium penalties
        self.assertLessEqual(tweaked_res.nutri_score.negative_total, base_res.nutri_score.negative_total)
        
        # Macro percentages should be well-formed and sum to 100
        macros = tweaked_res.macro_percentages
        self.assertEqual(macros["proteinPct"] + macros["carbsPct"] + macros["fatPct"], 100)

    def test_single_serving_scaling(self):
        req = RecipeCalculateRequest(
            title="Spinach Paneer",
            servings=1.0,
            ingredients=["200g paneer", "100g spinach", "1 tbsp olive oil"]
        )
        res = calculate_custom_recipe_endpoint(req)
        self.assertEqual(res.servings, 1.0)
        self.assertGreater(res.per_serving_nutrition.calories, 200)
        self.assertEqual(len(res.ingredient_contributions), 3)


if __name__ == '__main__':
    unittest.main()
