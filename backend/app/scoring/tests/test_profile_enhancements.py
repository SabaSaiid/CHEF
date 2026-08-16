"""
Unit tests for Profile enhancements, Adaptive TDEE status, and Weight summary / log management.
"""

import sys
import unittest
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Ensure backend root is in path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import User, UserProfile, WeightLog, NutritionLog
from app.auth import hash_password, create_access_token

# Setup in-memory test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


class TestProfileEnhancements(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.client = TestClient(app)

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)

    def _create_user(self, username="testchef", email="testchef@example.com"):
        db = TestingSessionLocal()
        user = User(
            username=username,
            email=email,
            hashed_password=hash_password("password123"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_access_token(data={"sub": str(user.id)})
        db.close()
        return user, {"Authorization": f"Bearer {token}"}

    def test_adaptive_tdee_status_empty(self):
        user, headers = self._create_user("chef_status1", "chef_status1@example.com")
        response = self.client.get("/api/tdee/adaptive/status", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["nutrition_days_count"], 0)
        self.assertEqual(data["weight_days_count"], 0)
        self.assertFalse(data["is_ready"])
        self.assertEqual(data["days_needed_nutrition"], 7)
        self.assertEqual(data["days_needed_weight"], 7)

    def test_adaptive_tdee_status_with_logs(self):
        user, headers = self._create_user("chef_status2", "chef_status2@example.com")
        db = TestingSessionLocal()
        today = datetime.now(timezone.utc).date()
        for i in range(8):
            d_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            db.add(NutritionLog(
                user_id=user.id,
                food_item="Oats & Berries",
                calories=400,
                protein_g=20,
                carbs_g=60,
                fat_g=8,
                date=d_str
            ))
            db.add(WeightLog(
                user_id=user.id,
                weight_kg=75.0 - (i * 0.1),
                date=d_str
            ))
        db.commit()
        db.close()

        response = self.client.get("/api/tdee/adaptive/status", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["nutrition_days_count"], 8)
        self.assertEqual(data["weight_days_count"], 8)
        self.assertTrue(data["is_ready"])
        self.assertEqual(data["days_needed_nutrition"], 0)
        self.assertEqual(data["days_needed_weight"], 0)

    def test_weight_logging_summary_and_delete(self):
        user, headers = self._create_user("chef_weight", "chef_weight@example.com")

        # 1. Log multiple weights
        r1 = self.client.post("/api/weight/log", json={"weight_kg": 76.5, "date": "2026-08-01"}, headers=headers)
        self.assertEqual(r1.status_code, 200)
        log_id1 = r1.json()["id"]

        r2 = self.client.post("/api/weight/log", json={"weight_kg": 75.0, "date": "2026-08-10"}, headers=headers)
        self.assertEqual(r2.status_code, 200)

        # 2. Get summary
        sum_resp = self.client.get("/api/weight/summary", headers=headers)
        self.assertEqual(sum_resp.status_code, 200)
        s_data = sum_resp.json()
        self.assertEqual(s_data["total_logs"], 2)
        self.assertEqual(s_data["current_weight"], 75.0)
        self.assertEqual(s_data["highest_weight"], 76.5)
        self.assertEqual(s_data["lowest_weight"], 75.0)

        # 3. Delete first log
        del_resp = self.client.delete(f"/api/weight/logs/{log_id1}", headers=headers)
        self.assertEqual(del_resp.status_code, 204)

        # 4. Verify log was deleted
        sum_resp2 = self.client.get("/api/weight/summary", headers=headers)
        self.assertEqual(sum_resp2.status_code, 200)
        self.assertEqual(sum_resp2.json()["total_logs"], 1)


if __name__ == "__main__":
    unittest.main()
