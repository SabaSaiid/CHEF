"""
Tests for Phase 1 Recipe Reviews & Cooking Tips router and moderation filter using unittest.
"""

import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import User
from app.auth import hash_password, create_access_token


class TestRecipeReviews(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

        def override_get_db():
            db = self.TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

        # Create user and auth headers
        db = self.TestingSessionLocal()
        user = User(
            username="chef_reviewer",
            email="reviewer@example.com",
            hashed_password=hash_password("Password123"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(data={"sub": str(user.id)})
        self.auth_headers = {"Authorization": f"Bearer {token}"}
        db.close()

    def tearDown(self):
        Base.metadata.drop_all(bind=self.engine)
        app.dependency_overrides.clear()

    def test_create_and_get_review(self):
        # 1. Post a review
        review_data = {
            "recipe_id": "rec_test_101",
            "recipe_source": "catalog",
            "rating": 5,
            "review_text": "Sauteing the garlic first makes this taste amazing!",
            "tip_category": "Cooking Technique",
        }
        resp = self.client.post("/api/reviews", json=review_data, headers=self.auth_headers)
        self.assertEqual(resp.status_code, 201)
        res_json = resp.json()
        self.assertEqual(res_json["rating"], 5)
        self.assertEqual(res_json["username"], "chef_reviewer")
        self.assertEqual(res_json["recipe_id"], "rec_test_101")

        # 2. Get reviews list for this recipe
        resp_list = self.client.get("/api/reviews/recipe/rec_test_101?recipe_source=catalog")
        self.assertEqual(resp_list.status_code, 200)
        reviews = resp_list.json()
        self.assertEqual(len(reviews), 1)
        self.assertEqual(reviews[0]["review_text"], "Sauteing the garlic first makes this taste amazing!")

        # 3. Get summary for this recipe
        resp_sum = self.client.get("/api/reviews/summary/rec_test_101?recipe_source=catalog")
        self.assertEqual(resp_sum.status_code, 200)
        summary = resp_sum.json()
        self.assertEqual(summary["average_rating"], 5.0)
        self.assertEqual(summary["total_reviews"], 1)
        self.assertEqual(summary["rating_distribution"]["5"], 1)

    def test_review_moderation(self):
        # Post review containing forbidden profanity
        review_data = {
            "recipe_id": "rec_test_102",
            "recipe_source": "catalog",
            "rating": 1,
            "review_text": "This recipe is total shit and bad",
            "tip_category": "General",
        }
        resp = self.client.post("/api/reviews", json=review_data, headers=self.auth_headers)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("failed moderation", resp.json()["detail"])


if __name__ == "__main__":
    unittest.main()
