/**
 * Utility for parsing, scaling, and formatting recipe ingredients cleanly.
 * Features an intelligent Culinary Quantity Engine to provide realistic
 * dish ingredient quantities for any dish, scaling seamlessly with servings.
 */

const UNITS_REGEX = new RegExp(
  '^\\b(cups?|c|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|kg|kilograms?|grams?|g|ml|milliliters?|liters?|l|pinches?|pinch|dashes?|dash|cans?|bottles?|packages?|slices?|pieces?|cloves?|clove|stalks?|heads?|bunches?|bunch|sprigs?|handfuls?|handful|small|medium|large|pcs)\\b',
  'i'
);

// Supports ASCII digits, fractions (1/2), unicode fractions (½, ⅓, ¼, ¾, ⅔), and ranges (1-2)
const leadingQtyRegex = new RegExp(
  '^((?:[\\d\\u00BD\\u2153\\u2154\\u00BC\\u00BE]+(?:\\s+[\\d\\u00BD\\u2153\\u2154\\u00BC\\u00BE/\\.]+|/\\d+|\\.\\d+)?|/\\d+)(?:\\s*(?:-|\\u2013)\\s*(?:[\\d\\u00BD\\u2153\\u2154\\u00BC\\u00BE]+(?:\\s+[\\d\\u00BD\\u2153\\u2154\\u00BC\\u00BE/\\.]+|/\\d+|\\.\\d+)?|/\\d+))?)\\s*([a-zA-Z]+)?\\s*(?:of\\s+)?(.*)$',
  'i'
);

const inlineQtyRegex = new RegExp(
  '^(.*?)\\s*(?:[\\(\\-]|\u2013)\\s*(\\d+(?:\\.\\d+)?)\\s*([a-zA-Z]+)?\\s*[\\)]?$',
  'i'
);

