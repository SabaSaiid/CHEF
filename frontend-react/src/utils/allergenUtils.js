/**
 * CHEF Allergen Safety Utility
 * Matches recipe ingredients against user allergy profiles to flag health hazards.
 */

export const ALLERGEN_DICTIONARY = {
  Peanut: ['peanut', 'peanuts', 'peanut butter', 'peanut oil', 'groundnut', 'arachis'],
  'Tree Nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'macadamia', 'hazelnut', 'nut', 'nuts'],
  'Dairy / Lactose': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'ghee', 'lactose', 'dairy'],
  'Gluten / Wheat': ['wheat', 'flour', 'gluten', 'barley', 'rye', 'pasta', 'bread', 'semolina', 'couscous'],
  Shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'squid', 'octopus', 'shellfish'],
  Soy: ['soy', 'soya', 'soybean', 'tofu', 'edamame', 'tamari', 'soy sauce', 'tempeh'],
  Eggs: ['egg', 'eggs', 'egg white', 'egg yolk', 'mayonnaise', 'mayo', 'ovalbumin'],
  Sesame: ['sesame', 'tahini', 'sesame oil', 'sesame seed'],
  Mustard: ['mustard', 'mustard seed', 'mustard oil'],
  Fish: ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'trout', 'anchovy', 'sardine', 'fish sauce']
};

/**
 * Checks a list of recipe ingredients against active user allergens.
 * @param {Array|string} ingredients - Array of ingredient strings or single string
 * @param {Array} userAllergens - List of allergen strings enabled in user profile (e.g. ['Peanut', 'Gluten / Wheat'])
 * @returns {Array} List of matched allergen names
 */
export function checkRecipeAllergens(ingredients, userAllergens = []) {
  if (!ingredients || !userAllergens || userAllergens.length === 0) return [];

  const ingredientList = Array.isArray(ingredients) 
    ? ingredients.map(i => (typeof i === 'string' ? i : i.name || '').toLowerCase())
    : [String(ingredients).toLowerCase()];

  const fullText = ingredientList.join(' ');
  const detected = [];

  userAllergens.forEach(allergen => {
    const keywords = ALLERGEN_DICTIONARY[allergen] || [allergen.toLowerCase()];
    const hasMatch = keywords.some(keyword => {
      // Use regex with word boundaries to avoid false positives (e.g. 'nut' matching 'nutmeg')
      if (keyword === 'nut' || keyword === 'nuts') {
        const nutRegex = /\b(almond|walnut|cashew|pecan|pistachio|hazelnut|macadamia|chestnut|nut|nuts)\b/i;
        return nutRegex.test(fullText);
      }
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(fullText);
    });

    if (hasMatch) {
      detected.push(allergen);
    }
  });

  return detected;
}
