# System Architecture & Technical Specification — CHEF

This document provides a comprehensive technical reference detailing the architecture, component topology, data flows, and subsystem specifications of the **CHEF (Constraint-based Hybrid Eating Framework)** platform.

---

## 🏛️ High-Level System Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT TIER (BROWSER)                            │
│                                                                             │
│  React 19 SPA (Port 5173 Dev / Port 80 Prod via Nginx)                      │
│  ├── 16 Client Pages (Kitchen, Recipes, Pantry, Tracker, Community, etc.)  │
│  ├── Context Providers (Auth, Theme, Settings, Toast)                      │
│  └── Dynamic Glassmorphism UI & Micro-animations                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                         HTTP / REST API Requests
                         (Proxied to :8001 via Vite/Nginx)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FASTAPI APPLICATION TIER                           │
│                               (Port 8001)                                   │
│                                                                             │
│  Middleware Pipeline:                                                       │
│  ├── GZip Compression (Responses > 1 KB)                                    │
│  ├── CORS Middleware (Cross-Origin Resource Sharing)                        │
│  └── SlowAPI Rate Limiting (OWASP A07 Brute-Force Defense)                  │
│                                                                             │
│  20 API Route Modules:                                                      │
│  ├── auth_router        ├── recipes            ├── pantry                   │
│  ├── detection          ├── nutrition          ├── mealplan                 │
│  ├── nutrition_tracker  ├── tdee               ├── tdee_adaptive            │
│  ├── profiles           ├── health_engine      ├── weight                   │
│  ├── diet_planner       ├── community_feed     ├── community_recipes        │
│  ├── groups_challenges  ├── reviews            ├── export                   │
│  ├── ingredients        └── demo                                            │
│                                                                             │
│  In-Memory Performance Cache:                                               │
│  └── cachetools.TTLCache (Raw Nutrition Cache & Nutri-Score Cache)          │
└───────────────────────┬───────────────────────────────┬─────────────────────┘
                        │                               │
        SQLAlchemy ORM  │               Async HTTP      │  Inference / API
        (Dual-Backend)  │                               │
                        ▼                               ▼
┌──────────────────────────────┐  ┌───────────────────────────────────────────┐
│       PERSISTENCE TIER       │  │             AI & ML SUBSYSTEM             │
│                              │  │                                           │
│ Local: SQLite (chef.db)      │  │ • YOLOv8 Nano: Food-101 (101 Classes)     │
│ Prod:  PostgreSQL 16         │  │   + Bounding Box Portion Geometry         │
│ Schema Migrations: Alembic   │  │ • Google Gemini 1.5 Flash (Receipts & AI) │
└──────────────────────────────┘  └───────────────────────────────────────────┘
```

---

## ⚙️ Backend Architecture & Router Catalog

The backend application is structured around **FastAPI 0.115+** running on Python 3.14+, organized into modular routers under `backend/app/routers/`:

| Router | File | Purpose & Endpoints |
| :--- | :--- | :--- |
| **Authentication** | `auth_router.py` | User registration, password hashing (bcrypt), JWT generation, session verification. |
| **Recipes** | `recipes.py` | Multi-constraint search (calories, prep time, diets), persistent Daily Recipe, bookmarks. |
| **Pantry & What-to-Cook** | `pantry.py` | Inventory CRUD, "What Can I Cook" matching, receipt OCR import, ingredient deduction. |
| **Computer Vision** | `detection.py` | Multi-tier YOLOv8 + Food-101 inference, portion estimation, fallback mock detection. |
| **Nutrition Lookup** | `nutrition.py` | Search across 350+ base ingredients, custom recipe nutrition calculator. |
| **Nutri-Score Engine** | `scoring/calculator.py` | 6-tier FSA-NPS 2023 algorithm ($S, A, B, C, D, E$) with category-specific thresholds. |
| **Meal Planner** | `mealplan.py` | Weekly drag-and-drop calendar slots, aggregated grocery list generator. |
| **Nutrition Tracker** | `nutrition_tracker.py` | Daily food intake logging, water tracking, day-copy, automated AI coach insights. |
| **TDEE Engine** | `tdee.py` | Mifflin-St Jeor basal metabolic rate and macronutrient distribution calculator. |
| **Adaptive Telemetry** | `tdee_adaptive.py` | Dynamic expenditure recalibration driven by logged consumption vs weight velocity. |
| **Profile Center** | `profiles.py` | Health profiles, physical stats, allergen preferences, target calories. |
| **Clinical Health Engine**| `health_engine.py` | Algorithmic dietary adaptations for Diabetes, Hypertension, PCOS, Thyroid, Kidney, GERD. |
| **Weight Telemetry** | `weight.py` | Historical weigh-in logs, rate of weight change, and milestone analytics. |
| **Diet Planner** | `diet_planner.py` | Automated multi-day therapeutic meal plan synthesis based on clinical conditions. |
| **Community Feed** | `community_feed.py` | Social timeline, user posts, recipe shares, likes, and comment threads. |
| **Community Recipes** | `community_recipes.py` | User-submitted custom recipes, public indexing, and community approval. |
| **Groups & Challenges** | `groups_challenges.py` | Dietary challenges (e.g., 7-Day Hydration), participant leaderboards, streaks. |
| **Reviews & Ratings** | `reviews.py` | 1–5 star recipe ratings, verified user reviews, and sentiment summaries. |
| **Export Service** | `export.py` | Formatted PDF export (via ReportLab), CSV spreadsheets, and raw JSON downloads. |
| **Ingredients & Parser**| `ingredients.py` | Regex natural language quantity parser and 50+ substitution swaps. |

---

## 💾 Dual-Backend Persistence Layer

CHEF supports two swappable database environments controlled by environment variables in `.env`:

1. **Development Mode (SQLite)**:
   - Connection: `sqlite:///./chef.db`
   - Zero configuration, zero external service dependencies.
   - Startup initialization: `lifespan` handler automatically runs `Base.metadata.create_all(bind=engine)` and verifies columns.