// Culinary Estimation Database for missing quantities
const CULINARY_ESTIMATES = [
  // Grains, Flours & Pulses
  { regex: /\b(arhar dal|toor dal|tur dal|moong dal|chana dal|urad dal|masoor dal|dal|lentil|lentils)\b/i, qtyPerServing: 0.33, unit: 'cup' },
  { regex: /\b(basmati rice|rice)\b/i, qtyPerServing: 0.5, unit: 'cup' },
  { regex: /\b(chickpeas|chana|chole|rajma|kidney beans|beans)\b/i, qtyPerServing: 0.38, unit: 'cup' },
  { regex: /\b(atta|whole wheat flour|maida|flour|all-purpose flour|suji|rawa|semolina|besan|poha|sabudana|oats|quinoa|sattu)\b/i, qtyPerServing: 0.5, unit: 'cup' },
  { regex: /\b(pasta|spaghetti|macaroni|noodles)\b/i, qtyPerServing: 75, unit: 'g' },
  { regex: /\b(lasagna sheets|lasagna sheet|lasagna)\b/i, qtyPerServing: 3, unit: 'sheets' },
  { regex: /\b(bread|pav|naan|roti|puri|bhatura|tortilla|bun|buns)\b/i, qtyPerServing: 1, unit: 'pcs' },

  // Nuts, Dried Fruits & Seeds
  { regex: /\b(peanuts|cashews|cashew|almonds|almond|raisins|walnuts|pistachios|seeds|sesame seeds|chia seeds|flaxseeds)\b/i, qtyPerServing: 0.67, unit: 'tbsp' },

  // Proteins & Seafood
  { regex: /\b(paneer|tofu)\b/i, qtyPerServing: 100, unit: 'g' },
  { regex: /\b(chicken|chicken breast|mutton|lamb|beef|pork|fish|salmon|tuna|meat)\b/i, qtyPerServing: 125, unit: 'g' },
  { regex: /\b(shrimp|prawn|prawns|clams|crab|lobster|squid)\b/i, qtyPerServing: 100, unit: 'g' },
  { regex: /\b(egg|eggs)\b/i, qtyPerServing: 1, unit: 'pcs' },

  // Vegetables & Fruits (Piece, Head, Cup, or Gram measurements — NEVER tbsp)
  { regex: /\b(potato|potatoes|aloo)\b/i, qtyPerServing: 0.67, unit: 'medium' },
  { regex: /\b(sweet potato|sweet potatoes)\b/i, qtyPerServing: 0.5, unit: 'medium' },
  { regex: /\b(cauliflower|gobi)\b/i, qtyPerServing: 0.33, unit: 'head' },
  { regex: /\b(cabbage)\b/i, qtyPerServing: 0.25, unit: 'head' },
  { regex: /\b(eggplant|brinjal|baingan|aubergine)\b/i, qtyPerServing: 0.5, unit: 'medium' },
  { regex: /\b(bell pepper|capsicum|peppers|bell peppers)\b/i, qtyPerServing: 0.5, unit: 'medium' },
  { regex: /\b(spinach|palak)\b/i, qtyPerServing: 1.0, unit: 'cup' },
  { regex: /\b(tomato|tomatoes|tamatar)\b/i, qtyPerServing: 0.67, unit: 'medium' },
  { regex: /\b(onion|onions|pyaaz|shallots|shallot)\b/i, qtyPerServing: 0.33, unit: 'medium' },
  { regex: /\b(carrot|carrots|gajar)\b/i, qtyPerServing: 0.5, unit: 'medium' },
  { regex: /\b(mushroom|mushrooms)\b/i, qtyPerServing: 75, unit: 'g' },
  { regex: /\b(bean sprouts|sprouts)\b/i, qtyPerServing: 0.5, unit: 'cup' },
  { regex: /\b(peas|matar|corn|sweet corn)\b/i, qtyPerServing: 0.33, unit: 'cup' },
  { regex: /\b(coconut|grated coconut)\b/i, qtyPerServing: 0.33, unit: 'cup' },
  { regex: /\b(drumstick|drumsticks)\b/i, qtyPerServing: 1, unit: 'pcs' },
  { regex: /\b(cucumber|kheera|zucchini)\b/i, qtyPerServing: 0.5, unit: 'medium' },
  { regex: /\b(broccoli)\b/i, qtyPerServing: 0.33, unit: 'head' },
  { regex: /\b(scallions|spring onion|green onion)\b/i, qtyPerServing: 2, unit: 'stalks' },
  { regex: /\b(tamarind pulp|tamarind paste|tamarind)\b/i, qtyPerServing: 0.5, unit: 'tbsp' },
  { regex: /\b(kokum)\b/i, qtyPerServing: 2, unit: 'pieces' },

  // Broths, Stocks & Liquids
  { regex: /\b(beef broth|chicken broth|vegetable broth|bone broth|broth|stock)\b/i, qtyPerServing: 1, unit: 'cup' },
  { regex: /\b(milk|whole milk|almond milk|soy milk|oat milk)\b/i, qtyPerServing: 0.5, unit: 'cup' },
  { regex: /\b(coconut milk)\b/i, qtyPerServing: 0.33, unit: 'cup' },

  // Sauces & Condiments
  { regex: /\b(soy sauce|tamari)\b/i, qtyPerServing: 0.5, unit: 'tbsp' },
  { regex: /\b(tamarind chutney|green chutney|mint chutney|coconut chutney|ketchup|sauce|vinegar|mayonnaise|mustard)\b/i, qtyPerServing: 0.67, unit: 'tbsp' },
  { regex: /\b(pav bhaji masala|sambar powder|rasam powder|chana masala powder|kitchen king masala|biryani masala|chai masala|curry powder|garam masala)\b/i, qtyPerServing: 0.33, unit: 'tsp' },

  // Aromatics, Herbs & Baking
  { regex: /\b(garlic|lahsun)\b/i, qtyPerServing: 1.33, unit: 'clove' },
  { regex: /\b(ginger|adrak)\b/i, qtyPerServing: 0.33, unit: 'inch' },
  { regex: /\b(green chili|chili|chilies|chillie|chile|hari mirch)\b/i, qtyPerServing: 0.67, unit: 'pcs' },
  { regex: /\b(curry leaves)\b/i, isSpecial: true, text: '6–8 fresh curry leaves' },
  { regex: /\b(coriander leaves|cilantro|mint|pudina|herbs|basil|parsley)\b/i, qtyPerServing: 1, unit: 'tbsp' },
  { regex: /\b(tea leaves|black tea)\b/i, qtyPerServing: 0.75, unit: 'tbsp' },
  { regex: /\b(cardamom|elaichi)\b/i, qtyPerServing: 1.5, unit: 'pods' },
  { regex: /\b(yeast|active dry yeast)\b/i, qtyPerServing: 0.25, unit: 'tsp' },
  { regex: /\b(saffron|kesar)\b/i, isSpecial: true, text: '1 pinch saffron (soaked in 1 tbsp warm milk)' },
  { regex: /\b(hing|asafoetida)\b/i, isSpecial: true, text: '1 pinch hing (asafoetida)' },

  // Spices
  { regex: /\b(turmeric|haldi)\b/i, qtyPerServing: 0.17, unit: 'tsp' },
  { regex: /\b(cumin|jeera)\b/i, qtyPerServing: 0.33, unit: 'tsp' },
  { regex: /\b(mustard seeds|rai)\b/i, qtyPerServing: 0.33, unit: 'tsp' },
  { regex: /\b(coriander powder|dhaniya powder)\b/i, qtyPerServing: 0.33, unit: 'tsp' },
  { regex: /\b(red chili powder|chili powder|paprika)\b/i, qtyPerServing: 0.25, unit: 'tsp' },
  { regex: /\b(amchur|dry mango powder)\b/i, qtyPerServing: 0.25, unit: 'tsp' },

  // Oils & Dairy
  { regex: /\b(ghee)\b/i, qtyPerServing: 0.5, unit: 'tbsp' },
  { regex: /\b(mustard oil|olive oil|cooking oil|vegetable oil|oil)\b/i, qtyPerServing: 0.5, unit: 'tbsp' },
  { regex: /\b(butter)\b/i, qtyPerServing: 0.5, unit: 'tbsp' },
  { regex: /\b(curd|yogurt|dahi)\b/i, qtyPerServing: 0.25, unit: 'cup' },
  { regex: /\b(cream|heavy cream|malai)\b/i, qtyPerServing: 1, unit: 'tbsp' },

  // Seasonings
  { regex: /\b(salt)\b/i, isSpecial: true, text: 'Salt to taste' },
  { regex: /\b(black salt)\b/i, qtyPerServing: 0.25, unit: 'tsp' },
  { regex: /\b(pepper|black pepper)\b/i, isSpecial: true, text: 'Black pepper to taste' },
  { regex: /\b(lemon|lime)\b/i, qtyPerServing: 0.25, unit: 'pcs' },
  { regex: /\b(water)\b/i, isSpecial: true, text: 'Water as needed' },
];

