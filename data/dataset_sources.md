# Dataset and Nutrition Sources

This repository uses a curated, offline SQLite database for demonstration purposes to avoid API rate limits during academic evaluation.

## Sources
1. **USDA FoodData Central**: Base nutritional values for the 350+ food items were referenced from the USDA database (per-100g basis). Covers proteins, dairy, grains, pulses, vegetables, fruits, nuts, oils, spices, sweeteners, and beverages — including localized Indian ingredients (paneer, ghee, dal, sattu, roti, etc.).
2. **Spoonacular Demo Data**: Recipe structures and images were adapted from open recipe APIs and cached locally. A unified dataset (`recipes.json`, ~7.4 MB, 7,100+ recipes) provides broad coverage of Indian regional cuisines (Bihar, North Indian, South Indian) plus snacks, non-veg, and desserts.
3. **YOLOv8 Computer Vision**: The `detection.py` module uses a **real YOLOv8 Nano** pre-trained model (`yolov8n.pt`) for food object detection. It filters predictions to 10 COCO food class indices (banana, apple, sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake) with a 0.25 confidence threshold.
4. **Ingredient Substitutions**: Hand-curated `substitutions.json` mapping 20 common ingredients to 3–5 healthier or allergy-safe alternatives.

## Data Preprocessing
- Constraints (calories, prep time) were normalized.
- Text parsing dictionaries were hand-crafted to catch common Indian/Western ingredient nomenclatures.
- Extended nutrition data (`nutrition_extra.json`) supplements the in-line database with rarer/global foods.

*Note: For live recipe data, configure the `SPOONACULAR_API_KEY` in the backend `.env` file.*
