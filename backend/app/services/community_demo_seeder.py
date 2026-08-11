"""
Authentic Community Demo Data Seeder for CHEF.
Seeds realistic users, posts, multi-turn comments, likes, follows, user recipes, groups, and challenges.
"""

from datetime import datetime, timezone, timedelta
import json
from sqlalchemy.orm import Session

from app.models import (
    User, UserProfile,
    CommunityPost, CommunityComment, CommunityLike, CommunityFollow,
    CommunityRecipe, CommunityGroup, CommunityGroupMember,
    CommunityChallenge, CommunityChallengeParticipant
)
from app.auth import hash_password

# List of realistic demo usernames created by the seeder
DEMO_USERNAMES = [
    "ZamZam",
    "aisha_kitchen",
    "aaradhya_t",
    "ashgar_ali",
    "ali_cooks",
    "shubham_v",
    "zaid_fit",
    "neel_bites",
    "vikas_k",
    "nishant_m",
    "ayushman_d",
    "priya.sharma",
    "karan_verma",
    "ananya.roy",
    "rohan_gupta",
    "dr_meera",
]

def _verify_and_migrate_community_tables(db: Session):
    """Ensure missing columns in existing database tables (SQLite, PostgreSQL, etc.) are added seamlessly."""
    try:
        from sqlalchemy import inspect, text
        bind = db.get_bind()
        inspector = inspect(bind)
        if inspector.has_table("community_posts"):
            cols = [c['name'] for c in inspector.get_columns("community_posts")]
            if "shared_meal_plan" not in cols:
                db.execute(text("ALTER TABLE community_posts ADD COLUMN shared_meal_plan TEXT"))
            if "group_id" not in cols:
                db.execute(text("ALTER TABLE community_posts ADD COLUMN group_id INTEGER"))
            if "recipe_id" not in cols:
                db.execute(text("ALTER TABLE community_posts ADD COLUMN recipe_id VARCHAR(255)"))
            if "recipe_source" not in cols:
                db.execute(text("ALTER TABLE community_posts ADD COLUMN recipe_source VARCHAR(50)"))
            db.commit()
    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger("chef.seeder").warning("Community table migration check: %s", e)


