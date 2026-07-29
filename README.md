---
title: CHEF
emoji: 👨‍🍳
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 7860
---

<div align="center">

# 👨‍🍳 CHEF — Constraint-based Hybrid Eating Framework

### *Your ingredients. Our intelligence.*

An AI-powered nutritional assistant that turns whatever's in your kitchen into healthy, personalized meals — built as a Capstone Project at **IIT Patna**.

[![Python](https://img.shields.io/badge/Python-3.14+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-F7DF1E?style=for-the-badge)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/SabaSaiid/CHEF/ci.yml?style=for-the-badge&label=CI&logo=githubactions&logoColor=white)](https://github.com/SabaSaiid/CHEF/actions)

---

**Team** · Saba Saeed · Aryan Sah · Banshika Saha · Hemnarayan Sahu · Swastika Sahoo

</div>

---

## 🧠 What is CHEF?

CHEF solves the daily **"what should I eat?"** problem. Instead of searching by dish name, you provide the **ingredients you already have**, and CHEF searches **7,100+ recipes** to recommend meals that match your:

- 🥗 **Dietary preferences** — vegetarian, vegan, keto, gluten-free, high-protein
- 🔥 **Calorie limits** — synced with your personalized TDEE targets
- ⏱️ **Available cooking time** — filter by max prep + cook time
- ⚕️ **Health conditions** — diabetes, hypertension, PCOS, thyroid & more
- 🏷️ **Allergens** — automatic recipe exclusion based on your allergen profile

Two ways to input ingredients: a **natural-language text parser** (handles fractions, ranges, units) or a **YOLOv8 ML model** that detects food items from camera/uploaded images.

---

## ✨ Features

### 🍳 Core Engine
| Feature | Description |
|---------|-------------|
| **Ingredient Parser** | Rule-based regex engine — handles quantities, units, fractions, ranges, and natural language |
| **Recipe Search** | Unified JSON dataset (7,100+ recipes, ~7.4 MB) with optional Spoonacular API fallback |
| **Constraint Filtering** | Diet tags, max calories, max cook time — strict Boolean + range enforcement |
| **Nutri-Score Rating** | 6-tier (S/A/B/C/D/E) nutritional grading based on the 2023 FSA-NPS algorithm with S-Tier extension |
| **Health-Aware Engine** | Condition-specific dietary rules (diabetes, hypertension, PCOS, thyroid, cholesterol, etc.) |
| **Ingredient Substitutions** | Smart lookup with case-insensitive partial matching for common swaps |

### 📊 Nutrition & Tracking
| Feature | Description |
|---------|-------------|
| **Nutrition Lookup** | Built-in database (350+ Indian & global foods) with per-100g values, scales by quantity |
| **Daily Nutrition Tracker** | Log meals, track calories/protein/carbs/fat with daily targets and history graphs |
| **TDEE Calculator** | Mifflin-St Jeor formula — calculates daily calorie & macro targets from your profile |
| **Adaptive TDEE** | Auto-adjusts targets based on weight trend tracking over time |
| **Weight Tracking** | Log weight entries to monitor progress against goals |

### 🗓️ Planning & Organization
| Feature | Description |
|---------|-------------|
| **Weekly Meal Planner** | Calendar UI — assign saved recipes to days/slots with week navigation |
| **AI Diet Planner** | Generates meal plans considering health conditions, preferences & nutritional balance |
| **Shopping List** | Auto-aggregated grocery list from planned meals with merge & print support |
| **Smart Pantry** | Track ingredients on hand with quantities, units, freshness, and categories |
| **Export & Print** | Download saved meals and grocery lists as formatted text/PDF |

### 🔒 User Experience
| Feature | Description |
|---------|-------------|
| **Food Detection (ML)** | YOLOv8 Nano real inference — detect food items from uploaded images |
| **JWT Authentication** | Secure signup/login with bcrypt hashing and protected endpoints |
| **User Profiles** | Save dietary preferences, allergens, health conditions, and taste preferences |
| **Recipe Ratings** | 1–5 star system for saved recipes with sort by rating |
| **Recipe of the Day** | Date-seeded random pick, consistent across all users, prioritizes vegetarian |
| **Dark / Light Theme** | Full glassmorphism design with persisted theme toggle |
| **Demo Mode** | Try the full app without creating an account |
| **Search History** | Quick-access tags for your last 10 ingredient searches |

---

## 🚀 Quick Start

### One-Click (macOS/Linux)
```bash
./start.sh
```
Opens both backend and frontend — visit **http://localhost:5173**

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

**Frontend:**
```bash
cd frontend-react
npm install
npm run dev
```

Then open **http://localhost:5173** (Vite proxies API calls to the backend).

### 🐳 Docker
```bash
# Development (hot-reload)
docker compose up

# Production
docker build --target backend-prod -t chef .
docker run -p 7860:7860 chef
```

Docker Compose spins up **PostgreSQL 16 + FastAPI + Vite** with a single command.

---

## ⚙️ Configuration

Create `backend/.env` from the template (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./chef.db` | Database connection string |
| `DATABASE_BACKEND` | `sqlite` | Set to `postgresql` for Docker/prod |
| `SPOONACULAR_API_KEY` | — | Optional: enables real recipe API search |
| `JWT_SECRET_KEY` | *(dev default)* | **Change in production!** |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `DEBUG` | `true` | Set to `false` in production |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.14 · FastAPI · SQLAlchemy · Alembic · SQLite / PostgreSQL 16 |
| **Frontend** | React 19 · Vite 8 · React Router 7 · Axios · Lucide Icons |
| **ML** | YOLOv8 Nano (Ultralytics) for real-time food detection |
| **Auth** | JWT (python-jose) · bcrypt password hashing |
| **Infra** | Docker · Docker Compose · Nginx · GitHub Actions CI |
| **Design** | Glassmorphism · Inter + Playfair Display fonts · Dark/Light theme |
| **Deploy** | Hugging Face Spaces · Render · Docker multi-stage builds |

---

## 📁 Project Structure

```
CHEF/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point + CORS + static serving
│   │   ├── config.py               # Pydantic settings from .env
│   │   ├── database.py             # SQLite/PostgreSQL engine + session factory
│   │   ├── auth.py                 # JWT token + bcrypt utilities
│   │   ├── models.py               # ORM models (User, SavedRecipe, MealPlan, etc.)
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── recipes.json            # 7,100+ recipe dataset (~7.4 MB)
│   │   ├── substitutions.json      # Ingredient substitution data
│   │   ├── nutrition_extra.json    # Extended nutrition database
│   │   ├── routers/
│   │   │   ├── auth_router.py      # Signup, login, profile
│   │   │   ├── ingredients.py      # Ingredient parser (regex)
│   │   │   ├── recipes.py          # Recipe search, save, rate, daily
│   │   │   ├── nutrition.py        # Nutrition lookup (350+ foods)
│   │   │   ├── nutrition_tracker.py # Daily nutrition logging & history
│   │   │   ├── detection.py        # Food detection (YOLOv8 ML)
│   │   │   ├── tdee.py             # TDEE calculator
│   │   │   ├── tdee_adaptive.py    # Adaptive TDEE adjustments
│   │   │   ├── mealplan.py         # Weekly planner + shopping list
│   │   │   ├── diet_planner.py     # AI diet plan generation
│   │   │   ├── pantry.py           # Smart pantry management
│   │   │   ├── health_engine.py    # Health-condition dietary rules
│   │   │   ├── profiles.py         # User profile management
│   │   │   ├── weight.py           # Weight tracking
│   │   │   ├── export.py           # PDF/text export
│   │   │   └── demo.py             # Demo mode endpoints
│   │   └── scoring/                # Nutri-Score engine (FSA-NPS 2023)
│   │       ├── calculator.py       # Scoring logic & S-tier bonus
│   │       ├── categories.py       # Category classification
│   │       ├── constants.py        # Point tables & thresholds
│   │       └── estimators.py       # Per-100g normalization & FVL% estimation
│   ├── alembic/                    # Database migrations
│   ├── requirements.txt
│   └── yolov8n.pt                  # YOLOv8 Nano weights (6.5 MB)
├── frontend-react/
│   ├── src/
│   │   ├── App.jsx                 # Root component + routing (10 pages)
│   │   ├── index.css               # Full design system (1200+ lines)
│   │   ├── services/api.js         # Axios instance + JWT interceptor
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # Global auth state
│   │   │   ├── ThemeContext.jsx    # Dark/light theme toggle
│   │   │   ├── ToastContext.jsx    # Toast notifications
│   │   │   └── SettingsContext.jsx # App settings
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Navigation bar + theme + auth
│   │   │   ├── Sidebar.jsx         # Collapsible sidebar navigation
│   │   │   ├── AuthModal.jsx       # Login/signup modal
│   │   │   ├── RecipeModal.jsx     # Recipe detail viewer
│   │   │   ├── SettingsModal.jsx   # User settings panel
│   │   │   ├── ChefScoreBadge.jsx  # Nutri-Score tier badge
│   │   │   ├── ChefScoreBreakdown.jsx  # Score breakdown details
│   │   │   └── SupplementaryBadges.jsx # Additional quality badges
│   │   └── pages/
│   │       ├── Home.jsx            # Dashboard + daily targets + recipe of the day
│   │       ├── Ingredients.jsx     # Ingredient parser + substitutions
│   │       ├── Recipes.jsx         # Recipe search + constraints
│   │       ├── Nutrition.jsx       # Nutrition lookup & analysis
│   │       ├── NutritionTracker.jsx # Daily intake logger + graphs
│   │       ├── Detection.jsx       # Food detection (image upload)
│   │       ├── TDEEProfile.jsx     # TDEE calculator + user profile
│   │       ├── SavedRecipes.jsx    # Bookmarked recipes + ratings
│   │       ├── MealPlanner.jsx     # Weekly planner + shopping list
│   │       └── Pantry.jsx          # Smart pantry manager
│   └── package.json
├── docs/                           # Documentation & reports
├── data/                           # Data provenance
├── models/                         # ML model documentation
├── .github/workflows/ci.yml       # GitHub Actions CI pipeline
├── Dockerfile                      # Multi-stage (dev + prod)
├── docker-compose.yml              # Dev: PostgreSQL + backend + frontend
├── docker-compose.prod.yml         # Production compose
├── nginx.conf                      # Nginx config for prod frontend
├── render.yaml                     # Render.com deployment config
├── start.sh                        # One-click local start script
├── PROJECT_REPORT.md               # Academic capstone report
└── REAL_WORLD_IMPACT.md            # Impact statement
```

---

## 🔌 API Endpoints

<details>
<summary><strong>View all endpoints (30+)</strong></summary>

### Authentication
| Method | Path | Description | Auth |
|--------|------|-------------|:----:|
| POST | `/api/auth/signup` | Create account, return JWT | — |
| POST | `/api/auth/login` | Login, return JWT | — |
| GET | `/api/auth/me` | Current user profile | ✅ |

### Recipes & Search
| Method | Path | Description | Auth |
|--------|------|-------------|:----:|
| POST | `/api/ingredients/parse` | Parse ingredient text | — |
| POST | `/api/recipes/search` | Search by ingredients + constraints | — |
| POST | `/api/recipes/save` | Save a recipe | ✅ |
| GET | `/api/recipes/saved` | List saved recipes | ✅ |
| PUT | `/api/recipes/saved/{id}/rate` | Rate a saved recipe (1–5) | ✅ |
| DELETE | `/api/recipes/saved/{id}` | Delete a saved recipe | ✅ |
| GET | `/api/recipes/daily` | Recipe of the day | — |

### Nutrition & Tracking
| Method | Path | Description | Auth |
|--------|------|-------------|:----:|
| POST | `/api/nutrition/analyze` | Nutrition lookup | — |
| GET | `/api/tracker/daily` | Get daily nutrition log | ✅ |
| POST | `/api/tracker/log` | Log a meal/food entry | ✅ |
| DELETE | `/api/tracker/{id}` | Delete a log entry | ✅ |
| POST | `/api/tdee/calculate` | Calculate TDEE (public) | — |
| POST | `/api/tdee/save` | Calculate + save to profile | ✅ |

### Meal Planning
| Method | Path | Description | Auth |
|--------|------|-------------|:----:|
| GET | `/api/mealplan` | Get meal plan (date range) | ✅ |
| POST | `/api/mealplan` | Add recipe to meal plan | ✅ |
| DELETE | `/api/mealplan/{id}` | Remove from meal plan | ✅ |
| GET | `/api/mealplan/shopping-list` | Generate shopping list | ✅ |

### Pantry, Detection & More
| Method | Path | Description | Auth |
|--------|------|-------------|:----:|
| GET | `/api/pantry` | List pantry items | ✅ |
| POST | `/api/pantry` | Add pantry item | ✅ |
| PUT | `/api/pantry/{id}` | Update pantry item | ✅ |
| DELETE | `/api/pantry/{id}` | Remove pantry item | ✅ |
| POST | `/api/detect/image` | Detect food via YOLOv8 ML | — |
| GET | `/api/substitutions` | List all substitutions | — |
| GET | `/api/substitutions/{ingredient}` | Get substitutes | — |
| GET | `/api/health` | Health check + feature status | — |

</details>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                       │
│            React 19 · Vite 8 · Glassmorphism UI             │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / JWT
┌───────────────────────────▼─────────────────────────────────┐
│                     FastAPI Backend                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Auth     │ │ Recipes  │ │ Nutrition│ │ Health Engine │  │
│  │ Router   │ │ + Search │ │ + TDEE   │ │ + Diet Plan   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Pantry   │ │ Meal     │ │ YOLOv8   │ │ Nutri-Score   │  │
│  │ Manager  │ │ Planner  │ │ Detection│ │ Scoring Engine│  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ SQLAlchemy ORM
┌───────────────────────────▼─────────────────────────────────┐
│              SQLite (dev) / PostgreSQL 16 (prod)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Nutri-Score Rating System

CHEF uses a **6-tier** nutritional grading system based on the **2023 FSA-NPS Nutri-Score** algorithm, extended with an **S-Tier** for exceptionally clean recipes:

| Tier | Color | Meaning | Criteria |
|:----:|:-----:|---------|----------|
| **★ S** | 🟡 Gold | **Superior** | Near-zero negative penalties + high positive density |
| **A** | 🟢 Dark Green | **Excellent** | Low saturated fats, sugars, sodium |
| **B** | 🟢 Light Green | **Good** | Well-balanced nutritional profile |
| **C** | 🟡 Yellow | **Average** | Moderate balance, suitable as part of varied diet |
| **D** | 🟠 Orange | **Poor** | Higher energy density, sodium, or sugars |
| **E** | 🔴 Red | **Very Poor** | Heavy penalties across negative components |

> All 5,250+ local recipes have been scored — **S: 8.1% · A: 27.0% · B: 18.3% · C: 29.4% · D: 15.9% · E: 1.3%**

---

## 🚢 Deployment

| Platform | Method | Config |
|----------|--------|--------|
| **Hugging Face Spaces** | Docker (auto-deploy) | HF frontmatter in README |
| **Render** | Web service | `render.yaml` |
| **Docker Compose** | Self-hosted | `docker-compose.yml` / `docker-compose.prod.yml` |
| **Manual** | Any VPS | `start.sh` or direct uvicorn |

---

## 🔮 Future Enhancements

| Feature | Description |
|---------|-------------|
| **Clinical Prescription Analysis** | OCR + NLP to parse prescriptions and auto-suggest therapeutic diets |
| **Advanced ML Detection** | Fine-tune YOLOv8 on Food-101 for mixed-dish recognition & portion estimation |
| **Smart Refrigerator Integration** | Connect with IoT appliances for automated pantry syncing |
| **Expanded Global Cuisines** | Broaden recipe database with more regional and continental cuisines |

---

## 👥 Contributors

| Name | Contribution |
|------|-------------|
| **Saba Saeed** | Project architecture, UI/UX design, documentation, constraint engine |
| **Aryan Sah** | YouTube video integration, recipe dataset images, backend routing, branch management |
| **Banshika Saha** | Recipe search engine, Spoonacular API, diet filtering, Vite proxy, dataset population |
| **Hemnarayan Sahu** | JWT authentication, frontend JS/CSS development, design constraints |
| **Swastika Sahoo** | TDEE engine, nutrition logic, SQLite schemas, YOLOv8 food detection |

---

<div align="center">

**Indian Institute of Technology Patna** · UG Program in CS & Data Analytics · Capstone Project

Made with ❤️ and lots of ☕

</div>
