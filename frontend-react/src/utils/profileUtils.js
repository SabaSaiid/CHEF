/**
 * Profile, Unit Conversion, TDEE, and Clinical Health Utilities
 */

import { calculateMacroPercentages } from './nutrition';

// ── Unit Conversions ──────────────────────────────────────────

export function kgToLbs(kg) {
  if (!kg && kg !== 0) return '';
  return (Math.round(kg * 2.20462262 * 10) / 10).toString();
}

export function lbsToKg(lbs) {
  if (!lbs && lbs !== 0) return '';
  return Math.round((parseFloat(lbs) / 2.20462262) * 10) / 10;
}

export function cmToFtIn(cm) {
  if (!cm && cm !== 0) return { feet: '', inches: '' };
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet: feet.toString(), inches: inches.toString() };
}

export function ftInToCm(feet, inches) {
  const f = parseFloat(feet) || 0;
  const i = parseFloat(inches) || 0;
  if (f === 0 && i === 0) return '';
  return Math.round((f * 12 + i) * 2.54);
}

// ── Macro Split Presets ───────────────────────────────────────

export const MACRO_PRESETS = [
  { id: 'balanced', label: 'Balanced', icon: '⚖️', proteinPct: 30, carbsPct: 45, fatPct: 25, desc: '30% P · 45% C · 25% F (Mediterranean / Everyday)' },
  { id: 'high_protein', label: 'High Protein', icon: '🥩', proteinPct: 40, carbsPct: 35, fatPct: 25, desc: '40% P · 35% C · 25% F (Fat Loss / Hypertrophy)' },
  { id: 'low_carb', label: 'Low Carb / Keto', icon: '🥑', proteinPct: 25, carbsPct: 10, fatPct: 65, desc: '25% P · 10% C · 65% F (Ketogenic / Insulin Control)' },
  { id: 'endurance', label: 'Endurance', icon: '🏃', proteinPct: 20, carbsPct: 55, fatPct: 25, desc: '20% P · 55% C · 25% F (Athletic / High Carbohydrate)' },
  { id: 'custom', label: 'Custom Sliders', icon: '⚙️', desc: 'Fine-tune exact macro percentages' },
];

// ── Clinical Health Insights ──────────────────────────────────

export const CLINICAL_INSIGHTS = {
  diabetes: {
    name: 'Type 2 Diabetes',
    icon: '🩸',
    color: '#e74c3c',
    guidance: 'Carbohydrates controlled (<40% of total calories), fiber target elevated to 35g+ for glycemic regulation.',
    clinical_note: 'Prioritize low Glycemic Index complex carbohydrates and lean proteins to stabilize blood glucose.',
  },
  hypertension: {
    name: 'Hypertension (High BP)',
    icon: '❤️‍🔥',
    color: '#e67e22',
    guidance: 'Hydration target boosted to 2.5L–3.5L/day. Emphasizes potassium-rich foods and reduced sodium intake.',
    clinical_note: 'DASH diet principles applied: higher magnesium, calcium, and potassium with minimal processed salts.',
  },
  hypotension: {
    name: 'Hypotension (Low BP)',
    icon: '💙',
    color: '#3498db',
    guidance: 'Higher fluid balance (3.0L+) recommended. Moderate healthy electrolyte and sodium maintenance.',
    clinical_note: 'Ensure frequent smaller meals and steady hydration to avoid postprandial blood pressure drops.',
  },
  high_cholesterol: {
    name: 'High Cholesterol',
    icon: '🫀',
    color: '#9b59b6',
    guidance: 'Dietary fat target restricted to ≤25% of calories with emphasis on soluble fiber (oats, legumes, pectin).',
    clinical_note: 'Limits saturated fats while maximizing polyunsaturated & monounsaturated fatty acids (MUFA/PUFA).',
  },
  pcos: {
    name: 'PCOS',
    icon: '🔬',
    color: '#16a085',
    guidance: 'Anti-inflammatory macronutrient distribution with balanced protein (≥30%) and high dietary fiber (30g+).',
    clinical_note: 'Helps balance insulin resistance and hormone regulation through low-glycemic dietary protocols.',
  },
  kidney_disease: {
    name: 'Kidney Disease',
    icon: '🫘',
    color: '#d35400',
    guidance: 'Protein intake capped at 0.8–1.0 g/kg to reduce renal filtration workload. Sodium & potassium monitored.',
    clinical_note: 'Strict renal protocol moderation. Avoid excessive high-protein boluses without medical supervision.',
  },
  thyroid: {
    name: 'Thyroid Support',
    icon: '🦋',
    color: '#2980b9',
    guidance: 'Ensures adequate selenium, zinc, and iodine dietary targets with balanced metabolic energy distribution.',
    clinical_note: 'Avoids extreme caloric deficits to prevent thyroid hormone (T3/T4) down-regulation.',
  },
  anemia: {
    name: 'Anemia / Iron Support',
    icon: '🩺',
    color: '#c0392b',
    guidance: 'Iron-dense culinary suggestions enabled. Vitamin C pairing highlighted to enhance non-heme iron absorption.',
    clinical_note: 'Recommends dark leafy greens, legumes, and lean proteins with citrus or vitamin C pairing.',
  },
};

// ── Live Calculation Engine ───────────────────────────────────

