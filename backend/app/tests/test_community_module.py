"""
Comprehensive test suite for the CHEF Community Module (Social Feed, Recipe Submissions, Groups & Challenges).
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


class TestCommunityModule(unittest.TestCase):
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

        # Create two test users
        db = self.TestingSessionLocal()
        user1 = User(username="chef_alice", email="alice@example.com", hashed_password=hash_password("Pass1234"))
        user2 = User(username="chef_bob", email="bob@example.com", hashed_password=hash_password("Pass1234"))
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)

        token1 = create_access_token(data={"sub": str(user1.id)})
        token2 = create_access_token(data={"sub": str(user2.id)})
        self.headers_alice = {"Authorization": f"Bearer {token1}"}
        self.headers_bob = {"Authorization": f"Bearer {token2}"}
        self.user1_id = user1.id
        self.user2_id = user2.id
        db.close()

    def tearDown(self):
        Base.metadata.drop_all(bind=self.engine)
        app.dependency_overrides.clear()

    def test_social_feed_flow(self):
        # 1. Alice creates a post
        post_data = {"content": "Check out my high-protein lunch today! #fitlife"}
        resp = self.client.post("/api/community/posts", json=post_data, headers=self.headers_alice)
        self.assertEqual(resp.status_code, 201)
        post_id = resp.json()["id"]

        # 2. Bob views global feed
        resp_feed = self.client.get("/api/community/feed/global", headers=self.headers_bob)
        self.assertEqual(resp_feed.status_code, 200)
        posts = resp_feed.json()
        self.assertTrue(len(posts) >= 1)

        # 3. Bob likes Alice's post
        resp_like = self.client.post(f"/api/community/posts/{post_id}/like", headers=self.headers_bob)
        self.assertEqual(resp_like.status_code, 200)
        self.assertEqual(resp_like.json()["likes_count"], 1)

        # 4. Bob comments on Alice's post
        comment_data = {"content": "Looks delicious! What ingredients did you use?"}
        resp_comm = self.client.post(f"/api/community/posts/{post_id}/comments", json=comment_data, headers=self.headers_bob)
        self.assertEqual(resp_comm.status_code, 201)

        # 5. Bob follows Alice
        resp_follow = self.client.post(f"/api/community/users/{self.user1_id}/follow", headers=self.headers_bob)
        self.assertEqual(resp_follow.status_code, 200)
        self.assertTrue(resp_follow.json()["is_following"])

    def test_recipe_submission_and_scoring(self):
        recipe_data = {
            "title": "Community High-Protein Salmon Salad",
            "summary": "Fresh grilled salmon over greens with lemon olive oil dressing.",
            "ready_in_minutes": 20,
            "servings": 2,
            "ingredients": ["200g Salmon filet", "100g Mixed greens", "1 tbsp Olive oil", "1 Lemon"],
            "instructions": "1. Season salmon. 2. Grill for 4 mins per side. 3. Toss with greens and olive oil.",
            "diets": ["Low Carb", "High Protein"],
            "calories": 450,
            "protein_g": 40,
            "carbs_g": 10,
            "fat_g": 25,
            "fiber_g": 3,
            "sodium_mg": 300,
            "sugar_g": 2,
        }
        resp = self.client.post("/api/community/recipes", json=recipe_data, headers=self.headers_alice)
        self.assertEqual(resp.status_code, 201)
        res_json = resp.json()
        self.assertEqual(res_json["title"], "Community High-Protein Salmon Salad")
        self.assertIsNotNone(res_json["nutri_score_grade"])
        self.assertEqual(res_json["moderation_status"], "approved")

    def test_groups_and_challenges(self):
        # 1. Get groups list
        resp_g = self.client.get("/api/community/groups", headers=self.headers_alice)
        self.assertEqual(resp_g.status_code, 200)
        groups = resp_g.json()
        self.assertTrue(len(groups) >= 1)
        group_id = groups[0]["id"]

        # 2. Join group
        resp_join = self.client.post(f"/api/community/groups/{group_id}/join", headers=self.headers_alice)
        self.assertEqual(resp_join.status_code, 200)
        self.assertTrue(resp_join.json()["is_member"])

        # 3. Get challenges list
        resp_c = self.client.get("/api/community/challenges", headers=self.headers_alice)
        self.assertEqual(resp_c.status_code, 200)
        challenges = resp_c.json()
        self.assertTrue(len(challenges) >= 1)
        ch_id = challenges[0]["id"]

        # 4. Join challenge
        resp_ch_join = self.client.post(f"/api/community/challenges/{ch_id}/join", headers=self.headers_alice)
        self.assertEqual(resp_ch_join.status_code, 200)

        # 5. Check progress
        resp_prog = self.client.get(f"/api/community/challenges/{ch_id}/progress", headers=self.headers_alice)
        self.assertEqual(resp_prog.status_code, 200)
        self.assertIn("current_progress", resp_prog.json())


if __name__ == "__main__":
    unittest.main()
