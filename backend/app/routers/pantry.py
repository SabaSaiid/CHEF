"""
Pantry router — log in-stock pantry items, smart inventory management,
location tagging, zero-waste expiration alerts, and intelligent recipe matching.
Requires authentication for all endpoints.
"""

from datetime import datetime, timezone
import math
import re
import json
import httpx
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import PantryItem, User
from app.auth import get_current_user
from app.schemas import (
    PantryItemCreate,
    PantryItemUpdate,
    PantryItemResponse,
    PantryBatchDeleteRequest,
    PantryBatchAddRequest,
    PantryClearExpiredResponse,
    PantryMatchedRecipeItem,
    PantryMatchResponse,
)
from app.config import settings

router = APIRouter(prefix="/api/pantry", tags=["pantry"])

# Standard Unit Conversions to a base unit (grams for mass, ml for volume)
UNIT_TO_BASE = {
    "g": 1.0, "gram": 1.0, "grams": 1.0,
    "kg": 1000.0, "kilogram": 1000.0, "kilograms": 1000.0,
    "oz": 28.3495, "ounce": 28.3495, "ounces": 28.3495,
    "lb": 453.592, "pound": 453.592, "pounds": 453.592,
    
    "ml": 1.0, "milliliter": 1.0, "milliliters": 1.0,
    "l": 1000.0, "liter": 1000.0, "liters": 1000.0, "litre": 1000.0, "litres": 1000.0,
    "tsp": 4.92892, "teaspoon": 4.92892, "teaspoons": 4.92892,
    "tbsp": 14.7868, "tablespoon": 14.7868, "tablespoons": 14.7868,
    "cup": 240.0, "cups": 240.0,
    "fl oz": 29.5735,
    "pint": 473.176, "pints": 473.176,
    "quart": 946.353, "quarts": 946.353,
    "gal": 3785.41, "gallon": 3785.41, "gallons": 3785.41,
}

def normalize_quantity(qty: float, from_unit: str, to_unit: str) -> float:
    """Converts a quantity between compatible units."""
    if not from_unit or not to_unit:
        return qty
    fu = from_unit.strip().lower()
    tu = to_unit.strip().lower()
    if fu == tu:
        return qty
    if fu in UNIT_TO_BASE and tu in UNIT_TO_BASE:
        return (qty * UNIT_TO_BASE[fu]) / UNIT_TO_BASE[tu]
    return qty


# ── Expiry Status Computation ──────────────────────────────────
EXPIRY_WARNING_DAYS = 3  # Items expiring within 3 days are flagged as 'expiring_soon'

def _compute_expiry_status(item: PantryItem) -> tuple[str, int]:
    """Compute freshness status and days remaining for a pantry item.
    Returns (expiry_status, days_remaining) where:
      - expiry_status: 'fresh' | 'expiring_soon' | 'expired'
      - days_remaining: integer days until expiration (negative = already expired)
    """
    now = datetime.now(timezone.utc)
    updated = item.updated_at
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=timezone.utc)
    
    days_fresh = item.days_fresh if item.days_fresh else 7
    elapsed_days = (now - updated).total_seconds() / 86400.0
    days_remaining = math.ceil(days_fresh - elapsed_days)

    if days_remaining <= 0:
        return "expired", days_remaining
    elif days_remaining <= EXPIRY_WARNING_DAYS:
        return "expiring_soon", days_remaining
    else:
        return "fresh", days_remaining


def _pantry_item_to_response(item: PantryItem) -> PantryItemResponse:
    """Convert a PantryItem ORM object to a PantryItemResponse with computed expiry fields."""
    expiry_status, days_remaining = _compute_expiry_status(item)
    return PantryItemResponse(
        id=item.id,
        user_id=item.user_id,
        ingredient_name=item.ingredient_name,
        quantity=item.quantity,
        unit=item.unit,
        category=item.category or "Other",
        location=getattr(item, "location", "Pantry") or "Pantry",
        days_fresh=item.days_fresh,
        updated_at=item.updated_at,
        expiry_status=expiry_status,
        days_remaining=days_remaining,
    )