def seed_community_demo_data(db: Session) -> dict:
    """
    Populates authentic, realistic community posts, comments, likes, user-submitted recipes,
    interest groups, and habit challenges.
    """
    # Ensure all database tables exist and missing columns are added
    from app.database import Base, engine
    Base.metadata.create_all(bind=engine)
    _verify_and_migrate_community_tables(db)

    now = datetime.now(timezone.utc)

    # ── 1. Create or fetch Demo Users ─────────────────────────────────
    user_map = {}
    
    user_definitions = [
        {"username": "ZamZam", "email": "zamzam@demo.chef", "display_name": "ZamZam", "diet": "high-protein"},
        {"username": "aisha_kitchen", "email": "aisha@demo.chef", "display_name": "Aisha Khan", "diet": "non-vegetarian"},
        {"username": "aaradhya_t", "email": "aaradhya@demo.chef", "display_name": "Aaradhya Tiwari", "diet": "vegetarian"},
        {"username": "ashgar_ali", "email": "ashgar@demo.chef", "display_name": "Ashgar Ali", "diet": "non-vegetarian"},
        {"username": "ali_cooks", "email": "ali@demo.chef", "display_name": "Ali Raza", "diet": "non-vegetarian"},
        {"username": "shubham_v", "email": "shubham@demo.chef", "display_name": "Shubham Verma", "diet": "high-protein"},
        {"username": "zaid_fit", "email": "zaid@demo.chef", "display_name": "Zaid Sheikh", "diet": "high-protein"},
        {"username": "neel_bites", "email": "neel@demo.chef", "display_name": "Neel Sharma", "diet": "vegetarian"},
        {"username": "vikas_k", "email": "vikas@demo.chef", "display_name": "Vikas Kumar", "diet": "non-vegetarian"},
        {"username": "nishant_m", "email": "nishant@demo.chef", "display_name": "Nishant Mishra", "diet": "vegetarian"},
        {"username": "ayushman_d", "email": "ayushman@demo.chef", "display_name": "Ayushman Dutt", "diet": "non-vegetarian"},
        {"username": "priya.sharma", "email": "priya@demo.chef", "display_name": "Priya Sharma", "diet": "vegetarian"},
        {"username": "karan_verma", "email": "karan@demo.chef", "display_name": "Karan Verma", "diet": "high-protein"},
        {"username": "ananya.roy", "email": "ananya@demo.chef", "display_name": "Ananya Roy", "diet": "vegetarian"},
        {"username": "rohan_gupta", "email": "rohan@demo.chef", "display_name": "Rohan Gupta", "diet": "non-vegetarian"},
        {"username": "dr_meera", "email": "meera@demo.chef", "display_name": "Dr. Meera Nambiar", "diet": "vegetarian"},
    ]

    for udef in user_definitions:
        u = db.query(User).filter((User.username == udef["username"]) | (User.email == udef["email"])).first()
        if not u:
            u = User(
                username=udef["username"],
                email=udef["email"],
                hashed_password=hash_password("demo123"),
            )
            db.add(u)
            db.flush()
        else:
            u.username = udef["username"]
            u.email = udef["email"]

        # Ensure user profile exists and display_name is updated
        prof = db.query(UserProfile).filter(UserProfile.user_id == u.id).first()
        if not prof:
            prof = UserProfile(
                user_id=u.id,
                profile_name=f"{udef['username']} Profile",
                display_name=udef["display_name"],
                diet_type=udef["diet"],
                is_active=True,
            )
            db.add(prof)
        else:
            prof.display_name = udef["display_name"]
            prof.diet_type = udef["diet"]

        db.flush()
        user_map[udef["username"]] = u

    demo_user_ids = [u.id for u in user_map.values()]

    # ── 2. Clear old demo community data ──────────────────────────────
    # Also clean up posts from *any* stale @demo.chef user not in current seeder
    all_demo_users = db.query(User).filter(User.email.like("%@demo.chef")).all()
    all_demo_user_ids = [u.id for u in all_demo_users]

    if all_demo_user_ids:
        old_posts = db.query(CommunityPost).filter(CommunityPost.user_id.in_(all_demo_user_ids)).all()
        old_post_ids = [p.id for p in old_posts]
        if old_post_ids:
            db.query(CommunityComment).filter(CommunityComment.post_id.in_(old_post_ids)).delete(synchronize_session=False)
            db.query(CommunityLike).filter(CommunityLike.post_id.in_(old_post_ids)).delete(synchronize_session=False)
            db.query(CommunityPost).filter(CommunityPost.id.in_(old_post_ids)).delete(synchronize_session=False)

        db.query(CommunityFollow).filter(
            (CommunityFollow.follower_id.in_(all_demo_user_ids)) | (CommunityFollow.following_id.in_(all_demo_user_ids))
        ).delete(synchronize_session=False)

        db.query(CommunityRecipe).filter(CommunityRecipe.submitter_id.in_(all_demo_user_ids)).delete(synchronize_session=False)
        db.query(CommunityGroupMember).filter(CommunityGroupMember.user_id.in_(all_demo_user_ids)).delete(synchronize_session=False)
        db.query(CommunityChallengeParticipant).filter(CommunityChallengeParticipant.user_id.in_(all_demo_user_ids)).delete(synchronize_session=False)
    db.flush()


    # ── 3. Seed Follow Relationships ─────────────────────────────────
    follows = [
        ("aisha_kitchen", "priya.sharma"),
        ("aisha_kitchen", "karan_verma"),
        ("aisha_kitchen", "dr_meera"),
        ("aisha_kitchen", "aaradhya_t"),
        ("aisha_kitchen", "ali_cooks"),
        ("karan_verma", "aisha_kitchen"),
        ("karan_verma", "zaid_fit"),
        ("priya.sharma", "ananya.roy"),
        ("priya.sharma", "aaradhya_t"),
        ("rohan_gupta", "priya.sharma"),
        ("rohan_gupta", "karan_verma"),
        ("aaradhya_t", "neel_bites"),
        ("shubham_v", "zaid_fit"),
        ("ashgar_ali", "ali_cooks"),
        ("vikas_k", "shubham_v"),
        ("ayushman_d", "ali_cooks"),
    ]
    for follower, following in follows:
        if follower in user_map and following in user_map:
            db.add(CommunityFollow(
                follower_id=user_map[follower].id,
                following_id=user_map[following].id,
                created_at=now - timedelta(days=2)
            ))
    db.flush()

    # ── 4. Seed Culinary Groups ──────────────────────────────────────
    groups_def = [
        {
            "name": "High-Protein Beginners",
            "slug": "high-protein-beginners",
            "description": "Community for sharing meal ideas, recipes, and tips for muscle building and high-protein eating.",
            "category": "Goal",
            "creator": "karan_verma",
        },
        {
            "name": "Diabetic-Friendly Cooking",
            "slug": "diabetic-friendly-cooking",
            "description": "Low-glycemic, blood-sugar conscious recipes and supportive meal planning tips.",
            "category": "Diet",
            "creator": "dr_meera",
        },
        {
            "name": "Mediterranean Lifestyle",
            "slug": "mediterranean-lifestyle",
            "description": "Celebrating heart-healthy olive oil, fresh veggies, lean fish, and vibrant Mediterranean dishes.",
            "category": "Cuisine",
            "creator": "priya.sharma",
        },
        {
            "name": "Desi Meal Preppers",
            "slug": "desi-meal-preppers",
            "description": "Mastering batch cooking, curry bases, and meal prep strategies tailored for Indian kitchens.",
            "category": "Lifestyle",
            "creator": "karan_verma",
        },
    ]

    group_map = {}
    for gdef in groups_def:
        grp = db.query(CommunityGroup).filter(CommunityGroup.slug == gdef["slug"]).first()
        creator = user_map.get(gdef["creator"])
        creator_id = creator.id if creator else None
        if not grp:
            grp = CommunityGroup(
                name=gdef["name"],
                slug=gdef["slug"],
                description=gdef["description"],
                category=gdef["category"],
                creator_id=creator_id,
                members_count=8,
            )
            db.add(grp)
            db.flush()
        else:
            grp.members_count = max(8, grp.members_count)
        group_map[gdef["slug"]] = grp

    # Add Group Memberships
    for grp in group_map.values():
        for uname in ["aisha_kitchen", "priya.sharma", "karan_verma", "rohan_gupta", "aaradhya_t", "shubham_v", "zaid_fit", "ali_cooks", "vikas_k"]:
            if uname in user_map:
                existing = db.query(CommunityGroupMember).filter(
                    CommunityGroupMember.group_id == grp.id,
                    CommunityGroupMember.user_id == user_map[uname].id
                ).first()
                if not existing:
                    db.add(CommunityGroupMember(
                        group_id=grp.id,
                        user_id=user_map[uname].id,
                        joined_at=now - timedelta(days=5)
                    ))
    db.flush()

    # ── 5. Seed Habit & Nutrition Challenges ─────────────────────────
    today_str = now.strftime("%Y-%m-%d")
    challenges_def = [
        {
            "title": "7-Day High-Protein Challenge",
            "description": "Hit your daily protein target for 5 out of 7 days this week!",
            "metric_type": "protein_target_days",
            "target_value": 5.0,
            "duration_days": 7,
            "badge_icon": "🥩",
        },
        {
            "title": "Nutri-Score A/B Streak",
            "description": "Log at least 5 meals rated A or B on Nutri-Score.",
            "metric_type": "nutri_score_count",
            "target_value": 5.0,
            "duration_days": 7,
            "badge_icon": "🥗",
        },
        {
            "title": "Hydration Hero",
            "description": "Reach your target daily water intake for 3 consecutive days.",
            "metric_type": "water_target_days",
            "target_value": 3.0,
            "duration_days": 7,
            "badge_icon": "💧",
        },
    ]

    challenge_map = {}
    for cdef in challenges_def:
        ch = db.query(CommunityChallenge).filter(CommunityChallenge.title == cdef["title"]).first()
        if not ch:
            ch = CommunityChallenge(
                title=cdef["title"],
                description=cdef["description"],
                metric_type=cdef["metric_type"],
                target_value=cdef["target_value"],
                duration_days=cdef["duration_days"],
                start_date=today_str,
                end_date="2026-12-31",
                badge_icon=cdef["badge_icon"],
            )
            db.add(ch)
            db.flush()
        challenge_map[cdef["title"]] = ch

    # Add Challenge Participants
    ch_protein = challenge_map.get("7-Day High-Protein Challenge")
    if ch_protein:
        db.add(CommunityChallengeParticipant(
            challenge_id=ch_protein.id,
            user_id=user_map["aisha_kitchen"].id,
            current_progress=4.0,
            is_completed=False,
            joined_at=now - timedelta(days=4),
        ))
        db.add(CommunityChallengeParticipant(
            challenge_id=ch_protein.id,
            user_id=user_map["karan_verma"].id,
            current_progress=5.0,
            is_completed=True,
            joined_at=now - timedelta(days=6),
            completed_at=now - timedelta(hours=12),
        ))
        db.add(CommunityChallengeParticipant(
            challenge_id=ch_protein.id,
            user_id=user_map["vikas_k"].id,
            current_progress=5.0,
            is_completed=True,
            joined_at=now - timedelta(days=6),
            completed_at=now - timedelta(hours=4),
        ))

    ch_nutri = challenge_map.get("Nutri-Score A/B Streak")
    if ch_nutri:
        db.add(CommunityChallengeParticipant(
            challenge_id=ch_nutri.id,
            user_id=user_map["priya.sharma"].id,
            current_progress=5.0,
            is_completed=True,
            joined_at=now - timedelta(days=5),
            completed_at=now - timedelta(hours=18),
        ))
        db.add(CommunityChallengeParticipant(
            challenge_id=ch_nutri.id,
            user_id=user_map["aaradhya_t"].id,
            current_progress=4.0,
            is_completed=False,
            joined_at=now - timedelta(days=3),
        ))

    ch_water = challenge_map.get("Hydration Hero")
    if ch_water:
        db.add(CommunityChallengeParticipant(
            challenge_id=ch_water.id,
            user_id=user_map["aisha_kitchen"].id,
            current_progress=2.0,
            is_completed=False,
            joined_at=now - timedelta(days=3),
        ))
        db.add(CommunityChallengeParticipant(
            challenge_id=ch_water.id,
            user_id=user_map["shubham_v"].id,
            current_progress=3.0,
            is_completed=True,
            joined_at=now - timedelta(days=4),
            completed_at=now - timedelta(hours=2),
        ))

    db.flush()

    # ── 6. Seed Global & Group Feed Posts with Authentic Conversations ─────

    posts_data = [
        {
            "username": "ZamZam",
            "content": "Has anyone tried fermenting home-made Sattu or Millet batter with probiotic yogurt for lower anti-nutrients & better gut absorption? 🧪 What’s your experience?",
            "image_url": None,  # Question post — no image needed
            "created_at": now - timedelta(hours=2),
            "group_slug": None,
            "likes": ["dr_meera", "priya.sharma", "aaradhya_t", "zaid_fit", "aisha_kitchen"],
            "comments": [
                ("dr_meera", "Fascinating experiment @ZamZam! Fermentation degrades phytic acid in millets/sattu by up to 60%, drastically improving iron & zinc bioavailability."),
                ("aaradhya_t", "In Bihar, traditional Sattu Ghol is left in clay pots overnight for mild natural fermentation during hot summers! It turns super gut-friendly."),
                ("priya.sharma", "I do 12-hour fermentation for Ragi & Besan cheela batter with curd. It gets super airy, fluffy, and way easier to digest!"),
                ("ZamZam", "@dr_meera That 60% phytic acid reduction figure is amazing! Definitely letting my batter sit overnight tonight."),
            ]
        },
        {
            "username": "aaradhya_t",
            "content": "Tried making Bihari Sattu Drink with roasted cumin, green chili, and fresh mint for post-workout hydration! 🥤\n\n18g plant protein, super refreshing, and costs under ₹30. Perfect desi protein shake for North Indian summers!",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/5/54/Sattu_Ghol.jpg",
            "created_at": now - timedelta(hours=4),
            "group_slug": None,
            "likes": ["ashgar_ali", "shubham_v", "neel_bites", "aisha_kitchen", "priya.sharma"],
            "comments": [
                ("ashgar_ali", "Sattu drink with chilled buttermilk (chaas) is my absolute favorite! Do you add black salt or regular salt?"),
                ("aaradhya_t", "@ashgar_ali Black salt + roasted cumin powder! Gives it that authentic street flavor."),
                ("shubham_v", "Tried this right after leg day. Much lighter on stomach than whey protein powder!"),
                ("neel_bites", "Adding lemon juice and rock salt makes it taste like Jaljeera. Loved it!"),
            ]
        },
        {
            "username": "ali_cooks",
            "content": "Weekend Special: Slow-cooked Mutton Yakhni Pulao using controlled ghee and whole spices! 🍲\n\nGot 36g protein per serving with half the fat of regular biryani. Hit 2,100 kcal target cleanly today!",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/5/53/Punjabi_Yakhni_Pulao.jpg",
            "created_at": now - timedelta(hours=8),
            "group_slug": None,
            "likes": ["zaid_fit", "ayushman_d", "ashgar_ali", "vikas_k"],
            "comments": [
                ("zaid_fit", "Yakhni broth is rich in collagen and protein! What cut of meat did you use?"),
                ("ali_cooks", "@zaid_fit Lean shank portion with marrow bones! Slow simmered for 2 hours."),
                ("ayushman_d", "Looks restaurant quality Ali! Did you track this using CHEF's AI scanner?"),
                ("ali_cooks", "@ayushman_d Yes! Scanned the plate and it estimated the macros surprisingly accurately."),
            ]
        },
        {
            "username": "zaid_fit",
            "content": "Pushing for 130g protein daily on a budget! 💪 Here is my daily staple:\n\n6 Egg Whites + 2 Whole Eggs + 50g Paneer Scramble + 1 bowl Soya Chunks Curry. Total cost: ~₹90/day!",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/0/06/Spicy_egg_bhurji_%40_the_eggfactory.jpg",
            "created_at": now - timedelta(hours=12),
            "group_slug": None,
            "likes": ["vikas_k", "nishant_m", "shubham_v", "karan_verma"],
            "comments": [
                ("vikas_k", "Soya chunks are unmatched for budget protein. 52g protein per 100g dry weight is crazy value!"),
                ("nishant_m", "How do you remove the raw smell from soya chunks?"),
                ("zaid_fit", "@nishant_m Boil them in salted water for 5 mins, squeeze out the water completely 2-3 times, then sauté with garlic paste before adding gravy!"),
                ("shubham_v", "Great tip Zaid! Doing this for my meal prep tonight."),
            ]
        },
        {
            "username": "shubham_v",
            "content": "Swapped white bread for Oats & Besan Cheela stuffed with paneer for breakfast! 🥞\n\nHit 24g protein before 9 AM. Fiber content keeps me full till 2 PM without mid-morning snack cravings.",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/5/5d/Besan_chilla.jpg",
            "created_at": now - timedelta(days=1),
            "group_slug": None,
            "likes": ["aaradhya_t", "ayushman_d", "priya.sharma", "neel_bites"],
            "comments": [
                ("aaradhya_t", "Besan cheela is a North Indian classic! Adding grated carrots and green chilies takes it to next level."),
                ("ayushman_d", "What is the carb to protein ratio in this?"),
                ("shubham_v", "@ayushman_d Roughly 1.5:1 (32g carbs, 24g protein). Super balanced!"),
            ]
        },
        {
            "username": "neel_bites",
            "content": "Healthy Snack Hack: Air-fried Crispy Makhana (Fox Nuts) with a dash of ghee, turmeric, and black pepper! 🥣\n\nHigh in antioxidants, low calories (140 kcal), and way better than potato chips.",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/0/03/Roasted_and_spiced_Foxnuts_%28Phool_Makhana%29.jpg",
            "created_at": now - timedelta(days=1, hours=6),
            "group_slug": None,
            "likes": ["nishant_m", "priya.sharma", "aaradhya_t", "dr_meera"],
            "comments": [
                ("nishant_m", "Makhana with chai in the evening is the best guilt-free combo."),
                ("priya.sharma", "Black pepper enhances curcumin absorption from turmeric! Great combo Neel."),
                ("neel_bites", "@priya.sharma Thanks Priya! Learned that tip from Dr. Meera's post."),
            ]
        },
        {
            "username": "vikas_k",
            "content": "Hit a new personal record: 10,000 steps + 120g protein target achieved for 6 consecutive days! 🏃‍♂️ Consistency with CHEF meal planner has been game changing.",
            "image_url": None,  # Achievement/motivation post — no specific food photo
            "created_at": now - timedelta(days=2),
            "group_slug": None,
            "likes": ["zaid_fit", "ashgar_ali", "shubham_v", "aisha_kitchen"],
            "comments": [
                ("zaid_fit", "Keep grinding Vikas! 💪 6 day streak is huge."),
                ("ashgar_ali", "Consistency is key! Are you doing the 7-Day High-Protein Challenge?"),
                ("vikas_k", "@ashgar_ali Yes! On day 6 right now, finishing strong tomorrow."),
            ]
        },
        {
            "username": "priya.sharma",
            "content": "Hit 112g protein today with purely vegetarian Indian meals! 🌱 High-protein Palak Paneer with Sattu Roti + Greek Yogurt. Swipe for macros breakdown!\n\n🔥 Cal: 1,820 | P: 112g | C: 190g | F: 62g | Fiber: 34g\n\nWhat's your go-to veg protein hack for hitting daily targets?",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/b/b7/Palakpaneer_Rayagada_Odisha_0009.jpg",
            "created_at": now - timedelta(days=2, hours=4),
            "group_slug": None,
            "likes": ["karan_verma", "aisha_kitchen", "rohan_gupta", "dr_meera", "ananya.roy"],
            "comments": [
                ("karan_verma", "Sattu roti is such an underrated protein source! Do you mix it with regular wheat flour or pure sattu?"),
                ("priya.sharma", "@karan_verma I use a 50:50 ratio of whole wheat and Chana Sattu. Keeps the rotis soft and adds ~8g protein per roti!"),
                ("aisha_kitchen", "Tried this today and it was amazing! Thanks for sharing Priya 🙌"),
            ]
        },
        {
            "username": "karan_verma",
            "content": "Sunday Prep Complete! 🍱 Packed 5 days of Tandoori Chicken Breast + Quinoa + Roasted Broccoli & Peppers.\n\n📊 450 kcal & 42g protein per meal box. Prepping on Sunday saves me from mid-week takeout temptations!",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/e/e1/Chickentandoori.jpg",
            "created_at": now - timedelta(days=3),
            "group_slug": None,
            "likes": ["aisha_kitchen", "priya.sharma", "rohan_gupta", "ananya.roy"],
            "comments": [
                ("ananya.roy", "That tandoori marinade looks incredible! What spices do you use?"),
                ("karan_verma", "@ananya.roy Hung curd, Kashmiri red chili, garam masala, ginger-garlic paste, and lemon juice. Marinate overnight for best flavor!"),
            ]
        },

        # ── Group-Specific Posts ───────────────────────────────────────
        {
            "username": "nishant_m",
            "content": "What is everyone's go-to vegetarian post-workout meal when you don't want whey protein?",
            "image_url": None,
            "created_at": now - timedelta(days=1, hours=2),
            "group_slug": "high-protein-beginners",
            "likes": ["aaradhya_t", "neel_bites", "shubham_v"],
            "comments": [
                ("aaradhya_t", "Sattu buttermilk or Paneer bhurji with 2 multigrain rotis!"),
                ("neel_bites", "Sprouted moong & makhana chaat + 200g Greek curd."),
                ("shubham_v", "Soya chunk bhurji with roasted chana!"),
            ]
        },
        {
            "username": "ayushman_d",
            "content": "Tips for storing cooked brown rice and quinoa for 5-day meal preps without getting dry?",
            "image_url": None,
            "created_at": now - timedelta(days=1, hours=10),
            "group_slug": "desi-meal-preppers",
            "likes": ["ali_cooks", "karan_verma", "ashgar_ali"],
            "comments": [
                ("ali_cooks", "Sprinkle a few drops of water before microwaving, and keep lid loosely covered!"),
                ("karan_verma", "Store in airtight glass containers instead of thin plastic tubs. Keeps moisture locked in."),
            ]
        },
        {
            "username": "dr_meera",
            "content": "Replacing refined wheat flour with an Oats & Besan blend for lower post-prandial blood sugar spikes 💡",
            "image_url": None,
            "created_at": now - timedelta(days=2, hours=2),
            "group_slug": "diabetic-friendly-cooking",
            "likes": ["ananya.roy", "aisha_kitchen", "aaradhya_t"],
            "comments": [
                ("ananya.roy", "Works great for parathas! 70% besan + 30% oat flour has a very low glycemic index."),
                ("aisha_kitchen", "My dad has Type 2 diabetes, definitely sharing this recipe with him!"),
            ]
        },
    ]

    inserted_posts_count = 0
    inserted_comments_count = 0

    for pdata in posts_data:
        author = user_map.get(pdata["username"])
        if not author:
            continue
            
        group_id = None
        if pdata["group_slug"] and pdata["group_slug"] in group_map:
            group_id = group_map[pdata["group_slug"]].id

        post = CommunityPost(
            user_id=author.id,
            content=pdata["content"],
            image_url=pdata["image_url"],
            group_id=group_id,
            likes_count=len(pdata["likes"]),
            comments_count=len(pdata["comments"]),
            created_at=pdata["created_at"],
        )
        db.add(post)
        db.flush()
        inserted_posts_count += 1

        # Seed Likes
        for liker_name in pdata["likes"]:
            liker = user_map.get(liker_name)
            if liker:
                db.add(CommunityLike(
                    post_id=post.id,
                    user_id=liker.id,
                    created_at=pdata["created_at"] + timedelta(minutes=10)
                ))

        # Seed Comments
        c_time = pdata["created_at"]
        for c_username, c_text in pdata["comments"]:
            c_author = user_map.get(c_username)
            if c_author:
                c_time += timedelta(minutes=15)
                db.add(CommunityComment(
                    post_id=post.id,
                    user_id=c_author.id,
                    content=c_text,
                    created_at=c_time,
                ))
                inserted_comments_count += 1

    db.flush()

    # ── 7. Seed User-Submitted Community Recipes ─────────────────────
    community_recipes_data = [
        {
            "submitter": "aaradhya_t",
            "title": "Desi Sattu Coolant & Protein Shake",
            "summary": "Refreshing Bihar-style chana sattu drink spiced with roasted cumin, mint leaves, black salt, and lemon juice. 18g plant protein!",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/5/54/Sattu_Ghol.jpg",
            "ready_in_minutes": 5,
            "servings": 1,
            "ingredients": json.dumps(["4 tbsp Roasted Chana Sattu", "1 glass Chilled Water or Chaas", "1/2 tsp Roasted Cumin Powder", "1/2 tsp Black Salt", "1 tbsp Lemon Juice", "Fresh Mint leaves"]),
            "instructions": "1. Add chana sattu, black salt, and roasted cumin powder to a glass.\n2. Pour in chilled water or buttermilk.\n3. Stir vigorously till smooth and lump-free.\n4. Garnish with chopped mint leaves and lemon juice. Serve chilled!",
            "diets": "Vegetarian, Vegan, High-Protein",
            "meal_type": "Snack",
            "region": "North Indian / Bihari",
            "calories": 210.0,
            "protein_g": 18.0,
            "carbs_g": 28.0,
            "fat_g": 3.5,
            "fiber_g": 7.0,
            "nutri_score_grade": "A",
            "moderation_status": "approved",
        },
        {
            "submitter": "ali_cooks",
            "title": "Slow-Cooked Mutton Yakhni Pulao",
            "summary": "Fragrant Kashmiri-style mutton pulao simmered in whole spice bone broth with lean meat cuts.",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/5/53/Punjabi_Yakhni_Pulao.jpg",
            "ready_in_minutes": 50,
            "servings": 4,
            "ingredients": json.dumps(["500g Lean Mutton Shanks", "2 cups Basmati Rice soaked", "1 cup Curd", "2 tbsp Ghee", "Whole Spices (fennel, cloves, cardamom, cinnamon)", "2 Onions sliced"]),
            "instructions": "1. Simmer mutton shanks with whole spices and 4 cups water for 40 mins to prepare Yakhni broth.\n2. Sauté onions in ghee until golden, add curd and strained mutton.\n3. Add rice and Yakhni broth, cook covered on low flame for 15 minutes till fluffy.",
            "diets": "High-Protein, Gluten-Free",
            "meal_type": "Dinner",
            "region": "North Indian / Kashmiri",
            "calories": 520.0,
            "protein_g": 36.0,
            "carbs_g": 48.0,
            "fat_g": 18.0,
            "fiber_g": 3.0,
            "nutri_score_grade": "B",
            "moderation_status": "approved",
        },
        {
            "submitter": "zaid_fit",
            "title": "High-Protein Soya Chunks & Egg Bhurji",
            "summary": "Budget-friendly 35g protein scramble made with boiled soya chunks, egg whites, and onion-tomato masala.",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/0/06/Spicy_egg_bhurji_%40_the_eggfactory.jpg",
            "ready_in_minutes": 15,
            "servings": 1,
            "ingredients": json.dumps(["50g Soya Chunks boiled & squeezed", "4 Egg Whites + 1 Whole Egg", "1 Onion finely chopped", "1 Tomato diced", "1 Green chili", "1 tsp Oil", "Turmeric & Chili powder"]),
            "instructions": "1. Coarsely mince boiled soya chunks.\n2. Sauté onion, green chili, and tomato in oil with spices.\n3. Add soya chunks and whisked egg whites/whole egg.\n4. Scramble on high heat for 3 mins until dry and cooked. Serve hot!",
            "diets": "High-Protein, Low-Carb",
            "meal_type": "Breakfast",
            "region": "Indian",
            "calories": 320.0,
            "protein_g": 35.0,
            "carbs_g": 14.0,
            "fat_g": 11.0,
            "fiber_g": 5.0,
            "nutri_score_grade": "A",
            "moderation_status": "approved",
        },
        {
            "submitter": "shubham_v",
            "title": "Paneer Stuffed Oats & Besan Cheela",
            "summary": "Low-glycemic savory pancake made from gram flour and oat flour, filled with spiced cottage cheese.",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/5/5d/Besan_chilla.jpg",
            "ready_in_minutes": 15,
            "servings": 2,
            "ingredients": json.dumps(["1/2 cup Besan", "1/2 cup Oat Flour", "100g Paneer crumbled", "1/2 Onion finely chopped", "1 tsp Ajwain", "1/2 tsp Turmeric", "1 tsp Ghee"]),
            "instructions": "1. Whisk besan, oat flour, ajwain, turmeric, and water into batter.\n2. Pour ladleful on pan and cook till crisp.\n3. Stuff with crumbled paneer and chopped onion, fold over and serve with mint chutney.",
            "diets": "Vegetarian, High-Protein",
            "meal_type": "Breakfast",
            "region": "North Indian",
            "calories": 340.0,
            "protein_g": 24.0,
            "carbs_g": 32.0,
            "fat_g": 13.0,
            "fiber_g": 6.5,
            "nutri_score_grade": "A",
            "moderation_status": "approved",
        },
        {
            "submitter": "neel_bites",
            "title": "Turmeric & Black Pepper Roasted Makhana",
            "summary": "Crunchy air-roasted fox nuts tossed in desi ghee, turmeric, and black pepper. Perfect 140 kcal snack.",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/0/03/Roasted_and_spiced_Foxnuts_%28Phool_Makhana%29.jpg",
            "ready_in_minutes": 8,
            "servings": 2,
            "ingredients": json.dumps(["2 cups Phool Makhana (Fox Nuts)", "1 tsp Desi Ghee", "1/2 tsp Turmeric powder", "1/2 tsp Freshly crushed Black Pepper", "1/2 tsp Rock Salt"]),
            "instructions": "1. Heat ghee in a heavy bottom pan.\n2. Add makhana and roast on low flame for 6-8 minutes till super crispy.\n3. Sprinkle turmeric, black pepper, and rock salt. Toss well and enjoy warm!",
            "diets": "Vegetarian, Gluten-Free, Low-Calorie",
            "meal_type": "Snack",
            "region": "Indian",
            "calories": 140.0,
            "protein_g": 4.5,
            "carbs_g": 22.0,
            "fat_g": 4.0,
            "fiber_g": 3.5,
            "nutri_score_grade": "A",
            "moderation_status": "approved",
        },
        {
            "submitter": "rohan_gupta",
            "title": "Keto Paneer & Spinach Bhurji",
            "summary": "Quick 10-minute scrambled cottage cheese with fresh spinach, green chilies, and desi ghee.",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/b/b7/Palakpaneer_Rayagada_Odisha_0009.jpg",
            "ready_in_minutes": 10,
            "servings": 1,
            "ingredients": json.dumps(["150g Paneer crumbled", "1 cup Baby Spinach chopped", "1 tsp Cumin seeds", "1 Green chili", "1 tsp Ghee", "1/2 tsp Turmeric & Garam Masala"]),
            "instructions": "1. Heat ghee, temper cumin seeds and green chili.\n2. Add chopped spinach and sauté for 1 minute.\n3. Add crumbled paneer and spices, toss on medium heat for 3 mins. Enjoy hot!",
            "diets": "Keto, Vegetarian, High-Protein",
            "meal_type": "Dinner",
            "region": "North Indian",
            "calories": 340.0,
            "protein_g": 22.0,
            "carbs_g": 8.0,
            "fat_g": 24.0,
            "fiber_g": 3.0,
            "nutri_score_grade": "B",
            "moderation_status": "pending",
        },
    ]


    for rdata in community_recipes_data:
        sub = user_map.get(rdata["submitter"])
        if sub:
            crec = CommunityRecipe(
                submitter_id=sub.id,
                title=rdata["title"],
                summary=rdata["summary"],
                image_url=rdata["image_url"],
                ready_in_minutes=rdata["ready_in_minutes"],
                servings=rdata["servings"],
                ingredients=rdata["ingredients"],
                instructions=rdata["instructions"],
                diets=rdata["diets"],
                meal_type=rdata["meal_type"],
                region=rdata["region"],
                calories=rdata["calories"],
                protein_g=rdata["protein_g"],
                carbs_g=rdata["carbs_g"],
                fat_g=rdata["fat_g"],
                fiber_g=rdata["fiber_g"],
                nutri_score_grade=rdata["nutri_score_grade"],
                moderation_status=rdata["moderation_status"],
                created_at=now - timedelta(days=1),
            )
            db.add(crec)

    db.commit()

    return {
        "status": "success",
        "posts_seeded": inserted_posts_count,
        "comments_seeded": inserted_comments_count,
        "users_seeded": len(user_map),
    }
