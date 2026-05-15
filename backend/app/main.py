"""
CHEF — Constraint-based Hybrid Eating Framework

Capstone project: a Python 3.14-compatible food assistant API with JWT auth.
  • Ingredient parsing (rule-based regex)
  • Recipe search (7,000+ recipes + optional Spoonacular)
  • Nutrition lookup (350+ foods built-in database)
  • Food detection (YOLOv8 ML computer vision)
  • JWT authentication (signup, login, user profiles)
  • TDEE calculator (Mifflin-St Jeor formula)
  • Weekly meal planner + shopping list generator
  • Ingredient substitutions (20 common swaps)
  • Recipe ratings (1-5 stars)

Run:  python -m uvicorn app.main:app --reload --port 8001
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html

from app.config import settings
from app.database import Base, engine

from app.routers import ingredients, recipes, nutrition, detection, auth_router, tdee, mealplan


# ── Lifespan: create SQLite tables on startup ──────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


# ── App (docs_url=None → we serve custom branded docs below) ──
app = FastAPI(
    title="CHEF — Constraint-based Hybrid Eating Framework",
    version=settings.APP_VERSION,
    description=(
        "A smart food assistant API that parses ingredients, discovers recipes "
        "from a database of **7,000+ dishes**, and provides nutritional insights. "
        "Built with FastAPI + YOLOv8 + SQLite at IIT Patna."
    ),
    contact={
        "name": "IIT Patna · Capstone-I · BS Data Analytics Team",
    },
    license_info={"name": "MIT License"},
    openapi_tags=[
        {"name": "auth",        "description": "Signup, login, and user profile management"},
        {"name": "tdee",        "description": "TDEE calculator — Mifflin-St Jeor formula, macro targets"},
        {"name": "ingredients", "description": "Natural language ingredient parser (rule-based regex)"},
        {"name": "recipes",     "description": "Recipe search, bookmarks, ratings, and daily recipe"},
        {"name": "nutrition",   "description": "Nutrition lookup — 350+ built-in foods"},
        {"name": "detection",   "description": "YOLOv8 computer vision food detection from images"},
        {"name": "mealplan",    "description": "Weekly meal planner and shopping list generator"},
        {"name": "health",      "description": "API health check"},
    ],
    # Disable default docs — we serve custom branded ones below
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

# ── Middleware ─────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)  # Compress responses > 1 KB
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ───────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(tdee.router)
app.include_router(ingredients.router)
app.include_router(recipes.router)
app.include_router(nutrition.router)
app.include_router(detection.router)
app.include_router(mealplan.router)


# ── Custom branded Swagger UI ──────────────────────────────────
_CUSTOM_CSS = """
/* ── CHEF Branded Swagger UI — Light Theme ─────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --chef-orange:  #f97316;
  --chef-amber:   #f59e0b;
  --chef-green:   #16a34a;
  --chef-red:     #dc2626;
  --chef-blue:    #2563eb;
  --chef-bg:      #f8fafc;
  --chef-surface: #ffffff;
  --chef-border:  #e2e8f0;
  --chef-muted:   #64748b;
  --chef-text:    #1e293b;
  --chef-subtle:  #f1f5f9;
}

/* Base */
body { background: var(--chef-bg) !important; font-family: 'Inter', sans-serif !important; }
.swagger-ui { font-family: 'Inter', sans-serif !important; color: var(--chef-text) !important; }
.swagger-ui * { box-sizing: border-box; }

/* ── Top banner ── */
#chef-banner {
  background: linear-gradient(90deg, #ffffff 0%, #fff7ed 50%, #ffffff 100%);
  border-bottom: 3px solid var(--chef-orange);
  padding: 18px 28px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 9999;
  box-shadow: 0 2px 12px rgba(249,115,22,0.10);
}
#chef-banner .chef-logo {
  font-size: 1.9rem;
  background: linear-gradient(135deg, var(--chef-orange), var(--chef-amber));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  letter-spacing: -0.5px;
}
#chef-banner .chef-meta { flex: 1; }
#chef-banner .chef-meta h1 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--chef-text);
}
#chef-banner .chef-meta p {
  margin: 2px 0 0;
  font-size: 0.78rem;
  color: var(--chef-muted);
}
#chef-banner .chef-badge {
  background: linear-gradient(135deg, var(--chef-orange), var(--chef-amber));
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(249,115,22,0.30);
}

/* ── Hide default Swagger topbar ── */
.swagger-ui .topbar { display: none !important; }

/* ── Page wrapper background ── */
.swagger-ui .wrapper { background: var(--chef-bg) !important; }

