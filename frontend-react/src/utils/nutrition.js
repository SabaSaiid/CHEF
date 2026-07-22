/**
 * Calculates normalized integer macro percentages using the Largest Remainder Method (Hare-Niemeyer).
 * Guarantees that the integer percentages sum to EXACTLY 100% (or 0% if total calories/macros is 0).
 *
 * @param {number} proteinG - Protein in grams
 * @param {number} carbsG - Carbs in grams
 * @param {number} fatG - Fat in grams
 * @param {number} totalCalories - Total target or actual calories (optional fallback)
 * @returns {{ proteinPct: number, carbsPct: number, fatPct: number }}
 */
export function calculateMacroPercentages(proteinG = 0, carbsG = 0, fatG = 0, totalCalories = 0) {
  const pCal = Math.max(0, proteinG || 0) * 4;
  const cCal = Math.max(0, carbsG || 0) * 4;
  const fCal = Math.max(0, fatG || 0) * 9;
  const macroTotal = pCal + cCal + fCal;
  const total = macroTotal > 0 ? macroTotal : (totalCalories > 0 ? totalCalories : 0);

  if (total <= 0) {
    return { proteinPct: 0, carbsPct: 0, fatPct: 0 };
  }

  const items = [
    { key: 'proteinPct', val: (pCal / total) * 100 },
    { key: 'carbsPct', val: (cCal / total) * 100 },
    { key: 'fatPct', val: (fCal / total) * 100 },
  ];

  const floorSum = items.reduce((sum, item) => sum + Math.floor(item.val), 0);
  let deficit = Math.min(100, Math.max(0, 100 - floorSum));

  const sorted = items
    .map((item) => ({
      key: item.key,
      floor: Math.floor(item.val),
      rem: item.val - Math.floor(item.val),
    }))
    .sort((a, b) => b.rem - a.rem);

  const result = { proteinPct: 0, carbsPct: 0, fatPct: 0 };

  sorted.forEach((item, i) => {
    const bonus = i < deficit ? 1 : 0;
    result[item.key] = item.floor + bonus;
  });

  return result;
}