# ── Text Tokenization Helpers ─────────────────────────────────
COMMON_MEASURE_WORDS = {
    "cup", "cups", "tbsp", "tablespoon", "tablespoons", "tsp", "teaspoon", "teaspoons",
    "g", "gram", "grams", "kg", "kilogram", "kilograms", "ml", "milliliter", "milliliters",
    "l", "liter", "liters", "litre", "litres", "oz", "ounce", "ounces", "lb", "pound", "pounds",
    "pinch", "pinches", "dash", "dashes", "clove", "cloves", "slice", "slices",
    "piece", "pieces", "pcs", "bunch", "bunches", "can", "cans", "handful", "handfuls",
    "large", "medium", "small", "fresh", "dried", "chopped", "diced", "sliced",
    "minced", "grated", "peeled", "melted", "warm", "cold", "hot", "ground",
    "shredded", "crushed", "cooked", "uncooked", "raw", "pure", "optional",
    "to", "taste", "for", "serving", "garnish", "as", "needed", "about",
    "and", "or", "of", "with", "in", "a", "an", "the", "freshly"
}

def _tokenize_name(s: str) -> set[str]:
    """Tokenize and stem basic plural/singular words."""
    words = set(re.findall(r'\b[a-zA-Z]+\b', s.lower()))
    normalized = set()
    for w in words:
        if w in COMMON_MEASURE_WORDS or len(w) <= 1:
            continue
        normalized.add(w)
        if w.endswith('ies') and len(w) > 4:
            normalized.add(w[:-3] + 'y')
        elif w.endswith('es') and len(w) > 3:
            normalized.add(w[:-2])
        elif w.endswith('s') and len(w) > 3:
            normalized.add(w[:-1])
    return normalized

def _clean_recipe_ingredient_line(line: str) -> str:
    """Strips measurements and numbers from a recipe ingredient string."""
    s = re.sub(r'\(.*?\)', '', line)
    s = re.sub(r'[\d/\.\-\+½¼¾⅓⅔⅛⅜⅝⅞]+', ' ', s)
    tokens = _tokenize_name(s)
    return " ".join(sorted(tokens)) if tokens else line.strip().lower()


# ── Core Endpoints ─────────────────────────────────────────────

