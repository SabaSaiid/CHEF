# Testing & Verification Guide — CHEF

This guide outlines the testing strategy, test suites, execution commands, and validation benchmarks for the **CHEF (Constraint-based Hybrid Eating Framework)** application.

---

## 🧪 Test Architecture Overview

CHEF employs a multi-tiered testing strategy spanning unit tests, nutritional validation benchmarks, caching integrity tests, and production build checks:

```
                      ┌─────────────────────────────────────────┐
                      │          CHEF TEST STRATEGY             │
                      └────────────────────┬────────────────────┘
                                           │
         ┌─────────────────────────────────┼────────────────────────────────┐
         │                                 │                                │
         ▼                                 ▼                                ▼
┌─────────────────┐             ┌─────────────────────┐          ┌────────────────────┐
│ Scoring Engine  │             │ Application Routers │          │ Frontend Client    │
│ & Nutri-Score   │             │ & State Management  │          │ Production Build   │
│ (17 Unit Tests) │             │ (6 Integration Tests│          │ (Vite 8 Compiler)  │
└─────────────────┘             └─────────────────────┘          └────────────────────┘
```

---

## 🚀 Running Test Suites

### 1. Nutri-Score & Scoring Engine Test Suite
Validates the FSA-NPS 2023 algorithm, S-Tier bonus criteria, South Asian dish benchmarks, portion estimators, and dietary adjustments:

```bash
# Execute using Python unittest from project root
backend/.venv/bin/python -m unittest discover -s backend/app/scoring/tests
```

**Coverage Areas:**
- `test_calculator.py`: Evaluates positive points, negative points, and final tier assignment across solid, beverage, cheese, and fat matrices.
- `test_indian_validation.py`: Verifies that authentic South Asian dishes (Moong Dal, Palak Paneer, Baingan Bharta) are scored without ghee/oil penalty skew.
- `test_nutri_score_enhancements.py`: Tests boundary conditions, extreme nutrient values, and S-Tier validation.
- `test_nutrition_tracker.py`: Tests daily calorie/macro summation, progress percentages, and hydration tracking logic.
- `test_pantry_enhancements.py`: Tests ingredient matching logic, missing item calculations, and inventory deduction.
- `test_profile_enhancements.py`: Verifies clinical condition adjustments for Diabetes, Hypertension, PCOS, and Thyroid.

---

### 2. Backend Application & Router Test Suite
Tests in-process TTL caching, community social feeds, recipe submissions, reviews, and demo seeders:

```bash
# Execute using Python unittest from project root
backend/.venv/bin/python -m unittest discover -s backend/app/tests
```

**Coverage Areas:**
- `test_caching.py`: Validates that `cachetools.TTLCache` correctly caches raw nutrition and Nutri-Score lookups while properly expiring entries.
- `test_community_module.py`: Tests community post creation, feed retrieval, recipe sharing, and challenges.
- `test_reviews.py`: Verifies recipe star ratings (1–5 scale), review persistence, and average score calculations.
- `test_community_demo_seeder.py`: Validates deterministic database seeding for demonstration environments.

---

### 3. Frontend Production Build Verification
Ensures that all React 19 JSX components, React Router 7 paths, CSS styling tokens, and Lucide icons compile without syntax or bundle errors:

```bash
cd frontend-react
npm run build
```

Expected output:
```
✓ built in ~300ms
dist/index.html
dist/assets/index-*.css
dist/assets/index-*.js
```

---

## 🔍 Manual End-to-End Verification (API Smoke Test)

With the backend running (`./start.sh` or `python -m uvicorn app.main:app --port 8001`):

### 1. Health & Status Check
```bash
curl -s http://127.0.0.1:8001/api/health | jq .
```

### 2. Recipe of the Day Check
```bash
curl -s http://127.0.0.1:8001/api/recipes/daily | jq .title
```

### 3. Ingredient Parser Check
```bash
curl -s -X POST http://127.0.0.1:8001/api/ingredients/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "2 cups of whole wheat flour and 1/2 tsp salt"}' | jq .
```

### 4. Nutri-Score On-Demand Calculation
```bash
curl -s -X POST http://127.0.0.1:8001/api/nutrition/nutri-score/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "energy_kj": 650,
    "sugars_g": 2.5,
    "saturated_fat_g": 0.8,
    "sodium_mg": 120,
    "fiber_g": 5.2,
    "protein_g": 9.4,
    "fvl_percent": 65,
    "category": "general"
  }' | jq .
```
Expected output tier: `S` or `A`.
