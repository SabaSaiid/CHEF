"""
Pantry router — log in-stock pantry items and manage stocks.
Requires authentication for all endpoints.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import PantryItem, User
from app.auth import get_current_user
from app.schemas import PantryItemCreate, PantryItemUpdate, PantryItemResponse
from app.config import settings
import httpx
import json

router = APIRouter(prefix="/api/pantry", tags=["pantry"])

# Standard Unit Conversions to a base unit (grams for mass, ml for volume)
UNIT_TO_BASE = {
    "g": 1.0, "gram": 1.0, "grams": 1.0,
    "kg": 1000.0, "kilogram": 1000.0, "kilograms": 1000.0,
    "oz": 28.3495, "ounce": 28.3495, "ounces": 28.3495,
    "lb": 453.592, "pound": 453.592, "pounds": 453.592,
    
    "ml": 1.0, "milliliter": 1.0, "milliliters": 1.0,
    "l": 1000.0, "liter": 1000.0, "liters": 1000.0,
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

class IngredientDeduct(BaseModel):
    name: str
    qty: float
    unit: Optional[str] = None

class RecipeDeductRequest(BaseModel):
    ingredients: list[IngredientDeduct]

@router.get("", response_model=list[PantryItemResponse])
def get_pantry(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all pantry items for the current user."""
    return db.query(PantryItem).filter(PantryItem.user_id == current_user.id).all()