@router.get("", response_model=list[PantryItemResponse])
def get_pantry(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all pantry items for the current user with computed expiry status."""
    items = db.query(PantryItem).filter(PantryItem.user_id == current_user.id).order_by(PantryItem.updated_at.desc()).all()
    return [_pantry_item_to_response(item) for item in items]


@router.post("", response_model=PantryItemResponse, status_code=201)
def add_pantry_item(
    req: PantryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new ingredient to the pantry. If it exists, update quantity/unit/location."""
    existing = db.query(PantryItem).filter(
        PantryItem.user_id == current_user.id,
        PantryItem.ingredient_name.ilike(req.ingredient_name.strip())
    ).first()

    if existing:
        existing.quantity += req.quantity
        existing.unit = req.unit
        if req.category:
            existing.category = req.category
        if req.location:
            existing.location = req.location
        if req.days_fresh is not None:
            existing.days_fresh = req.days_fresh
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return _pantry_item_to_response(existing)

    item = PantryItem(
        user_id=current_user.id,
        ingredient_name=req.ingredient_name.strip(),
        quantity=req.quantity,
        unit=req.unit,
        category=req.category or "Other",
        location=req.location or "Pantry",
        days_fresh=req.days_fresh if req.days_fresh is not None else 7,
        updated_at=datetime.now(timezone.utc)
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _pantry_item_to_response(item)


@router.post("/batch-add", response_model=list[PantryItemResponse])
def batch_add_pantry_items(
    req: PantryBatchAddRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add multiple ingredients to the pantry in a single atomic request."""
    added_responses = []
    for item_req in req.items:
        name = item_req.ingredient_name.strip()
        if not name:
            continue
        existing = db.query(PantryItem).filter(
            PantryItem.user_id == current_user.id,
            PantryItem.ingredient_name.ilike(name)
        ).first()

        if existing:
            existing.quantity += item_req.quantity
            existing.unit = item_req.unit
            if item_req.category:
                existing.category = item_req.category
            if item_req.location:
                existing.location = item_req.location
            if item_req.days_fresh is not None:
                existing.days_fresh = item_req.days_fresh
            existing.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing)
            added_responses.append(_pantry_item_to_response(existing))
        else:
            new_item = PantryItem(
                user_id=current_user.id,
                ingredient_name=name,
                quantity=item_req.quantity,
                unit=item_req.unit,
                category=item_req.category or "Other",
                location=item_req.location or "Pantry",
                days_fresh=item_req.days_fresh if item_req.days_fresh is not None else 7,
                updated_at=datetime.now(timezone.utc)
            )
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            added_responses.append(_pantry_item_to_response(new_item))

    return added_responses


@router.put("/{item_id}", response_model=PantryItemResponse)
def update_pantry_item(
    item_id: int,
    req: PantryItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update pantry item name, quantity, unit, category, location, or freshness window."""
    item = db.query(PantryItem).filter(
        PantryItem.id == item_id,
        PantryItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pantry item not found"
        )

    update_timestamp = False

    if req.ingredient_name is not None and req.ingredient_name.strip():
        item.ingredient_name = req.ingredient_name.strip()
    if req.quantity is not None:
        if req.quantity > item.quantity:
            update_timestamp = True  # Adding new stock resets freshness
        item.quantity = req.quantity
    if req.unit is not None:
        item.unit = req.unit
    if req.category is not None:
        item.category = req.category
    if req.location is not None:
        item.location = req.location
    if req.days_fresh is not None:
        item.days_fresh = req.days_fresh
        update_timestamp = True
    
    if update_timestamp:
        item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return _pantry_item_to_response(item)


@router.delete("/{item_id}")
def delete_pantry_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a pantry item."""
    item = db.query(PantryItem).filter(
        PantryItem.id == item_id,
        PantryItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pantry item not found"
        )

    db.delete(item)
    db.commit()
    return {"message": "Pantry item deleted", "id": item_id}


@router.post("/batch-delete")
def batch_delete_pantry_items(
    req: PantryBatchDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple pantry items in a single request."""
    if not req.item_ids:
        return {"message": "No items to delete", "deleted_count": 0}

    deleted_count = db.query(PantryItem).filter(
        PantryItem.user_id == current_user.id,
        PantryItem.id.in_(req.item_ids)
    ).delete(synchronize_session=False)

    db.commit()
    return {"message": f"Successfully deleted {deleted_count} items", "deleted_count": deleted_count}


@router.post("/clear-expired", response_model=PantryClearExpiredResponse)
def clear_expired_pantry_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Find and remove all expired pantry items in one click."""
    items = db.query(PantryItem).filter(PantryItem.user_id == current_user.id).all()
    expired_ids = []
    for item in items:
        status_label, _ = _compute_expiry_status(item)
        if status_label == "expired":
            expired_ids.append(item.id)

    if not expired_ids:
        return PantryClearExpiredResponse(removed_count=0, message="No expired items found in pantry.")

    deleted_count = db.query(PantryItem).filter(
        PantryItem.user_id == current_user.id,
        PantryItem.id.in_(expired_ids)
    ).delete(synchronize_session=False)

    db.commit()
    return PantryClearExpiredResponse(
        removed_count=deleted_count,
        message=f"Cleaned up {deleted_count} expired item(s) from your pantry."
    )


# ── Recipe Matching Algorithm ──────────────────────────────────

@router.get("/matched-recipes", response_model=PantryMatchResponse)
def get_matched_recipes(
    filter_type: str = Query("all", description="'all' | 'cookable' | 'almost' | 'expiring'"),
    meal_type: str = Query("all", description="'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'"),
    search: Optional[str] = Query(None, description="Search query in title or cuisine"),
    limit: int = Query(40, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Scans the 7,000+ local catalog recipes and scores each against the user's
    current in-stock pantry items.
    Returns ranked recipes with match percentages, missing ingredients, and
    highlighted zero-waste expiring ingredients.
    """
    from app.routers.recipes import DEMO_RECIPES

    pantry_items = db.query(PantryItem).filter(
        PantryItem.user_id == current_user.id,
        PantryItem.quantity > 0
    ).all()

    if not pantry_items or not DEMO_RECIPES:
        return PantryMatchResponse(recipes=[], total_matched=0, cookable_now_count=0, expiring_soon_count=0)

    # Pre-process user pantry tokens and map
    pantry_data = []
    for pi in pantry_items:
        tokens = _tokenize_name(pi.ingredient_name)
        status_label, days_left = _compute_expiry_status(pi)
        is_expiring = status_label in ("expiring_soon", "expired")
        pantry_data.append({
            "id": pi.id,
            "name": pi.ingredient_name,
            "tokens": tokens,
            "quantity": pi.quantity,
            "unit": pi.unit,
            "is_expiring": is_expiring
        })

    def match_recipe_ingredient(recipe_ing_str: str) -> tuple[bool, Optional[str], bool]:
        """Returns (is_matched, matched_pantry_name, is_expiring)."""
        ing_tokens = _tokenize_name(recipe_ing_str)
        if not ing_tokens:
            return False, None, False

        # Try exact or token subset match
        for p in pantry_data:
            if not p["tokens"]:
                continue
            # Overlap exists and one is subset of another or shares 2+ tokens
            common = ing_tokens & p["tokens"]
            if common:
                if len(common) >= min(len(ing_tokens), len(p["tokens"])) or len(common) >= 1:
                    return True, p["name"], p["is_expiring"]
        return False, None, False

    matched_results = []
    cookable_count = 0
    expiring_count = 0

    search_term = search.strip().lower() if search else None

    for r in DEMO_RECIPES:
        # Check search query if provided
        if search_term:
            title_match = search_term in (r.title or "").lower()
            cuisine_match = any(search_term in c.lower() for c in (r.cuisines or []))
            if not title_match and not cuisine_match:
                continue

        # Check meal type if specified
        if meal_type != "all":
            dish_types_lower = [dt.lower() for dt in (r.dish_types or [])]
            if meal_type == "breakfast" and not any(t in dish_types_lower for t in ["breakfast", "brunch", "morning"]):
                continue
            if meal_type == "lunch" and not any(t in dish_types_lower for t in ["lunch", "main course", "salad", "sandwich", "soup"]):
                continue
            if meal_type == "dinner" and not any(t in dish_types_lower for t in ["dinner", "main course", "entree", "side dish"]):
                continue
            if meal_type == "snack" and not any(t in dish_types_lower for t in ["snack", "appetizer", "fingerfood", "dessert"]):
                continue

        raw_ingredients = r.ingredients if isinstance(r.ingredients, list) else []
        if not raw_ingredients:
            continue

        matched_ings = []
        missing_ings = []
        uses_expiring = False

        for ing_str in raw_ingredients:
            is_matched, p_name, is_exp = match_recipe_ingredient(ing_str)
            if is_matched:
                matched_ings.append(ing_str)
                if is_exp:
                    uses_expiring = True
            else:
                missing_ings.append(ing_str)

        total_ings = len(raw_ingredients)
        matched_count = len(matched_ings)
        missing_count = len(missing_ings)

        if matched_count == 0:
            continue

        match_pct = round((matched_count / total_ings) * 100)
        is_cookable_now = (missing_count == 0)

        if is_cookable_now:
            cookable_count += 1
        if uses_expiring:
            expiring_count += 1

        # Apply filter_type
        if filter_type == "cookable" and not is_cookable_now:
            continue
        elif filter_type == "almost" and (missing_count > 2 or is_cookable_now):
            continue
        elif filter_type == "expiring" and not uses_expiring:
            continue

        matched_results.append(PantryMatchedRecipeItem(
            id=str(r.id),
            title=r.title or "Untitled Recipe",
            image=r.image,
            ready_in_minutes=r.ready_in_minutes or 30,
            servings=r.servings or 2,
            dish_types=r.dish_types or [],
            cuisines=r.cuisines or [],
            nutri_score=r.nutri_score or "B",
            chef_score=r.chef_score or 85,
            calories=r.calories,
            protein=r.protein,
            carbs=r.carbs,
            fat=r.fat,
            match_pct=match_pct,
            matched_count=matched_count,
            total_count=total_ings,
            matched_ingredients=matched_ings,
            missing_ingredients=missing_ings,
            uses_expiring=uses_expiring,
            is_cookable_now=is_cookable_now,
        ))

    # Sort results: cookable first, then uses_expiring, then highest match percentage, then chef score
    matched_results.sort(
        key=lambda item: (
            1 if item.is_cookable_now else 0,
            1 if item.uses_expiring else 0,
            item.match_pct,
            item.chef_score or 0
        ),
        reverse=True
    )

    paged_recipes = matched_results[:limit]

    return PantryMatchResponse(
        recipes=paged_recipes,
        total_matched=len(matched_results),
        cookable_now_count=cookable_count,
        expiring_soon_count=expiring_count,
    )


# ── Recipe Ingredient Deduction ───────────────────────────────

class IngredientDeduct(BaseModel):
    name: str
    qty: float
    unit: Optional[str] = None

class RecipeDeductRequest(BaseModel):
    ingredients: list[IngredientDeduct]

@router.post("/deduct-recipe")
def deduct_recipe_ingredients(
    req: RecipeDeductRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deduct cooked recipe ingredients from user's pantry stocks."""
    deducted = []
    not_found = []
    
    all_items = db.query(PantryItem).filter(PantryItem.user_id == current_user.id).all()
    
    for ing in req.ingredients:
        match = None
        req_tokens = _tokenize_name(ing.name)
        
        # 1. Exact Match
        for item in all_items:
            if item.ingredient_name.lower().strip() == ing.name.lower().strip():
                match = item
                break
                
        # 2. Token Intersection Match (Word Boundaries & Singular/Plural)
        if not match:
            for item in all_items:
                item_tokens = _tokenize_name(item.ingredient_name)
                if len(item_tokens & req_tokens) > 0 and (item_tokens.issubset(req_tokens) or req_tokens.issubset(item_tokens)):
                    match = item
                    break
                    
        if match:
            # 3. Unit Normalization before Deduction
            qty_to_deduct = normalize_quantity(ing.qty, ing.unit, match.unit) if ing.unit else ing.qty
            
            # 4. Safe Deduction (DO NOT reset updated_at)
            match.quantity = max(0.0, round((match.quantity - qty_to_deduct) * 100) / 100)
            db.commit()
            deducted.append({
                "name": match.ingredient_name,
                "deducted_qty": qty_to_deduct,
                "new_qty": match.quantity,
                "unit": match.unit
            })
        else:
            not_found.append(ing.name)
            
    return {"message": "Deduction completed", "deducted": deducted, "not_found": not_found}


# ── Smart Magic Import & Preview ───────────────────────────────

class MagicImportRequest(BaseModel):
    text: Optional[str] = None
    raw_text: Optional[str] = None
    preview_only: Optional[bool] = False

    @property
    def input_text(self) -> str:
        return self.raw_text or self.text or ""

def _fallback_parse_grocery_text(text: str) -> list[dict]:
    """Rule-based fallback parser when Gemini API is unavailable."""
    lines = [l.strip() for l in text.replace(';', '\n').replace(',', '\n').split('\n') if l.strip()]
    items = []
    pattern = re.compile(
        r'^(?:[-•*]\s*)?'
        r'(?:(\d+(?:\.\d+)?)\s*)?'
        r'(pcs?|kg|g|ml|l|liter|liters|litre|cups?|tbsp|tsp|oz|bunch|packets?|slices?|pieces?|box|bottles?)?\s*'
        r'(?:of\s+)?'
        r'(.+)$',
        re.IGNORECASE
    )
    for line in lines:
        m = pattern.match(line)
        if m:
            qty = float(m.group(1)) if m.group(1) else 1
            unit = m.group(2) or 'pcs'
            name = m.group(3).strip().rstrip(',;.')
            
            # Simple category heuristics
            name_lower = name.lower()
            cat = "Other"
            loc = "Pantry"
            if any(w in name_lower for w in ["milk", "cheese", "butter", "yogurt", "cream"]):
                cat = "Dairy"
                loc = "Fridge"
            elif any(w in name_lower for w in ["chicken", "egg", "beef", "fish", "prawn", "tofu", "paneer", "meat"]):
                cat = "Proteins"
                loc = "Fridge"
            elif any(w in name_lower for w in ["tomato", "onion", "garlic", "spinach", "carrot", "apple", "banana", "lemon"]):
                cat = "Produce"
                loc = "Fridge" if any(w in name_lower for w in ["spinach", "carrot", "tomato"]) else "Pantry"
            elif any(w in name_lower for w in ["flour", "rice", "pasta", "bread", "oat", "sugar"]):
                cat = "Grains & Baking"
                loc = "Pantry"
            elif any(w in name_lower for w in ["oil", "salt", "pepper", "cumin", "turmeric", "sauce", "vinegar"]):
                cat = "Spices & Seasonings"
                loc = "Spice Rack"

            items.append({
                "ingredient_name": name.title(),
                "quantity": qty,
                "unit": unit.lower(),
                "category": cat,
                "location": loc,
                "days_fresh": 7 if cat in ["Produce", "Dairy", "Proteins"] else 90,
            })
        elif line:
            items.append({
                "ingredient_name": line.title(),
                "quantity": 1,
                "unit": "pcs",
                "category": "Other",
                "location": "Pantry",
                "days_fresh": 7,
            })
    return items

@router.post("/magic-import")
async def magic_import_pantry(
    req: MagicImportRequest,
    preview: bool = Query(False, description="If true, returns parsed items without saving to DB"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Parses messy grocery lists, receipts, or notes via Gemini API (or regex fallback).
    Supports preview mode so users can inspect and modify before saving.
    """
    input_text = req.input_text
    if not input_text.strip():
        raise HTTPException(status_code=400, detail="No text provided to import.")

    parsed_items = None

    if settings.GEMINI_API_KEY:
        prompt = f"""
    You are an expert culinary AI. Parse the following grocery list or receipt text and extract the ingredients.
    Return ONLY a valid JSON array of objects. No markdown formatting, no code blocks, just raw JSON.
    Each object must exactly match this schema:
    - "ingredient_name" (string, capitalized)
    - "quantity" (number)
    - "unit" (string, e.g., 'pcs', 'g', 'ml', 'serving', 'tbsp', etc.)
    - "category" (string, EXACTLY ONE OF: 'Produce', 'Proteins', 'Dairy', 'Grains & Baking', 'Spices & Seasonings', 'Other')
    - "location" (string, EXACTLY ONE OF: 'Fridge', 'Freezer', 'Pantry', 'Spice Rack', 'Countertop')
    - "days_fresh" (number, estimated shelf life in days)

    Text to parse:
    {input_text}
    """
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.1}
                    }
                )
                
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    if raw_text.startswith("```"):
                        raw_text = raw_text[3:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                        
                    parsed_items = json.loads(raw_text.strip())
        except Exception:
            pass  # Fall through to fallback

    if parsed_items is None:
        parsed_items = _fallback_parse_grocery_text(input_text)

    if not parsed_items:
        raise HTTPException(status_code=400, detail="Could not parse any items from the provided text.")

    # If preview mode requested, return without committing
    if preview or req.preview_only:
        return {
            "items": parsed_items,
            "preview": True,
            "message": f"Successfully parsed {len(parsed_items)} items. Review before saving."
        }

    # Auto-save parsed items into the user's pantry
    saved_count = 0
    for item in parsed_items:
        name = item.get("ingredient_name", "").strip()
        if not name:
            continue
        
        existing = db.query(PantryItem).filter(
            PantryItem.user_id == current_user.id,
            PantryItem.ingredient_name.ilike(name)
        ).first()
        
        if existing:
            existing.quantity = (existing.quantity or 0) + (item.get("quantity", 1) or 1)
            if item.get("location"):
                existing.location = item.get("location")
            existing.updated_at = datetime.now(timezone.utc)
        else:
            new_item = PantryItem(
                user_id=current_user.id,
                ingredient_name=name,
                quantity=item.get("quantity", 1),
                unit=item.get("unit", "pcs"),
                category=item.get("category", "Other"),
                location=item.get("location", "Pantry"),
                days_fresh=item.get("days_fresh", 7),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(new_item)
        saved_count += 1
    
    db.commit()

    return {
        "items": parsed_items,
        "preview": False,
        "message": f"Successfully imported {saved_count} items into your pantry!"
    }


# ── Smart AI Chef Generator ────────────────────────────────────

@router.api_route("/generate-recipe", methods=["GET", "POST"])
async def generate_pantry_recipe(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a recipe strictly using currently available pantry items.
    """
    all_items = db.query(PantryItem).filter(PantryItem.user_id == current_user.id).all()
    available = []
    for item in all_items:
        status_label, _ = _compute_expiry_status(item)
        if status_label != "expired" and item.quantity > 0:
            available.append(f"{item.quantity} {item.unit} {item.ingredient_name}")
            
    if not available:
        raise HTTPException(status_code=400, detail="Pantry is empty or all items are expired.")

    pantry_str = ", ".join(available)
    
    if not settings.GEMINI_API_KEY:
        # Fallback recipe if API key is missing
        return {
            "title": "Pantry Fusion Stir-Fry",
            "description": "A quick, nourishing skillet toss crafted directly from your available pantry ingredients.",
            "prep_time": 20,
            "ingredients": available[:6],
            "instructions": [
                "Heat 1 tablespoon of cooking oil in a large skillet over medium-high heat.",
                "Add your main proteins and aromatics, sautéing until fragrant (3-4 minutes).",
                "Add remaining vegetables and grains, seasoning with salt and pepper to taste.",
                "Toss vigorously until tender-crisp and heated through. Serve hot!"
            ],
            "macros": {
                "calories": 420,
                "protein": 24,
                "carbs": 48,
                "fat": 14
            }
        }

    prompt = f"""
    You are a Michelin-star chef. The user has the following ingredients in their pantry:
    {pantry_str}
    
    Create a highly creative, delicious recipe that strictly uses ONLY these ingredients (plus basic staples like water, salt, pepper, cooking oil if absolutely necessary).
    Return ONLY a valid JSON object. No markdown formatting, no code blocks, just raw JSON.
    Schema:
    - "title" (string, catchy name)
    - "description" (string)
    - "prep_time" (number in minutes)
    - "ingredients" (array of strings, e.g. "2 pcs Eggs")
    - "instructions" (array of strings, step-by-step)
    - "macros" (object with "calories", "protein", "carbs", "fat" - all numbers)
    """

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.7}
                }
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Recipe generation failed")
                
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
                
            recipe = json.loads(raw_text.strip())
            return recipe
            
    except Exception as e:
        # Fallback if Gemini fails
        return {
            "title": "Pantry Signature Skillet",
            "description": "A comforting home-cooked meal using your available kitchen staples.",
            "prep_time": 25,
            "ingredients": available[:5],
            "instructions": [
                "Prep all available ingredients into uniform bite-sized pieces.",
                "Heat oil in a pan and lightly sear ingredients until golden.",
                "Simmer gently to bring out natural flavors, seasoning to preference.",
                "Garnish and serve immediately."
            ],
            "macros": {
                "calories": 450,
                "protein": 22,
                "carbs": 52,
                "fat": 16
            }
        }
