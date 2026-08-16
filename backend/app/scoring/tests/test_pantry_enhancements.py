import unittest
from datetime import datetime, timezone, timedelta
from app.routers.pantry import (
    normalize_quantity,
    _compute_expiry_status,
    _tokenize_name,
    _clean_recipe_ingredient_line,
    _fallback_parse_grocery_text,
)
from app.models import PantryItem

class TestPantryEnhancements(unittest.TestCase):

    def test_unit_conversions(self):
        # 1 kg to g
        self.assertAlmostEqual(normalize_quantity(1.0, "kg", "g"), 1000.0)
        # 500g to kg
        self.assertAlmostEqual(normalize_quantity(500.0, "g", "kg"), 0.5)
        # 1 liter to ml
        self.assertAlmostEqual(normalize_quantity(1.0, "l", "ml"), 1000.0)
        # 2 tbsp to tsp
        self.assertAlmostEqual(normalize_quantity(2.0, "tbsp", "tsp"), 6.0, places=1)
        # Unknown units return original quantity
        self.assertEqual(normalize_quantity(3.0, "serving", "serving"), 3.0)

    def test_expiry_computation(self):
        now = datetime.now(timezone.utc)
        
        # Fresh item (updated now, 7 days fresh)
        fresh_item = PantryItem(
            id=1,
            user_id=1,
            ingredient_name="Apple",
            quantity=5.0,
            unit="pcs",
            category="Produce",
            location="Fridge",
            days_fresh=7,
            updated_at=now
        )
        status, days = _compute_expiry_status(fresh_item)
        self.assertEqual(status, "fresh")
        self.assertGreaterEqual(days, 6)

        # Expiring soon item (updated 6 days ago, 7 days fresh -> 1 day left)
        expiring_item = PantryItem(
            id=2,
            user_id=1,
            ingredient_name="Milk",
            quantity=1.0,
            unit="l",
            category="Dairy",
            location="Fridge",
            days_fresh=7,
            updated_at=now - timedelta(days=6)
        )
        status, days = _compute_expiry_status(expiring_item)
        self.assertEqual(status, "expiring_soon")
        self.assertLessEqual(days, 3)

        # Expired item (updated 10 days ago, 7 days fresh -> -3 days)
        expired_item = PantryItem(
            id=3,
            user_id=1,
            ingredient_name="Yogurt",
            quantity=1.0,
            unit="pcs",
            category="Dairy",
            location="Fridge",
            days_fresh=7,
            updated_at=now - timedelta(days=10)
        )
        status, days = _compute_expiry_status(expired_item)
        self.assertEqual(status, "expired")
        self.assertLessEqual(days, 0)

    def test_tokenization_and_cleaning(self):
        tokens = _tokenize_name("Organic Free-Range Eggs")
        self.assertIn("egg", tokens)

        tokens_chicken = _tokenize_name("Skinless Chicken Breasts")
        self.assertIn("chicken", tokens_chicken)
        self.assertIn("breast", tokens_chicken)

        cleaned = _clean_recipe_ingredient_line("2 cups chopped fresh spinach")
        self.assertIn("spinach", cleaned)

    def test_fallback_grocery_parser(self):
        raw_text = "2 cartons of milk\n500g chicken breast\n12 eggs\n1 loaf of bread"
        parsed = _fallback_parse_grocery_text(raw_text)
        self.assertGreaterEqual(len(parsed), 4)
        names = [p["ingredient_name"].lower() for p in parsed]
        self.assertTrue(any("milk" in n for n in names))
        self.assertTrue(any("chicken" in n for n in names))
        self.assertTrue(any("egg" in n for n in names))

if __name__ == "__main__":
    unittest.main()
