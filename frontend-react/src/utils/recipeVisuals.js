/**
 * Utility to generate dish-appropriate culinary visual card themes,
 * icons, and background gradients for recipe cards.
 * Prevents forced repetitive stock photos across thousands of recipes.
 */

export function getRecipeCardVisual(recipe) {
  const title = (recipe?.title || '').toLowerCase();
  const summary = (recipe?.summary || '').toLowerCase();
  const region = (recipe?.region || '').toLowerCase();
  const text = `${title} ${summary} ${region}`;

  if (/biryani|pulao|fried rice|jeera rice|chawal/.test(text)) {
    return {
      icon: '🍛',
      gradient: 'linear-gradient(135deg, #2a1c0d 0%, #4a3014 50%, #1e1308 100%)',
      accentColor: '#f59e0b',
      category: 'Rice & Biryani'
    };
  }
  if (/chicken|mutton|lamb|meat|kebab|tikka|tandoori|fish|seafood|prawn|shrimp|keema|rogan/.test(text)) {
    return {
      icon: '🍗',
      gradient: 'linear-gradient(135deg, #2c1417 0%, #4f1b22 50%, #200b0e 100%)',
      accentColor: '#ef4444',
      category: 'Meat & Seafood'
    };
  }
  if (/paratha|roti|naan|chapati|bread|bhatura|puri|dosa|idli|kulcha|phulka/.test(text)) {
    return {
      icon: '🫓',
      gradient: 'linear-gradient(135deg, #2b2012 0%, #4a361a 50%, #1f160a 100%)',
      accentColor: '#eab308',
      category: 'Breads & Tiffins'
    };
  }
  if (/paneer|cheese|butter|cream|malai/.test(text)) {
    return {
      icon: '🧀',
      gradient: 'linear-gradient(135deg, #282212 0%, #473a19 50%, #1d180a 100%)',
      accentColor: '#facc15',
      category: 'Paneer & Dairy'
    };
  }
  if (/dal|daal|lentil|soup|sambar|rasam|curry|masala|gravy|chana|chole|rajma|ghugni/.test(text)) {
    return {
      icon: '🍲',
      gradient: 'linear-gradient(135deg, #281912 0%, #492a17 50%, #1e1109 100%)',
      accentColor: '#f97316',
      category: 'Curries & Dals'
    };
  }
  if (/salad|sabzi|gobi|aloo|bhindi|baingan|veggie|vegetable|palak|saag/.test(text)) {
    return {
      icon: '🥗',
      gradient: 'linear-gradient(135deg, #132418 0%, #1b3d27 50%, #0c1a10 100%)',
      accentColor: '#22c55e',
      category: 'Vegetables & Salads'
    };
  }
  if (/sweet|halwa|kheer|jamun|barfi|cake|dessert|mithai|kulfi|ice|malpua|khaja|thekua/.test(text)) {
    return {
      icon: '🧁',
      gradient: 'linear-gradient(135deg, #291424 0%, #491b3e 50%, #1e0b19 100%)',
      accentColor: '#ec4899',
      category: 'Desserts & Sweets'
    };
  }
  if (/egg|omelette|breakfast|pancake|snack|chaat|pakora|samosa|vada/.test(text)) {
    return {
      icon: '🍳',
      gradient: 'linear-gradient(135deg, #2a2213 0%, #493a19 50%, #1f1809 100%)',
      accentColor: '#eab308',
      category: 'Breakfast & Snacks'
    };
  }

  return {
    icon: '🍽️',
    gradient: 'linear-gradient(135deg, #1d1e24 0%, #2b2f3a 50%, #14161b 100%)',
    accentColor: '#a855f7',
    category: 'Recipe'
  };
}
