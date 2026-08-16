import unittest
from unittest.mock import MagicMock
from app.schemas import (
    NutritionLogCreate,
    NutritionLogUpdate,
    NutritionLogCopyRequest,
    DailyNutritionSummary,
    WaterLogCreate,
)
from app.models import NutritionLog, User
from app.routers.nutrition_tracker import log_food, update_log, copy_day_logs, delete_log


class TestNutritionTrackerBackend(unittest.TestCase):
    def setUp(self):
        self.mock_user = User(id=1, email="test@example.com", username="testuser", target_calories=2000)
        self.mock_db = MagicMock()

    def test_log_food_creation(self):
        req = NutritionLogCreate(
            food_item="Oatmeal with Honey",
            calories=250.0,
            protein_g=8.0,
            carbs_g=45.0,
            fat_g=4.0,
            fiber_g=6.0,
            quantity=1.0,
            unit="bowl",
            meal_slot="Breakfast",
            date="2026-08-16"
        )
        res = log_food(req=req, db=self.mock_db, current_user=self.mock_user)
        self.assertEqual(res.food_item, "Oatmeal with Honey")
        self.assertEqual(res.calories, 250.0)
        self.assertEqual(res.meal_slot, "Breakfast")
        self.assertEqual(res.fiber_g, 6.0)
        self.mock_db.add.assert_called_once()
        self.mock_db.commit.assert_called_once()

    def test_update_food_log(self):
        existing_log = NutritionLog(
            id=10,
            user_id=1,
            food_item="Boiled Egg",
            calories=78.0,
            protein_g=6.0,
            carbs_g=0.6,
            fat_g=5.0,
            fiber_g=0.0,
            quantity=1.0,
            unit="piece",
            meal_slot="Breakfast",
            date="2026-08-16"
        )
        self.mock_db.query.return_value.filter.return_value.first.return_value = existing_log

        update_req = NutritionLogUpdate(
            quantity=2.0,
            calories=156.0,
            protein_g=12.0,
            meal_slot="Lunch"
        )
        updated = update_log(log_id=10, req=update_req, db=self.mock_db, current_user=self.mock_user)
        self.assertEqual(updated.quantity, 2.0)
        self.assertEqual(updated.calories, 156.0)
        self.assertEqual(updated.protein_g, 12.0)
        self.assertEqual(updated.meal_slot, "Lunch")
        self.assertEqual(updated.food_item, "Boiled Egg")  # Unchanged
        self.mock_db.commit.assert_called_once()

    def test_copy_day_logs(self):
        log1 = NutritionLog(
            id=1, user_id=1, food_item="Avocado Toast", calories=250.0,
            protein_g=6.0, carbs_g=28.0, fat_g=14.0, fiber_g=5.0,
            quantity=1.0, unit="slice", meal_slot="Breakfast", date="2026-08-15"
        )
        log2 = NutritionLog(
            id=2, user_id=1, food_item="Grilled Salmon", calories=400.0,
            protein_g=38.0, carbs_g=2.0, fat_g=22.0, fiber_g=0.0,
            quantity=1.0, unit="fillet", meal_slot="Dinner", date="2026-08-15"
        )
        self.mock_db.query.return_value.filter.return_value.all.return_value = [log1, log2]

        copy_req = NutritionLogCopyRequest(
            source_date="2026-08-15",
            target_date="2026-08-16"
        )
        copied = copy_day_logs(req=copy_req, db=self.mock_db, current_user=self.mock_user)
        self.assertEqual(len(copied), 2)
        self.assertEqual(copied[0].date, "2026-08-16")
        self.assertEqual(copied[1].date, "2026-08-16")
        self.assertEqual(self.mock_db.add.call_count, 2)


if __name__ == '__main__':
    unittest.main()
