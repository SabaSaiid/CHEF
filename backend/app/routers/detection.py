"""
Food detection router — Advanced ML Pipeline (YOLOv8 + Food-101).

Supports two model tiers:
  1. "food101" — custom YOLOv8 trained on Food-101 (101 dish classes)
  2. "basic"   — stock YOLOv8n with 10 COCO food classes (fallback)

Includes portion size estimation based on bounding box area ratios.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
import io
import math
from PIL import Image
from app.schemas import DetectionResult, DetectedFood, BoundingBox

router = APIRouter(prefix="/api/detect", tags=["detection"])

# ── Upload constraints ──────────────────────────────────────────
_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB hard limit
_ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

import logging
_logger = logging.getLogger(__name__)

# ── Model state (lazy-loaded on first request) ──────────────────
_model = None
_model_available: bool | None = None  # None = untried
_model_version: str = "basic"         # "food101" or "basic"


# ═══════════════════════════════════════════════════════════════
#  Food-101 Class Mapping (101 classes)
#
#  These are the 101 dish categories from the ETH Food-101 dataset.
#  Index numbers match the YOLOv8 model's output class IDs when
#  trained on Food-101.
# ═══════════════════════════════════════════════════════════════

FOOD101_CLASSES = {
    0: "apple_pie", 1: "baby_back_ribs", 2: "baklava", 3: "beef_carpaccio",
    4: "beef_tartare", 5: "beet_salad", 6: "beignets", 7: "bibimbap",
    8: "bread_pudding", 9: "breakfast_burrito", 10: "bruschetta",
    11: "caesar_salad", 12: "cannoli", 13: "caprese_salad", 14: "carrot_cake",
    15: "ceviche", 16: "cheesecake", 17: "cheese_plate", 18: "chicken_curry",
    19: "chicken_quesadilla", 20: "chicken_wings", 21: "chocolate_cake",
    22: "chocolate_mousse", 23: "churros", 24: "clam_chowder",
    25: "club_sandwich", 26: "crab_cakes", 27: "creme_brulee",
    28: "croque_madame", 29: "cup_cakes", 30: "deviled_eggs",
    31: "donuts", 32: "dumplings", 33: "edamame", 34: "eggs_benedict",
    35: "escargots", 36: "falafel", 37: "filet_mignon", 38: "fish_and_chips",
    39: "foie_gras", 40: "french_fries", 41: "french_onion_soup",
    42: "french_toast", 43: "fried_calamari", 44: "fried_rice",
    45: "frozen_yogurt", 46: "garlic_bread", 47: "gnocchi",
    48: "greek_salad", 49: "grilled_cheese_sandwich", 50: "grilled_salmon",
    51: "guacamole", 52: "gyoza", 53: "hamburger", 54: "hot_and_sour_soup",
    55: "hot_dog", 56: "huevos_rancheros", 57: "hummus", 58: "ice_cream",
    59: "lasagna", 60: "lobster_bisque", 61: "lobster_roll_sandwich",
    62: "macaroni_and_cheese", 63: "macarons", 64: "miso_soup",
    65: "mussels", 66: "nachos", 67: "omelette", 68: "onion_rings",
    69: "oysters", 70: "pad_thai", 71: "paella", 72: "pancakes",
    73: "panna_cotta", 74: "peking_duck", 75: "pho", 76: "pizza",
    77: "pork_chop", 78: "poutine", 79: "prime_rib",
    80: "pulled_pork_sandwich", 81: "ramen", 82: "ravioli", 83: "red_velvet_cake",
    84: "risotto", 85: "samosa", 86: "sashimi", 87: "scallops",
    88: "seaweed_salad", 89: "shrimp_and_grits", 90: "spaghetti_bolognese",
    91: "spaghetti_carbonara", 92: "spring_rolls", 93: "steak",
    94: "strawberry_shortcake", 95: "sushi", 96: "tacos", 97: "takoyaki",
    98: "tiramisu", 99: "tuna_tartare", 100: "waffles",
}

# ── COCO fallback (basic model — 10 food classes) ───────────────
COCO_FOOD_CLASSES = {
    46: "banana", 47: "apple", 48: "sandwich", 49: "orange",
    50: "broccoli", 51: "carrot", 52: "hot_dog", 53: "pizza",
    54: "donut", 55: "cake",
}


# ═══════════════════════════════════════════════════════════════
#  Portion Size Estimation
#
#  Uses the bounding box area relative to the full image to
#  estimate the physical portion weight in grams.
#
#  Assumptions (calibrated against typical food photography):
#    - A standard dinner plate occupies ~40% of a typical food photo
#    - A standard plate holds roughly 300g of food
#    - Portion weight scales linearly with the food's bbox area
# ═══════════════════════════════════════════════════════════════

# Average weight (g) per standard serving for Food-101 dishes
# These are nutritional reference weights used for calorie estimation
FOOD_REFERENCE_DATA: dict[str, dict] = {
    # Format: "class_name": {"serving_g": weight, "cal_per_100g": calories}
    "apple_pie": {"serving_g": 125, "cal_per_100g": 237},
    "baby_back_ribs": {"serving_g": 200, "cal_per_100g": 250},
    "baklava": {"serving_g": 80, "cal_per_100g": 430},
    "beef_carpaccio": {"serving_g": 100, "cal_per_100g": 120},
    "beef_tartare": {"serving_g": 120, "cal_per_100g": 150},
    "beet_salad": {"serving_g": 150, "cal_per_100g": 50},
    "beignets": {"serving_g": 90, "cal_per_100g": 350},
    "bibimbap": {"serving_g": 400, "cal_per_100g": 130},
    "bread_pudding": {"serving_g": 150, "cal_per_100g": 230},
    "breakfast_burrito": {"serving_g": 250, "cal_per_100g": 200},
    "bruschetta": {"serving_g": 100, "cal_per_100g": 180},
    "caesar_salad": {"serving_g": 200, "cal_per_100g": 80},
    "cannoli": {"serving_g": 100, "cal_per_100g": 350},
    "caprese_salad": {"serving_g": 180, "cal_per_100g": 120},
    "carrot_cake": {"serving_g": 130, "cal_per_100g": 300},
    "ceviche": {"serving_g": 150, "cal_per_100g": 90},
    "cheesecake": {"serving_g": 125, "cal_per_100g": 320},
    "cheese_plate": {"serving_g": 100, "cal_per_100g": 350},
    "chicken_curry": {"serving_g": 300, "cal_per_100g": 140},
    "chicken_quesadilla": {"serving_g": 200, "cal_per_100g": 250},
    "chicken_wings": {"serving_g": 150, "cal_per_100g": 290},
    "chocolate_cake": {"serving_g": 125, "cal_per_100g": 350},
    "chocolate_mousse": {"serving_g": 120, "cal_per_100g": 225},
    "churros": {"serving_g": 100, "cal_per_100g": 380},
    "clam_chowder": {"serving_g": 250, "cal_per_100g": 70},
    "club_sandwich": {"serving_g": 250, "cal_per_100g": 220},
    "crab_cakes": {"serving_g": 120, "cal_per_100g": 200},
    "creme_brulee": {"serving_g": 130, "cal_per_100g": 250},
    "croque_madame": {"serving_g": 200, "cal_per_100g": 260},
    "cup_cakes": {"serving_g": 75, "cal_per_100g": 350},
    "deviled_eggs": {"serving_g": 60, "cal_per_100g": 200},
    "donuts": {"serving_g": 80, "cal_per_100g": 400},
    "dumplings": {"serving_g": 180, "cal_per_100g": 200},
    "edamame": {"serving_g": 120, "cal_per_100g": 120},
    "eggs_benedict": {"serving_g": 250, "cal_per_100g": 190},
    "escargots": {"serving_g": 100, "cal_per_100g": 170},
    "falafel": {"serving_g": 100, "cal_per_100g": 330},
    "filet_mignon": {"serving_g": 200, "cal_per_100g": 270},
    "fish_and_chips": {"serving_g": 350, "cal_per_100g": 230},
    "foie_gras": {"serving_g": 60, "cal_per_100g": 460},
    "french_fries": {"serving_g": 150, "cal_per_100g": 310},
    "french_onion_soup": {"serving_g": 300, "cal_per_100g": 60},
    "french_toast": {"serving_g": 150, "cal_per_100g": 250},
    "fried_calamari": {"serving_g": 120, "cal_per_100g": 175},
    "fried_rice": {"serving_g": 300, "cal_per_100g": 160},
    "frozen_yogurt": {"serving_g": 150, "cal_per_100g": 130},
    "garlic_bread": {"serving_g": 80, "cal_per_100g": 350},
    "gnocchi": {"serving_g": 200, "cal_per_100g": 130},
    "greek_salad": {"serving_g": 200, "cal_per_100g": 90},
    "grilled_cheese_sandwich": {"serving_g": 150, "cal_per_100g": 300},
    "grilled_salmon": {"serving_g": 200, "cal_per_100g": 180},
    "guacamole": {"serving_g": 100, "cal_per_100g": 160},
    "gyoza": {"serving_g": 150, "cal_per_100g": 210},
    "hamburger": {"serving_g": 250, "cal_per_100g": 250},
    "hot_and_sour_soup": {"serving_g": 250, "cal_per_100g": 40},
    "hot_dog": {"serving_g": 150, "cal_per_100g": 290},
    "huevos_rancheros": {"serving_g": 300, "cal_per_100g": 140},
    "hummus": {"serving_g": 100, "cal_per_100g": 270},
    "ice_cream": {"serving_g": 130, "cal_per_100g": 210},
    "lasagna": {"serving_g": 300, "cal_per_100g": 135},
    "lobster_bisque": {"serving_g": 250, "cal_per_100g": 80},
    "lobster_roll_sandwich": {"serving_g": 200, "cal_per_100g": 220},
    "macaroni_and_cheese": {"serving_g": 250, "cal_per_100g": 160},
    "macarons": {"serving_g": 40, "cal_per_100g": 400},
    "miso_soup": {"serving_g": 250, "cal_per_100g": 35},
    "mussels": {"serving_g": 200, "cal_per_100g": 85},
    "nachos": {"serving_g": 200, "cal_per_100g": 340},
    "omelette": {"serving_g": 180, "cal_per_100g": 150},
    "onion_rings": {"serving_g": 120, "cal_per_100g": 330},
    "oysters": {"serving_g": 100, "cal_per_100g": 70},
    "pad_thai": {"serving_g": 300, "cal_per_100g": 155},
    "paella": {"serving_g": 350, "cal_per_100g": 130},
    "pancakes": {"serving_g": 200, "cal_per_100g": 230},
    "panna_cotta": {"serving_g": 130, "cal_per_100g": 230},
    "peking_duck": {"serving_g": 200, "cal_per_100g": 250},
    "pho": {"serving_g": 400, "cal_per_100g": 45},
    "pizza": {"serving_g": 200, "cal_per_100g": 270},
    "pork_chop": {"serving_g": 200, "cal_per_100g": 230},
    "poutine": {"serving_g": 300, "cal_per_100g": 170},
    "prime_rib": {"serving_g": 250, "cal_per_100g": 290},
    "pulled_pork_sandwich": {"serving_g": 250, "cal_per_100g": 210},
    "ramen": {"serving_g": 400, "cal_per_100g": 85},
    "ravioli": {"serving_g": 250, "cal_per_100g": 150},
    "red_velvet_cake": {"serving_g": 125, "cal_per_100g": 320},
    "risotto": {"serving_g": 250, "cal_per_100g": 140},
    "samosa": {"serving_g": 100, "cal_per_100g": 260},
    "sashimi": {"serving_g": 120, "cal_per_100g": 110},
    "scallops": {"serving_g": 120, "cal_per_100g": 110},
    "seaweed_salad": {"serving_g": 100, "cal_per_100g": 70},
    "shrimp_and_grits": {"serving_g": 300, "cal_per_100g": 130},
    "spaghetti_bolognese": {"serving_g": 350, "cal_per_100g": 130},
    "spaghetti_carbonara": {"serving_g": 300, "cal_per_100g": 170},
    "spring_rolls": {"serving_g": 100, "cal_per_100g": 230},
    "steak": {"serving_g": 250, "cal_per_100g": 270},
    "strawberry_shortcake": {"serving_g": 150, "cal_per_100g": 260},
    "sushi": {"serving_g": 150, "cal_per_100g": 140},
    "tacos": {"serving_g": 150, "cal_per_100g": 210},
    "takoyaki": {"serving_g": 120, "cal_per_100g": 200},
    "tiramisu": {"serving_g": 150, "cal_per_100g": 280},
    "tuna_tartare": {"serving_g": 120, "cal_per_100g": 130},
    "waffles": {"serving_g": 150, "cal_per_100g": 290},
    # Fallback COCO foods
    "banana": {"serving_g": 120, "cal_per_100g": 89},
    "apple": {"serving_g": 180, "cal_per_100g": 52},
    "sandwich": {"serving_g": 200, "cal_per_100g": 250},
    "orange": {"serving_g": 150, "cal_per_100g": 47},
    "broccoli": {"serving_g": 150, "cal_per_100g": 34},
    "carrot": {"serving_g": 80, "cal_per_100g": 41},
    "cake": {"serving_g": 125, "cal_per_100g": 350},
}

# Default for unknown foods
_DEFAULT_REF = {"serving_g": 200, "cal_per_100g": 180}

# Plate reference: a typical plate occupies ~40% of a food photo
_PLATE_AREA_FRACTION = 0.40
_PLATE_FOOD_WEIGHT_G = 300.0  # average weight of food on a standard plate


def _estimate_portion(bbox_area_fraction: float, food_name: str) -> tuple[float, float]:
    """
    Estimate portion weight (g) and calories from the bounding box area.

    Args:
        bbox_area_fraction: Fraction of total image occupied by the food's bounding box (0–1)
        food_name: Detected food class name (used for calorie lookup)

    Returns:
        (estimated_grams, estimated_calories)
    """
    ref = FOOD_REFERENCE_DATA.get(food_name, _DEFAULT_REF)

    # Scale: if plate = 40% of image → 300g, so food_weight = (bbox_area / plate_area) * 300g
    raw_estimate_g = (bbox_area_fraction / _PLATE_AREA_FRACTION) * _PLATE_FOOD_WEIGHT_G

    # Clamp to reasonable range (min 20g, max 800g) and round
    estimated_g = round(max(20.0, min(800.0, raw_estimate_g)), 0)

    # Calculate calories from estimated grams
    estimated_cal = round((estimated_g / 100.0) * ref["cal_per_100g"], 0)

    return estimated_g, estimated_cal


# ═══════════════════════════════════════════════════════════════
#  Model Loading — tries Food-101 first, falls back to COCO
# ═══════════════════════════════════════════════════════════════

def _get_model():
    """
    Lazy-load the best available YOLO model:
      1. food101_yolov8.pt  → 101 dish classes (custom trained)
      2. yolov8n.pt         → 10 COCO food classes (fallback)
    """
    global _model, _model_available, _model_version

    if _model_available is not None:
        return _model, _model_available, _model_version

    # Attempt 1: Custom Food-101 model
    try:
        from ultralytics import YOLO
        from pathlib import Path

        food101_path = Path(__file__).resolve().parent.parent.parent / "food101_yolov8.pt"
        if food101_path.exists():
            _model = YOLO(str(food101_path))
            _model_available = True
            _model_version = "food101"
            _logger.info("🍽️  Food-101 model loaded: %s (101 classes)", food101_path)
            return _model, _model_available, _model_version

        # Attempt 2: Stock YOLOv8n
        _model = YOLO("yolov8n.pt")
        _model_available = True
        _model_version = "basic"
        _logger.info("📦 Stock YOLOv8n loaded (10 COCO food classes — Food-101 model not found)")
        return _model, _model_available, _model_version

    except Exception as e:
        _model = None
        _model_available = False
        _model_version = "unavailable"
        _logger.warning(
            "YOLOv8 model could not be loaded: %s. "
            "Detection endpoint will return 503 until a model is available.", e
        )
        return _model, _model_available, _model_version


# ═══════════════════════════════════════════════════════════════
#  Detection Endpoint
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/image",
    response_model=DetectionResult,
    summary="Detect food items in an image using YOLOv8 + Food-101",
    responses={
        400: {"description": "Invalid image format or file too large"},
        503: {"description": "YOLOv8 model is not loaded"},
    },
)
async def detect_food(file: UploadFile = File(...)):
    """
    Advanced ML food detection from an uploaded image.

    - **Accepted formats**: JPEG, PNG, WebP
    - **Max file size**: 10 MB
    - Runs YOLOv8 inference, identifies food classes, estimates portion
      sizes from bounding box geometry, and calculates approximate calories.
    """
    model, model_available, model_ver = _get_model()
    if not model_available:
        raise HTTPException(
            status_code=503,
            detail="YOLOv8 model is not available. Please ensure a model .pt file is present."
        )

    # 1. Validate MIME type
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Please upload a JPEG, PNG, or WebP image."
        )

    # 2. Read and enforce size limit
    image_bytes = await file.read()
    if len(image_bytes) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(image_bytes) // (1024*1024)} MB). Maximum allowed size is 10 MB."
        )

    # 3. Validate it is a real image
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        img = Image.open(io.BytesIO(image_bytes))  # Re-open after verify
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode image. Please upload a valid image file.")

    img_width, img_height = img.size

    # 4. Run YOLOv8 Inference
    results = model.predict(source=img, conf=0.25, verbose=False)

    # 5. Parse predictions — different logic for classification vs detection models
    detected: list[DetectedFood] = []
    seen_ingredients: set[str] = set()
    total_cal = 0.0

    for result in results:

        # ── Classification model (Food-101) ──────────────────────
        # Returns probabilities for the whole image, not bounding boxes.
        if model_ver == "food101" and hasattr(result, "probs") and result.probs is not None:
            probs = result.probs
            top5_indices = probs.top5
            top5_confs = probs.top5conf.tolist()

            for cls_id, confidence in zip(top5_indices, top5_confs):
                if confidence < 0.05:  # skip very low confidence
                    continue

                # Get class name from the model's own name mapping
                if hasattr(result, "names") and cls_id in result.names:
                    food_name = result.names[cls_id]
                elif cls_id in FOOD101_CLASSES:
                    food_name = FOOD101_CLASSES[cls_id]
                else:
                    continue

                # For classification, use reference serving size (no bbox available)
                ref = FOOD_REFERENCE_DATA.get(food_name, _DEFAULT_REF)
                estimated_g = float(ref["serving_g"])
                estimated_cal = round((estimated_g / 100.0) * ref["cal_per_100g"], 0)
                total_cal += estimated_cal

                display_label = food_name.replace("_", " ")

                if food_name not in seen_ingredients:
                    seen_ingredients.add(food_name)

                detected.append(DetectedFood(
                    label=display_label,
                    confidence=round(confidence, 4),
                    ingredient=food_name,
                    bbox=None,  # classification models don't produce bounding boxes
                    estimated_portion_g=estimated_g,
                    estimated_calories=estimated_cal,
                ))

            # Only use the top prediction(s) — classification gives one result per image
            break

        # ── Detection model (basic COCO) ─────────────────────────
        # Returns bounding boxes with class IDs and coordinates.
        elif hasattr(result, "boxes") and result.boxes is not None:
            for box in result.boxes:
                class_id = int(box.cls[0].item())
                confidence = float(box.conf[0].item())

                if class_id not in COCO_FOOD_CLASSES:
                    continue

                food_name = COCO_FOOD_CLASSES[class_id]

                # Extract normalized bounding box
                xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2] in pixels
                bbox = BoundingBox(
                    x1=round(xyxy[0] / img_width, 4),
                    y1=round(xyxy[1] / img_height, 4),
                    x2=round(xyxy[2] / img_width, 4),
                    y2=round(xyxy[3] / img_height, 4),
                )

                # Portion estimation from bbox area
                bbox_w = (xyxy[2] - xyxy[0]) / img_width
                bbox_h = (xyxy[3] - xyxy[1]) / img_height
                bbox_area_fraction = bbox_w * bbox_h

                estimated_g, estimated_cal = _estimate_portion(bbox_area_fraction, food_name)
                total_cal += estimated_cal

                display_label = food_name.replace("_", " ")

                if food_name not in seen_ingredients:
                    seen_ingredients.add(food_name)

                detected.append(DetectedFood(
                    label=display_label,
                    confidence=confidence,
                    ingredient=food_name,
                    bbox=bbox,
                    estimated_portion_g=estimated_g,
                    estimated_calories=estimated_cal,
                ))

    if not detected:
        return DetectionResult(
            detected_foods=[],
            ingredients=[],
            message="No food items detected. Try a clearer image with visible food.",
            method=f"yolov8_{model_ver}",
            model_version=model_ver,
        )

    return DetectionResult(
        detected_foods=detected,
        ingredients=list(seen_ingredients),
        message=f"Detected {len(detected)} food item(s) with portion estimates.",
        method=f"yolov8_{model_ver}",
        model_version=model_ver,
        total_estimated_calories=round(total_cal, 0),
    )