function replaceUnicodeFractions(str) {
  return str
    .replace(/½/g, ' 0.5')
    .replace(/⅓/g, ' 0.333')
    .replace(/⅔/g, ' 0.667')
    .replace(/¼/g, ' 0.25')
    .replace(/¾/g, ' 0.75');
}

/**
 * Parse a raw quantity string into a float.
 */
export function parseQuantityValue(qtyStr) {
  if (!qtyStr) return null;
  const str = replaceUnicodeFractions(qtyStr).trim();
  
  if (str.includes('-') || str.includes('–')) {
    const parts = str.split(/[-–]/);
    const min = parseQuantityValue(parts[0]);
    const max = parseQuantityValue(parts[1]);
    if (min !== null && max !== null) {
      return { value: (min.value + max.value) / 2, isRange: true, min: min.value, max: max.value };
    }
  }

  const parts = str.split(/\s+/);
  let sum = 0;
  let hasValid = false;
  for (const p of parts) {
    if (p.includes('/')) {
      const [num, den] = p.split('/');
      const val = parseFloat(num) / parseFloat(den);
      if (!isNaN(val)) { sum += val; hasValid = true; }
    } else {
      const val = parseFloat(p);
      if (!isNaN(val)) { sum += val; hasValid = true; }
    }
  }

  return hasValid ? { value: sum, isRange: false } : null;
}

/**
 * Format a number nicely into culinary representation.
 */
export function formatQuantityValue(num) {
  if (num === null || num === undefined || isNaN(num) || num <= 0) return '';

  const roundedInt = Math.round(num);
  if (Math.abs(num - roundedInt) < 0.08) {
    return `${roundedInt}`;
  }

  const intPart = Math.floor(num);
  const fracPart = num - intPart;

  const fractions = [
    { val: 0.25, str: '¼' },
    { val: 0.333, str: '⅓' },
    { val: 0.5, str: '½' },
    { val: 0.667, str: '⅔' },
    { val: 0.75, str: '¾' }
  ];

  for (const f of fractions) {
    if (Math.abs(fracPart - f.val) < 0.08) {
      return intPart > 0 ? `${intPart} ${f.str}` : f.str;
    }
  }

  return Number(num.toFixed(1)).toString();
}

/**
 * Formats unit and ingredient name grammatically without spelling distortions.
 */
