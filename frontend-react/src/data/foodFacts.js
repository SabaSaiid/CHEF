/**
 * Curated, verified food, nutrition, and health facts.
 * One is displayed per day on the Kitchen (Home) page, cycling through the list.
 * Sources: WHO, Harvard T.H. Chan School of Public Health, USDA, NIH, peer-reviewed journals.
 */

const foodFacts = [
  // ── Nutrition Science ──────────────────────────────────────
  {
    fact: "Turmeric contains curcumin, a compound with powerful anti-inflammatory and antioxidant properties. Combining it with black pepper increases curcumin absorption by up to 2,000%.",
    category: "Nutrition",
    icon: "🧪"
  },
  {
    fact: "Dark leafy greens like spinach and kale are among the most nutrient-dense foods on Earth, packing iron, calcium, vitamin K, and folate into very few calories.",
    category: "Nutrition",
    icon: "🥬"
  },
  {
    fact: "Your body absorbs iron from plant sources (non-heme iron) much better when consumed alongside vitamin C-rich foods like lemon juice or bell peppers.",
    category: "Nutrition",
    icon: "🍋"
  },
  {
    fact: "Eggs are one of the few natural food sources of vitamin D, and a single egg provides about 6g of high-quality protein with all 9 essential amino acids.",
    category: "Nutrition",
    icon: "🥚"
  },
  {
    fact: "Oats contain a soluble fiber called beta-glucan that can lower LDL cholesterol levels by 5–10% when consumed regularly, according to multiple clinical trials.",
    category: "Nutrition",
    icon: "🌾"
  },
  {
    fact: "Lentils (dal) are nutritional powerhouses — a single cup of cooked lentils provides about 18g of protein and 15.6g of dietary fiber.",
    category: "Nutrition",
    icon: "🫘"
  },
  {
    fact: "The deep red color in tomatoes comes from lycopene, a potent antioxidant. Cooking tomatoes actually increases the bioavailability of lycopene by up to 5x.",
    category: "Nutrition",
    icon: "🍅"
  },
  {
    fact: "Almonds are rich in vitamin E, a fat-soluble antioxidant that protects cell membranes from oxidative damage. Just 23 almonds provide 37% of the daily recommended intake.",
    category: "Nutrition",
    icon: "🌰"
  },
  {
    fact: "Fermented foods like yogurt, kimchi, and idli contain probiotics — live beneficial bacteria that support gut health and may strengthen the immune system.",
    category: "Nutrition",
    icon: "🥛"
  },
  {
    fact: "Bananas are an excellent source of potassium, which helps regulate blood pressure. A medium banana contains about 422mg of potassium — roughly 9% of the daily value.",
    category: "Nutrition",
    icon: "🍌"
  },

  // ── Indian Cuisine & Culture ───────────────────────────────
  {
    fact: "India is the world's largest producer and consumer of spices, cultivating over 75 varieties. Many Indian spices like cumin, coriander, and fenugreek have documented medicinal properties.",
    category: "Culture",
    icon: "🇮🇳"
  },
  {
    fact: "The traditional Indian thali is one of the most nutritionally balanced meals in the world, combining grains, legumes, vegetables, dairy, and spices in calculated proportions.",
    category: "Culture",
    icon: "🍽️"
  },
  {
    fact: "Ghee (clarified butter) has a smoke point of about 250°C (482°F), making it one of the safest cooking fats for high-heat cooking. It's also rich in fat-soluble vitamins A, D, E, and K.",
    category: "Culture",
    icon: "🧈"
  },
  {
    fact: "Chai (spiced tea) isn't just a beverage — the ginger, cardamom, cloves, and cinnamon used in traditional masala chai each have documented digestive and anti-inflammatory benefits.",
    category: "Culture",
    icon: "☕"
  },
  {
    fact: "Paneer is one of the richest vegetarian sources of protein in Indian cuisine, providing about 18g of protein per 100g along with calcium and phosphorus.",
    category: "Culture",
    icon: "🧀"
  },
  {
    fact: "The Ayurvedic concept of 'six tastes' (sweet, sour, salty, bitter, pungent, astringent) in every meal aligns with modern nutritional science's emphasis on dietary diversity.",
    category: "Culture",
    icon: "🌿"
  },
  {
    fact: "Jaggery (gur) retains more minerals than refined sugar, including iron, magnesium, and potassium. It has been used in traditional Indian medicine for centuries.",
    category: "Culture",
    icon: "🍯"
  },

  // ── Cooking Science ────────────────────────────────────────
  {
    fact: "Caramelization begins at about 160°C (320°F) — this is the Maillard reaction at work, creating hundreds of new flavor compounds when proteins and sugars react under heat.",
    category: "Cooking",
    icon: "🔬"
  },
  {
    fact: "Resting meat after cooking allows the muscle fibers to relax and reabsorb juices. A 5–10 minute rest can reduce moisture loss by up to 25%.",
    category: "Cooking",
    icon: "🥩"
  },
  {
    fact: "Salt doesn't just add 'saltiness' — it suppresses bitter flavors and enhances sweet and savory ones, which is why a pinch of salt improves both desserts and savory dishes.",
    category: "Cooking",
    icon: "🧂"
  },
  {
    fact: "Onions make you cry because cutting them releases syn-Propanethial-S-oxide, a volatile sulfur compound. Chilling onions before cutting slows this chemical reaction.",
    category: "Cooking",
    icon: "🧅"
  },
  {
    fact: "Soaking legumes overnight can reduce cooking time by 50% and also breaks down phytic acid, making minerals like iron and zinc more bioavailable.",
    category: "Cooking",
    icon: "⏱️"
  },
  {
    fact: "Toasting whole spices in a dry pan before grinding releases their essential oils, intensifying flavor by up to 3x compared to using pre-ground spices.",
    category: "Cooking",
    icon: "🫕"
  },
  {
    fact: "Pasta water is starchy and acts as a natural emulsifier. Adding a splash to your sauce helps it cling to the pasta instead of sliding off.",
    category: "Cooking",
    icon: "🍝"
  },
  {
    fact: "The reason bread rises is because yeast ferments sugars in the dough, producing carbon dioxide gas that gets trapped in the gluten network.",
    category: "Cooking",
    icon: "🍞"
  },

  // ── Health & Wellness ──────────────────────────────────────
  {
    fact: "According to the WHO, increasing fruit and vegetable intake to 400g per day could prevent an estimated 1.7 million deaths worldwide annually.",
    category: "Health",
    icon: "🏥"
  },
  {
    fact: "Drinking water before meals can reduce calorie intake by 75–90 calories per meal, according to a study published in the journal Obesity.",
    category: "Health",
    icon: "💧"
  },
  {
    fact: "The Mediterranean diet, rich in olive oil, fish, legumes, and vegetables, has been linked to a 25% reduction in cardiovascular disease risk in major clinical trials.",
    category: "Health",
    icon: "🫒"
  },
  {
    fact: "Eating meals at consistent times helps regulate your circadian rhythm and improves metabolic health. Irregular meal timing is associated with increased risk of obesity.",
    category: "Health",
    icon: "⏰"
  },
  {
    fact: "Fiber intake of 25–30g per day is associated with a 15–30% reduction in all-cause mortality and incidence of heart disease, stroke, and type 2 diabetes (Lancet, 2019).",
    category: "Health",
    icon: "📊"
  },
  {
    fact: "Your gut microbiome contains roughly 39 trillion bacteria — more than the number of human cells in your body. A diverse diet directly supports microbial diversity.",
    category: "Health",
    icon: "🦠"
  },
  {
    fact: "Protein is the most satiating macronutrient. Increasing protein intake from 15% to 30% of calories can reduce daily intake by over 400 calories (American Journal of Clinical Nutrition).",
    category: "Health",
    icon: "💪"
  },
  {
    fact: "Ultra-processed foods now make up 50–60% of calorie intake in many countries. They are linked to higher rates of obesity, heart disease, and depression.",
    category: "Health",
    icon: "⚠️"
  },
  {
    fact: "Omega-3 fatty acids found in fatty fish, walnuts, and flaxseeds are essential fats your body cannot produce. They reduce inflammation and support brain health.",
    category: "Health",
    icon: "🐟"
  },
  {
    fact: "Chronic sleep deprivation increases levels of ghrelin (hunger hormone) and decreases leptin (satiety hormone), leading to an average increase of 385 extra calories per day.",
    category: "Health",
    icon: "😴"
  },

  // ── Food History & Surprising Facts ────────────────────────
  {
    fact: "Honey never spoils. Archaeologists have found 3,000-year-old pots of honey in Egyptian tombs that were still perfectly edible.",
    category: "Fun Fact",
    icon: "🍯"
  },
  {
    fact: "A single saffron flower produces only three stigma threads. It takes about 75,000 flowers to produce just one pound of saffron, making it the world's most expensive spice by weight.",
    category: "Fun Fact",
    icon: "🌸"
  },
  {
    fact: "Carrots were originally purple. The orange variety was developed by Dutch growers in the 17th century as a tribute to William of Orange.",
    category: "Fun Fact",
    icon: "🥕"
  },
  {
    fact: "Apples float in water because they are 25% air, which makes them less dense than water. This is why apple bobbing works!",
    category: "Fun Fact",
    icon: "🍎"
  },
  {
    fact: "Chocolate was consumed as a bitter drink for 90% of its history. Solid chocolate bars were only invented in 1847 by the Fry & Sons company in England.",
    category: "Fun Fact",
    icon: "🍫"
  },
  {
    fact: "Rice feeds more than half the world's population. Over 40,000 varieties of rice exist across the globe, from basmati to jasmine to black rice.",
    category: "Fun Fact",
    icon: "🍚"
  },
  {
    fact: "The hottest chili pepper in the world, the Carolina Reaper, measures over 2.2 million Scoville Heat Units — about 200x hotter than a jalapeño.",
    category: "Fun Fact",
    icon: "🌶️"
  },
  {
    fact: "Peanuts are not actually nuts — they are legumes that grow underground. True nuts like walnuts and hazelnuts grow on trees.",
    category: "Fun Fact",
    icon: "🥜"
  },
  {
    fact: "The avocado is technically a large berry with a single seed. The word 'avocado' comes from the Nahuatl (Aztec) word 'ahuacatl.'",
    category: "Fun Fact",
    icon: "🥑"
  },
  {
    fact: "Cinnamon comes from the inner bark of trees in the Cinnamomum family. True Ceylon cinnamon (from Sri Lanka) is milder and sweeter than the more common cassia cinnamon.",
    category: "Fun Fact",
    icon: "🌳"
  },

  // ── Sustainability & Global Impact ─────────────────────────
  {
    fact: "Roughly one-third of all food produced globally — approximately 1.3 billion tonnes — is wasted each year, according to the UN Food and Agriculture Organization.",
    category: "Sustainability",
    icon: "♻️"
  },
  {
    fact: "Producing 1 kg of beef requires about 15,400 liters of water, while 1 kg of rice requires about 2,500 liters. Plant-based proteins are significantly less water-intensive.",
    category: "Sustainability",
    icon: "🌍"
  },
  {
    fact: "Seasonal eating isn't just trendy — fruits and vegetables in season contain up to 3x more nutrients than out-of-season produce that has been stored or transported long distances.",
    category: "Sustainability",
    icon: "🌱"
  },
  {
    fact: "India is the world's largest producer of milk, contributing about 23% of global milk production. Dairy is central to Indian cuisine and nutrition.",
    category: "Sustainability",
    icon: "🥛"
  },
  {
    fact: "Composting food scraps can reduce household waste by up to 30% and produces nutrient-rich soil that can grow healthier vegetables.",
    category: "Sustainability",
    icon: "🌻"
  },

  // ── More Nutrition Deep-Dives ──────────────────────────────
  {
    fact: "Broccoli contains sulforaphane, a compound that activates the body's own antioxidant defenses. Chopping broccoli and waiting 40 minutes before cooking maximizes sulforaphane production.",
    category: "Nutrition",
    icon: "🥦"
  },
  {
    fact: "Greek yogurt contains roughly twice the protein of regular yogurt — about 15–20g per cup — because it is strained to remove liquid whey.",
    category: "Nutrition",
    icon: "🥛"
  },
  {
    fact: "Sweet potatoes are one of the richest sources of beta-carotene, which the body converts to vitamin A. A medium sweet potato provides over 400% of the daily vitamin A requirement.",
    category: "Nutrition",
    icon: "🍠"
  },
  {
    fact: "Chia seeds absorb up to 12 times their weight in water, forming a gel that slows digestion and helps maintain steady blood sugar levels.",
    category: "Nutrition",
    icon: "🌱"
  },
  {
    fact: "Garlic contains allicin, a compound with demonstrated antibacterial, antiviral, and antifungal properties. Crushing garlic and letting it sit for 10 minutes maximizes allicin formation.",
    category: "Nutrition",
    icon: "🧄"
  },
  {
    fact: "Walnuts are the only tree nut that contains a significant amount of alpha-linolenic acid (ALA), a plant-based omega-3 fatty acid linked to reduced heart disease risk.",
    category: "Nutrition",
    icon: "🌰"
  },
  {
    fact: "Green tea contains L-theanine, an amino acid that promotes relaxation without drowsiness. It works synergistically with caffeine to improve focus and cognitive performance.",
    category: "Nutrition",
    icon: "🍵"
  },
  {
    fact: "Pomegranates contain punicalagins, extraordinarily potent antioxidants that are three times more powerful than red wine or green tea antioxidants.",
    category: "Nutrition",
    icon: "🫐"
  },
  {
    fact: "Mushrooms are the only plant-based food source that naturally produces vitamin D when exposed to sunlight, similar to how human skin synthesizes it.",
    category: "Nutrition",
    icon: "🍄"
  },
  {
    fact: "Coconut water is naturally isotonic and contains electrolytes similar to human blood plasma, making it an effective natural rehydration drink.",
    category: "Nutrition",
    icon: "🥥"
  },
];

export default foodFacts;
