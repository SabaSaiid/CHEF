from fastapi import APIRouter
import json
from pathlib import Path

router = APIRouter(prefix="/api/substitutions", tags=["substitutions"])

_DATA_FILE = Path(__file__).resolve().parent.parent / "substitutions.json"

def _load_substitutions():
    with open(_DATA_FILE, "r") as f:
        return json.load(f)

@router.get("", summary="List all ingredients with substitutions")
def list_substitutions():
    """Returns the full substitution dictionary."""
    return _load_substitutions()

@router.get("/{ingredient}", summary="Get substitutions for a specific ingredient")
def get_substitution(ingredient: str):
    """
    Returns substitutes for a given ingredient (case-insensitive partial match).
    E.g. /api/substitutions/butter → returns butter substitutes
    """
    data = _load_substitutions()
    # Case-insensitive match
    for key in data:
        if key.lower() == ingredient.lower():
            return {"ingredient": key, "substitutes": data[key], "found": True}
    
    # Try partial match
    matches = {k: v for k, v in data.items() if ingredient.lower() in k.lower()}
    if matches:
        first_key = list(matches.keys())[0]
        return {"ingredient": first_key, "substitutes": matches[first_key], "found": True}
    
    return {"ingredient": ingredient, "substitutes": [], "found": False}