function formatQuantityUnitAndName(qty, unit, name) {
  const isDiscrete = ['medium', 'clove', 'cloves', 'inch', 'inches', 'pcs', 'piece', 'pieces', 'head', 'heads', 'bunch', 'bunches', 'stalks', 'stalk', 'sheets', 'sheet', 'pods', 'pod'].includes(unit.toLowerCase());

  let finalQty = qty;
  if (isDiscrete) {
    finalQty = Math.max(1, Math.round(qty));
  }

  const isPlural = finalQty > 1.05;
  const formattedQty = formatQuantityValue(finalQty);

  // Normalize base ingredient name from common misspellings/trailing plurals
  let cleanName = name.trim()
    .replace(/\bpotatoe\b/gi, 'potato')
    .replace(/\btomatoe\b/gi, 'tomato')
    .replace(/\bchillies\b/gi, 'chilies');

  if (!unit || unit === 'pcs' || unit === 'piece' || unit === 'pieces') {
    let pluralName = cleanName;
    if (isPlural) {
      const lower = cleanName.toLowerCase();
      if (lower.endsWith('chili') || lower.endsWith('chilli')) pluralName = `${cleanName.replace(/chilli?$/i, '')}chilies`;
      else if (lower.endsWith('potato')) pluralName = `${cleanName}es`;
      else if (lower.endsWith('tomato')) pluralName = `${cleanName}es`;
      else if (!lower.endsWith('s')) pluralName = `${cleanName}s`;
    } else {
      const lower = cleanName.toLowerCase();
      if (lower.endsWith('chilies') || lower.endsWith('chillies')) pluralName = `${cleanName.replace(/chilli?es$/i, '')}chili`;
      else if (lower.endsWith('potatoes')) pluralName = cleanName.replace(/es$/i, '');
      else if (lower.endsWith('tomatoes')) pluralName = cleanName.replace(/es$/i, '');
    }
    return `${formattedQty} ${pluralName}`.trim();
  }

  let formattedUnit = unit;
  let formattedName = cleanName;

  if (unit === 'medium') {
    formattedUnit = 'medium';
    if (isPlural) {
      const lower = cleanName.toLowerCase();
      if (lower.endsWith('potato')) formattedName = `${cleanName}es`;
      else if (lower.endsWith('tomato')) formattedName = `${cleanName}es`;
      else if (lower.endsWith('onion') || lower.endsWith('pepper') || lower.endsWith('bell pepper') || lower.endsWith('carrot') || lower.endsWith('eggplant') || lower.endsWith('brinjal')) {
        if (!lower.endsWith('s')) formattedName = `${cleanName}s`;
      }
    } else {
      const lower = cleanName.toLowerCase();
      if (lower.endsWith('potatoes') || lower.endsWith('tomatoes')) formattedName = cleanName.replace(/es$/i, '');
      else if (lower.endsWith('onions') || lower.endsWith('peppers') || lower.endsWith('carrots')) formattedName = cleanName.replace(/s$/i, '');
    }
  } else if (unit === 'cup' || unit === 'cups') {
    formattedUnit = isPlural ? 'cups' : 'cup';
  } else if (unit === 'clove' || unit === 'cloves') {
    formattedUnit = isPlural ? 'cloves' : 'clove';
  } else if (unit === 'inch' || unit === 'inches') {
    formattedUnit = isPlural ? 'inches' : 'inch';
  } else if (unit === 'head' || unit === 'heads') {
    formattedUnit = isPlural ? 'heads' : 'head';
  } else if (unit === 'stalk' || unit === 'stalks') {
    formattedUnit = isPlural ? 'stalks' : 'stalk';
  } else if (unit === 'sheet' || unit === 'sheets') {
    formattedUnit = isPlural ? 'sheets' : 'sheet';
  } else if (unit === 'pod' || unit === 'pods') {
    formattedUnit = isPlural ? 'pods' : 'pod';
  } else if (unit === 'tbsp' || unit === 'tsp' || unit === 'g' || unit === 'ml' || unit === 'kg' || unit === 'l') {
    formattedUnit = unit;
  }

  return `${formattedQty} ${formattedUnit} ${formattedName}`.trim();
}

/**
 * Parses an ingredient string into structured parts.
 */
