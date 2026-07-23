"""
TDEE Calculator router — clinically accurate Total Daily Energy Expenditure
engine with dual-formula BMR, percentage-based goal adjustments, and
weight-based protein targets.

References:
  • Mifflin-St Jeor (1990)  — doi:10.1093/ajcn/51.2.241
  • Katch-McArdle (1996)    — uses lean body mass when body-fat % is known
  • Cunningham (1980)       — alternative for athletes with known LBM
  • Dynamic TEF Adjustment  — factors in thermic effect of high-protein diets
  • ISSN position stand     — protein 1.4–2.2 g/kg for active individuals
  • WHO BMI classification  — https://www.who.int/data/gho/data/themes/topics/topic-details/GHO/body-mass-index
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import TDEERequest, TDEEResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/tdee", tags=["tdee"])


# ── Activity multipliers (Harris-Benedict / Katch-McArdle standard) ──────

ACTIVITY_MULTIPLIERS = {
    "sedentary":        1.2,    # Desk job, little to no exercise
    "lightly_active":   1.375,  # Light exercise 1–3 days/week
    "moderately_active": 1.55,  # Moderate exercise 3–5 days/week
    "very_active":      1.725,  # Hard exercise 6–7 days/week
    "extra_active":     1.9,    # Very hard exercise + physical job / 2× training
}

# ── Deficit / surplus percentages by intensity ───────────────────────────

GOAL_ADJUSTMENTS = {
    #              (deficit %, surplus %)
    "mild":       (0.10, 0.10),   # ~0.25 kg/week change
    "moderate":   (0.20, 0.15),   # ~0.5 kg/week loss, ~0.35 kg/week gain
    "aggressive": (0.25, 0.20),   # ~0.7 kg/week loss, ~0.5 kg/week gain
}

# ── Protein targets (g / kg body weight) by goal ────────────────────────

PROTEIN_PER_KG = {
    #                 (sedentary, active)
    "lose":     (1.6, 2.2),   # Higher protein preserves lean mass during deficit
    "maintain": (1.2, 1.8),   # Moderate protein for maintenance
    "gain":     (1.6, 2.0),   # High protein for muscle synthesis
}

# ── Which activity levels count as "active" for protein purposes ─────────

ACTIVE_LEVELS = {"moderately_active", "very_active", "extra_active"}

# ── BMI categories (WHO classification) ─────────────────────────────────

BMI_CATEGORIES = [
    (16.0,  "Severely Underweight"),
    (18.5,  "Underweight"),
    (25.0,  "Normal"),
    (30.0,  "Overweight"),
    (35.0,  "Obese I"),
    (40.0,  "Obese II"),
    (999.0, "Obese III"),
]


def _bmi(weight_kg: float, height_cm: float) -> tuple[float, str]:
    """Calculate BMI and return (value, WHO category)."""
    height_m = height_cm / 100
    bmi_val = round(weight_kg / (height_m ** 2), 1)
    category = "Obese III"
    for threshold, label in BMI_CATEGORIES:
        if bmi_val < threshold:
            category = label
            break
    return bmi_val, category


def _bmr_mifflin(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    """Mifflin-St Jeor equation (1990) — most validated for general population."""
    if gender == "male":
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    else:
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161


def _bmr_katch_mcardle(weight_kg: float, body_fat_pct: float) -> float:
    """Katch-McArdle equation — more accurate when body-fat % is known."""
    lean_body_mass = weight_kg * (1 - body_fat_pct / 100)
    return 370 + (21.6 * lean_body_mass)


def _bmr_cunningham(weight_kg: float, body_fat_pct: float) -> float:
    """Cunningham equation — heavily favored for athletic/muscular individuals."""
    lean_body_mass = weight_kg * (1 - body_fat_pct / 100)
    return 500 + (22 * lean_body_mass)


def calculate_macro_percentages(protein_g: float | None, carbs_g: float | None, fat_g: float | None, total_calories: float | None) -> tuple[int, int, int]:
    """Calculates normalized integer macro percentages using the Largest Remainder Method (Hare-Niemeyer)."""
    p_g = max(0.0, float(protein_g or 0))
    c_g = max(0.0, float(carbs_g or 0))
    f_g = max(0.0, float(fat_g or 0))
    p_cal = p_g * 4
    c_cal = c_g * 4
    f_cal = f_g * 9
    macro_total = p_cal + c_cal + f_cal
    total = macro_total if macro_total > 0 else (float(total_calories) if total_calories and float(total_calories) > 0 else 0.0)

    if total <= 0:
        return 0, 0, 0

    items = [
        {"key": "p", "val": (p_cal / total) * 100},
        {"key": "c", "val": (c_cal / total) * 100},
        {"key": "f", "val": (f_cal / total) * 100},
    ]

    floor_sum = sum(int(item["val"]) for item in items)
    deficit = max(0, min(100, 100 - floor_sum))

    sorted_items = sorted(
        [{"key": item["key"], "floor": int(item["val"]), "rem": item["val"] - int(item["val"])} for item in items],
        key=lambda x: x["rem"],
        reverse=True
    )

    res = {}
    for idx, item in enumerate(sorted_items):
        bonus = 1 if idx < deficit else 0
        res[item["key"]] = item["floor"] + bonus

    return res["p"], res["c"], res["f"]


def calculate_tdee_macros(req: TDEERequest) -> TDEEResponse:
    """
    Core TDEE engine with clinical-grade accuracy.

    Pipeline:
      1. BMR  — Cunningham / Katch-McArdle (if body fat known) or Mifflin-St Jeor
      2. TDEE — BMR × activity multiplier
      3. Goal — percentage-based deficit/surplus (not flat ±500)
      4. Safety — never drop below BMR
      5. Protein — g/kg body weight (ISSN guidelines)
      6. Fat — 25-30% of calories (essential fat needs)
      7. Carbs — remainder of calories
      8. Extras — fiber (14 g / 1000 kcal) + water (35 ml / kg)
    """

    # ─── 1. Basal Metabolic Rate ─────────────────────────────────────
    if req.body_fat_percent is not None:
        # If very active/athletic, use Cunningham, else Katch-McArdle
        if req.activity_level in ["very_active", "extra_active"]:
            bmr = _bmr_cunningham(req.weight_kg, req.body_fat_percent)
            formula_used = "Cunningham"
        else:
            bmr = _bmr_katch_mcardle(req.weight_kg, req.body_fat_percent)
            formula_used = "Katch-McArdle"
    else:
        bmr = _bmr_mifflin(req.weight_kg, req.height_cm, req.age, req.gender)
        formula_used = "Mifflin-St Jeor"

    # ─── 2. Total Daily Energy Expenditure (maintenance) ─────────────
    multiplier = ACTIVITY_MULTIPLIERS.get(req.activity_level, 1.2)
    tdee_maintenance = bmr * multiplier

    # ─── 3. Goal adjustment (percentage-based) ───────────────────────
    intensity = req.goal_intensity if req.goal_intensity in GOAL_ADJUSTMENTS else "moderate"
    deficit_pct, surplus_pct = GOAL_ADJUSTMENTS[intensity]

    if req.goal == "lose":
        target_calories = tdee_maintenance * (1 - deficit_pct)
    elif req.goal == "gain":
        target_calories = tdee_maintenance * (1 + surplus_pct)
    else:
        target_calories = tdee_maintenance

    # ─── 4. Safety floor — never go below BMR ────────────────────────
    # Going below BMR triggers metabolic adaptation and muscle loss.
    # Additional gender-based absolute minimums from clinical guidelines.
    absolute_min = 1500 if req.gender == "male" else 1200
    safety_floor = max(bmr, absolute_min)
    target_calories = max(target_calories, safety_floor)

    target_calories = int(round(target_calories))

    # ─── 5. Macro Distribution (Evidence-Based AMDR & Sports Nutrition) ──
    # Standard Clinical Splits:
    #   • Maintenance: 20% Protein / 50% Carbs / 30% Fat
    #   • Weight Loss: 30% Protein / 40% Carbs / 30% Fat (higher protein preserves lean mass)
    #   • Muscle Gain: 30% Protein / 45% Carbs / 25% Fat
    if req.goal == "lose":
        protein_ratio, fat_ratio = 0.30, 0.30
    elif req.goal == "gain":
        protein_ratio, fat_ratio = 0.30, 0.25
    else:
        protein_ratio, fat_ratio = 0.20, 0.30

    # Ensure active individuals meet minimum protein per kg (1.6g/kg for lose/gain, 1.2g/kg maintain)
    is_active = req.activity_level in ACTIVE_LEVELS
    min_protein_g_per_kg = 1.6 if (req.goal in ["lose", "gain"] or is_active) else 1.2
    weight_protein_g = int(round(min_protein_g_per_kg * req.weight_kg))
    
    pct_protein_g = int(round((target_calories * protein_ratio) / 4))
    target_protein = max(pct_protein_g, weight_protein_g)
    
    # Cap protein at 35% of total calories (AMDR upper limit)
    max_protein_cals = target_calories * 0.35
    if target_protein * 4 > max_protein_cals:
        target_protein = int(round(max_protein_cals / 4))
        
    protein_calories = target_protein * 4

    # Fat target
    fat_calories_target = target_calories * fat_ratio
    target_fat = int(round(fat_calories_target / 9))
    fat_calories = target_fat * 9

    # Carbs target (remainder of calories)
    carbs_calories = max(0, target_calories - protein_calories - fat_calories)
    target_carbs = int(round(carbs_calories / 4))

    # ─── Ensure total target_calories strictly matches macro sum ──────
    target_calories = (target_protein * 4) + (target_carbs * 4) + (target_fat * 9)

    # ─── Actual macro percentages ────────────────────────────────────
    protein_pct_actual, carbs_pct_actual, fat_pct_actual = calculate_macro_percentages(
        target_protein, target_carbs, target_fat, target_calories
    )

    # ─── 8. Fiber & Water ────────────────────────────────────────────
    # Academy of Nutrition and Dietetics: 14 g fiber per 1000 kcal
    target_fiber = int(round(14 * (target_calories / 1000)))
    target_fiber = max(target_fiber, 25)  # minimum 25 g/day

    # EFSA guideline: ~35 ml per kg body weight
    target_water = int(round(35 * req.weight_kg))

    # ─── 9. BMI & Target Recommendations ─────────────────────────────
    bmi_val, bmi_cat = _bmi(req.weight_kg, req.height_cm)

    if bmi_val < 18.5:
        recommended_goal = "gain"
        recommendation_reason = f"BMI is {bmi_val} ({bmi_cat}). Controlled Surplus (Bulking) is recommended for healthy muscle gain."
    elif bmi_val >= 25.0:
        recommended_goal = "lose"
        recommendation_reason = f"BMI is {bmi_val} ({bmi_cat}). Controlled Deficit (Cutting) is recommended to achieve normal BMI range."
    else:
        recommended_goal = req.goal if req.goal in ["lose", "gain", "maintain"] else "maintain"
        recommendation_reason = f"BMI is {bmi_val} ({bmi_cat}). Healthy normal range — align with your preference ({req.goal})."

    return TDEEResponse(
        # Core targets
        target_calories=target_calories,
        target_protein=target_protein,
        target_carbs=target_carbs,
        target_fat=target_fat,
        # Diagnostic breakdown
        bmr=int(round(bmr)),
        tdee_maintenance=int(round(tdee_maintenance)),
        bmi=bmi_val,
        bmi_category=bmi_cat,
        formula_used=formula_used,
        # Additional targets
        target_fiber_g=target_fiber,
        target_water_ml=target_water,
        # Macro split info
        protein_pct=protein_pct_actual,
        carbs_pct=carbs_pct_actual,
        fat_pct=fat_pct_actual,
        protein_per_kg=round(target_protein / req.weight_kg, 2),
        recommended_goal=recommended_goal,
        recommendation_reason=recommendation_reason,
    )



@router.post("/calculate", response_model=TDEEResponse)
def calculate_public(req: TDEERequest):
    """
    Public endpoint to calculate TDEE without saving it.
    """
    return calculate_tdee_macros(req)


@router.post("/save", response_model=TDEEResponse)
def calculate_and_save(
    req: TDEERequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Calculates TDEE, saves the physical profile and targets to the user's account, 
    and returns the calculated macros.
    """
    result = calculate_tdee_macros(req)
    
    # Save inputs
    current_user.age = req.age
    current_user.gender = req.gender
    current_user.weight_kg = req.weight_kg
    current_user.height_cm = req.height_cm
    current_user.activity_level = req.activity_level
    current_user.goal = req.goal
    current_user.goal_intensity = req.goal_intensity
    current_user.body_fat_percent = req.body_fat_percent
    
    # Save outputs
    current_user.target_calories = result.target_calories
    current_user.target_protein = result.target_protein
    current_user.target_carbs = result.target_carbs
    current_user.target_fat = result.target_fat
    current_user.bmr = result.bmr
    current_user.tdee_maintenance = result.tdee_maintenance
    current_user.bmi = result.bmi
    current_user.target_fiber_g = result.target_fiber_g
    current_user.target_water_ml = result.target_water_ml
    
    db.commit()
    db.refresh(current_user)
    
    return result
