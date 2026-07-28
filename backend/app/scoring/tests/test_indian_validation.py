"""
Phase 2 — Indian / Non-European Cuisine Validation Benchmark Suite.

Audits Nutri-Score performance against 25 representative South Asian dishes
to evaluate category routing accuracy and analyze saturated fat / macro skews.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from app.scoring.calculator import compute_nutri_score, compute_nutri_score_from_recipe
from app.scoring.categories import classify_recipe_category


INDIAN_BENCHMARK_DISHES = [
    {"title": "Palak Paneer", "ingredients": ["200g spinach", "150g paneer", "1 tbsp ghee", "1 onion", "2 tomatoes"], "nutrition": {"calories": 320, "protein_g": 16, "carbs_g": 10, "fat_g": 24, "saturated_fat_g": 12, "sugar_g": 4, "sodium_mg": 480, "fiber_g": 4}},
    {"title": "Dal Makhani", "ingredients": ["1 cup black lentils", "1/4 cup kidney beans", "2 tbsp butter", "2 tbsp cream", "1 onion"], "nutrition": {"calories": 380, "protein_g": 14, "carbs_g": 42, "fat_g": 18, "saturated_fat_g": 9, "sugar_g": 3, "sodium_mg": 520, "fiber_g": 8}},
    {"title": "Chana Masala", "ingredients": ["2 cups chickpeas", "2 tomatoes", "1 onion", "1 tbsp oil", "spices"], "nutrition": {"calories": 280, "protein_g": 12, "carbs_g": 44, "fat_g": 6, "saturated_fat_g": 0.8, "sugar_g": 5, "sodium_mg": 390, "fiber_g": 10}},
    {"title": "Aloo Gobi", "ingredients": ["2 cups cauliflower", "1 potato", "1 onion", "1 tbsp oil", "spices"], "nutrition": {"calories": 180, "protein_g": 4, "carbs_g": 28, "fat_g": 7, "saturated_fat_g": 1.0, "sugar_g": 4, "sodium_mg": 310, "fiber_g": 5}},
    {"title": "Vegetable Biryani", "ingredients": ["2 cups basmati rice", "1 cup mixed veggies", "2 tbsp ghee", "spices"], "nutrition": {"calories": 410, "protein_g": 8, "carbs_g": 68, "fat_g": 12, "saturated_fat_g": 6, "sugar_g": 3, "sodium_mg": 450, "fiber_g": 4}},
    {"title": "Sambhar", "ingredients": ["1 cup toor dal", "1 cup mixed vegetables", "1 tbsp oil", "tamarind", "spices"], "nutrition": {"calories": 160, "protein_g": 8, "carbs_g": 26, "fat_g": 3, "saturated_fat_g": 0.5, "sugar_g": 4, "sodium_mg": 340, "fiber_g": 6}},
    {"title": "Rasam", "ingredients": ["2 tomatoes", "tamarind juice", "1 tsp ghee", "curry leaves", "spices"], "nutrition": {"calories": 75, "protein_g": 2, "carbs_g": 10, "fat_g": 3, "saturated_fat_g": 1.2, "sugar_g": 3, "sodium_mg": 280, "fiber_g": 2}},
    {"title": "Paneer Tikka", "ingredients": ["250g paneer", "1 bell pepper", "1 onion", "2 tbsp yogurt", "1 tsp oil"], "nutrition": {"calories": 360, "protein_g": 20, "carbs_g": 12, "fat_g": 26, "saturated_fat_g": 14, "sugar_g": 4, "sodium_mg": 510, "fiber_g": 2}},
    {"title": "Chicken Tikka Masala", "ingredients": ["300g chicken breast", "1/2 cup tomato puree", "2 tbsp cream", "1 tbsp oil"], "nutrition": {"calories": 390, "protein_g": 32, "carbs_g": 14, "fat_g": 22, "saturated_fat_g": 8, "sugar_g": 6, "sodium_mg": 580, "fiber_g": 2}},
    {"title": "Sweet Lassi", "ingredients": ["1 cup yogurt", "1/2 cup water", "2 tbsp sugar", "cardamom"], "nutrition": {"calories": 190, "protein_g": 6, "carbs_g": 28, "fat_g": 6, "saturated_fat_g": 3.8, "sugar_g": 26, "sodium_mg": 85, "fiber_g": 0}},
    {"title": "Tomato Shorba", "ingredients": ["4 tomatoes", "1 tsp ghee", "coriander stems", "spices"], "nutrition": {"calories": 90, "protein_g": 2, "carbs_g": 12, "fat_g": 4, "saturated_fat_g": 2.0, "sugar_g": 6, "sodium_mg": 320, "fiber_g": 3}},
    {"title": "Baingan Bharta", "ingredients": ["1 roasted eggplant", "1 onion", "2 tomatoes", "1 tbsp oil"], "nutrition": {"calories": 140, "protein_g": 3, "carbs_g": 16, "fat_g": 8, "saturated_fat_g": 1.1, "sugar_g": 7, "sodium_mg": 290, "fiber_g": 6}},
    {"title": "Moong Dal Tadka", "ingredients": ["1 cup yellow moong dal", "1 tsp ghee", "1 tomato", "1 onion", "cumin"], "nutrition": {"calories": 210, "protein_g": 12, "carbs_g": 32, "fat_g": 4, "saturated_fat_g": 2.0, "sugar_g": 2, "sodium_mg": 360, "fiber_g": 6}},
    {"title": "Masala Dosa", "ingredients": ["1 dosa", "1/2 cup potato masala", "1 tbsp oil"], "nutrition": {"calories": 310, "protein_g": 6, "carbs_g": 52, "fat_g": 9, "saturated_fat_g": 2.0, "sugar_g": 3, "sodium_mg": 420, "fiber_g": 4}},
    {"title": "Idli Sambar", "ingredients": ["2 idlis", "1 cup sambar"], "nutrition": {"calories": 220, "protein_g": 9, "carbs_g": 40, "fat_g": 3, "saturated_fat_g": 0.5, "sugar_g": 4, "sodium_mg": 380, "fiber_g": 5}},
    {"title": "Dhokla", "ingredients": ["1 cup besan", "1 tsp oil", "mustard seeds", "curry leaves"], "nutrition": {"calories": 160, "protein_g": 7, "carbs_g": 24, "fat_g": 4, "saturated_fat_g": 0.6, "sugar_g": 3, "sodium_mg": 310, "fiber_g": 3}},
    {"title": "Kadhi Pakora", "ingredients": ["1 cup yogurt", "2 tbsp besan", "fried pakoras", "1 tbsp ghee"], "nutrition": {"calories": 290, "protein_g": 9, "carbs_g": 26, "fat_g": 17, "saturated_fat_g": 7, "sugar_g": 6, "sodium_mg": 540, "fiber_g": 3}},
    {"title": "Fish Curry (Kerala Style)", "ingredients": ["250g fish fillet", "1/2 cup coconut milk", "1 tbsp oil", "spices"], "nutrition": {"calories": 310, "protein_g": 24, "carbs_g": 6, "fat_g": 21, "saturated_fat_g": 12, "sugar_g": 2, "sodium_mg": 460, "fiber_g": 1}},
    {"title": "Bhindi Masala", "ingredients": ["250g okra", "1 onion", "1 tbsp oil", "spices"], "nutrition": {"calories": 130, "protein_g": 3, "carbs_g": 12, "fat_g": 8, "saturated_fat_g": 1.0, "sugar_g": 3, "sodium_mg": 270, "fiber_g": 5}},
    {"title": "Rajma", "ingredients": ["1.5 cups kidney beans", "2 tomatoes", "1 onion", "1 tbsp oil"], "nutrition": {"calories": 260, "protein_g": 13, "carbs_g": 40, "fat_g": 5, "saturated_fat_g": 0.7, "sugar_g": 3, "sodium_mg": 390, "fiber_g": 9}},
    {"title": "Rice Kheer", "ingredients": ["2 cups whole milk", "1/4 cup basmati rice", "3 tbsp sugar", "nuts"], "nutrition": {"calories": 280, "protein_g": 7, "carbs_g": 42, "fat_g": 9, "saturated_fat_g": 5.2, "sugar_g": 28, "sodium_mg": 95, "fiber_g": 1}},
    {"title": "Gajar Ka Halwa", "ingredients": ["2 cups grated carrots", "1 cup milk", "2 tbsp ghee", "2 tbsp sugar"], "nutrition": {"calories": 310, "protein_g": 5, "carbs_g": 45, "fat_g": 13, "saturated_fat_g": 8.0, "sugar_g": 32, "sodium_mg": 80, "fiber_g": 4}},
    {"title": "Vegetable Pulao", "ingredients": ["2 cups basmati rice", "1 cup mixed veggies", "1 tbsp ghee"], "nutrition": {"calories": 320, "protein_g": 6, "carbs_g": 56, "fat_g": 8, "saturated_fat_g": 4.0, "sugar_g": 3, "sodium_mg": 380, "fiber_g": 4}},
    {"title": "Mutter Paneer", "ingredients": ["150g paneer", "1 cup green peas", "1 onion", "2 tomatoes", "1 tbsp oil"], "nutrition": {"calories": 340, "protein_g": 15, "carbs_g": 22, "fat_g": 21, "saturated_fat_g": 9.5, "sugar_g": 6, "sodium_mg": 440, "fiber_g": 6}},
    {"title": "Puri Bhaji", "ingredients": ["3 puris", "1 cup potato bhaji"], "nutrition": {"calories": 450, "protein_g": 8, "carbs_g": 62, "fat_g": 20, "saturated_fat_g": 4.5, "sugar_g": 4, "sodium_mg": 560, "fiber_g": 5}},
]


def test_indian_benchmark():
    print("=" * 85)
    print(f"{'Dish Title':<26} | {'Category':<10} | {'Grade':<6} | {'Score':<6} | {'Neg':<4} | {'Pos':<4} | {'FVL%':<6}")
    print("=" * 85)
    
    grade_counts = {}
    for dish in INDIAN_BENCHMARK_DISHES:
        cat = classify_recipe_category(dish["title"], dish["ingredients"])
        res = compute_nutri_score_from_recipe(dish)
        
        grade_counts[res.grade] = grade_counts.get(res.grade, 0) + 1
        
        print(f"{dish['title']:<26} | {cat:<10} | {res.grade:<6} | {res.numeric_score:<6} | {res.negative_total:<4} | {res.positive_total:<4} | {res.breakdown.fvl_pct:<6.1f}")
        
    print("=" * 85)
    print("Grade Breakdown across 25 Indian Dishes:", grade_counts)
    print("=" * 85)


if __name__ == "__main__":
    test_indian_benchmark()