/* ── Info block ── */
.swagger-ui .info {
  background: var(--chef-surface) !important;
  border-radius: 12px !important;
  padding: 24px !important;
  margin: 20px 0 16px !important;
  border: 1px solid var(--chef-border) !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06) !important;
}
.swagger-ui .info .title { color: var(--chef-orange) !important; font-weight: 700 !important; }
.swagger-ui .info p, .swagger-ui .info li { color: var(--chef-muted) !important; }
.swagger-ui .info a { color: var(--chef-orange) !important; }
.swagger-ui .info .base-url { color: var(--chef-muted) !important; }

/* ── Scheme/server bar ── */
.swagger-ui .scheme-container {
  background: var(--chef-surface) !important;
  border: 1px solid var(--chef-border) !important;
  border-radius: 10px !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
  padding: 12px 20px !important;
}

/* ── Tag group headers ── */
.swagger-ui .opblock-tag {
  background: var(--chef-surface) !important;
  border: 1px solid var(--chef-border) !important;
  border-radius: 10px !important;
  color: var(--chef-text) !important;
  font-size: 0.95rem !important;
  font-weight: 600 !important;
  margin-top: 10px !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
  transition: border-color 0.15s !important;
}
.swagger-ui .opblock-tag:hover { border-color: var(--chef-orange) !important; }
.swagger-ui .opblock-tag small { color: var(--chef-muted) !important; font-weight: 400 !important; }
.swagger-ui .opblock-tag-section { background: var(--chef-bg) !important; }

