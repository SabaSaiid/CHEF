"""
Nutrition lookup router — uses a built-in nutrition database of 350+ foods.
Falls back gracefully when no external API key is configured.
"""

import json
from pathlib import Path
from fastapi import APIRouter
from app.schemas import NutritionRequest, NutritionData

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])

# ── Built-in nutrition database (per 100g or per serving) ──────
NUTRITION_DB: dict[str, dict] = {
    # ── Proteins & Meats ──
    "chicken":          {"calories": 165, "protein_g": 31,   "carbs_g": 0,    "fat_g": 3.6,  "fiber_g": 0,    "sugar_g": 0},
    "chicken breast":   {"calories": 165, "protein_g": 31,   "carbs_g": 0,    "fat_g": 3.6,  "fiber_g": 0,    "sugar_g": 0},
    "chicken thigh":    {"calories": 209, "protein_g": 26,   "carbs_g": 0,    "fat_g": 10.9, "fiber_g": 0,    "sugar_g": 0},
    "egg":              {"calories": 155, "protein_g": 13,   "carbs_g": 1.1,  "fat_g": 11,   "fiber_g": 0,    "sugar_g": 1.1},
    "eggs":             {"calories": 155, "protein_g": 13,   "carbs_g": 1.1,  "fat_g": 11,   "fiber_g": 0,    "sugar_g": 1.1},
    "mutton":           {"calories": 294, "protein_g": 25,   "carbs_g": 0,    "fat_g": 21,   "fiber_g": 0,    "sugar_g": 0},
    "lamb":             {"calories": 294, "protein_g": 25,   "carbs_g": 0,    "fat_g": 21,   "fiber_g": 0,    "sugar_g": 0},
    "beef":             {"calories": 250, "protein_g": 26,   "carbs_g": 0,    "fat_g": 15,   "fiber_g": 0,    "sugar_g": 0},
    "pork":             {"calories": 242, "protein_g": 27,   "carbs_g": 0,    "fat_g": 14,   "fiber_g": 0,    "sugar_g": 0},
    "fish":             {"calories": 206, "protein_g": 22,   "carbs_g": 0,    "fat_g": 12,   "fiber_g": 0,    "sugar_g": 0},
    "salmon":           {"calories": 208, "protein_g": 20,   "carbs_g": 0,    "fat_g": 13,   "fiber_g": 0,    "sugar_g": 0},
    "tuna":             {"calories": 132, "protein_g": 28,   "carbs_g": 0,    "fat_g": 1.3,  "fiber_g": 0,    "sugar_g": 0},
    "shrimp":           {"calories": 99,  "protein_g": 24,   "carbs_g": 0.2,  "fat_g": 0.3,  "fiber_g": 0,    "sugar_g": 0},
    "prawn":            {"calories": 99,  "protein_g": 24,   "carbs_g": 0.2,  "fat_g": 0.3,  "fiber_g": 0,    "sugar_g": 0},
    "tofu":             {"calories": 76,  "protein_g": 8,    "carbs_g": 1.9,  "fat_g": 4.8,  "fiber_g": 0.3,  "sugar_g": 0.6},
    "paneer":           {"calories": 265, "protein_g": 18,   "carbs_g": 1.2,  "fat_g": 21,   "fiber_g": 0,    "sugar_g": 0},

    # ── Dairy ──
    "milk":             {"calories": 42,  "protein_g": 3.4,  "carbs_g": 5,    "fat_g": 1,    "fiber_g": 0,    "sugar_g": 5},
    "curd":             {"calories": 61,  "protein_g": 3.5,  "carbs_g": 4.7,  "fat_g": 3.3,  "fiber_g": 0,    "sugar_g": 4.7},
    "yogurt":           {"calories": 59,  "protein_g": 10,   "carbs_g": 3.6,  "fat_g": 0.7,  "fiber_g": 0,    "sugar_g": 3.2},
    "dahi":             {"calories": 61,  "protein_g": 3.5,  "carbs_g": 4.7,  "fat_g": 3.3,  "fiber_g": 0,    "sugar_g": 4.7},
    "butter":           {"calories": 717, "protein_g": 0.9,  "carbs_g": 0.1,  "fat_g": 81,   "fiber_g": 0,    "sugar_g": 0.1},
    "ghee":             {"calories": 900, "protein_g": 0,    "carbs_g": 0,    "fat_g": 100,  "fiber_g": 0,    "sugar_g": 0},
    "cheese":           {"calories": 402, "protein_g": 25,   "carbs_g": 1.3,  "fat_g": 33,   "fiber_g": 0,    "sugar_g": 0.5},
    "cream":            {"calories": 340, "protein_g": 2.1,  "carbs_g": 2.8,  "fat_g": 36,   "fiber_g": 0,    "sugar_g": 2.8},
    "buttermilk":       {"calories": 40,  "protein_g": 3.3,  "carbs_g": 4.8,  "fat_g": 0.9,  "fiber_g": 0,    "sugar_g": 4.8},
    "lassi":            {"calories": 72,  "protein_g": 2.8,  "carbs_g": 12,   "fat_g": 1.5,  "fiber_g": 0,    "sugar_g": 10},

    # ── Grains & Cereals ──
    "rice":             {"calories": 130, "protein_g": 2.7,  "carbs_g": 28,   "fat_g": 0.3,  "fiber_g": 0.4,  "sugar_g": 0},
    "basmati rice":     {"calories": 121, "protein_g": 3.5,  "carbs_g": 25,   "fat_g": 0.4,  "fiber_g": 0.4,  "sugar_g": 0},
    "brown rice":       {"calories": 111, "protein_g": 2.6,  "carbs_g": 23,   "fat_g": 0.9,  "fiber_g": 1.8,  "sugar_g": 0.4},
    "wheat":            {"calories": 340, "protein_g": 13,   "carbs_g": 72,   "fat_g": 2.5,  "fiber_g": 12,   "sugar_g": 0.4},
    "atta":             {"calories": 340, "protein_g": 13,   "carbs_g": 72,   "fat_g": 2.5,  "fiber_g": 12,   "sugar_g": 0.4},
    "flour":            {"calories": 364, "protein_g": 10,   "carbs_g": 76,   "fat_g": 1,    "fiber_g": 2.7,  "sugar_g": 0.3},
    "maida":            {"calories": 364, "protein_g": 10,   "carbs_g": 76,   "fat_g": 1,    "fiber_g": 2.7,  "sugar_g": 0.3},
    "oats":             {"calories": 389, "protein_g": 17,   "carbs_g": 66,   "fat_g": 7,    "fiber_g": 11,   "sugar_g": 0},
    "pasta":            {"calories": 131, "protein_g": 5,    "carbs_g": 25,   "fat_g": 1.1,  "fiber_g": 1.8,  "sugar_g": 0.6},
    "noodles":          {"calories": 138, "protein_g": 4.5,  "carbs_g": 25,   "fat_g": 2.1,  "fiber_g": 1,    "sugar_g": 0.6},
    "bread":            {"calories": 265, "protein_g": 9,    "carbs_g": 49,   "fat_g": 3.2,  "fiber_g": 2.7,  "sugar_g": 5},
    "roti":             {"calories": 120, "protein_g": 3.5,  "carbs_g": 21,   "fat_g": 3.7,  "fiber_g": 1.9,  "sugar_g": 0.4},
    "chapati":          {"calories": 120, "protein_g": 3.5,  "carbs_g": 21,   "fat_g": 3.7,  "fiber_g": 1.9,  "sugar_g": 0.4},
    "naan":             {"calories": 262, "protein_g": 9,    "carbs_g": 45,   "fat_g": 5.1,  "fiber_g": 2,    "sugar_g": 3.6},
    "paratha":          {"calories": 260, "protein_g": 5,    "carbs_g": 36,   "fat_g": 10,   "fiber_g": 2.3,  "sugar_g": 1.2},
    "poha":             {"calories": 110, "protein_g": 2,    "carbs_g": 23,   "fat_g": 0.6,  "fiber_g": 0.5,  "sugar_g": 0.2},
    "upma":             {"calories": 130, "protein_g": 3,    "carbs_g": 18,   "fat_g": 5,    "fiber_g": 1.5,  "sugar_g": 0.5},
    "idli":             {"calories": 39,  "protein_g": 2,    "carbs_g": 8,    "fat_g": 0.1,  "fiber_g": 0.3,  "sugar_g": 0},
    "dosa":             {"calories": 120, "protein_g": 3,    "carbs_g": 18,   "fat_g": 4,    "fiber_g": 0.5,  "sugar_g": 0.5},
    "puri":             {"calories": 300, "protein_g": 5,    "carbs_g": 36,   "fat_g": 15,   "fiber_g": 1.5,  "sugar_g": 0.5},
    "semolina":         {"calories": 360, "protein_g": 13,   "carbs_g": 73,   "fat_g": 1.1,  "fiber_g": 3.9,  "sugar_g": 0.7},
    "suji":             {"calories": 360, "protein_g": 13,   "carbs_g": 73,   "fat_g": 1.1,  "fiber_g": 3.9,  "sugar_g": 0.7},
    "cornflakes":       {"calories": 357, "protein_g": 8,    "carbs_g": 84,   "fat_g": 0.4,  "fiber_g": 4,    "sugar_g": 10},
    "muesli":           {"calories": 340, "protein_g": 10,   "carbs_g": 65,   "fat_g": 5,    "fiber_g": 7,    "sugar_g": 20},

    # ── Pulses & Legumes ──
    "chickpeas":        {"calories": 164, "protein_g": 9,    "carbs_g": 27,   "fat_g": 2.6,  "fiber_g": 8,    "sugar_g": 5},
    "chana":            {"calories": 164, "protein_g": 9,    "carbs_g": 27,   "fat_g": 2.6,  "fiber_g": 8,    "sugar_g": 5},
    "rajma":            {"calories": 127, "protein_g": 9,    "carbs_g": 22,   "fat_g": 0.5,  "fiber_g": 7,    "sugar_g": 0.3},
    "lentils":          {"calories": 116, "protein_g": 9,    "carbs_g": 20,   "fat_g": 0.4,  "fiber_g": 8,    "sugar_g": 1.8},
    "dal":              {"calories": 116, "protein_g": 9,    "carbs_g": 20,   "fat_g": 0.4,  "fiber_g": 8,    "sugar_g": 1.8},
    "arhar dal":        {"calories": 116, "protein_g": 9,    "carbs_g": 20,   "fat_g": 0.4,  "fiber_g": 8,    "sugar_g": 1.8},
    "moong dal":        {"calories": 105, "protein_g": 7,    "carbs_g": 19,   "fat_g": 0.4,  "fiber_g": 7.6,  "sugar_g": 2},
    "urad dal":         {"calories": 105, "protein_g": 7.6,  "carbs_g": 17,   "fat_g": 0.4,  "fiber_g": 4.8,  "sugar_g": 0},
    "masoor dal":       {"calories": 116, "protein_g": 9,    "carbs_g": 20,   "fat_g": 0.4,  "fiber_g": 8,    "sugar_g": 1.8},
    "sattu":            {"calories": 413, "protein_g": 20,   "carbs_g": 65,   "fat_g": 7,    "fiber_g": 10,   "sugar_g": 3},
    "soybean":          {"calories": 173, "protein_g": 17,   "carbs_g": 10,   "fat_g": 9,    "fiber_g": 6,    "sugar_g": 3},
    "peanut":           {"calories": 567, "protein_g": 26,   "carbs_g": 16,   "fat_g": 49,   "fiber_g": 9,    "sugar_g": 4},
    "peanuts":          {"calories": 567, "protein_g": 26,   "carbs_g": 16,   "fat_g": 49,   "fiber_g": 9,    "sugar_g": 4},

    # ── Vegetables ──
    "potato":           {"calories": 77,  "protein_g": 2,    "carbs_g": 17,   "fat_g": 0.1,  "fiber_g": 2.2,  "sugar_g": 0.8},
    "sweet potato":     {"calories": 86,  "protein_g": 1.6,  "carbs_g": 20,   "fat_g": 0.1,  "fiber_g": 3,    "sugar_g": 4.2},
    "spinach":          {"calories": 23,  "protein_g": 2.9,  "carbs_g": 3.6,  "fat_g": 0.4,  "fiber_g": 2.2,  "sugar_g": 0.4},
    "palak":            {"calories": 23,  "protein_g": 2.9,  "carbs_g": 3.6,  "fat_g": 0.4,  "fiber_g": 2.2,  "sugar_g": 0.4},
    "tomato":           {"calories": 18,  "protein_g": 0.9,  "carbs_g": 3.9,  "fat_g": 0.2,  "fiber_g": 1.2,  "sugar_g": 2.6},
    "onion":            {"calories": 40,  "protein_g": 1.1,  "carbs_g": 9.3,  "fat_g": 0.1,  "fiber_g": 1.7,  "sugar_g": 4.2},
    "garlic":           {"calories": 149, "protein_g": 6.4,  "carbs_g": 33,   "fat_g": 0.5,  "fiber_g": 2.1,  "sugar_g": 1},
    "ginger":           {"calories": 80,  "protein_g": 1.8,  "carbs_g": 18,   "fat_g": 0.8,  "fiber_g": 2,    "sugar_g": 1.7},
    "cauliflower":      {"calories": 25,  "protein_g": 1.9,  "carbs_g": 5,    "fat_g": 0.3,  "fiber_g": 2,    "sugar_g": 1.9},
    "cabbage":          {"calories": 25,  "protein_g": 1.3,  "carbs_g": 6,    "fat_g": 0.1,  "fiber_g": 2.5,  "sugar_g": 3.2},
    "broccoli":         {"calories": 34,  "protein_g": 2.8,  "carbs_g": 7,    "fat_g": 0.4,  "fiber_g": 2.6,  "sugar_g": 1.7},
    "carrot":           {"calories": 41,  "protein_g": 0.9,  "carbs_g": 10,   "fat_g": 0.2,  "fiber_g": 2.8,  "sugar_g": 4.7},
    "bell pepper":      {"calories": 31,  "protein_g": 1,    "carbs_g": 6,    "fat_g": 0.3,  "fiber_g": 2.1,  "sugar_g": 4.2},
    "capsicum":         {"calories": 31,  "protein_g": 1,    "carbs_g": 6,    "fat_g": 0.3,  "fiber_g": 2.1,  "sugar_g": 4.2},
    "green chili":      {"calories": 40,  "protein_g": 2,    "carbs_g": 9,    "fat_g": 0.2,  "fiber_g": 1.5,  "sugar_g": 5.3},
    "brinjal":          {"calories": 25,  "protein_g": 1,    "carbs_g": 6,    "fat_g": 0.2,  "fiber_g": 3,    "sugar_g": 3.6},
    "eggplant":         {"calories": 25,  "protein_g": 1,    "carbs_g": 6,    "fat_g": 0.2,  "fiber_g": 3,    "sugar_g": 3.6},
    "bhindi":           {"calories": 33,  "protein_g": 1.9,  "carbs_g": 7,    "fat_g": 0.2,  "fiber_g": 3.2,  "sugar_g": 1.5},
    "okra":             {"calories": 33,  "protein_g": 1.9,  "carbs_g": 7,    "fat_g": 0.2,  "fiber_g": 3.2,  "sugar_g": 1.5},
    "peas":             {"calories": 81,  "protein_g": 5,    "carbs_g": 14,   "fat_g": 0.4,  "fiber_g": 5,    "sugar_g": 6},
    "corn":             {"calories": 86,  "protein_g": 3.3,  "carbs_g": 19,   "fat_g": 1.4,  "fiber_g": 2.7,  "sugar_g": 3.2},
    "beans":            {"calories": 31,  "protein_g": 1.8,  "carbs_g": 7,    "fat_g": 0.2,  "fiber_g": 2.7,  "sugar_g": 3.3},
    "mushroom":         {"calories": 22,  "protein_g": 3.1,  "carbs_g": 3.3,  "fat_g": 0.3,  "fiber_g": 1,    "sugar_g": 2},
    "cucumber":         {"calories": 16,  "protein_g": 0.7,  "carbs_g": 3.6,  "fat_g": 0.1,  "fiber_g": 0.5,  "sugar_g": 1.7},
    "lettuce":          {"calories": 15,  "protein_g": 1.4,  "carbs_g": 2.9,  "fat_g": 0.2,  "fiber_g": 1.3,  "sugar_g": 0.8},
    "radish":           {"calories": 16,  "protein_g": 0.7,  "carbs_g": 3.4,  "fat_g": 0.1,  "fiber_g": 1.6,  "sugar_g": 1.9},
    "beetroot":         {"calories": 43,  "protein_g": 1.6,  "carbs_g": 10,   "fat_g": 0.2,  "fiber_g": 2.8,  "sugar_g": 7},
    "pumpkin":          {"calories": 26,  "protein_g": 1,    "carbs_g": 7,    "fat_g": 0.1,  "fiber_g": 0.5,  "sugar_g": 2.8},
    "bottle gourd":     {"calories": 15,  "protein_g": 0.6,  "carbs_g": 3.4,  "fat_g": 0,    "fiber_g": 0.5,  "sugar_g": 2},
    "bitter gourd":     {"calories": 17,  "protein_g": 1,    "carbs_g": 3.7,  "fat_g": 0.2,  "fiber_g": 2.8,  "sugar_g": 1.9},

    # ── Fruits ──
    "banana":           {"calories": 89,  "protein_g": 1.1,  "carbs_g": 23,   "fat_g": 0.3,  "fiber_g": 2.6,  "sugar_g": 12},
    "apple":            {"calories": 52,  "protein_g": 0.3,  "carbs_g": 14,   "fat_g": 0.2,  "fiber_g": 2.4,  "sugar_g": 10},
    "mango":            {"calories": 60,  "protein_g": 0.8,  "carbs_g": 15,   "fat_g": 0.4,  "fiber_g": 1.6,  "sugar_g": 14},
    "orange":           {"calories": 47,  "protein_g": 0.9,  "carbs_g": 12,   "fat_g": 0.1,  "fiber_g": 2.4,  "sugar_g": 9},
    "grapes":           {"calories": 69,  "protein_g": 0.7,  "carbs_g": 18,   "fat_g": 0.2,  "fiber_g": 0.9,  "sugar_g": 16},
    "watermelon":       {"calories": 30,  "protein_g": 0.6,  "carbs_g": 8,    "fat_g": 0.2,  "fiber_g": 0.4,  "sugar_g": 6},
    "papaya":           {"calories": 43,  "protein_g": 0.5,  "carbs_g": 11,   "fat_g": 0.3,  "fiber_g": 1.7,  "sugar_g": 8},
    "guava":            {"calories": 68,  "protein_g": 2.6,  "carbs_g": 14,   "fat_g": 1,    "fiber_g": 5.4,  "sugar_g": 9},
    "pomegranate":      {"calories": 83,  "protein_g": 1.7,  "carbs_g": 19,   "fat_g": 1.2,  "fiber_g": 4,    "sugar_g": 14},
    "pineapple":        {"calories": 50,  "protein_g": 0.5,  "carbs_g": 13,   "fat_g": 0.1,  "fiber_g": 1.4,  "sugar_g": 10},
    "avocado":          {"calories": 160, "protein_g": 2,    "carbs_g": 9,    "fat_g": 15,   "fiber_g": 7,    "sugar_g": 0.7},
    "coconut":          {"calories": 354, "protein_g": 3.3,  "carbs_g": 15,   "fat_g": 33,   "fiber_g": 9,    "sugar_g": 6},
    "lemon":            {"calories": 29,  "protein_g": 1.1,  "carbs_g": 9.3,  "fat_g": 0.3,  "fiber_g": 2.8,  "sugar_g": 2.5},
    "lime":             {"calories": 30,  "protein_g": 0.7,  "carbs_g": 11,   "fat_g": 0.2,  "fiber_g": 2.8,  "sugar_g": 1.7},
    "strawberry":       {"calories": 32,  "protein_g": 0.7,  "carbs_g": 8,    "fat_g": 0.3,  "fiber_g": 2,    "sugar_g": 5},
    "blueberry":        {"calories": 57,  "protein_g": 0.7,  "carbs_g": 14,   "fat_g": 0.3,  "fiber_g": 2.4,  "sugar_g": 10},
    "dates":            {"calories": 277, "protein_g": 1.8,  "carbs_g": 75,   "fat_g": 0.2,  "fiber_g": 7,    "sugar_g": 66},
    "raisins":          {"calories": 299, "protein_g": 3.1,  "carbs_g": 79,   "fat_g": 0.5,  "fiber_g": 3.7,  "sugar_g": 59},
    "dry fruits":       {"calories": 580, "protein_g": 15,   "carbs_g": 30,   "fat_g": 48,   "fiber_g": 8,    "sugar_g": 20},

    # ── Nuts & Seeds ──
    "almond":           {"calories": 579, "protein_g": 21,   "carbs_g": 22,   "fat_g": 50,   "fiber_g": 13,   "sugar_g": 4},
    "almonds":          {"calories": 579, "protein_g": 21,   "carbs_g": 22,   "fat_g": 50,   "fiber_g": 13,   "sugar_g": 4},
    "cashew":           {"calories": 553, "protein_g": 18,   "carbs_g": 30,   "fat_g": 44,   "fiber_g": 3,    "sugar_g": 6},
    "walnut":           {"calories": 654, "protein_g": 15,   "carbs_g": 14,   "fat_g": 65,   "fiber_g": 7,    "sugar_g": 3},
    "pistachio":        {"calories": 560, "protein_g": 20,   "carbs_g": 28,   "fat_g": 45,   "fiber_g": 10,   "sugar_g": 8},
    "flaxseed":         {"calories": 534, "protein_g": 18,   "carbs_g": 29,   "fat_g": 42,   "fiber_g": 27,   "sugar_g": 1.6},
    "chia seeds":       {"calories": 486, "protein_g": 17,   "carbs_g": 42,   "fat_g": 31,   "fiber_g": 34,   "sugar_g": 0},
    "sesame seeds":     {"calories": 573, "protein_g": 18,   "carbs_g": 23,   "fat_g": 50,   "fiber_g": 12,   "sugar_g": 0.3},
    "sunflower seeds":  {"calories": 584, "protein_g": 21,   "carbs_g": 20,   "fat_g": 51,   "fiber_g": 9,    "sugar_g": 2.6},

    # ── Oils & Fats ──
    "olive oil":        {"calories": 884, "protein_g": 0,    "carbs_g": 0,    "fat_g": 100,  "fiber_g": 0,    "sugar_g": 0},
    "mustard oil":      {"calories": 884, "protein_g": 0,    "carbs_g": 0,    "fat_g": 100,  "fiber_g": 0,    "sugar_g": 0},
    "coconut oil":      {"calories": 862, "protein_g": 0,    "carbs_g": 0,    "fat_g": 100,  "fiber_g": 0,    "sugar_g": 0},
    "vegetable oil":    {"calories": 884, "protein_g": 0,    "carbs_g": 0,    "fat_g": 100,  "fiber_g": 0,    "sugar_g": 0},
    "oil":              {"calories": 884, "protein_g": 0,    "carbs_g": 0,    "fat_g": 100,  "fiber_g": 0,    "sugar_g": 0},

    # ── Spices & Condiments ──
    "turmeric":         {"calories": 312, "protein_g": 10,   "carbs_g": 67,   "fat_g": 3.3,  "fiber_g": 21,   "sugar_g": 3.2},
    "cumin":            {"calories": 375, "protein_g": 18,   "carbs_g": 44,   "fat_g": 22,   "fiber_g": 11,   "sugar_g": 2.3},
    "coriander powder": {"calories": 298, "protein_g": 12,   "carbs_g": 55,   "fat_g": 18,   "fiber_g": 42,   "sugar_g": 0},
    "garam masala":     {"calories": 375, "protein_g": 15,   "carbs_g": 45,   "fat_g": 15,   "fiber_g": 25,   "sugar_g": 3},
    "red chili powder": {"calories": 282, "protein_g": 12,   "carbs_g": 50,   "fat_g": 14,   "fiber_g": 35,   "sugar_g": 10},
    "black pepper":     {"calories": 251, "protein_g": 10,   "carbs_g": 64,   "fat_g": 3.3,  "fiber_g": 25,   "sugar_g": 0.6},
    "cinnamon":         {"calories": 247, "protein_g": 4,    "carbs_g": 81,   "fat_g": 1.2,  "fiber_g": 53,   "sugar_g": 2.2},
    "salt":             {"calories": 0,   "protein_g": 0,    "carbs_g": 0,    "fat_g": 0,    "fiber_g": 0,    "sugar_g": 0},
    "soy sauce":        {"calories": 53,  "protein_g": 8.1,  "carbs_g": 4.9,  "fat_g": 0.6,  "fiber_g": 0.8,  "sugar_g": 0.4},
    "vinegar":          {"calories": 18,  "protein_g": 0,    "carbs_g": 0.6,  "fat_g": 0,    "fiber_g": 0,    "sugar_g": 0.4},
    "ketchup":          {"calories": 112, "protein_g": 1.7,  "carbs_g": 26,   "fat_g": 0.5,  "fiber_g": 0.3,  "sugar_g": 22},

    # ── Sweeteners & Desserts ──
    "sugar":            {"calories": 387, "protein_g": 0,    "carbs_g": 100,  "fat_g": 0,    "fiber_g": 0,    "sugar_g": 100},
    "jaggery":          {"calories": 383, "protein_g": 0.4,  "carbs_g": 98,   "fat_g": 0.1,  "fiber_g": 0,    "sugar_g": 85},
    "honey":            {"calories": 304, "protein_g": 0.3,  "carbs_g": 82,   "fat_g": 0,    "fiber_g": 0.2,  "sugar_g": 82},
    "chocolate":        {"calories": 546, "protein_g": 5,    "carbs_g": 60,   "fat_g": 31,   "fiber_g": 7,    "sugar_g": 48},
    "ice cream":        {"calories": 207, "protein_g": 3.5,  "carbs_g": 24,   "fat_g": 11,   "fiber_g": 0.7,  "sugar_g": 21},

    # ── Beverages ──
    "tea":              {"calories": 1,   "protein_g": 0,    "carbs_g": 0.3,  "fat_g": 0,    "fiber_g": 0,    "sugar_g": 0},
    "coffee":           {"calories": 2,   "protein_g": 0.3,  "carbs_g": 0,    "fat_g": 0,    "fiber_g": 0,    "sugar_g": 0},
    "coconut water":    {"calories": 19,  "protein_g": 0.7,  "carbs_g": 3.7,  "fat_g": 0.2,  "fiber_g": 1.1,  "sugar_g": 2.6},
    "orange juice":     {"calories": 45,  "protein_g": 0.7,  "carbs_g": 10,   "fat_g": 0.2,  "fiber_g": 0.2,  "sugar_g": 8.4},
}

