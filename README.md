# 👨‍🍳 CHEF — Constraint-based Hybrid Eating Framework

> **Your ingredients. Our intelligence.**  
> An AI-powered nutritional assistant that transforms whatever is in your kitchen into healthy, personalized meals.  
> *Developed as a Capstone Project at **Indian Institute of Technology Patna (IIT Patna)**.*

---

[![Version](https://img.shields.io/badge/version-2.1.0-orange?style=flat-square)](backend/app/config.py)
[![Python](https://img.shields.io/badge/Python-3.14+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm_Noncommercial_1.0.0-blue.svg?style=flat-square)](LICENSE)

---

## 🌟 Overview

**CHEF** is an advanced full-stack nutritional platform that solves the daily *"what to eat"* dilemma. Instead of generic recipe lookups, CHEF takes the ingredients you already have at home—entered via natural language text, scanned receipts, or photographed with real-time computer vision—and pairs them with constraint-based optimization to recommend nutritionally balanced meals.

The platform combines a curated offline dataset of **5,250 recipes** (calibrated against USDA FoodData Central and ICMR-NIN nutritional matrices) with optional live Spoonacular API expansion to search over **7,100+ global and Indian dishes**, filtering results dynamically against:
- 🥗 **Dietary Rules**: Vegetarian, Vegan, Keto, Gluten-Free, High-Protein
- 🎯 **Nutritional Targets**: Daily calorie, protein, carb, and fat goals (computed via Mifflin-St Jeor TDEE & adaptive telemetry)
- ⏱️ **Cooking Constraints**: Maximum available prep and cook time
- ⚕️ **Clinical Health Profiles**: Evidence-based dietary adjustments for Diabetes, Hypertension, PCOS, Thyroid, Kidney Disease, and GERD
- 🚫 **Allergen Exclusions**: Peanuts, Dairy, Gluten, Eggs, Soy, Shellfish, Fish, Tree Nuts

---

## 🔥 Key Features

- **📷 Multi-Tier AI Food Detection**: Identify dishes from images using **YOLOv8** computer vision. Supports **Tier 1 (Food-101)** with 101 dish classes, **Tier 2 (Stock COCO)** with 10 classes, geometric bounding box portion size estimation, approximate calorie calculation, and a mock fallback mode.
- **🤖 Multimodal AI Pantry Assistant**: Powered by **Google Gemini 1.5 Flash** for optical/text receipt and grocery list parsing, plus a "Surprise Me" custom recipe generator tailored exclusively to your available pantry stock.
- **🥑 Smart Pantry & "What Can I Cook"**: Track pantry items, storage locations (Fridge, Freezer, Pantry), and freshness countdowns. The matching engine features synonym normalization, missing-ingredient badges, and one-click pantry inventory deduction when a recipe is cooked.
- **📊 6-Tier Nutri-Score Rating Engine**: Rates recipe healthiness from **S (Superior)** to **E (Very Poor)** using the 2023 FSA-NPS algorithm with extended clean-eating S-Tier criteria.
- **⚡ Daily Targets Widget & Live Sync**: Real-time cockpit widget displaying daily progress bars, macro ratios, remaining calorie allowances, and instant quick-logging.
- **🗓️ Weekly Meal Planner & Shopping List**: Drag-and-drop meal planning with automated, aggregated grocery lists, live macro sync tags, and nutritional tip shuffling.
- **💧 Nutrition & Hydration Tracker**: Complete intake log with water consumption tracking, quick-copy previous day, historical analytics, and automated AI coach insights.
- **📉 Adaptive TDEE & Weight Telemetry**: Log weight over time to monitor progress; adaptive TDEE algorithms recalculate caloric requirements based on actual weight velocity and intake logs.
- **👥 Community Hub & Recipe Exchange**: Publish personal recipes, explore community favorites, interact via social activity feeds, participate in dietary challenges, and write verified reviews with star ratings.
- **🔔 Notification Center**: Real-time alerts for hydration reminders, pantry expiry warnings, challenge updates, and meal planner sync with persistent storage and read-state filtering.
- **📄 Multi-Format Export**: One-click download of meal plans and recipes into clean printable PDFs (via ReportLab), CSV spreadsheets, or raw JSON.

---

## 🚀 Quick Start

### 1. One-Click Launch (macOS / Linux)
```bash
./start.sh
```
Starts both the FastAPI backend (`http://localhost:8001`) and the Vite React frontend (`http://localhost:5173`).

---

### 2. Manual Setup

#### Backend (FastAPI + Python 3.14+)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

#### Frontend (React 19 + Vite 8)
```bash
cd frontend-react
npm install
npm run dev
```
Open **http://localhost:5173** in your browser. All `/api` requests are automatically proxied to `http://127.0.0.1:8001`.

---

### 3. Docker Setup

#### Development (PostgreSQL 16 + FastAPI + Vite Dev Server)
```bash
docker compose up -d
```

#### Production (Containerized Nginx + PostgreSQL + FastAPI)
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 8, React Router 7, Axios (with JWT interceptors), Lucide Icons, Glassmorphism UI Design System
- **Backend**: Python 3.14+, FastAPI 0.115+, SQLAlchemy 2.0, Alembic, Pydantic v2, SlowAPI (rate limiting), ReportLab (PDF generation)
- **Database**: Dual-backend support — SQLite (Development) / PostgreSQL 16 via `pg8000` (Production)
- **Machine Learning & AI**: 
  - YOLOv8 (Ultralytics) for real-time food detection & portion estimation
  - Google Gemini 1.5 Flash for multimodal receipt parsing and custom recipe synthesis
- **Authentication & Security**: JWT (python-jose) + bcrypt hashing, GZip response compression, OWASP A07 brute-force protection
- **Caching**: `cachetools.TTLCache` in-memory caching for raw nutrition data and computed Nutri-Scores

---

## 📂 Project Structure

```
CHEF/
├── backend/                      # FastAPI Application
│   ├── app/
│   │   ├── main.py               # Entrypoint, middleware, and custom branded Swagger UI
│   │   ├── config.py             # App configuration & settings loaded from .env
│   │   ├── database.py           # Dual-backend SQLite/PostgreSQL engine
│   │   ├── models.py             # SQLAlchemy ORM models (Users, Pantry, Recipes, Logs, Community)
│   │   ├── schemas.py            # Pydantic v2 validation models
│   │   ├── auth.py               # JWT authentication & password utilities
│   │   ├── routers/              # 20 API Route Modules
│   │   │   ├── auth_router.py    # Authentication, signup, login, session tokens
│   │   │   ├── recipes.py        # Constraint search, bookmarks, ratings, daily recipe
│   │   │   ├── pantry.py         # Smart pantry, What Can I Cook, Gemini receipt parser
│   │   │   ├── detection.py      # YOLOv8 + Food-101 multi-tier food detection
│   │   │   ├── nutrition.py      # Nutritional lookup & Nutri-Score calculator
│   │   │   ├── mealplan.py       # Weekly meal planner & shopping list
│   │   │   ├── nutrition_tracker.py # Food logs, hydration tracker, coach insights
│   │   │   ├── tdee.py           # Mifflin-St Jeor TDEE & macro calculator
│   │   │   ├── tdee_adaptive.py  # Adaptive expenditure telemetry
│   │   │   ├── profiles.py       # User profile command center & clinical health engine
│   │   │   ├── health_engine.py  # Clinical nutrition guideline adjustments
│   │   │   ├── weight.py         # Weight logging & progress tracking
│   │   │   ├── diet_planner.py   # Automated therapeutic diet plan generation
│   │   │   ├── community_feed.py # Activity feed, posts, comments, shares
│   │   │   ├── community_recipes.py # User recipe submissions & discovery
│   │   │   ├── groups_challenges.py # Diet challenges & group leaderboards
│   │   │   ├── reviews.py        # Recipe ratings & user reviews
│   │   │   ├── export.py         # PDF, CSV, JSON export
│   │   │   ├── ingredients.py    # Regex ingredient parser & 50+ substitution swaps
│   │   │   └── demo.py           # Demo data seeding & reset
│   │   ├── scoring/              # 2023 FSA-NPS Nutri-Score rating engine
│   │   └── tests/                # Unit test suites (Scoring, Community, Caching, Reviews)
│   └── requirements.txt          # Python dependencies
├── frontend-react/               # React SPA
│   ├── src/
│   │   ├── pages/                # 16 Application Pages
│   │   ├── components/           # UI Components (CHEF Hub Sidebar, DailyTargets, Navbar, Modals)
│   │   ├── context/              # Context Providers (Auth, Theme, Toast, Settings)
│   │   └── services/             # Axios API service layer
│   └── package.json              # Frontend dependencies
├── docs/                         # Detailed System Documentation & Architecture Guides
├── scripts/                      # ML training scripts (Food-101 Colab) & data auditors
├── Dockerfile                    # Multi-stage production container build
├── docker-compose.yml            # Development Docker Compose (Postgres + Backend + Frontend)
├── docker-compose.prod.yml       # Production Docker Compose (Postgres + Backend + Nginx)
├── nginx.conf                    # Production reverse proxy configuration
├── SETUP.md                      # Comprehensive installation and environment guide
├── TESTING.md                    # Test execution and verification guide
└── start.sh                      # One-click startup script
```

---

## 📡 Core API Endpoints

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT bearer token | ❌ |
| `POST` | `/api/recipes/search` | Constraint-based recipe search across 7,100+ recipes | ❌ |
| `GET`  | `/api/recipes/daily` | Fetch persistent Recipe of the Day | ❌ |
| `POST` | `/api/detect/image` | YOLOv8 + Food-101 food vision detection & calorie estimation | ❌ |
| `GET`  | `/api/pantry/matched-recipes` | "What Can I Cook" pantry matching with missing-item counts | ✅ |
| `POST` | `/api/pantry/magic-import` | Gemini 1.5 Flash receipt/grocery text parser | ✅ |
| `POST` | `/api/pantry/generate-recipe`| Gemini 1.5 Flash custom recipe synthesis from stock | ✅ |
| `POST` | `/api/nutrition/nutri-score/calculate` | Compute 6-tier FSA-NPS Nutri-Score for custom dishes | ❌ |
| `POST` | `/api/tdee/calculate` | Calculate BMR/TDEE & macro targets with Mifflin-St Jeor | ❌ |
| `GET`  | `/api/profiles/active` | Retrieve active health profile with clinical guidelines | ✅ |
| `GET`  | `/api/mealplan` | Fetch weekly meal plan and aggregated grocery list | ✅ |
| `GET`  | `/api/tracker` | List logged daily food intake and macro totals | ✅ |
| `POST` | `/api/tracker/water` | Log hydration consumption | ✅ |
| `GET`  | `/api/tracker/coach-insights` | Receive AI coaching tips based on daily macro compliance | ✅ |
| `GET`  | `/api/community/posts` | Discover community feed, shared meal plans, and posts | ❌ |
| `POST` | `/api/export/mealplan/pdf` | Export weekly meal plan to formatted PDF | ✅ |

Interactive OpenAPI documentation is available at **http://localhost:8001/docs** (branded Swagger UI) and **http://localhost:8001/redoc**.

---

## 👥 Authors & Capstone Team (IIT Patna)

- **Saba Saeed**
- **Aryan Sah**
- **Banshika Saha**
- **Hemnarayan Sahu**
- **Swastika Sahoo**

---

## 📜 License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE) — free for noncommercial, research, and educational use. Commercial use is prohibited without prior written consent.