/* ── Endpoint blocks ── */
.swagger-ui .opblock {
  background: var(--chef-surface) !important;
  border-radius: 8px !important;
  border: 1px solid var(--chef-border) !important;
  margin-bottom: 6px !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
}
.swagger-ui .opblock.opblock-post   { border-left: 4px solid var(--chef-blue) !important; background: #eff6ff !important; }
.swagger-ui .opblock.opblock-get    { border-left: 4px solid var(--chef-green) !important; background: #f0fdf4 !important; }
.swagger-ui .opblock.opblock-put    { border-left: 4px solid var(--chef-amber) !important; background: #fffbeb !important; }
.swagger-ui .opblock.opblock-delete { border-left: 4px solid var(--chef-red) !important; background: #fef2f2 !important; }
.swagger-ui .opblock-summary { background: transparent !important; }
.swagger-ui .opblock-summary-description { color: var(--chef-muted) !important; font-size: 0.85rem !important; }
.swagger-ui .opblock-summary-path { color: var(--chef-text) !important; font-weight: 500 !important; }
.swagger-ui .opblock-summary-path__deprecated { color: var(--chef-muted) !important; }

/* HTTP method badges */
.swagger-ui .opblock-summary-method {
  border-radius: 6px !important;
  font-size: 0.68rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.6px !important;
  min-width: 62px !important;
  text-align: center !important;
}

/* ── Expanded endpoint body ── */
.swagger-ui .opblock-body, .swagger-ui .opblock-section {
  background: var(--chef-surface) !important;
}
.swagger-ui .opblock-description-wrapper p,
.swagger-ui .opblock-external-docs-wrapper p { color: var(--chef-muted) !important; }
.swagger-ui table thead tr th { color: var(--chef-muted) !important; border-color: var(--chef-border) !important; }
.swagger-ui table tbody tr td { color: var(--chef-text) !important; border-color: var(--chef-border) !important; }
.swagger-ui .parameter__name { color: var(--chef-text) !important; font-weight: 500 !important; }
.swagger-ui .parameter__type { color: var(--chef-blue) !important; font-size: 0.8rem !important; }
.swagger-ui .parameter__deprecated { color: var(--chef-muted) !important; }
.swagger-ui .parameter-item { border-color: var(--chef-border) !important; }

/* ── Buttons ── */
.swagger-ui .btn.execute {
  background: linear-gradient(135deg, var(--chef-orange), var(--chef-amber)) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 8px !important;
  font-weight: 700 !important;
  box-shadow: 0 2px 8px rgba(249,115,22,0.25) !important;
  transition: opacity 0.15s !important;
}
.swagger-ui .btn.execute:hover { opacity: 0.88 !important; }
.swagger-ui .btn.cancel {
  border-color: var(--chef-border) !important;
  color: var(--chef-muted) !important;
  border-radius: 8px !important;
}
.swagger-ui .btn.authorize {
  border-color: var(--chef-green) !important;
  color: var(--chef-green) !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
}
.swagger-ui .btn.try-out__btn {
  border-color: var(--chef-orange) !important;
  color: var(--chef-orange) !important;
  border-radius: 6px !important;
}

/* ── Models / Schemas section ── */
.swagger-ui section.models {
  background: var(--chef-surface) !important;
  border: 1px solid var(--chef-border) !important;
  border-radius: 10px !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
}
.swagger-ui section.models h4 { color: var(--chef-orange) !important; }
.swagger-ui .model-box { background: var(--chef-subtle) !important; border-radius: 6px !important; }
.swagger-ui .model, .swagger-ui .model-title { color: var(--chef-text) !important; }
.swagger-ui .model span { color: var(--chef-muted) !important; }
.swagger-ui .prop-type { color: var(--chef-blue) !important; }
.swagger-ui .prop-format { color: var(--chef-muted) !important; }

/* ── Inputs, textareas, selects ── */
.swagger-ui input[type=text], .swagger-ui input[type=email],
.swagger-ui textarea, .swagger-ui select {
  background: var(--chef-subtle) !important;
  border: 1px solid var(--chef-border) !important;
  border-radius: 6px !important;
  color: var(--chef-text) !important;
}
.swagger-ui input[type=text]:focus,
.swagger-ui input[type=email]:focus,
.swagger-ui textarea:focus {
  border-color: var(--chef-orange) !important;
  outline: 2px solid rgba(249,115,22,0.15) !important;
}

/* ── Filter bar ── */
.swagger-ui .operation-filter-input {
  background: var(--chef-surface) !important;
  border: 1px solid var(--chef-border) !important;
  border-radius: 8px !important;
  color: var(--chef-text) !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
}

/* ── Response section ── */
.swagger-ui .responses-wrapper { background: var(--chef-subtle) !important; border-radius: 8px !important; }
.swagger-ui .response-col_status { color: var(--chef-green) !important; font-weight: 600 !important; }
.swagger-ui .response-col_description { color: var(--chef-muted) !important; }
.swagger-ui .highlight-code {
  background: var(--chef-subtle) !important;
  border-radius: 8px !important;
  border: 1px solid var(--chef-border) !important;
}
.swagger-ui .microlight { color: var(--chef-text) !important; }

/* ── Arrow icons ── */
.swagger-ui .arrow { fill: var(--chef-muted) !important; }

/* ── Markdown inside descriptions ── */
.swagger-ui .markdown p, .swagger-ui .markdown li { color: var(--chef-muted) !important; }
.swagger-ui .markdown code { background: var(--chef-subtle) !important; color: var(--chef-orange) !important; border-radius: 4px !important; padding: 1px 5px !important; }

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--chef-bg); }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--chef-orange); }
"""


_BANNER_JS = """
document.addEventListener('DOMContentLoaded', function () {
  const banner = document.createElement('div');
  banner.id = 'chef-banner';
  banner.innerHTML = `
    <div class="chef-logo">👨‍🍳 CHEF</div>
    <div class="chef-meta">
      <h1>Constraint-based Hybrid Eating Framework</h1>
      <p>IIT Patna · Capstone-I · UG Computer Science & Data Analytics · 2026</p>
    </div>
    <span class="chef-badge">FastAPI Docs</span>
  `;
  document.body.prepend(banner);
});
"""


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui():
    """Serve the custom CHEF-branded Swagger UI."""
    html = get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title="CHEF API — Swagger UI",
        swagger_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
        swagger_ui_parameters={
            "deepLinking": True,
            "displayRequestDuration": True,
            "filter": True,
            "syntaxHighlight.theme": "monokai",
            "tryItOutEnabled": True,
            "persistAuthorization": True,
            "docExpansion": "none",
        },
    )
    # Inject custom CSS and banner JS into the returned HTML
    custom_html = html.body.decode("utf-8").replace(
        "</head>",
        f"<style>{_CUSTOM_CSS}</style></head>",
    ).replace(
        "</body>",
        f"<script>{_BANNER_JS}</script></body>",
    )
    return HTMLResponse(content=custom_html)


@app.get("/redoc", include_in_schema=False)
async def custom_redoc():
    """Serve the ReDoc documentation page."""
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title="CHEF API — ReDoc",
        redoc_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
    )


# ── Health check ──────────────────────────────────────────────
@app.get("/api/health", tags=["health"])
def health_check():
    """API health check — returns current feature configuration."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "features": {
            "ingredient_parsing": "rule_based",
            "recipe_search": "spoonacular" if settings.SPOONACULAR_API_KEY else "demo",
            "nutrition": "built_in_db_350_foods",
            "food_detection": "yolov8_ml",
            "authentication": "jwt_bcrypt",
            "meal_planner": "enabled",
            "tdee_calculator": "mifflin_st_jeor",
        },
    }


# ── Serve React frontend (production build) ───────────────────
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend-react" / "dist"

if FRONTEND_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        path = FRONTEND_DIR / full_path
        if path.is_file():
            return FileResponse(str(path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))