# ── Load extended data from JSON ───────────────────────────────
_extra_path = Path(__file__).parent.parent / "nutrition_extra.json"
if _extra_path.exists():
    with open(_extra_path) as _f:
        _extra = json.load(_f)
    NUTRITION_DB.update(_extra)


def _lookup(food: str) -> dict | None:
    """Case-insensitive lookup in the nutrition database."""
    key = food.lower().strip()
    if key in NUTRITION_DB:
        return NUTRITION_DB[key]
    # Partial match
    for db_key, data in NUTRITION_DB.items():
        if key in db_key or db_key in key:
            return data
    return None


@router.post("/analyze", response_model=NutritionData)
def analyze_nutrition(req: NutritionRequest):
    """
    Look up nutrition data for a food item.
    Uses a built-in database of 350+ foods covering Indian, global, and rare items.
    Values are per 100g, scaled by quantity.
    """
    data = _lookup(req.food_item)

    if data is None:
        # Return zeroes with a note rather than an error
        return NutritionData(
            food_item=req.food_item,
            quantity=req.quantity,
            unit=req.unit,
            source="demo (not found — try a common food like chicken, rice, eggs, etc.)",
        )

    scale = req.quantity
    return NutritionData(
        food_item=req.food_item,
        quantity=req.quantity,
        unit=req.unit,
        calories=round(data["calories"] * scale, 1),
        protein_g=round(data["protein_g"] * scale, 1),
        carbs_g=round(data["carbs_g"] * scale, 1),
        fat_g=round(data["fat_g"] * scale, 1),
        fiber_g=round(data.get("fiber_g", 0) * scale, 1),
        sugar_g=round(data.get("sugar_g", 0) * scale, 1),
        source="demo",
    )