@router.post("", response_model=PantryItemResponse, status_code=201)
def add_pantry_item(
    req: PantryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new ingredient to the pantry. If it exists, update quantity/unit."""
    # Check if ingredient with same name already exists (case-insensitive check)
    existing = db.query(PantryItem).filter(
        PantryItem.user_id == current_user.id,
        PantryItem.ingredient_name.ilike(req.ingredient_name.strip())
    ).first()

    if existing:
        existing.quantity += req.quantity
        existing.unit = req.unit
        if req.category:
            existing.category = req.category
        if req.days_fresh is not None:
            existing.days_fresh = req.days_fresh
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    item = PantryItem(
        user_id=current_user.id,
        ingredient_name=req.ingredient_name.strip(),
        quantity=req.quantity,
        unit=req.unit,
        category=req.category or "Other",
        days_fresh=req.days_fresh if req.days_fresh is not None else 7,
        updated_at=datetime.now(timezone.utc)
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{item_id}", response_model=PantryItemResponse)
def update_pantry_item(
    item_id: int,
    req: PantryItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update pantry item quantity, unit, category, or freshness window."""
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

    if req.quantity is not None:
        if req.quantity > item.quantity:
            update_timestamp = True # Adding new stock resets freshness
        item.quantity = req.quantity
    if req.unit is not None:
        item.unit = req.unit
    if req.category is not None:
        item.category = req.category
    if req.days_fresh is not None:
        item.days_fresh = req.days_fresh
        update_timestamp = True
    
    if update_timestamp:
        item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item

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

@router.post("/deduct-recipe")
def deduct_recipe_ingredients(
    req: RecipeDeductRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deduct recipe ingredients from user's pantry stocks."""
    import re
    
    def tokenize(s: str) -> set:
        words = set(re.findall(r'\b\w+\b', s.lower()))
        normalized = set()
        for w in words:
            normalized.add(w)
            if w.endswith('s') and len(w) > 3:
                normalized.add(w[:-1])
        return normalized

    deducted = []
    not_found = []
    
    all_items = db.query(PantryItem).filter(PantryItem.user_id == current_user.id).all()
    
    for ing in req.ingredients:
        match = None
        req_tokens = tokenize(ing.name)
        
        # 1. Exact Match
        for item in all_items:
            if item.ingredient_name.lower().strip() == ing.name.lower().strip():
                match = item
                break
                
        # 2. Token Intersection Match (Word Boundaries & Singular/Plural)
        if not match:
            for item in all_items:
                item_tokens = tokenize(item.ingredient_name)
                # Ensure they share core root words, preventing "salt" from matching "salted butter"
                if len(item_tokens & req_tokens) > 0 and (item_tokens.issubset(req_tokens) or req_tokens.issubset(item_tokens)):
                    match = item
                    break
                    
        if match:
            # 3. Unit Normalization before Deduction
            qty_to_deduct = normalize_quantity(ing.qty, ing.unit, match.unit) if ing.unit else ing.qty
            
            # 4. Safe Deduction (DO NOT UPDATE updated_at)
            match.quantity = max(0.0, match.quantity - qty_to_deduct)
            db.commit()
            deducted.append({"name": match.ingredient_name, "deducted_qty": qty_to_deduct, "new_qty": match.quantity, "unit": match.unit})
        else:
            not_found.append(ing.name)
            
    return {"message": "Deduction completed", "deducted": deducted, "not_found": not_found}

class MagicImportRequest(BaseModel):
    text: Optional[str] = None
    raw_text: Optional[str] = None

    @property
    def input_text(self) -> str:
        return self.raw_text or self.text or ""

def _fallback_parse_grocery_text(text: str) -> list[dict]:
    """Rule-based fallback parser when Gemini API is unavailable."""
    import re
    lines = [l.strip() for l in text.replace(';', '\n').split('\n') if l.strip()]
    items = []
    pattern = re.compile(
        r'^(?:[-•*]\s*)?'
        r'(?:(\d+(?:\.\d+)?)\s*)?'
        r'(pcs?|kg|g|ml|l|liter|liters|cups?|tbsp|tsp|oz|bunch|packets?|packets?|slices?|pieces?)?\s*'
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
            items.append({
                "ingredient_name": name.title(),
                "quantity": qty,
                "unit": unit.lower(),
                "category": "Other",
                "days_fresh": 7,
            })
        elif line:
            items.append({
                "ingredient_name": line.title(),
                "quantity": 1,
                "unit": "pcs",
                "category": "Other",
                "days_fresh": 7,
            })
    return items

@router.post("/magic-import")
async def magic_import_pantry(
    req: MagicImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Parses a messy grocery list or receipt text via Gemini API 
    and saves parsed items directly into the user's pantry.
    Falls back to rule-based parsing when Gemini is unavailable.
    """
    input_text = req.input_text
    if not input_text.strip():
        raise HTTPException(status_code=400, detail="No text provided to import.")

    parsed_items = None

    # Try Gemini API first
    if settings.GEMINI_API_KEY:
        prompt = f"""
    You are an expert culinary AI. Parse the following grocery list or receipt text and extract the ingredients.
    Return ONLY a valid JSON array of objects. No markdown formatting, no code blocks, just raw JSON.
    Each object must exactly match this schema:
    - "ingredient_name" (string, capitalized)
    - "quantity" (number)
    - "unit" (string, e.g., 'pcs', 'g', 'ml', 'serving', etc.)
    - "category" (string, EXACTLY ONE OF: 'Produce', 'Proteins', 'Dairy', 'Grains & Baking', 'Spices & Seasonings', 'Other')
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

    # Fallback to rule-based parser
    if parsed_items is None:
        parsed_items = _fallback_parse_grocery_text(input_text)

    if not parsed_items:
        raise HTTPException(status_code=400, detail="Could not parse any items from the provided text.")

    # Auto-save parsed items into the user's pantry
    saved_count = 0
    for item in parsed_items:
        name = item.get("ingredient_name", "").strip()
        if not name:
            continue
        
        # Check if item already exists in pantry
        existing = db.query(PantryItem).filter(
            PantryItem.user_id == current_user.id,
            PantryItem.ingredient_name.ilike(name)
        ).first()
        
        if existing:
            existing.quantity = (existing.quantity or 0) + (item.get("quantity", 1) or 1)
        else:
            new_item = PantryItem(
                user_id=current_user.id,
                ingredient_name=name,
                quantity=item.get("quantity", 1),
                unit=item.get("unit", "pcs"),
                category=item.get("category", "Other"),
                days_fresh=item.get("days_fresh", 7),
            )
            db.add(new_item)
        saved_count += 1
    
    db.commit()

    return {
        "items": parsed_items,
        "message": f"Successfully imported {saved_count} items into your pantry!"
    }

@router.get("/generate-recipe")
async def generate_pantry_recipe(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a recipe strictly using currently available pantry items.
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key is missing.")

    all_items = db.query(PantryItem).filter(PantryItem.user_id == current_user.id).all()
    available = []
    for item in all_items:
        expiry_time = item.updated_at.timestamp() + (item.days_fresh * 24 * 3600)
        if expiry_time > datetime.now().timestamp() and item.quantity > 0:
            available.append(f"{item.quantity} {item.unit} {item.ingredient_name}")
            
    if not available:
        raise HTTPException(status_code=400, detail="Pantry is empty or all items expired.")

    pantry_str = ", ".join(available)
    
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
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
                
            recipe = json.loads(raw_text.strip())
            return recipe
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
