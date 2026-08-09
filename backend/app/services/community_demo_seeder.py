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
    "aisha_kitchen",
    "priya.sharma",
    "karan_verma",
    "ananya.roy",
    "rohan_gupta",
    "dr_meera",
]

def _verify_and_migrate_community_tables(db: Session):
    """Ensure missing columns in existing SQLite tables are added seamlessly."""
    try:
        bind = db.get_bind()
        if bind.dialect.name == "sqlite":
            conn = bind.raw_connection()
            cursor = conn.cursor()
            
            # Check community_posts columns
            cursor.execute("PRAGMA table_info(community_posts);")
            cols = [col[1] for col in cursor.fetchall()]
            if cols:
                if "shared_meal_plan" not in cols:
                    cursor.execute("ALTER TABLE community_posts ADD COLUMN shared_meal_plan TEXT;")
                if "group_id" not in cols:
                    cursor.execute("ALTER TABLE community_posts ADD COLUMN group_id INTEGER;")
                if "recipe_id" not in cols:
                    cursor.execute("ALTER TABLE community_posts ADD COLUMN recipe_id VARCHAR(255);")
                if "recipe_source" not in cols:
                    cursor.execute("ALTER TABLE community_posts ADD COLUMN recipe_source VARCHAR(50);")
                conn.commit()
    except Exception as e:
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
        {"username": "aisha_kitchen", "email": "aisha@demo.chef", "display_name": "Aisha Khan", "diet": "non-vegetarian"},
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
    old_posts = db.query(CommunityPost).filter(CommunityPost.user_id.in_(demo_user_ids)).all()
    old_post_ids = [p.id for p in old_posts]
    if old_post_ids:
        db.query(CommunityComment).filter(CommunityComment.post_id.in_(old_post_ids)).delete(synchronize_session='evaluate')
        db.query(CommunityLike).filter(CommunityLike.post_id.in_(old_post_ids)).delete(synchronize_session='evaluate')
        db.query(CommunityPost).filter(CommunityPost.id.in_(old_post_ids)).delete(synchronize_session='evaluate')

    db.query(CommunityFollow).filter(
        (CommunityFollow.follower_id.in_(demo_user_ids)) | (CommunityFollow.following_id.in_(demo_user_ids))
    ).delete(synchronize_session='evaluate')

    db.query(CommunityRecipe).filter(CommunityRecipe.submitter_id.in_(demo_user_ids)).delete(synchronize_session='evaluate')
    db.query(CommunityGroupMember).filter(CommunityGroupMember.user_id.in_(demo_user_ids)).delete(synchronize_session='evaluate')
    db.query(CommunityChallengeParticipant).filter(CommunityChallengeParticipant.user_id.in_(demo_user_ids)).delete(synchronize_session='evaluate')
    db.flush()

    # ── 3. Seed Follow Relationships ─────────────────────────────────
    follows = [
        ("aisha_kitchen", "priya.sharma"),
        ("aisha_kitchen", "karan_verma"),
        ("aisha_kitchen", "dr_meera"),
        ("karan_verma", "aisha_kitchen"),
        ("priya.sharma", "ananya.roy"),
        ("rohan_gupta", "priya.sharma"),
        ("rohan_gupta", "karan_verma"),
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
                members_count=4,
            )
            db.add(grp)
            db.flush()
        else:
            grp.members_count = max(4, grp.members_count)
        group_map[gdef["slug"]] = grp

    # Add Group Memberships
    for grp in group_map.values():
        for uname in ["aisha_kitchen", "priya.sharma", "karan_verma", "rohan_gupta"]:
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

    ch_water = challenge_map.get("Hydration Hero")
    if ch_water:
        db.add(CommunityChallengeParticipant(
            challenge_id=ch_water.id,
            user_id=user_map["aisha_kitchen"].id,
            current_progress=2.0,
            is_completed=False,
            joined_at=now - timedelta(days=3),
        ))

    db.flush()

    # ── 6. Seed Global & Group Feed Posts with Authentic Conversations ─────

    posts_data = [
        {
            "username": "priya.sharma",
            "content": "Hit 112g protein today with purely vegetarian Indian meals! 🌱 High-protein Palak Paneer with Sattu Roti + Greek Yogurt. Swipe for macros breakdown!\n\n🔥 Cal: 1,820 | P: 112g | C: 190g | F: 62g | Fiber: 34g\n\nWhat's your go-to veg protein hack for hitting daily targets?",
            "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80",
            "created_at": now - timedelta(hours=3),
            "group_slug": None,
            "likes": ["karan_verma", "aisha_kitchen", "rohan_gupta", "dr_meera", "ananya.roy"],
            "comments": [
                ("karan_verma", "Sattu roti is such an underrated protein source! Do you mix it with regular wheat flour or pure sattu?"),
                ("priya.sharma", "@karan_verma I use a 50:50 ratio of whole wheat and Chana Sattu. Keeps the rotis soft and adds ~8g protein per roti!"),
                ("aisha_kitchen", "Tried this today and it was amazing! Thanks for sharing Priya 🙌"),
                ("rohan_gupta", "Bookmarked! Need more high protein veg ideas for my Mondays."),
                ("dr_meera", "Combining legumes (sattu) with grains (wheat) also completes the essential amino acid profile! Great nutrition science in action."),
            ]
        },
        {
            "username": "karan_verma",
            "content": "Sunday Prep Complete! 🍱 Packed 5 days of Tandoori Chicken Breast + Quinoa + Roasted Broccoli & Peppers.\n\n📊 450 kcal & 42g protein per meal box. Prepping on Sunday saves me from mid-week takeout temptations! Who else is meal prepping today?",
            "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
            "created_at": now - timedelta(hours=7),
            "group_slug": None,
            "likes": ["aisha_kitchen", "priya.sharma", "rohan_gupta", "ananya.roy"],
            "comments": [
                ("ananya.roy", "That tandoori marinade looks incredible! What spices do you use?"),
                ("karan_verma", "@ananya.roy Hung curd, Kashmiri red chili, garam masala, ginger-garlic paste, and lemon juice. Marinate overnight for best flavor!"),
                ("aisha_kitchen", "42g protein per meal prep box is impressive! Definitely copying this for next week."),
                ("priya.sharma", "Do you freeze them or just keep them in the fridge?"),
                ("karan_verma", "@priya.sharma 3 days in fridge, 2 days in freezer. Heats up perfectly in 2 mins!"),
            ]
        },
        {
            "username": "ananya.roy",
            "content": "Tried making Ragi & Jaggery Pancakes with crushed almond topping! 🥞\n\nZero refined sugar, super fluffy, and rich in calcium. Perfect breakfast after a morning 5k run!",
            "image_url": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&auto=format&fit=crop&q=80",
            "created_at": now - timedelta(hours=15),
            "group_slug": None,
            "likes": ["priya.sharma", "dr_meera", "aisha_kitchen"],
            "comments": [
                ("dr_meera", "Excellent choice using Ragi! Great complex carbs with high micronutrient value (calcium & iron)."),
                ("priya.sharma", "Add a touch of cardamom powder next time, makes it smell like festive sweets!"),
                ("ananya.roy", "@priya.sharma Ooh cardamom sounds delicious, trying that tomorrow!"),
            ]
        },
        {
            "username": "aisha_kitchen",
            "content": "Logged my full day of eating using CHEF's AI Food Scanner! 📱 Scanned my home-made Chicken Biryani and got instant macro estimates. Loving how easy it is to keep track of calories and stay consistent.",
            "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
            "created_at": now - timedelta(days=1),
            "group_slug": None,
            "likes": ["karan_verma", "priya.sharma", "rohan_gupta"],
            "comments": [
                ("rohan_gupta", "Nice! Biryani is hard to track manually so the AI scanner is a lifesaver."),
                ("priya.sharma", "Homemade biryani with controlled oil is actually super balanced in macros!"),
                ("karan_verma", "Drop the recipe link if you saved it in CHEF!"),
                ("aisha_kitchen", "@karan_verma Saved it in my collection! Will publish it to Community Recipes soon."),
            ]
        },
        {
            "username": "dr_meera",
            "content": "Quick Tip on Glycemic Index 💡: Pair your high-carb foods (like white rice or roti) with fiber-dense veggies or lentils (dal) and a splash of ghee or lemon juice.\n\nThis simple habit slows down glucose absorption and prevents post-meal energy slumps!",
            "image_url": None,
            "created_at": now - timedelta(days=1, hours=4),
            "group_slug": None,
            "likes": ["aisha_kitchen", "priya.sharma", "rohan_gupta", "ananya.roy", "karan_verma"],
            "comments": [
                ("rohan_gupta", "Did not know lemon juice helps with glycemic response, super helpful tip Dr. Meera!"),
                ("ananya.roy", "Ghee with rice makes it taste so much better too! Win-win."),
                ("dr_meera", "@ananya.roy Absolutely! Healthy fats delay gastric emptying."),
            ]
        },
        {
            "username": "rohan_gupta",
            "content": "Just completed the 7-Day High-Protein Challenge! 🥩 Big thanks to @priya.sharma for recommending the Sattu shake post-workout. Muscle recovery has been night and day!",
            "image_url": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&auto=format&fit=crop&q=80",
            "created_at": now - timedelta(days=2),
            "group_slug": None,
            "likes": ["karan_verma", "aisha_kitchen", "priya.sharma"],
            "comments": [
                ("karan_verma", "Congrats on finishing the challenge man! 💪 On to the next one!"),
                ("aisha_kitchen", "Awesome achievement! I'm on day 4 right now."),
                ("priya.sharma", "So glad the Sattu shake worked for you! Way to go Rohan 🎉"),
            ]
        },

        # ── Group-Specific Posts ───────────────────────────────────────
        {
            "username": "karan_verma",
            "content": "What is your #1 budget protein source in India for hitting 100g+ daily without expensive supplements?",
            "image_url": None,
            "created_at": now - timedelta(days=1, hours=8),
            "group_slug": "high-protein-beginners",
            "likes": ["priya.sharma", "aisha_kitchen", "rohan_gupta"],
            "comments": [
                ("priya.sharma", "Chana sattu, boiled eggs, paneer, and soybean chunks! 100g soya chunks gives ~52g protein for just ₹20."),
                ("rohan_gupta", "Egg whites + Paneer bhurji is my daily staple."),
                ("aisha_kitchen", "Soybean chunks and Greek curd have been game changers for me."),
            ]
        },
        {
            "username": "dr_meera",
            "content": "Replacing refined wheat flour with an Oats & Besan blend for lower post-prandial blood sugar spikes 💡",
            "image_url": None,
            "created_at": now - timedelta(days=2, hours=2),
            "group_slug": "diabetic-friendly-cooking",
            "likes": ["ananya.roy", "aisha_kitchen"],
            "comments": [
                ("ananya.roy", "Works great for parathas! 70% besan + 30% oat flour has a very low glycemic index."),
                ("aisha_kitchen", "My dad has Type 2 diabetes, definitely sharing this recipe with him!"),
            ]
        },
        {
            "username": "priya.sharma",
            "content": "Batch cooking Gravy Bases on Sunday: Onion-Tomato Masala & Spinach Paste 🥘",
            "image_url": None,
            "created_at": now - timedelta(days=3),
            "group_slug": "desi-meal-preppers",
            "likes": ["karan_verma", "rohan_gupta", "aisha_kitchen"],
            "comments": [
                ("karan_verma", "Saves 20 mins every single weeknight! I freeze them in silicone ice cube trays."),
                ("rohan_gupta", "Pro tip: add ginger-garlic paste right at the end to keep the fresh aroma sharp."),
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
            "submitter": "priya.sharma",
            "title": "High-Protein Sattu Stuffed Paratha",
            "summary": "Nutritious roasted chana sattu paratha spiced with carom seeds, green chilies, and fresh lemon juice. 16g protein per paratha!",
            "image_url": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80",
            "ready_in_minutes": 20,
            "servings": 2,
            "ingredients": json.dumps(["1 cup Roasted Chana Sattu", "1 cup Whole Wheat Atta", "1 Green Chili chopped", "1 tsp Ajwain (carom seeds)", "1 tbsp Lemon Juice", "Salt & Mustard oil"]),
            "instructions": "1. Knead soft dough with wheat atta.\n2. Mix sattu with green chilies, ajwain, lemon juice, salt, and 1 tsp mustard oil with 2 tbsp water till crumbly.\n3. Stuff into dough balls and roll flat.\n4. Cook on hot tawa with ghee till golden spots appear.",
            "diets": "Vegetarian, High-Protein",
            "meal_type": "Breakfast",
            "region": "North Indian / Bihari",
            "calories": 380.0,
            "protein_g": 16.0,
            "carbs_g": 52.0,
            "fat_g": 10.0,
            "fiber_g": 8.5,
            "nutri_score_grade": "A",
            "moderation_status": "approved",
        },
        {
            "submitter": "karan_verma",
            "title": "Meal-Prep Tandoori Chicken & Quinoa Bowl",
            "summary": "Juicy tandoori-marinated chicken breast served over fluffy quinoa and steamed broccoli. High protein, clean macros.",
            "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
            "ready_in_minutes": 35,
            "servings": 4,
            "ingredients": json.dumps(["500g Chicken Breast Cubes", "1 cup Quinoa cooked", "2 cups Broccoli florets", "3 tbsp Hung Curd", "1 tbsp Kashmiri Chili Powder", "1 tsp Garam Masala", "1 tbsp Lemon juice"]),
            "instructions": "1. Marinate chicken cubes in hung curd, lemon juice, and spices for 30 mins.\n2. Air fry or grill chicken at 200°C for 14-16 minutes.\n3. Fluff cooked quinoa and steam broccoli.\n4. Divide equally into 4 meal prep containers.",
            "diets": "High-Protein, Gluten-Free",
            "meal_type": "Lunch",
            "region": "North Indian",
            "calories": 450.0,
            "protein_g": 42.0,
            "carbs_g": 38.0,
            "fat_g": 12.0,
            "fiber_g": 6.0,
            "nutri_score_grade": "A",
            "moderation_status": "approved",
        },
        {
            "submitter": "ananya.roy",
            "title": "Fluffy Ragi & Banana Jaggery Pancakes",
            "summary": "Gluten-free finger millet pancakes sweetened naturally with ripe bananas and organic jaggery powder.",
            "image_url": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&auto=format&fit=crop&q=80",
            "ready_in_minutes": 15,
            "servings": 2,
            "ingredients": json.dumps(["1 cup Ragi Flour", "1 Ripe Banana mashed", "2 tbsp Organic Jaggery powder", "1/2 cup Milk", "1/4 tsp Cardamom powder", "1 tsp Ghee for cooking"]),
            "instructions": "1. Mash ripe banana in a bowl, add jaggery, milk, and cardamom powder.\n2. Whisk in ragi flour to form smooth batter.\n3. Pour ladlefuls on warm ghee-greased pan.\n4. Cook 2 mins per side till golden.",
            "diets": "Vegetarian, Gluten-Free",
            "meal_type": "Breakfast",
            "region": "South Indian",
            "calories": 290.0,
            "protein_g": 9.5,
            "carbs_g": 54.0,
            "fat_g": 4.5,
            "fiber_g": 7.0,
            "nutri_score_grade": "A",
            "moderation_status": "approved",
        },
        {
            "submitter": "dr_meera",
            "title": "Sprouts & Roasted Makhana Protein Chaat",
            "summary": "Tangy crunchy evening snack packed with sprouted moong, fox nuts, pomegranate seeds, and chaat masala.",
            "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80",
            "ready_in_minutes": 10,
            "servings": 2,
            "ingredients": json.dumps(["1 cup Sprouted Moong", "1 cup Roasted Makhana", "1/2 cup Pomegranate seeds", "1/2 Onion finely chopped", "1 Cucumber diced", "1 tsp Chaat Masala", "Lemon juice"]),
            "instructions": "1. Dry roast makhana in pan till crispy.\n2. Combine steamed moong sprouts, makhana, onion, cucumber, and pomegranate.\n3. Toss with chaat masala and fresh lemon juice. Serve immediately.",
            "diets": "Vegetarian, Vegan, Low-Fat",
            "meal_type": "Snack",
            "region": "Indian",
            "calories": 210.0,
            "protein_g": 11.5,
            "carbs_g": 34.0,
            "fat_g": 3.5,
            "fiber_g": 9.0,
            "nutri_score_grade": "A",
            "moderation_status": "approved",
        },
        {
            "submitter": "rohan_gupta",
            "title": "Keto Paneer & Spinach Bhurji",
            "summary": "Quick 10-minute scrambled cottage cheese with fresh spinach, green chilies, and desi ghee.",
            "image_url": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80",
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
