/**
 * Curated, verified food, nutrition, science, and culinary facts.
 * Displayed dynamically on the Kitchen (Home) page with category filters & auto-rotation.
 * Sources: WHO, Harvard T.H. Chan School of Public Health, USDA, NIH, peer-reviewed journals.
 */

const foodFacts = [
  // ── Nutrition Science ──────────────────────────────────────
  {
    id: 'f1',
    fact: "Turmeric contains curcumin, a compound with powerful anti-inflammatory and antioxidant properties. Combining it with black pepper increases curcumin absorption by up to 2,000%.",
    category: "Nutrition",
    icon: "🧪"
  },
  {
    id: 'f2',
    fact: "Dark leafy greens like spinach and kale are among the most nutrient-dense foods on Earth, packing iron, calcium, vitamin K, and folate into very few calories.",
    category: "Nutrition",
    icon: "🥬"
  },
  {
    id: 'f3',
    fact: "Your body absorbs iron from plant sources (non-heme iron) much better when consumed alongside vitamin C-rich foods like lemon juice or bell peppers.",
    category: "Nutrition",
    icon: "🍋"
  },
  {
    id: 'f4',
    fact: "Eggs are one of the few natural food sources of vitamin D, and a single egg provides about 6g of high-quality protein with all 9 essential amino acids.",
    category: "Nutrition",
    icon: "🥚"
  },
  {
    id: 'f5',
    fact: "Oats contain a soluble fiber called beta-glucan that can lower LDL cholesterol levels by 5–10% when consumed regularly, according to multiple clinical trials.",
    category: "Nutrition",
    icon: "🌾"
  },
  {
    id: 'f6',
    fact: "Lentils (dal) are nutritional powerhouses — a single cup of cooked lentils provides about 18g of protein and 15.6g of dietary fiber.",
    category: "Nutrition",
    icon: "🫘"
  },
  {
    id: 'f7',
    fact: "The deep red color in tomatoes comes from lycopene, a potent antioxidant. Cooking tomatoes actually increases the bioavailability of lycopene by up to 5x.",
    category: "Nutrition",
    icon: "🍅"
  },
  {
    id: 'f8',
    fact: "Almonds are rich in vitamin E, a fat-soluble antioxidant that protects cell membranes from oxidative damage. Just 23 almonds provide 37% of the daily recommended intake.",
    category: "Nutrition",
    icon: "🌰"
  },
  {
    id: 'f9',
    fact: "Fermented foods like yogurt, kimchi, and idli contain probiotics — live beneficial bacteria that support gut health and may strengthen the immune system.",
    category: "Nutrition",
    icon: "🥛"
  },
  {
    id: 'f10',
    fact: "Bananas are an excellent source of potassium, which helps regulate blood pressure. A medium banana contains about 422mg of potassium — roughly 9% of the daily value.",
    category: "Nutrition",
    icon: "🍌"
  },
  {
    id: 'f11',
    fact: "Cooling cooked rice or potatoes in the fridge for 12+ hours transforms their starch into 'resistant starch', which lowers glycemic index and feeds beneficial gut bacteria.",
    category: "Nutrition",
    icon: "🍚"
  },
  {
    id: 'f12',
    fact: "Blueberries get their deep color from anthocyanins — antioxidants that cross the blood-brain barrier to improve memory and protect against cognitive decline.",
    category: "Nutrition",
    icon: "🫐"
  },

  // ── Indian Cuisine & Culture ───────────────────────────────
  {
    id: 'f13',
    fact: "India is the world's largest producer and consumer of spices, cultivating over 75 varieties. Many Indian spices like cumin, coriander, and fenugreek have documented medicinal properties.",
    category: "Culture",
    icon: "🇮🇳"
  },
  {
    id: 'f14',
    fact: "The traditional Indian thali is one of the most nutritionally balanced meals in the world, combining grains, legumes, vegetables, dairy, and spices in calculated proportions.",
    category: "Culture",
    icon: "🍽️"
  },
  {
    id: 'f15',
    fact: "Ghee (clarified butter) has a high smoke point of 250°C (482°F) and contains short-chain fatty acids like butyrate, which nourishes the intestinal lining.",
    category: "Culture",
    icon: "🧈"
  },
  {
    id: 'f16',
    fact: "Chai (spiced tea) isn't just a beverage — the ginger, cardamom, cloves, and cinnamon used in traditional masala chai each have documented digestive and anti-inflammatory benefits.",
    category: "Culture",
    icon: "☕"
  },
  {
    id: 'f17',
    fact: "Paneer is one of the richest vegetarian sources of protein in Indian cuisine, providing about 18g of protein per 100g along with calcium and phosphorus.",
    category: "Culture",
    icon: "🧀"
  },
  {
    id: 'f18',
    fact: "The Ayurvedic concept of 'six tastes' (sweet, sour, salty, bitter, pungent, astringent) in every meal aligns with modern nutritional science's emphasis on dietary diversity.",
    category: "Culture",
    icon: "🌿"
  },
  {
    id: 'f19',
    fact: "Jaggery (gur) retains more minerals than refined sugar, including iron, magnesium, and potassium. It has been used in traditional Indian medicine for centuries.",
    category: "Culture",
    icon: "🍯"
  },
  {
    id: 'f20',
    fact: "Asafoetida (Hing) contains compounds that inhibit intestinal gas formation when cooking heavy legumes like chana or rajma.",
    category: "Culture",
    icon: "🌱"
  },

  // ── Cooking Science & Hacks ───────────────────────────────
  {
    id: 'f21',
    fact: "Caramelization begins at about 160°C (320°F) — this is the Maillard reaction at work, creating hundreds of new flavor compounds when proteins and sugars react under heat.",
    category: "Cooking",
    icon: "🔬"
  },
  {
    id: 'f22',
    fact: "Resting meat after cooking allows the muscle fibers to relax and reabsorb juices. A 5–10 minute rest can reduce moisture loss by up to 25%.",
    category: "Cooking",
    icon: "🥩"
  },
  {
    id: 'f23',
    fact: "Salt doesn't just add 'saltiness' — it suppresses bitter flavors and enhances sweet and savory ones, which is why a pinch of salt improves both desserts and savory dishes.",
    category: "Cooking",
    icon: "🧂"
  },
  {
    id: 'f24',
    fact: "Onions make you cry because cutting them releases syn-Propanethial-S-oxide, a volatile sulfur compound. Chilling onions before cutting slows this chemical reaction.",
    category: "Cooking",
    icon: "🧅"
  },
  {
    id: 'f25',
    fact: "Soaking legumes overnight can reduce cooking time by 50% and also breaks down phytic acid, making minerals like iron and zinc more bioavailable.",
    category: "Cooking",
    icon: "⏱️"
  },
  {
    id: 'f26',
    fact: "Toasting whole spices in a dry pan before grinding releases their essential oils, intensifying flavor by up to 3x compared to using pre-ground spices.",
    category: "Cooking",
    icon: "🫕"
  },
  {
    id: 'f27',
    fact: "Pasta water is starchy and acts as a natural emulsifier. Adding a splash to your sauce helps it cling to the pasta instead of sliding off.",
    category: "Cooking",
    icon: "🍝"
  },
  {
    id: 'f28',
    fact: "Adding a splash of acid (lemon juice or vinegar) right at the end of cooking brightens flavors and can reduce the amount of added salt needed by up to 30%.",
    category: "Cooking",
    icon: "🍋"
  },

  // ── Health & Metabolism ───────────────────────────────────
  {
    id: 'f29',
    fact: "According to the WHO, increasing fruit and vegetable intake to 400g per day could prevent an estimated 1.7 million deaths worldwide annually.",
    category: "Health",
    icon: "🏥"
  },
  {
    id: 'f30',
    fact: "Drinking water before meals can reduce calorie intake by 75–90 calories per meal, according to a study published in the journal Obesity.",
    category: "Health",
    icon: "💧"
  },
  {
    id: 'f31',
    fact: "The Mediterranean diet, rich in olive oil, fish, legumes, and vegetables, has been linked to a 25% reduction in cardiovascular disease risk in major clinical trials.",
    category: "Health",
    icon: "🫒"
  },
  {
    id: 'f32',
    fact: "Eating meals at consistent times helps regulate your circadian rhythm and improves metabolic health. Irregular meal timing is associated with increased risk of obesity.",
    category: "Health",
    icon: "⏰"
  },
  {
    id: 'f33',
    fact: "Fiber intake of 25–30g per day is associated with a 15–30% reduction in all-cause mortality and incidence of heart disease, stroke, and type 2 diabetes (Lancet, 2019).",
    category: "Health",
    icon: "📊"
  },
  {
    id: 'f34',
    fact: "Your gut microbiome contains roughly 39 trillion bacteria — more than the number of human cells in your body. A diverse diet directly supports microbial diversity.",
    category: "Health",
    icon: "🦠"
  },
  {
    id: 'f35',
    fact: "Protein has a Thermic Effect of Food (TEF) of 20-30%, meaning your body burns up to 30% of protein calories just digesting and processing it!",
    category: "Health",
    icon: "💪"
  },
  {
    id: 'f36',
    fact: "Coffee is the single largest source of antioxidants in the Western diet. Moderate coffee consumption (3-4 cups/day) is linked to lower risk of type 2 diabetes and liver disease.",
    category: "Health",
    icon: "☕"
  },

  // ── Fun Food History & Trivia ──────────────────────────────
  {
    id: 'f37',
    fact: "Honey never spoils. Archaeologists have found 3,000-year-old pots of honey in Egyptian tombs that were still perfectly edible.",
    category: "Fun Fact",
    icon: "🍯"
  },
  {
    id: 'f38',
    fact: "A single saffron flower produces only three stigma threads. It takes about 75,000 flowers to produce just one pound of saffron, making it the world's most expensive spice by weight.",
    category: "Fun Fact",
    icon: "🌸"
  },
  {
    id: 'f39',
    fact: "Carrots were originally purple. The orange variety was developed by Dutch growers in the 17th century as a tribute to William of Orange.",
    category: "Fun Fact",
    icon: "🥕"
  },
  {
    id: 'f40',
    fact: "Apples float in water because they are 25% air, which makes them less dense than water. This is why apple bobbing works!",
    category: "Fun Fact",
    icon: "🍎"
  },
  {
    id: 'f41',
    fact: "Chocolate was consumed as a bitter drink for 90% of its history. Solid chocolate bars were only invented in 1847 by the Fry & Sons company in England.",
    category: "Fun Fact",
    icon: "🍫"
  },
  {
    id: 'f42',
    fact: "Rice feeds more than half the world's population. Over 40,000 varieties of rice exist across the globe, from basmati to jasmine to black rice.",
    category: "Fun Fact",
    icon: "🍚"
  },

  // ── Superfoods & Micronutrients ────────────────────────────
  {
    id: 'f43',
    fact: "Broccoli contains sulforaphane, a compound that activates the body's own antioxidant defenses. Chopping broccoli and waiting 40 minutes before cooking maximizes sulforaphane production.",
    category: "Nutrition",
    icon: "🥦"
  },
  {
    id: 'f44',
    fact: "Greek yogurt contains roughly twice the protein of regular yogurt — about 15–20g per cup — because it is strained to remove liquid whey.",
    category: "Nutrition",
    icon: "🥛"
  },
  {
    id: 'f45',
    fact: "Sweet potatoes are one of the richest sources of beta-carotene, which the body converts to vitamin A. A medium sweet potato provides over 400% of the daily vitamin A requirement.",
    category: "Nutrition",
    icon: "🍠"
  },
  {
    id: 'f46',
    fact: "Chia seeds absorb up to 12 times their weight in water, forming a gel that slows digestion and helps maintain steady blood sugar levels.",
    category: "Nutrition",
    icon: "🌱"
  },
  {
    id: 'f47',
    fact: "Garlic contains allicin, a compound with demonstrated antibacterial, antiviral, and antifungal properties. Crushing garlic and letting it sit for 10 minutes maximizes allicin formation.",
    category: "Nutrition",
    icon: "🧄"
  },
  {
    id: 'f48',
    fact: "Walnuts are the only tree nut that contains a significant amount of alpha-linolenic acid (ALA), a plant-based omega-3 fatty acid linked to reduced heart disease risk.",
    category: "Nutrition",
    icon: "🌰"
  },
  {
    id: 'f49',
    fact: "Green tea contains L-theanine, an amino acid that promotes relaxation without drowsiness. It works synergistically with caffeine to improve focus and cognitive performance.",
    category: "Nutrition",
    icon: "🍵"
  },
  {
    id: 'f50',
    fact: "Pomegranates contain punicalagins, extraordinarily potent antioxidants that are three times more powerful than red wine or green tea antioxidants.",
    category: "Nutrition",
    icon: "🫐"
  },
  {
    id: 'f51',
    fact: "Mushrooms are the only plant-based food source that naturally produces vitamin D when exposed to sunlight, similar to how human skin synthesizes it.",
    category: "Nutrition",
    icon: "🍄"
  },
  {
    id: 'f52',
    fact: "Coconut water is naturally isotonic and contains electrolytes similar to human blood plasma, making it an effective natural rehydration drink.",
    category: "Nutrition",
    icon: "🥥"
  }
];

export default foodFacts;