2. **Production Mode (PostgreSQL 16)**:
   - Connection: `postgresql+pg8000://user:pass@host:5432/db`
   - Multi-container concurrency and connection pooling.
   - Migrations executed deterministically via `alembic upgrade head`.

---

## 🧠 AI & Machine Learning Pipeline

### 1. Vision Inference Flow (`detection.py`)
- **Primary Tier (`yolov8_food101.pt`)**: YOLOv8 Nano fine-tuned on the ETH Food-101 benchmark dataset identifying 101 prepared dish classes.
- **Portion Estimation**: Geometric analysis evaluates normalized bounding box area:
  $$\text{Area} = (x_2 - x_1)(y_2 - y_1)$$
  Portion weight is derived against a 25% image frame baseline and calibrated against dish density lookup tables.
- **Secondary Tier (`yolov8n.pt`)**: Pre-trained COCO baseline identifying 10 common raw ingredients.
- **Resilience Tier**: Heuristic mock detection ensuring that demo platforms (e.g. Hugging Face Spaces free tier) function seamlessly when PyTorch wheels are omitted.

### 2. Generative Multimodal AI (`pantry.py`)
- **Receipt & Text Ingestion**: Employs Google Gemini 1.5 Flash (`generateContent`) to extract structured ingredient names, quantities, storage locations, and estimated shelf lives from unstructured text or receipts.
- **Surprise Me Recipe Synthesis**: Generates chef-grade, zero-waste recipes restricted exclusively to currently logged pantry ingredients.

---

## 🛡️ Security & Performance Architecture

- **OWASP A07 Brute-Force Protection**: Endpoint rate limiting enforced by SlowAPI (`10/minute` on login/auth routes).
- **Session Security**: Stateless JWTs signed with `HS256`. If no `JWT_SECRET_KEY` is provided in `.env`, the server generates a cryptographically secure random 256-bit secret on boot to prevent default key vulnerabilities.
- **Transfer Optimization**: GZip middleware automatically compresses JSON payloads exceeding 1,000 bytes.
- **In-Memory Caching**: `cachetools.TTLCache` caches parsed nutritional entities and computed Nutri-Scores to reduce database and CPU overhead.
