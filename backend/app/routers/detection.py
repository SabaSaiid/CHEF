"""
Food detection router — RULE-BASED DEMO (no real ML).
Accepts an image filename and uses keyword matching to guess food items.
Clearly labeled as a demo feature.
"""

from fastapi import APIRouter, UploadFile, File
from app.schemas import DetectionResult, DetectedFood

router = APIRouter(prefix="/api/detect", tags=["detection"])

# ── Keyword-to-food mapping for demo detection ─────────────────
FOOD_KEYWORDS: dict[str, str] = {
    "pizza": "pizza",
    "burger": "burger",
    "sandwich": "sandwich",
    "salad": "salad",
    "pasta": "pasta",
    "spaghetti": "pasta",
    "noodle": "noodles",
    "rice": "rice",
    "chicken": "chicken",
    "steak": "beef steak",
    "beef": "beef",
    "fish": "fish",
    "salmon": "salmon",
    "sushi": "sushi",
    "soup": "soup",
    "bread": "bread",
    "cake": "cake",
    "pie": "pie",
    "egg": "eggs",
    "fruit": "mixed fruit",
    "apple": "apple",
    "banana": "banana",
    "orange": "orange",
    "tomato": "tomato",
    "potato": "potato",
    "fries": "french fries",
    "taco": "taco",
    "burrito": "burrito",
    "curry": "curry",
    "pancake": "pancakes",
    "waffle": "waffles",
    "ice cream": "ice cream",
    "smoothie": "smoothie",
    "donut": "donut",
    "cookie": "cookies",
}


def _detect_from_filename(filename: str) -> list[DetectedFood]:
    """Try to detect food from the filename using keyword matching."""
    name_lower = filename.lower()
    detected = []
    for keyword, food in FOOD_KEYWORDS.items():
        if keyword in name_lower:
            detected.append(DetectedFood(
                label=food,
                confidence=0.75,
                ingredient=food,
            ))
    return detected


@router.post("/image", response_model=DetectionResult)
async def detect_food(file: UploadFile = File(...)):
    """
    🧪 DEMO: Rule-based food detection from image filename.

    This is NOT real ML/computer vision — it simply matches keywords
    in the uploaded filename against a list of known foods.

    Upload a file named like "chicken_salad.jpg" or "pizza.png" to see results.
    In a production version, this would use a real image classification model.
    """
    filename = file.filename or "unknown"

    # Read and discard the file content (we only use the filename for demo)
    await file.read()

    detected = _detect_from_filename(filename)

    if not detected:
        return DetectionResult(
            detected_foods=[],
            ingredients=[],
            message=(
                f"No food detected in '{filename}'. "
                "This is a demo — try naming your file with a food keyword "
                "(e.g., 'chicken_salad.jpg', 'pizza.png')."
            ),
            method="rule_based_demo",
        )

    ingredients = list({d.ingredient for d in detected})

    return DetectionResult(
        detected_foods=detected,
        ingredients=ingredients,
        message=f"Detected {len(detected)} food(s) from filename (rule-based demo).",
        method="rule_based_demo",
    )
