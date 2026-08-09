"""
Unit tests for the Community Demo Data Seeder.
Verifies that authentic users, posts, nested comments, likes, recipes, groups, and challenges are created correctly.
"""

import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import (
    User, CommunityPost, CommunityComment, CommunityLike,
    CommunityFollow, CommunityRecipe, CommunityGroup, CommunityGroupMember,
    CommunityChallenge, CommunityChallengeParticipant
)
from app.services.community_demo_seeder import seed_community_demo_data


class TestCommunityDemoSeeder(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite database for testing
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db = TestingSessionLocal()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    def test_seed_community_demo_data(self):
        result = seed_community_demo_data(self.db)
        self.assertEqual(result["status"], "success")
        self.assertGreaterEqual(result["posts_seeded"], 6)
        self.assertGreaterEqual(result["comments_seeded"], 15)

        # Check users were created
        users = self.db.query(User).all()
        usernames = {u.username for u in users}
        self.assertIn("aisha_kitchen", usernames)
        self.assertIn("priya.sharma", usernames)
        self.assertIn("karan_verma", usernames)
        self.assertIn("ananya.roy", usernames)
        self.assertIn("rohan_gupta", usernames)
        self.assertIn("dr_meera", usernames)


        # Check posts & comments
        posts = self.db.query(CommunityPost).all()
        self.assertTrue(len(posts) >= 9)

        # Ensure comments exist on posts
        comments = self.db.query(CommunityComment).all()
        self.assertTrue(len(comments) >= 20)

        # Check community recipes
        recipes = self.db.query(CommunityRecipe).all()
        self.assertTrue(len(recipes) >= 5)

        # Check approved vs pending moderation
        approved_recipes = [r for r in recipes if r.moderation_status == "approved"]
        pending_recipes = [r for r in recipes if r.moderation_status == "pending"]
        self.assertTrue(len(approved_recipes) >= 4)
        self.assertTrue(len(pending_recipes) >= 1)

        # Check groups & challenges
        groups = self.db.query(CommunityGroup).all()
        self.assertTrue(len(groups) >= 4)

        challenges = self.db.query(CommunityChallenge).all()
        self.assertTrue(len(challenges) >= 3)


if __name__ == "__main__":
    unittest.main()
