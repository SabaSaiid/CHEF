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
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Quick Start (Windows)

```bash
# 1. Navigate to the backend
cd backend

# 2. Create a virtual environment (optional but recommended)
python -m venv .venv
.venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the server
python -m uvicorn app.main:app --reload
```

Then open **http://127.0.0.1:8000** in your browser.

## Features

| Feature | Method | Notes |
|---------|--------|-------|
| Ingredient Parsing | Rule-based regex | Handles quantities, units, fractions |
| Recipe Search | Demo data (10 recipes) | Set `SPOONACULAR_API_KEY` in `.env` for real API |
| **Constraint Filtering** | Diet, calories, cook time | Filter recipes by vegetarian/vegan/keto/gluten-free/high-protein, max kcal, max minutes |
| Nutrition Lookup | Built-in database (30+ foods) | Per-100g values, scales by quantity |
| Food Detection | Filename keyword matching | Demo only — not real ML |
| Save Recipes | SQLite database | Persists between restarts |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/ingredients/parse` | Parse ingredient text |
| POST | `/api/recipes/search` | Search recipes by ingredients |
| POST | `/api/recipes/save` | Save a recipe |
| GET | `/api/recipes/saved` | List saved recipes |
| DELETE | `/api/recipes/saved/{id}` | Delete a saved recipe |
| POST | `/api/nutrition/analyze` | Look up nutrition data |
| POST | `/api/detect/image` | Detect food in image (demo) |

## Project Structure

```
Chef1/
├── backend/
│   ├── .env                 # Configuration (all API keys optional)
│   ├── requirements.txt     # Python 3.14-safe dependencies
│   └── app/
│       ├── main.py          # FastAPI app entry point
│       ├── config.py        # Settings from .env
│       ├── database.py      # SQLite engine + session
│       ├── models.py        # ORM models (SavedRecipe)
│       ├── schemas.py       # Pydantic schemas
│       └── routers/
│           ├── ingredients.py
│           ├── recipes.py
│           ├── nutrition.py
│           └── detection.py
├── frontend/
│   ├── index.html           # Single-page app shell
│   ├── style.css            # Dark theme styles
│   └── app.js               # All frontend logic
└── README.md
```

## Configuration

Edit `backend/.env` to configure:

- **`DATABASE_URL`** — defaults to `sqlite:///./chef.db`
- **`SPOONACULAR_API_KEY`** — optional, enables real recipe search
- **`DEBUG`** — set to `false` in production

## Tech Stack

- **Python 3.14** + FastAPI + SQLAlchemy (sync) + SQLite
- **Frontend**: plain HTML/CSS/JS (no build step)
- **Zero compiled dependencies** — everything installs with `pip`

## Future Enhancements

> **Note:** This is a **beta / prototype release** (March 2026). The current version delivers a fully functional core flow — ingredient parsing, constraint-based recipe search, nutrition lookup, and food detection. Features listed below are planned for future iterations and will be updated according to convenience and project needs.

| Feature | Description |
|---------|-------------|
| User Authentication | JWT-based signup/login to enable personal saved recipes and preferences per user |
| Meal Planner | Weekly meal planning calendar — assign saved recipes to days of the week |
| Ingredient Substitution | Rule-based lookup for ingredient swaps (e.g., "No butter? Use olive oil") |
| Recipe Ratings | Star rating system on saved recipes with sort-by-rating support |
| Shopping List Generator | Auto-aggregate ingredients from selected recipes into a printable shopping list |
| Print / Export Recipe | Download or print a recipe as a clean text or PDF format |
| Daily Nutrition Tracker | Log daily food intake with running calorie/protein/carb totals and history |
| User Profile + TDEE Calculator | Input age, weight, height, activity level to calculate recommended daily intake |
| Recipe of the Day | Randomly featured recipe on the dashboard to encourage exploration |
| Search History | Show recent ingredient searches for quick re-access |
| Dark / Light Theme Toggle | User-selectable theme preference (currently dark-only) |