export function parseIngredient(ingStr) {
  if (!ingStr || typeof ingStr !== 'string') {
    return { hasQuantity: false, qty: null, unit: '', name: '', raw: ingStr || '' };
  }

  const raw = ingStr.trim();

  // Pattern 1: Leading range/fraction/number + optional unit + name
  const match = raw.match(leadingQtyRegex);

  if (match) {
    const rawQty = match[1]?.trim();
    let unitCandidate = match[2]?.trim() || '';
    let restName = match[3]?.trim() || '';

    const parsedQty = parseQuantityValue(rawQty);

    if (parsedQty && parsedQty.value > 0) {
      let unit = '';
      let name = '';

      if (unitCandidate && UNITS_REGEX.test(unitCandidate)) {
        unit = unitCandidate;
        name = restName;
      } else {
        if (!restName && unitCandidate) {
          name = unitCandidate;
          unit = '';
        } else {
          name = (unitCandidate + ' ' + restName).trim();
          unit = '';
        }
      }

      return {
        hasQuantity: true,
        qty: parsedQty.value,
        isRange: parsedQty.isRange,
        minQty: parsedQty.min,
        maxQty: parsedQty.max,
        unit,
        name: name.replace(/^of\s+/i, '').trim(),
        raw
      };
    }
  }

  // Pattern 2: Quantity in parens or at end
  const inlineMatch = raw.match(inlineQtyRegex);
  if (inlineMatch) {
    const mainName = inlineMatch[1].trim();
    const qtyVal = parseFloat(inlineMatch[2]);
    const unitVal = inlineMatch[3] || '';
    if (!isNaN(qtyVal) && qtyVal > 0) {
      return {
        hasQuantity: true,
        qty: qtyVal,
        unit: unitVal,
        name: mainName,
        raw
      };
    }
  }

  return {
    hasQuantity: false,
    qty: null,
    unit: '',
    name: raw,
    raw
  };
}

/**
 * Scale and format an ingredient string accurately for a dish.
 */
export function formatIngredientForServings(ingStr, ratio = 1.0, targetServings = 1) {
  if (!ingStr) return '';

  // Guard: If string ALREADY contains explicit "to taste" or "as needed" or "pinch", preserve it cleanly!
  if (/to taste|as needed|pinch/i.test(ingStr)) {
    return ingStr;
  }

  const parsed = parseIngredient(ingStr);

  // Case A: Ingredient ALREADY HAS explicit quantity (e.g. "1 ½ cups rice", "200g paneer")
  if (parsed.hasQuantity && parsed.qty) {
    if (ratio === 1.0) return ingStr;

    if (parsed.isRange && parsed.minQty && parsed.maxQty) {
      const scaledMin = formatQuantityValue(parsed.minQty * ratio);
      const scaledMax = formatQuantityValue(parsed.maxQty * ratio);
      const unitStr = parsed.unit ? ` ${parsed.unit}` : '';
      return `${scaledMin} - ${scaledMax}${unitStr} ${parsed.name}`.trim();
    }

    const scaledQty = parsed.qty * ratio;
    return formatQuantityUnitAndName(scaledQty, parsed.unit, parsed.name);
  }

  // Case B: Ingredient LACKS explicit quantity string (e.g. "arhar dal", "onion", "garlic", "ghee")
  const ingName = parsed.name || ingStr;
  const actualServings = Math.max(1, targetServings);

  for (const rule of CULINARY_ESTIMATES) {
    if (rule.regex.test(ingName)) {
      if (rule.isSpecial) {
        return rule.text;
      }
      const calculatedQty = rule.qtyPerServing * actualServings;
      return formatQuantityUnitAndName(calculatedQty, rule.unit, ingName);
    }
  }

  // Category-Aware Culinary Fallback (NEVER assign flat 'tbsp' to produce, grains or meats!)
  const lower = ingName.toLowerCase();
  if (/meat|beef|pork|chicken|mutton|fish|lamb|tofu|paneer|prawn|shrimp/i.test(lower)) {
    return `${actualServings * 100} g ${ingName}`;
  }
  if (/vegetable|curry|sauce|broth|soup|water|stock|milk|curd/i.test(lower)) {
    return `${formatQuantityValue(actualServings * 0.5)} cups ${ingName}`;
  }
  if (/powder|masala|spice|seeds|herb|seasoning/i.test(lower)) {
    return `${formatQuantityValue(actualServings * 0.33)} tsp ${ingName}`;
  }
  
  const fallbackQty = actualServings <= 2 ? 1 : 2;
  return `${fallbackQty} medium ${ingName}`;
}
