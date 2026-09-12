# CHEF — Setup & Installation Guide

This document covers the in-depth setup process for local development, production deployment, database configuration, and testing for the **CHEF (Constraint-based Hybrid Eating Framework)** platform.

---

## 1. Prerequisites

- **Python 3.14+**: Recommended for optimal Asyncio performance.
- **Node.js 18+ & npm 9+**: Required for the React 19 / Vite 8 frontend.
- **Git**: For cloning and branch management.
- **Docker & Docker Compose** (Optional): For containerized local development with PostgreSQL or production deployment.

---

## 2. Environment Variables Configuration

Create a `.env` file in the `backend/` directory (or use root environment variables when running Docker).

Sample `backend/.env`:
```env
# ── Application Settings ──
APP_NAME="CHEF"
DEBUG=false

# ── CORS Settings (Comma-separated origins) ──
CORS_ORIGINS="http://localhost:5173,http://localhost:5174,http://localhost:8001"

# ── Database Configuration ──
# Option A: Local SQLite (default for development)
DATABASE_BACKEND="sqlite"
DATABASE_URL="sqlite:///./chef.db"

# Option B: PostgreSQL (production or docker-compose)
# DATABASE_BACKEND="postgresql"
# DATABASE_URL="postgresql+pg8000://chef_user:chef_dev_pass@localhost:5432/chef_db"

# ── JWT Authentication ──
# Set a persistent secret key for sessions to survive server restarts
JWT_SECRET_KEY="your-secure-random-secret-key-at-least-32-chars"
JWT_ALGORITHM="HS256"
JWT_EXPIRY_MINUTES=30

# ── Optional External APIs (Falls back to demo/local data if omitted) ──
# Google Gemini 1.5 Flash (for receipt parsing & custom pantry recipe generator)
GEMINI_API_KEY=""

# Spoonacular API (for live recipe search expansion)
SPOONACULAR_API_KEY=""

# Edamam Nutrition API (for additional nutritional lookups)
EDAMAM_APP_ID=""
EDAMAM_APP_KEY=""
```

---

## 3. Running the Application Locally

### Option A: One-Click Startup Script (Recommended)
```bash
./start.sh
```
This script boots both the FastAPI backend on port `8001` and the Vite React frontend on port `5173` with automatic process monitoring and unified shutdown (`Ctrl+C`).

---

### Option B: Manual Startup

#### 1. Backend Server
```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8001
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```
- API Root: `http://localhost:8001`
- Swagger UI Documentation: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

#### 2. Frontend Development Server
```bash
cd frontend-react

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open **http://localhost:5173** in your browser. All `/api/*` endpoints are automatically proxied to `http://127.0.0.1:8001`.

---

## 4. Docker Deployment

CHEF provides complete Docker configurations for both development and production.

### Development with PostgreSQL
Starts PostgreSQL 16, the FastAPI backend, and the Vite React dev server with volume mounts for hot reloading:
```bash
# Start all services in the background
docker compose up -d

# View container logs
docker compose logs -f

# Stop all services
docker compose down

# Reset database volume for a clean start
docker compose down -v
```

### Production Deployment
Uses the multi-stage `Dockerfile` and `docker-compose.prod.yml` to build an optimized React production bundle served via Nginx with reverse proxy to Uvicorn:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 5. Database Initialization & Migrations

CHEF handles database initialization and schema safety automatically on server startup via the FastAPI `lifespan` handler:
1. It attempts to run Alembic migrations (`alembic upgrade head`).
2. If Alembic is not initialized or running in lightweight mode, it automatically calls `Base.metadata.create_all(bind=engine)`.
3. It performs schema safety checks to dynamically verify and add missing columns (e.g., allergens, health conditions, pantry shelf-life).

### Manual Migrations
To manage migrations explicitly using Alembic:
```bash
cd backend
source .venv/bin/activate

# Apply latest migrations
alembic upgrade head

# Generate a new migration after updating models.py
alembic revision --autogenerate -m "Add new feature columns"
```

To seed demo data:
```bash
# Execute demo seeder script or trigger via API
curl -X POST http://localhost:8001/api/demo/seed
```

---

## 6. Running Tests & Verifications

To ensure stability across the scoring engine, community modules, and UI:

```bash
# Run Nutri-Score & Nutritional Engine unit tests
backend/.venv/bin/python -m unittest discover -s backend/app/scoring/tests

# Run Backend Application & Router unit tests
backend/.venv/bin/python -m unittest discover -s backend/app/tests

# Verify Frontend Production Build
cd frontend-react && npm run build
```

See [`TESTING.md`](TESTING.md) for full details on test coverage and execution.
