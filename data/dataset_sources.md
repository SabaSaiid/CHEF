# Dataset and Nutrition Sources

This repository uses a curated, offline SQLite database for demonstration purposes to avoid API rate limits during academic evaluation.

## Sources
1. **USDA FoodData Central**: Base nutritional values for the 30+ core ingredients were referenced from the USDA database (Per 100g basis).
2. **Spoonacular Demo Data**: Recipe structures and images were adapted from open recipe APIs and cached locally.
3. **Dummy ML Labels**: The `detection.py` module utilizes a hardcoded keyword-matching heuristic. In a production ML pipeline, this would be replaced with a YOLOv8 or ResNet-50 image classification model trained on the Food-101 Dataset.

## Data Preprocessing
- Constraints (calories, prep time) were normalized.
- Text parsing dictionaries were hand-crafted to catch common Indian/Western ingredient nomenclatures.

*Note: For live data, please configure the `SPOONACULAR_API_KEY` in the backend `.env` file.*
