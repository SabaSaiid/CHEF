"""
CHEF — Constraint-based Hybrid Eating Framework

Capstone project: a Python 3.14-compatible food assistant API with JWT auth.
  • Ingredient parsing (rule-based)
  • Recipe search (demo data + optional Spoonacular)
  • Nutrition lookup (built-in database)
  • Food detection (rule-based demo)

Run:  python -m uvicorn app.main:app --reload
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import Base, engine


# ── Lifespan: create SQLite tables on startup ──────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


# ── App ────────────────────────────────────────────────────────
app = FastAPI(
    title="CHEF — Constraint-based Hybrid Eating Framework",
    version="1.0.0",
    description="A smart food assistant that parses ingredients, discovers recipes, and provides nutritional insights.",
    contact={
        "name": "Capstone Project 1 of Indian Institute of Technology Patna, Bachelor of Science in Data Analytics Team"    },
    license_info={
        "name": "MIT License",
    },
    openapi_tags=[
        {"name": "authors", "description": "Saba Saeed, Aryan Sah, Banshika Saha, Hemnarayan Sahu, Swastika Sahoo"}
    ],
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register routers ──────────────────────────────────────────
from app.routers import ingredients, recipes, nutrition, detection, auth_router, tdee, substitutions, mealplan  # noqa: E402

app.include_router(auth_router.router)
app.include_router(tdee.router)
app.include_router(ingredients.router)
app.include_router(recipes.router)
app.include_router(nutrition.router)
app.include_router(detection.router)
app.include_router(substitutions.router)
app.include_router(mealplan.router)


# ── Health check ──────────────────────────────────────────────
@app.get("/api/health", tags=["health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "features": {
            "ingredient_parsing": "rule_based",
            "recipe_search": "spoonacular" if settings.SPOONACULAR_API_KEY else "demo",
            "nutrition": "demo",
            "food_detection": "rule_based_demo",
        },
    }


# ── Serve frontend ────────────────────────────────────────────
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend-react" / "dist"

if FRONTEND_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend")
    
    # We also need to serve assets from the root correctly or just depend on the default routing
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        path = FRONTEND_DIR / full_path
        if path.is_file():
            return FileResponse(str(path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))