export function computeLiveTDEE(formData, presetId = 'balanced', customRatios = { proteinPct: 30, carbsPct: 45, fatPct: 25 }) {
  const age = parseInt(formData.age, 10);
  const weight = parseFloat(formData.weight_kg);
  const height = parseFloat(formData.height_cm);
  const gender = formData.gender || 'male';
  const activity = formData.activity_level || 'sedentary';
  const goal = formData.goal || 'maintain';
  const intensity = formData.goal_intensity || 'moderate';
  const bodyFat = formData.body_fat_percent ? parseFloat(formData.body_fat_percent) : null;

  if (!age || !weight || !height || weight <= 0 || height <= 0 || age <= 0) {
    return null;
  }

  // 1. Calculate BMR
  let bmr;
  let formula = 'Mifflin-St Jeor';
  if (bodyFat && bodyFat >= 3 && bodyFat <= 60) {
    // Katch-McArdle
    const leanMass = weight * (1 - bodyFat / 100);
    bmr = Math.round(370 + 21.6 * leanMass);
    formula = 'Katch-McArdle (Body Fat % Adjusted)';
  } else {
    // Mifflin-St Jeor
    if (gender === 'male') {
      bmr = Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    } else {
      bmr = Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
  }

  // 2. Activity Multiplier
  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  const multiplier = activityMultipliers[activity] || 1.2;
  const maintenance = Math.round(bmr * multiplier);

  // 3. Goal Adjustment
  let targetCalories = maintenance;
  const goalLower = goal.toLowerCase();
  const isMaintain = goalLower.includes('maintain');

  if (!isMaintain) {
    if (goalLower.includes('lose')) {
      const deficitMap = { mild: 0.1, moderate: 0.2, aggressive: 0.25 };
      const deficit = deficitMap[intensity] || 0.2;
      targetCalories = Math.round(maintenance * (1 - deficit));
    } else if (goalLower.includes('gain')) {
      const surplusMap = { mild: 0.1, moderate: 0.15, aggressive: 0.2 };
      const surplus = surplusMap[intensity] || 0.15;
      targetCalories = Math.round(maintenance * (1 + surplus));
    }
  }

  // Safety floor
  const floor = gender === 'female' ? 1200 : 1500;
  if (targetCalories < floor) targetCalories = floor;

  // 4. Macro Calculation
  let pPct = 30, cPct = 45, fPct = 25;
  if (presetId === 'custom') {
    pPct = customRatios.proteinPct;
    cPct = customRatios.carbsPct;
    fPct = customRatios.fatPct;
  } else {
    const preset = MACRO_PRESETS.find(p => p.id === presetId);
    if (preset && preset.id !== 'custom') {
      pPct = preset.proteinPct;
      cPct = preset.carbsPct;
      fPct = preset.fatPct;
    }
  }

  const targetProteinG = Math.round((targetCalories * (pPct / 100)) / 4);
  const targetCarbsG = Math.round((targetCalories * (cPct / 100)) / 4);
  const targetFatG = Math.round((targetCalories * (fPct / 100)) / 9);

  // 5. BMI
  const heightM = height / 100;
  const bmiVal = Math.round((weight / (heightM * heightM)) * 10) / 10;
  let bmiCat = 'Normal';
  if (bmiVal < 18.5) bmiCat = 'Underweight';
  else if (bmiVal >= 30) bmiCat = 'Obese';
  else if (bmiVal >= 25) bmiCat = 'Overweight';

  // 6. Fiber & Water
  const targetFiber = Math.max(25, Math.min(50, Math.round((targetCalories / 1000) * 14)));
  const targetWater = Math.round(weight * 35 + (activity === 'very_active' || activity === 'extra_active' ? 500 : 0));

  const proteinPerKg = (targetProteinG / weight).toFixed(1);

  return {
    target_calories: targetCalories,
    target_protein: targetProteinG,
    target_carbs: targetCarbsG,
    target_fat: targetFatG,
    protein_pct: pPct,
    carbs_pct: cPct,
    fat_pct: fPct,
    bmr,
    tdee_maintenance: maintenance,
    bmi: bmiVal,
    bmi_category: bmiCat,
    formula_used: formula,
    target_fiber_g: targetFiber,
    target_water_ml: targetWater,
    protein_per_kg: proteinPerKg,
  };
}

// ── Goal Timeline Estimator ───────────────────────────────────

export function calculateGoalTimeline(currentWeight, goalWeight, targetCalories, maintenanceCalories) {
  const curr = parseFloat(currentWeight);
  const goal = parseFloat(goalWeight);
  if (!curr || !goal || curr === goal || !targetCalories || !maintenanceCalories) {
    return null;
  }

  const deltaKg = Math.abs(curr - goal);
  const dailyCalorieDelta = Math.abs(maintenanceCalories - targetCalories);

  // 1 kg body tissue approx 7700 kcal
  const totalKcalNeeded = deltaKg * 7700;
  const daysNeeded = dailyCalorieDelta > 0 ? Math.round(totalKcalNeeded / dailyCalorieDelta) : null;

  if (!daysNeeded || daysNeeded <= 0 || daysNeeded > 730) {
    return null;
  }

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysNeeded);

  const weeklyRateKg = ((dailyCalorieDelta * 7) / 7700).toFixed(2);
  const weeksNeeded = Math.round((daysNeeded / 7) * 10) / 10;

  return {
    deltaKg: deltaKg.toFixed(1),
    isLoss: curr > goal,
    daysNeeded,
    weeksNeeded,
    weeklyRateKg,
    targetDateStr: targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}
