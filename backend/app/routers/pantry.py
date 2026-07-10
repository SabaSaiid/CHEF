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
