# Dataset, Nutrition, and Culinary Sources

This document details the data provenance, nutritional calibration standards, and recipe curation methodologies utilized across the **CHEF** platform.

---

## 🥗 Nutritional Calibration Standards

### 1. USDA FoodData Central & ICMR-NIN Recalibration
- **Base Database**: Per-100g nutritional compositions across 350+ base ingredients derived from USDA FoodData Central foundation foods.
- **Indian Culinary Recalibration**: Recalibrated against ICMR-NIN (Indian Council of Medical Research — National Institute of Nutrition) *Indian Food Composition Tables (IFCT)*. Special attention was applied to authentic regional staples (paneer, desi ghee, mustard oil, sattu, besan, atta, ragi, moong/chana/urad dals, and Indian spices).
- **Technique-Aware Fat & Moisture Scaling**: Accounted for thermal moisture evaporation and cooking fat absorption across roasting, boiling, pressure cooking, shallow frying, and deep frying techniques to ensure caloric integrity across all 5,250 curated local recipes.

---

## 📖 Recipe Repository Architecture

### 1. Curated Local Recipe Dataset (`recipes.json`)
- **Scale**: 5,250 fully parsed and normalized recipes (~7.4 MB).
- **Geographic Coverage**: Rich representation of Indian regional cuisines (Bihari, Punjabi, South Indian, Bengali, Gujarati, Maharashtrian) alongside popular Continental, Mediterranean, East Asian, and Mexican preparations.
- **Dietary Tagging**: Explicit Boolean tagging for `vegetarian`, `vegan`, `gluten_free`, `dairy_free`, `keto`, and `high_protein`.
- **Nutri-Score Enrichment**: Pre-computed 6-tier Nutri-Score ($S, A, B, C, D, E$) with positive (fiber, protein, FVL%) and negative (energy, sat fat, sugars, sodium) nutrient breakdowns.

### 2. Live Spoonacular API Integration
- **Distribution Ratio**: Configured with a 70/30 World-to-Indian ratio to broaden global gastronomy while prioritizing local culinary accessibility.
- **Dietary Priority**: Prioritizes vegetarian and allergen-free alternatives when user profiles indicate dietary constraints.
- **Persistent Daily Recipe Cache**: Implements `daily_recipe_cache.json` ensuring that the selected Recipe of the Day remains persistent for 24 hours across all user sessions before automatically refreshing.

---

## 🔄 Ingredient Substitutions Database (`substitutions.json`)

- **Scale**: 50+ common culinary swaps covering dairy, grain, egg, sweetener, and protein alternatives.
- **Contextual Categories**:
  - **Allergy Replacements**: Gluten-free flours (almond flour, oat flour, coconut flour), dairy-free milk/butter (oat milk, almond milk, olive oil).
  - **Health & Low-Calorie**: Greek yogurt for sour cream/mayo, applesauce for baking oil, cauliflower rice for white rice.
  - **Cultural & Regional**: Sattu for whey protein, tofu for paneer, jaggery for refined white sugar.

---

## 📷 Computer Vision Datasets

- **ETH Zurich Food-101**: 101,000 images across 101 prepared dish classes used for fine-tuning YOLOv8 Nano (`yolov8_food101.pt`).
- **MS COCO (Common Objects in Context)**: 10 primary food indices (banana, apple, sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake) used as a lightweight baseline detection tier (`yolov8n.pt`).
