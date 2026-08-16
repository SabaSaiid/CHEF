/**
 * Curated Kitchen Ingredient Substitutes Dataset
 * Provides emergency kitchen replacements with precise ratios and culinary notes.
 */

const kitchenSubstitutes = [
  // ── Dairy & Eggs ──────────────────────────────────────────
  {
    id: 'sub_buttermilk',
    ingredient: 'Buttermilk',
    category: 'Dairy',
    icon: '🥛',
    substitutes: [
      {
        name: 'Milk + Lemon Juice or Vinegar',
        ratio: '1 cup milk + 1 tbsp lemon juice or white vinegar',
        notes: 'Let stand 5–10 mins at room temp until slightly curdled and thickened.',
        bestFor: 'Baking pancakes, cakes, quick breads, marinades'
      },
      {
        name: 'Plain Yogurt or Sour Cream + Milk',
        ratio: '3/4 cup plain yogurt + 1/4 cup milk',
        notes: 'Whisk until smooth and uniform.',
        bestFor: 'Batters, dressings, and dips'
      }
    ]
  },
  {
    id: 'sub_heavy_cream',
    ingredient: 'Heavy Cream',
    category: 'Dairy',
    icon: '🥛',
    substitutes: [
      {
        name: 'Milk + Melted Butter',
        ratio: '3/4 cup whole milk + 1/4 cup melted unsalted butter',
        notes: 'Whisk together warm. Will not whip into whipped cream, but perfect for sauces & soups.',
        bestFor: 'Cream soups, pasta sauces, pan sauces, casseroles'
      },
      {
        name: 'Coconut Cream',
        ratio: '1:1 replacement',
        notes: 'Use chilled canned full-fat coconut cream. Adds a subtle coconut flavor.',
        bestFor: 'Curries, dairy-free baking, whipped cream toppings'
      },
      {
        name: 'Greek Yogurt + Milk',
        ratio: '1/2 cup Greek yogurt + 1/2 cup whole milk',
        notes: 'Provides creaminess and high protein with lower fat.',
        bestFor: 'Cold dips, creamy dressings, pasta bakes'
      }
    ]
  },
  {
    id: 'sub_sour_cream',
    ingredient: 'Sour Cream',
    category: 'Dairy',
    icon: '🥣',
    substitutes: [
      {
        name: 'Plain Whole Milk Greek Yogurt',
        ratio: '1:1 replacement',
        notes: 'Almost identical tang, creaminess, and texture with triple the protein.',
        bestFor: 'Tacos, dips, dollops, baking, marinades'
      },
      {
        name: 'Cottage Cheese Blended + Lemon',
        ratio: '1 cup cottage cheese blended with 1 tbsp lemon juice',
        notes: 'High-protein, velvety smooth substitute.',
        bestFor: 'Dips, dressings, baked potatoes'
      }
    ]
  },
  {
    id: 'sub_butter',
    ingredient: 'Butter (in Cooking & Baking)',
    category: 'Dairy & Fats',
    icon: '🧈',
    substitutes: [
      {
        name: 'Olive Oil / Avocado Oil',
        ratio: '3/4 cup oil for every 1 cup butter',
        notes: 'Healthier monounsaturated fats. Extra virgin adds a fruity herbal aroma.',
        bestFor: 'Sautéing, roasting, pasta sauces, quick breads'
      },
      {
        name: 'Ghee (Clarified Butter)',
        ratio: '1:1 replacement',
        notes: 'Higher smoke point (485°F) with intense nutty, rich buttery flavor.',
        bestFor: 'High-heat searing, Indian curries, roasting'
      },
      {
        name: 'Applesauce or Mashed Banana',
        ratio: '1/2 cup applesauce for 1 cup butter',
        notes: 'Significantly cuts calories and fat in baking while maintaining moisture.',
        bestFor: 'Muffins, brownies, banana bread, oatmeal cookies'
      }
    ]
  },
  {
    id: 'sub_egg_baking',
    ingredient: 'Egg (in Baking)',
    category: 'Baking & Pantry',
    icon: '🥚',
    substitutes: [
      {
        name: 'Flaxseed Meal ("Flax Egg")',
        ratio: '1 tbsp ground flaxseed + 3 tbsp warm water (per egg)',
        notes: 'Stir and let sit 5 mins until gelatinous. Nutty flavor & rich in omega-3.',
        bestFor: 'Muffins, pancakes, cookies, dense cakes'
      },
      {
        name: 'Unsweetened Applesauce',
        ratio: '1/4 cup applesauce (per egg)',
        notes: 'Adds natural moisture and binding power.',
        bestFor: 'Quick breads, brownies, soft cookies'
      },
      {
        name: 'Chia Seed Gel',
        ratio: '1 tbsp chia seeds + 3 tbsp water (per egg)',
        notes: 'Let sit 10 mins until a thick gel forms.',
        bestFor: 'Gluten-free baking, oatmeal bakes'
      },
      {
        name: 'Silken Tofu',
        ratio: '1/4 cup blended silken tofu (per egg)',
        notes: 'Neutral flavor, provides moisture and dense crumb.',
        bestFor: 'Pies, puddings, rich chocolate cakes'
      }
    ]
  },
  {
    id: 'sub_parmesan',
    ingredient: 'Parmesan Cheese',
    category: 'Dairy',
    icon: '🧀',
    substitutes: [
      {
        name: 'Pecorino Romano or Grana Padano',
        ratio: '1:1 replacement',
        notes: 'Pecorino is sharper and saltier (made from sheep milk); Grana Padano is slightly milder.',
        bestFor: 'Pasta, risotto, Caesar salads, soups'
      },
      {
        name: 'Nutritional Yeast',
        ratio: '1:1 replacement (vegan / dairy-free)',
        notes: 'Rich in umami, B-vitamins, and gives a deep savory cheesy flavor.',
        bestFor: 'Popcorn, roasted veggies, pasta sprinkles'
      }
    ]
  },

  // ── Baking & Pantry Staples ───────────────────────────────
  {
    id: 'sub_baking_powder',
    ingredient: 'Baking Powder',
    category: 'Baking & Pantry',
    icon: '🧁',
    substitutes: [
      {
        name: 'Baking Soda + Cream of Tartar',
        ratio: '1/4 tsp baking soda + 1/2 tsp cream of tartar (for 1 tsp baking powder)',
        notes: 'Creates the classic acid-base leavening reaction.',
        bestFor: 'Cakes, biscuits, pancakes, cookies'
      },
      {
        name: 'Baking Soda + Lemon Juice / Buttermilk',
        ratio: '1/4 tsp baking soda + 1/2 tsp lemon juice (for 1 tsp baking powder)',
        notes: 'Mix directly into wet ingredients right before baking.',
        bestFor: 'Pancakes, waffles, muffins'
      }
    ]
  },
  {
    id: 'sub_baking_soda',
    ingredient: 'Baking Soda',
    category: 'Baking & Pantry',
    icon: '🥄',
    substitutes: [
      {
        name: 'Baking Powder (3x amount)',
        ratio: '3 tsp baking powder for 1 tsp baking soda',
        notes: 'Omit extra salt in the recipe as baking powder contains sodium.',
        bestFor: 'Cookies, cakes, quick breads'
      }
    ]
  },
  {
    id: 'sub_cornstarch',
    ingredient: 'Cornstarch (Thickener)',
    category: 'Baking & Pantry',
    icon: '🌾',
    substitutes: [
      {
        name: 'All-Purpose Flour',
        ratio: '2 tbsp all-purpose flour for 1 tbsp cornstarch',
        notes: 'Cook 2–3 mins longer to remove raw flour taste. Creates an opaque sauce.',
        bestFor: 'Gravies, stews, pie fillings'
      },
      {
        name: 'Arrowroot Powder or Tapioca Starch',
        ratio: '1:1 replacement',
        notes: 'Keeps sauces clear and glossy. Tolerates acidic liquids well.',
        bestFor: 'Fruit pie fillings, stir-fry sauces, glazes'
      }
    ]
  },
  {
    id: 'sub_brown_sugar',
    ingredient: 'Brown Sugar',
    category: 'Baking & Pantry',
    icon: '🍬',
    substitutes: [
      {
        name: 'White Sugar + Molasses / Maple Syrup',
        ratio: '1 cup white granulated sugar + 1 tbsp molasses or dark maple syrup',
        notes: 'Mix with a fork until moist and sandy.',
        bestFor: 'Cookies, barbecue sauces, marinades, cakes'
      },
      {
        name: 'Coconut Sugar',
        ratio: '1:1 replacement',
        notes: 'Lower glycemic index with natural caramel notes.',
        bestFor: 'Oatmeal, baking, coffee'
      }
    ]
  },
  {
    id: 'sub_honey',
    ingredient: 'Honey',
    category: 'Baking & Pantry',
    icon: '🍯',
    substitutes: [
      {
        name: 'Pure Maple Syrup or Agave Nectar',
        ratio: '1:1 replacement',
        notes: 'Agave is slightly sweeter and dissolves quickly; maple syrup adds woodsy caramel undertones.',
        bestFor: 'Dressings, marinades, tea, baked goods'
      },
      {
        name: 'Simple Sugar Syrup',
        ratio: '1 cup sugar + 1/4 cup water simmered until dissolved',
        notes: 'Neutral sweetness without distinct honey floral aroma.',
        bestFor: 'Beverages, glazing, basic sweetening'
      }
    ]
  },

  // ── Sauces, Condiments & Seasonings ───────────────────────
  {
    id: 'sub_soy_sauce',
    ingredient: 'Soy Sauce',
    category: 'Condiments',
    icon: '🥢',
    substitutes: [
      {
        name: 'Tamari (Gluten-Free)',
        ratio: '1:1 replacement',
        notes: 'Slightly richer and smoother than regular soy sauce with no wheat.',
        bestFor: 'Stir-fries, sushi dipping, marinades'
      },
      {
        name: 'Coconut Aminos',
        ratio: '1:1 replacement (lower sodium)',
        notes: 'Slightly sweeter and 70% less sodium. Naturally soy-free & gluten-free.',
        bestFor: 'Paleo, keto, allergen-friendly Asian dishes'
      },
      {
        name: 'Worcestershire Sauce + Splash of Water',
        ratio: '1 tbsp Worcestershire + 1 tsp water',
        notes: 'Gives deep savory umami with complex spice notes.',
        bestFor: 'Stews, marinades, ground meat seasoning'
      }
    ]
  },
  {
    id: 'sub_white_wine',
    ingredient: 'White Wine (for Deglazing / Cooking)',
    category: 'Cooking Liquids',
    icon: '🍷',
    substitutes: [
      {
        name: 'Chicken or Veg Broth + Splash of Lemon Juice / White Vinegar',
        ratio: '1 cup broth + 1 tbsp lemon juice or white wine vinegar',
        notes: 'Provides both the savory depth and acidity needed for deglazing pan fond.',
        bestFor: 'Risotto, pan sauces, chicken piccata, pasta sauces'
      },
      {
        name: 'Apple Cider Vinegar (Diluted)',
        ratio: '1/2 cup apple cider vinegar + 1/2 cup water',
        notes: 'Fruity acidity that tenderizes meats.',
        bestFor: 'Braised dishes, marinades'
      }
    ]
  },
  {
    id: 'sub_lemon_juice',
    ingredient: 'Fresh Lemon Juice',
    category: 'Produce & Acids',
    icon: '🍋',
    substitutes: [
      {
        name: 'Lime Juice',
        ratio: '1:1 replacement',
        notes: 'Almost identical acidity level with slight floral citrus notes.',
        bestFor: 'Dressings, marinades, guacamole, cocktails'
      },
      {
        name: 'White Wine Vinegar or Apple Cider Vinegar',
        ratio: '1/2 tbsp vinegar for 1 tbsp lemon juice',
        notes: 'Provides sharp acidic brightness.',
        bestFor: 'Salad dressings, marinades, curries'
      }
    ]
  },
  {
    id: 'sub_garlic',
    ingredient: 'Fresh Garlic Cloves',
    category: 'Produce & Spices',
    icon: '🧄',
    substitutes: [
      {
        name: 'Garlic Powder',
        ratio: '1/8 tsp garlic powder for 1 fresh clove',
        notes: 'Concentrated flavor. Distribute evenly into sauces or dry rubs.',
        bestFor: 'Dry rubs, marinades, pasta sauces, soups'
      },
      {
        name: 'Minced Garlic in Jar / Garlic Paste',
        ratio: '1/2 tsp minced garlic for 1 clove',
        notes: 'Convenient 1:1 flavor profile.',
        bestFor: 'Sautéing, curries, stir-fries'
      },
      {
        name: 'Shallot / Chives',
        ratio: '1 tbsp finely minced shallot for 1 clove',
        notes: 'Subtle sweet allium aroma without intense sharpness.',
        bestFor: 'Vinaigrettes, delicate egg dishes'
      }
    ]
  },
  {
    id: 'sub_ginger',
    ingredient: 'Fresh Ginger Root',
    category: 'Produce & Spices',
    icon: '🫚',
    substitutes: [
      {
        name: 'Ground Ginger Powder',
        ratio: '1/4 tsp ground ginger for 1 tbsp fresh grated ginger',
        notes: 'More pungent and earthy than fresh.',
        bestFor: 'Curries, marinades, chai, baking'
      },
      {
        name: 'Ginger Paste',
        ratio: '1:1 replacement',
        notes: 'Identical fresh zesty profile.',
        bestFor: 'Indian, Thai, and Chinese cooking'
      }
    ]
  },
  {
    id: 'sub_tomato_paste',
    ingredient: 'Tomato Paste',
    category: 'Pantry Staples',
    icon: '🍅',
    substitutes: [
      {
        name: 'Tomato Sauce / Puree Reduced',
        ratio: '3 tbsp tomato sauce simmered down to 1 tbsp',
        notes: 'Cook in pan for 3 mins until darkened and thickened.',
        bestFor: 'Curries, bolognese, stews, chili'
      },
      {
        name: 'Ketchup (Emergency)',
        ratio: '1 tbsp ketchup (reduce other sweeteners)',
        notes: 'Slightly sweeter and tangier; cuts acidity requirement.',
        bestFor: 'Barbecue sauce, stews, glazes'
      }
    ]
  },
  {
    id: 'sub_dijon_mustard',
    ingredient: 'Dijon Mustard',
    category: 'Condiments',
    icon: '🌭',
    substitutes: [
      {
        name: 'Yellow Mustard + Dash of White Vinegar or Mayo',
        ratio: '1 tbsp yellow mustard + 1/2 tsp white wine vinegar',
        notes: 'Boosts tanginess closer to Dijon.',
        bestFor: 'Vinaigrettes, sandwiches, marinades'
      },
      {
        name: 'Whole Grain Mustard or Spicy Brown Mustard',
        ratio: '1:1 replacement',
        notes: 'Adds rustic texture and spicy mustard kick.',
        bestFor: 'Glazes, dressings, cheese boards'
      }
    ]
  }
];

export default kitchenSubstitutes;
