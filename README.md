# CHEF — Constraint-based Hybrid Eating Framework
*Your ingredients. Our intelligence.*

> **Built as Capstone Project-I:**
> - Saba Saeed
> - Aryan Sah
> - Banshika Saha
> - Hemnarayan Sahu
> - Swastika Sahoo

[![Python](https://img.shields.io/badge/Python-3.14+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Quick Start (Windows)

**Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

**Frontend (development):**
```bash
cd frontend-react
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser (Vite dev server proxies API calls to the backend).

For production, run `npm run build` inside `frontend-react/` — the backend will serve the built files from `frontend-react/dist/` automatically at `http://127.0.0.1:8000`.

## Features

| Feature | Method | Notes |
|---------|--------|-------|
| Ingredient Parsing | Rule-based regex | Handles quantities, units, fractions, ranges |
| Recipe Search | 30+ in-line + extended JSON dataset (~180 KB) | Set `SPOONACULAR_API_KEY` in `.env` for real API fallback |
| **Constraint Filtering** | Diet, calories, cook time | vegetarian/vegan/keto/gluten-free/high-protein, max kcal, max minutes |
| Nutrition Lookup | Built-in database (350+ foods) | Per-100g values, scales by quantity. Covers Indian & global foods |
| Food Detection | **YOLOv8 ML** (real inference) | Detects 10 COCO food classes from uploaded images |
| JWT Authentication | bcrypt + python-jose | Signup, login, protected endpoints, user profiles |
| TDEE Calculator | Mifflin-St Jeor formula | Calculates daily calorie/macro targets, saves to user profile |
| Recipe Ratings | 1–5 star system | Rate saved recipes, sort by rating |
| Recipe of the Day | Date-seeded random | Same pick all day for all users, prioritizes vegetarian |
| Ingredient Substitutions | JSON lookup (20 ingredients) | Case-insensitive partial matching, integrated into parser UI |
| Weekly Meal Planner | Calendar UI + DB | Assign saved recipes to days/slots, week navigation |
| Shopping List Generator | Aggregated from meal plan | Auto-merges ingredient lists from planned meals |
| Search History | localStorage | Last 10 ingredient searches as quick-access tags |
| Dark / Light Theme | CSS variables + context | Persisted toggle, full dark theme support |
| Save / Bookmark Recipes | Per-user SQLite storage | Authenticated save, list, delete |

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|:----:|
| GET | `/api/health` | Health check + feature status | — |
| POST | `/api/auth/signup` | Create account, return JWT | — |
| POST | `/api/auth/login` | Login, return JWT | — |
| GET | `/api/auth/me` | Current user profile | ✅ |
| POST | `/api/tdee/calculate` | Calculate TDEE (public) | — |
| POST | `/api/tdee/save` | Calculate + save to profile | ✅ |
| POST | `/api/ingredients/parse` | Parse ingredient text | — |
| POST | `/api/recipes/search` | Search by ingredients + constraints | — |
| POST | `/api/recipes/save` | Save a recipe | ✅ |
| GET | `/api/recipes/saved` | List saved recipes | ✅ |
| PUT | `/api/recipes/saved/{id}/rate` | Rate a saved recipe (1–5) | ✅ |
| DELETE | `/api/recipes/saved/{id}` | Delete a saved recipe | ✅ |
| GET | `/api/recipes/daily` | Recipe of the day | — |
| POST | `/api/nutrition/analyze` | Nutrition lookup | — |
| POST | `/api/detect/image` | Detect food via YOLOv8 ML | — |
| GET | `/api/substitutions` | List all substitutions | — |
| GET | `/api/substitutions/{ingredient}` | Get substitutes for ingredient | — |
| GET | `/api/mealplan` | Get meal plan (date range) | ✅ |
| POST | `/api/mealplan` | Add recipe to meal plan | ✅ |
| DELETE | `/api/mealplan/{plan_id}` | Remove from meal plan | ✅ |
| GET | `/api/mealplan/shopping-list` | Generate shopping list | ✅ |

**Total: 22 endpoints** (13 public, 9 authenticated)

## Project Structure

```
CHEF/
├── backend/
│   ├── .env                 # Configuration (API keys, JWT secret, DB URL)
│   ├── .env.example         # Template for .env
│   ├── requirements.txt     # Python 3.14-safe dependencies
│   ├── yolov8n.pt           # YOLOv8 Nano model weights (6.5 MB)
│   ├── chef.db              # SQLite database (auto-created)
│   └── app/
│       ├── main.py          # FastAPI app entry point + CORS + static serving
│       ├── config.py        # Pydantic settings from .env
│       ├── database.py      # SQLite engine + session factory
│       ├── auth.py          # JWT token + bcrypt password utilities
│       ├── models.py        # ORM models (User, SavedRecipe, MealPlan)
│       ├── schemas.py       # 20+ Pydantic request/response schemas
│       ├── substitutions.json      # Ingredient substitution data
│       ├── recipes_extra.json      # Extended recipe dataset (~180 KB)
│       ├── nutrition_extra.json    # Extended nutrition data (~26 KB)
│       └── routers/
│           ├── auth_router.py      # Signup, login, profile
│           ├── ingredients.py      # Ingredient parser (regex)
│           ├── recipes.py          # Recipe search, save, rate, daily
│           ├── nutrition.py        # Nutrition lookup (350+ foods)
│           ├── detection.py        # Food detection (YOLOv8 ML)
│           ├── tdee.py             # TDEE calculator
│           ├── substitutions.py    # Ingredient substitution API
│           └── mealplan.py         # Weekly meal planner + shopping list
├── frontend-react/
│   ├── index.html           # SPA shell
│   ├── package.json         # React 19 + Vite 8 + dependencies
│   ├── vite.config.js       # Dev proxy (/api → backend)
│   └── src/
│       ├── main.jsx         # React entry point
│       ├── App.jsx          # Root component + routing (8 pages)
│       ├── index.css        # Full design system (1200+ lines)
│       ├── services/api.js  # Axios instance + JWT interceptor
│       ├── context/
│       │   ├── AuthContext.jsx     # Global auth state
│       │   └── ThemeContext.jsx    # Dark/light theme toggle
│       ├── components/
│       │   ├── Navbar.jsx          # Navigation bar + theme + auth
│       │   ├── AuthModal.jsx       # Login/signup modal
│       │   └── RecipeModal.jsx     # Recipe detail viewer
│       └── pages/
│           ├── Home.jsx            # Kitchen dashboard + recipe of the day
│           ├── Ingredients.jsx     # Ingredient parser + substitutions
│           ├── Recipes.jsx         # Recipe search + constraints
│           ├── Nutrition.jsx       # Nutrition lookup
│           ├── Detection.jsx       # Food detection (image upload)
│           ├── TDEEProfile.jsx     # TDEE calculator + profile
│           ├── SavedRecipes.jsx    # Bookmarked recipes + ratings
│           └── MealPlanner.jsx     # Weekly planner + shopping list
├── data/
│   └── dataset_sources.md   # Data provenance documentation
├── models/
│   └── README.md            # ML model documentation
├── logs/
│   └── server.log
├── PROJECT_REPORT.md        # Academic capstone report
├── REAL_WORLD_IMPACT.md     # Impact statement
├── SETUP.md                 # Installation guide
└── README.md
```

## Configuration

Edit `backend/.env` to configure (see `.env.example` for all options):

- **`DATABASE_URL`** — defaults to `sqlite:///./chef.db`
- **`SPOONACULAR_API_KEY`** — optional, enables real recipe API search
- **`JWT_SECRET_KEY`** — change in production!
- **`CORS_ORIGINS`** — comma-separated allowed origins (defaults to `*`)
- **`DEBUG`** — set to `false` in production

## Tech Stack

- **Backend**: Python 3.14 + FastAPI + SQLAlchemy (sync) + SQLite
- **Frontend**: React 19 + Vite 8 + React Router 7 + Axios
- **ML**: YOLOv8 Nano (Ultralytics) for food detection
- **Auth**: JWT (python-jose) + bcrypt password hashing
- **Design**: Glassmorphism, Inter + Playfair Display fonts, dark/light theme

## Future Enhancements

> The following features are planned for future iterations:

| Feature | Description |
|---------|-------------|
| Print / Export Recipe | Download or print a recipe as a clean text or PDF format |
| Daily Nutrition Tracker | Log daily food intake with running calorie/protein/carb totals and history |
| Advanced ML Detection | Expand beyond 10 COCO classes — fine-tune YOLOv8 on Food-101 dataset |
| PostgreSQL Migration | Move from SQLite to PostgreSQL for production scalability |
| Docker Deployment | Dockerfile + docker-compose for 1-click deployment |
