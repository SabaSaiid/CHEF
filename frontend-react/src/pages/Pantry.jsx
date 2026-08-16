import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import RecipeModal from '../components/RecipeModal';
import AuthModal from '../components/AuthModal';
import {
  Plus,
  Wand2,
  Trash2,
  Search,
  AlertTriangle,
  ChefHat,
  Info,
  AlertCircle,
  Package,
  Clock,
  Leaf,
  Minus,
  Edit2,
  CheckSquare,
  Square,
  Copy,
  Download,
  LayoutGrid,
  List as ListIcon,
  Flame,
  Check,
  Sparkles,
  Share2,
  ShoppingBag,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  X,
  Layers,
  ThermometerSnowflake,
  UtensilsCrossed,
  RotateCcw,
  Zap,
} from 'lucide-react';
import useHoldToRepeat from '../hooks/useHoldToRepeat';

/**
 * Returns a sensible increment/decrement step based on unit type.
 */
function getStepForUnit(unit) {
  if (!unit) return 1;
  const u = unit.trim().toLowerCase();
  const stepMap = {
    'pcs': 1, 'pieces': 1, 'piece': 1, 'whole': 1, 'nos': 1,
    'slices': 1, 'slice': 1,
    'g': 50, 'gram': 50, 'grams': 50,
    'ml': 100, 'milliliter': 100, 'milliliters': 100,
    'kg': 0.25, 'kilogram': 0.25, 'kilograms': 0.25,
    'l': 0.25, 'liter': 0.25, 'liters': 0.25, 'litre': 0.25, 'litres': 0.25,
    'tbsp': 1, 'tablespoon': 1, 'tablespoons': 1,
    'tsp': 0.5, 'teaspoon': 0.5, 'teaspoons': 0.5,
    'cup': 0.25, 'cups': 0.25,
    'oz': 1, 'ounce': 1, 'ounces': 1,
    'lb': 0.25, 'pound': 0.25, 'pounds': 0.25,
    'serving': 1, 'servings': 1,
    'dozen': 1,
    'bunch': 1, 'bunches': 1,
    'can': 1, 'cans': 1,
    'packet': 1, 'packets': 1,
    'bottle': 1, 'bottles': 1,
    'box': 1, 'boxes': 1,
  };
  return stepMap[u] || 1;
}

/**
 * Formats a step value + unit for display on buttons (e.g., "+50g", "-100ml", "+1")
 */
function formatStepLabel(step, unit, direction) {
  const prefix = direction > 0 ? '+' : '−';
  const u = (unit || '').trim().toLowerCase();
  const showUnit = [
    'g', 'gram', 'grams', 'ml', 'milliliter', 'milliliters', 'kg', 'kilogram', 'kilograms',
    'l', 'liter', 'liters', 'litre', 'litres', 'oz', 'ounce', 'ounces', 'lb', 'pound', 'pounds',
    'tsp', 'teaspoon', 'teaspoons', 'tbsp', 'tablespoon', 'tablespoons', 'cup', 'cups'
  ].includes(u);
  const displayStep = step % 1 === 0 ? step.toString() : step.toFixed(step < 1 ? 2 : 1).replace(/0+$/, '').replace(/\.$/, '');
  return showUnit ? `${prefix}${displayStep}${u}` : `${prefix}${displayStep}`;
}

/**
 * Keyword-based emoji matcher for food ingredients.
 */
function getItemEmoji(ingredientName, category) {
  const name = (ingredientName || '').toLowerCase();

  const itemKeywords = [
    { keywords: ['egg'], emoji: '🥚' },
    { keywords: ['chicken'], emoji: '🍗' },
    { keywords: ['beef', 'steak'], emoji: '🥩' },
    { keywords: ['pork', 'bacon', 'ham'], emoji: '🥓' },
    { keywords: ['fish', 'salmon', 'tuna', 'cod', 'tilapia'], emoji: '🐟' },
    { keywords: ['shrimp', 'prawn', 'seafood', 'crab', 'lobster'], emoji: '🦐' },
    { keywords: ['lamb', 'mutton', 'goat'], emoji: '🍖' },
    { keywords: ['turkey'], emoji: '🦃' },
    { keywords: ['tofu', 'paneer', 'tempeh'], emoji: '🧊' },
    { keywords: ['sausage'], emoji: '🌭' },

    { keywords: ['milk'], emoji: '🥛' },
    { keywords: ['butter'], emoji: '🧈' },
    { keywords: ['cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta'], emoji: '🧀' },
    { keywords: ['yogurt', 'yoghurt', 'curd', 'dahi'], emoji: '🥣' },
    { keywords: ['cream', 'whip'], emoji: '🍦' },
    { keywords: ['ice cream'], emoji: '🍨' },

    { keywords: ['apple'], emoji: '🍎' },
    { keywords: ['banana'], emoji: '🍌' },
    { keywords: ['orange'], emoji: '🍊' },
    { keywords: ['lemon', 'lime'], emoji: '🍋' },
    { keywords: ['grape'], emoji: '🍇' },
    { keywords: ['strawberr'], emoji: '🍓' },
    { keywords: ['blueberr', 'berr'], emoji: '🫐' },
    { keywords: ['watermelon', 'melon'], emoji: '🍉' },
    { keywords: ['peach', 'apricot', 'nectarine'], emoji: '🍑' },
    { keywords: ['pineapple'], emoji: '🍍' },
    { keywords: ['mango'], emoji: '🥭' },
    { keywords: ['avocado'], emoji: '🥑' },
    { keywords: ['coconut'], emoji: '🥥' },
    { keywords: ['cherry', 'cherries'], emoji: '🍒' },
    { keywords: ['pear'], emoji: '🍐' },
    { keywords: ['kiwi'], emoji: '🥝' },

    { keywords: ['tomato'], emoji: '🍅' },
    { keywords: ['potato'], emoji: '🥔' },
    { keywords: ['sweet potato', 'yam'], emoji: '🍠' },
    { keywords: ['carrot'], emoji: '🥕' },
    { keywords: ['corn'], emoji: '🌽' },
    { keywords: ['broccoli'], emoji: '🥦' },
    { keywords: ['lettuce', 'salad'], emoji: '🥗' },
    { keywords: ['cucumber'], emoji: '🥒' },
    { keywords: ['pepper', 'capsicum', 'bell pepper'], emoji: '🫑' },
    { keywords: ['chili', 'chilli', 'jalapeno'], emoji: '🌶️' },
    { keywords: ['mushroom'], emoji: '🍄' },
    { keywords: ['onion'], emoji: '🧅' },
    { keywords: ['garlic'], emoji: '🧄' },
    { keywords: ['ginger'], emoji: '🫚' },
    { keywords: ['spinach', 'kale', 'greens', 'chard'], emoji: '🥬' },
    { keywords: ['pea', 'bean', 'lentil', 'chickpea', 'dal'], emoji: '🫘' },
    { keywords: ['eggplant', 'aubergine', 'brinjal'], emoji: '🍆' },
    { keywords: ['cabbage'], emoji: '🥬' },
    { keywords: ['celery'], emoji: '🥬' },
    { keywords: ['pumpkin', 'squash', 'zucchini', 'gourd'], emoji: '🎃' },

    { keywords: ['bread', 'toast', 'bun', 'roll', 'naan', 'roti', 'pita'], emoji: '🍞' },
    { keywords: ['rice', 'basmati', 'jasmine'], emoji: '🍚' },
    { keywords: ['pasta', 'spaghetti', 'noodle', 'penne', 'macaroni'], emoji: '🍝' },
    { keywords: ['flour', 'wheat', 'atta', 'maida'], emoji: '🌾' },
    { keywords: ['oat', 'cereal', 'granola', 'muesli'], emoji: '🥣' },
    { keywords: ['cookie', 'biscuit'], emoji: '🍪' },
    { keywords: ['cake'], emoji: '🍰' },
    { keywords: ['sugar'], emoji: '🍬' },
    { keywords: ['tortilla', 'wrap'], emoji: '🌯' },
    { keywords: ['cracker'], emoji: '🍘' },

    { keywords: ['olive oil'], emoji: '🫒' },
    { keywords: ['oil', 'cooking oil', 'vegetable oil', 'sunflower'], emoji: '🛢️' },
    { keywords: ['vinegar'], emoji: '🫗' },
    { keywords: ['soy sauce', 'sauce', 'ketchup', 'mayo', 'mustard'], emoji: '🧴' },
    { keywords: ['salt'], emoji: '🧂' },
    { keywords: ['honey'], emoji: '🍯' },
    { keywords: ['spice', 'cumin', 'turmeric', 'coriander', 'paprika', 'cinnamon', 'pepper'], emoji: '🫙' },
    { keywords: ['herb', 'basil', 'parsley', 'mint', 'thyme', 'rosemary', 'oregano', 'cilantro', 'dill'], emoji: '🌿' },

    { keywords: ['coffee'], emoji: '☕' },
    { keywords: ['tea'], emoji: '🍵' },
    { keywords: ['juice'], emoji: '🧃' },
    { keywords: ['water'], emoji: '💧' },
    { keywords: ['soda', 'cola', 'drink'], emoji: '🥤' },
    { keywords: ['wine'], emoji: '🍷' },
    { keywords: ['beer'], emoji: '🍺' },

    { keywords: ['nut', 'almond', 'walnut', 'cashew', 'pistachio', 'peanut', 'hazelnut'], emoji: '🥜' },
    { keywords: ['chocolate', 'cocoa'], emoji: '🍫' },
  ];

  for (const entry of itemKeywords) {
    if (entry.keywords.some(kw => name.includes(kw))) {
      return entry.emoji;
    }
  }

  const categoryFallback = {
    'Produce': '🥬',
    'Proteins': '🥩',
    'Dairy': '🧈',
    'Grains & Baking': '🌾',
    'Spices & Seasonings': '🫙',
    'Other': '📦',
  };
  return categoryFallback[category] || '📦';
}

function getLocationEmoji(location) {
  const map = {
    'Fridge': '❄️',
    'Freezer': '🧊',
    'Pantry': '🏺',
    'Countertop': '🧺',
    'Spice Rack': '🧂',
  };
  return map[location] || '🏺';
}

function getCategoryAccentClass(category) {
  const map = {
    'Produce': 'produce',
    'Proteins': 'proteins',
    'Dairy': 'dairy',
    'Grains & Baking': 'grains',
    'Spices & Seasonings': 'spices',
    'Other': 'other',
  };
  return map[category] || 'other';
}

function HoldablePantryQtyBtn({ item, step, direction, onAdjust, title }) {
  const amount = direction * step;
  const handlers = useHoldToRepeat(() => onAdjust(item, amount), 350, 100);
  const label = formatStepLabel(step, item?.unit, direction);
  return (
    <button
      type="button"
      className={`pantry-qty-btn ${direction < 0 ? 'minus' : 'plus'}`}
      title={title}
      {...handlers}
    >
      {label}
    </button>
  );
}

const PANTRY_CATEGORIES = ['All', 'Produce', 'Proteins', 'Dairy', 'Grains & Baking', 'Spices & Seasonings', 'Other'];
const STORAGE_LOCATIONS = ['All Locations', 'Fridge', 'Freezer', 'Pantry', 'Spice Rack', 'Countertop'];
const UNIT_OPTIONS = ['pcs', 'g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'cup', 'slices', 'serving', 'oz', 'lb', 'can', 'packet', 'bottle'];

const QUICK_PRESETS = [
  { name: 'Eggs', category: 'Proteins', location: 'Fridge', unit: 'pcs', days_fresh: 14, emoji: '🥚', amount: 6 },
  { name: 'Chicken Breast', category: 'Proteins', location: 'Fridge', unit: 'g', days_fresh: 4, emoji: '🍗', amount: 500 },
  { name: 'Milk', category: 'Dairy', location: 'Fridge', unit: 'ml', days_fresh: 7, emoji: '🥛', amount: 1000 },
  { name: 'Butter', category: 'Dairy', location: 'Fridge', unit: 'g', days_fresh: 30, emoji: '🧈', amount: 250 },
  { name: 'Spinach', category: 'Produce', location: 'Fridge', unit: 'g', days_fresh: 4, emoji: '🥬', amount: 200 },
  { name: 'Onions', category: 'Produce', location: 'Pantry', unit: 'pcs', days_fresh: 20, emoji: '🧅', amount: 4 },
  { name: 'Garlic', category: 'Produce', location: 'Pantry', unit: 'pcs', days_fresh: 30, emoji: '🧄', amount: 2 },
  { name: 'Olive Oil', category: 'Spices & Seasonings', location: 'Spice Rack', unit: 'ml', days_fresh: 180, emoji: '🫒', amount: 500 },
  { name: 'Rice', category: 'Grains & Baking', location: 'Pantry', unit: 'g', days_fresh: 365, emoji: '🌾', amount: 1000 },
  { name: 'Bread', category: 'Grains & Baking', location: 'Pantry', unit: 'slices', days_fresh: 6, emoji: '🍞', amount: 12 }
];

const QUICK_KITS = [
  {
    id: 'breakfast_essentials',
    title: 'Breakfast Essentials',
    subtitle: 'Classic morning staples for pancakes, omelets, and toasts.',
    emoji: '🥞',
    items: [
      { ingredient_name: 'Eggs', quantity: 6, unit: 'pcs', category: 'Proteins', location: 'Fridge', days_fresh: 14 },
      { ingredient_name: 'Milk', quantity: 1000, unit: 'ml', category: 'Dairy', location: 'Fridge', days_fresh: 7 },
      { ingredient_name: 'Bread', quantity: 12, unit: 'slices', category: 'Grains & Baking', location: 'Pantry', days_fresh: 6 },
      { ingredient_name: 'Butter', quantity: 200, unit: 'g', category: 'Dairy', location: 'Fridge', days_fresh: 30 },
    ]
  },
  {
    id: 'italian_pasta_night',
    title: 'Italian Pasta Night',
    subtitle: 'Everything needed to whip up a rich restaurant-quality pasta dinner.',
    emoji: '🍝',
    items: [
      { ingredient_name: 'Pasta', quantity: 500, unit: 'g', category: 'Grains & Baking', location: 'Pantry', days_fresh: 365 },
      { ingredient_name: 'Tomato', quantity: 4, unit: 'pcs', category: 'Produce', location: 'Fridge', days_fresh: 7 },
      { ingredient_name: 'Garlic', quantity: 2, unit: 'pcs', category: 'Produce', location: 'Pantry', days_fresh: 30 },
      { ingredient_name: 'Olive Oil', quantity: 250, unit: 'ml', category: 'Spices & Seasonings', location: 'Spice Rack', days_fresh: 180 },
      { ingredient_name: 'Cheese', quantity: 150, unit: 'g', category: 'Dairy', location: 'Fridge', days_fresh: 21 },
    ]
  },
  {
    id: 'asian_stir_fry',
    title: 'Asian Stir-Fry Staples',
    subtitle: 'Aromatic foundation for sizzling stir-fries, fried rice, and noodles.',
    emoji: '🥢',
    items: [
      { ingredient_name: 'Rice', quantity: 1000, unit: 'g', category: 'Grains & Baking', location: 'Pantry', days_fresh: 365 },
      { ingredient_name: 'Soy Sauce', quantity: 250, unit: 'ml', category: 'Spices & Seasonings', location: 'Spice Rack', days_fresh: 180 },
      { ingredient_name: 'Garlic', quantity: 3, unit: 'pcs', category: 'Produce', location: 'Pantry', days_fresh: 30 },
      { ingredient_name: 'Ginger', quantity: 100, unit: 'g', category: 'Produce', location: 'Fridge', days_fresh: 21 },
      { ingredient_name: 'Chicken Breast', quantity: 500, unit: 'g', category: 'Proteins', location: 'Fridge', days_fresh: 4 },
      { ingredient_name: 'Bell Pepper', quantity: 2, unit: 'pcs', category: 'Produce', location: 'Fridge', days_fresh: 8 },
    ]
  },
  {
    id: 'protein_power_prep',
    title: 'High Protein Meal Prep',
    subtitle: 'Lean proteins and clean greens for fitness and macro tracking.',
    emoji: '🥩',
    items: [
      { ingredient_name: 'Chicken Breast', quantity: 1000, unit: 'g', category: 'Proteins', location: 'Fridge', days_fresh: 4 },
      { ingredient_name: 'Eggs', quantity: 12, unit: 'pcs', category: 'Proteins', location: 'Fridge', days_fresh: 14 },
      { ingredient_name: 'Spinach', quantity: 300, unit: 'g', category: 'Produce', location: 'Fridge', days_fresh: 4 },
      { ingredient_name: 'Greek Yogurt', quantity: 500, unit: 'g', category: 'Dairy', location: 'Fridge', days_fresh: 10 },
    ]
  },
  {
    id: 'salad_greens',
    title: 'Crisp Salad & Fresh Greens',
    subtitle: 'Nutrient-rich produce and light dressings for fresh daily bowls.',
    emoji: '🥗',
    items: [
      { ingredient_name: 'Lettuce', quantity: 1, unit: 'pcs', category: 'Produce', location: 'Fridge', days_fresh: 5 },
      { ingredient_name: 'Cucumber', quantity: 2, unit: 'pcs', category: 'Produce', location: 'Fridge', days_fresh: 7 },
      { ingredient_name: 'Tomato', quantity: 3, unit: 'pcs', category: 'Produce', location: 'Fridge', days_fresh: 7 },
      { ingredient_name: 'Olive Oil', quantity: 200, unit: 'ml', category: 'Spices & Seasonings', location: 'Spice Rack', days_fresh: 180 },
      { ingredient_name: 'Lemon', quantity: 2, unit: 'pcs', category: 'Produce', location: 'Countertop', days_fresh: 14 },
    ]
  }
];

export default function Pantry() {
  const { token } = useContext(AuthContext);
  const toast = useToast();
  const { settings } = useSettings();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  // Main Pantry Data
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active Tab & View Mode
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'cook' | 'ai_chef' | 'kits'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Add Item Form state
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('pcs');
  const [category, setCategory] = useState('Produce');
  const [location, setLocation] = useState('Fridge');
  const [daysFresh, setDaysFresh] = useState(7);

  // Edit Item Modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    ingredient_name: '',
    quantity: 1,
    unit: 'pcs',
    category: 'Produce',
    location: 'Fridge',
    days_fresh: 7
  });

  // Filter & Sort states
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [freshnessFilter, setFreshnessFilter] = useState('all'); // 'all' | 'fresh' | 'expiring' | 'expired' | 'low_stock'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('name-asc');

  // AI & Smart Import states
  const [magicImportText, setMagicImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [magicPreviewItems, setMagicPreviewItems] = useState(null);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState(null);

  // Recipe Matcher Tab states
  const [matchedRecipes, setMatchedRecipes] = useState([]);
  const [loadingMatched, setLoadingMatched] = useState(false);
  const [matchFilterType, setMatchFilterType] = useState('all'); // 'all' | 'cookable' | 'almost' | 'expiring'
  const [matchMealType, setMatchMealType] = useState('all');
  const [matchSortBy, setMatchSortBy] = useState('match'); // 'match' | 'fastest' | 'nutri'
  const [matchSearch, setMatchSearch] = useState('');
  const [matchStats, setMatchStats] = useState({ total_matched: 0, cookable_now_count: 0, expiring_soon_count: 0, almost_cookable_count: 0 });

  // Modals & Exports
  const [selectedRecipeForModal, setSelectedRecipeForModal] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Fetch Pantry Items
  const fetchPantry = async (isInitial = false) => {
    if (!token) {
      setError('Please log in to manage your pantry inventory.');
      return;
    }
    if (isInitial) setLoading(true);
    try {
      const data = await api.get('/pantry');
      setPantryItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch pantry inventory');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Fetch Matched Recipes
  const fetchMatchedRecipes = async () => {
    if (!token) return;
    setLoadingMatched(true);
    try {
      const params = new URLSearchParams();
      if (matchFilterType !== 'all') params.append('filter_type', matchFilterType);
      if (matchMealType !== 'all') params.append('meal_type', matchMealType);
      if (matchSortBy !== 'match') params.append('sort_by', matchSortBy);
      if (matchSearch.trim()) params.append('search', matchSearch.trim());
      params.append('limit', '40');

      const res = await api.get(`/pantry/matched-recipes?${params.toString()}`);
      setMatchedRecipes(res.recipes || []);
      setMatchStats({
        total_matched: res.total_matched || 0,
        cookable_now_count: res.cookable_now_count || 0,
        expiring_soon_count: res.expiring_soon_count || 0,
        almost_cookable_count: res.almost_cookable_count || 0,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to fetch recipe matches');
    } finally {
      setLoadingMatched(false);
    }
  };

  useEffect(() => {
    fetchPantry(true);
  }, [token]);

  useEffect(() => {
    if (activeTab === 'cook' && token) {
      fetchMatchedRecipes();
    }
  }, [activeTab, matchFilterType, matchMealType, matchSortBy, token]);

  // Freshness calculation
  const getFreshnessStatus = (item) => {
    if (!item) return { label: 'Fresh', color: '#27ae60', status: 'fresh', daysLeft: 7 };
    const rawDate = item.updated_at ? new Date(item.updated_at).getTime() : Date.now();
    const updatedDate = isNaN(rawDate) ? Date.now() : rawDate;
    const expiryTime = updatedDate + (item.days_fresh || 7) * 24 * 60 * 60 * 1000;
    const timeLeftMs = expiryTime - Date.now();
    const daysLeft = Math.ceil(timeLeftMs / (24 * 60 * 60 * 1000));
    const warningDays = settings.expiryWarningDays || 3;

    if (isNaN(daysLeft) || daysLeft > warningDays) {
      return { label: 'Fresh', color: '#27ae60', status: 'fresh', daysLeft };
    }
    if (daysLeft <= 0) {
      return { label: 'Expired', color: '#e74c3c', status: 'expired', daysLeft };
    }
    return { label: `Expires in ${daysLeft}d`, color: '#f39c12', status: 'expiring', daysLeft };
  };

  const getFillPercentage = (item) => {
    if (!item || !item.quantity || isNaN(item.quantity)) return 0;
    let fill = 100;
    const u = (item.unit || '').toLowerCase();
    if (u === 'g' || u === 'ml') fill = Math.min(100, (item.quantity / 1000) * 100);
    else if (u === 'pcs' || u === 'slices' || u === 'eggs') fill = Math.min(100, (item.quantity / 12) * 100);
    else if (u === 'kg' || u === 'l') fill = Math.min(100, (item.quantity / 2) * 100);
    if (item.quantity > 0 && fill < 5) fill = 5;
    return isNaN(fill) ? 0 : fill;
  };

  // Safe item collection
  const safeItems = Array.isArray(pantryItems) ? pantryItems : [];
  const totalItems = safeItems.length;

  const expiringSoonItems = safeItems.filter(item => {
    const status = getFreshnessStatus(item);
    return status.status === 'expiring' || status.status === 'expired';
  });
  const expiringSoonCount = expiringSoonItems.length;

  const lowStockItems = safeItems.filter(item => getFillPercentage(item) <= 25 && (item.quantity || 0) > 0);
  const lowStockCount = lowStockItems.length;

  // Add Item Handler
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await api.post('/pantry', {
        ingredient_name: name.trim(),
        quantity: parseFloat(quantity) || 1,
        unit: unit.trim() || 'pcs',
        category: category || 'Produce',
        location: location || 'Fridge',
        days_fresh: parseInt(daysFresh, 10) || 7
      });
      toast.success(`Added "${name}" to pantry ✓`);
      setName('');
      setQuantity(1);
      setUnit('pcs');
      fetchPantry(false);
    } catch (err) {
      toast.error(err.message || 'Failed to add ingredient');
    }
  };

  // Quick Preset Add Handler
  const handlePresetClick = async (preset) => {
    try {
      await api.post('/pantry', {
        ingredient_name: preset.name,
        quantity: preset.amount,
        unit: preset.unit,
        category: preset.category,
        location: preset.location,
        days_fresh: preset.days_fresh
      });
      toast.success(`Logged ${preset.emoji} ${preset.name} (+${preset.amount} ${preset.unit})`);
      fetchPantry(false);
    } catch (err) {
      toast.error(err.message || 'Failed to add preset');
    }
  };

  // Apply Quick Restock Kit
  const handleApplyKit = async (kit) => {
    try {
      await api.post('/pantry/batch-add', { items: kit.items });
      toast.success(`Added ${kit.emoji} ${kit.title} (${kit.items.length} items) to your pantry!`);
      fetchPantry(false);
      setActiveTab('inventory');
    } catch (err) {
      toast.error(err.message || 'Failed to apply kit');
    }
  };

  // Adjust quantity
  const handleQuantityAdjust = async (item, amount) => {
    if (!item) return;
    const currentQty = item.quantity || 0;
    const rawNew = currentQty + amount;
    const newQty = Math.max(0, Math.round(rawNew * 100) / 100);
    if (newQty === 0) {
      handleDelete(item.id, item.ingredient_name);
      return;
    }
    setPantryItems(prev => (prev || []).map(p => p.id === item.id ? { ...p, quantity: newQty } : p));
    try {
      await api.put(`/pantry/${item.id}`, { quantity: newQty });
    } catch (err) {
      toast.error(err.message || 'Failed to update quantity');
      fetchPantry(false);
    }
  };

  // Delete Single Item
  const handleDelete = async (id, itemName) => {
    if (!id) return;
    setPantryItems(prev => (prev || []).filter(p => p.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      await api.delete(`/pantry/${id}`);
      toast.success(`Removed "${itemName || 'item'}"`);
    } catch (err) {
      toast.error(err.message || 'Failed to remove item');
      fetchPantry(false);
    }
  };

  // Edit Item Modal Open & Save
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setEditForm({
      ingredient_name: item.ingredient_name || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'pcs',
      category: item.category || 'Produce',
      location: item.location || 'Pantry',
      days_fresh: item.days_fresh || 7
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const updated = await api.put(`/pantry/${editingItem.id}`, editForm);
      setPantryItems(prev => (prev || []).map(p => p.id === editingItem.id ? updated : p));
      toast.success(`Updated "${editForm.ingredient_name}" ✓`);
      setEditingItem(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save updates');
    }
  };

  // Batch Selection Handlers
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (itemsToSelect) => {
    if (selectedIds.size === itemsToSelect.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(itemsToSelect.map(i => i.id)));
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      await api.post('/pantry/batch-delete', { item_ids: ids });
      toast.success(`Deleted ${ids.length} selected items ✓`);
      setPantryItems(prev => prev.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } catch (err) {
      toast.error(err.message || 'Failed to delete items');
    }
  };

  // Clear All Expired
  const handleClearExpired = async () => {
    try {
      const res = await api.post('/pantry/clear-expired');
      toast.success(res.message || 'Expired items cleaned up!');
      fetchPantry(false);
    } catch (err) {
      toast.error(err.message || 'Failed to clear expired items');
    }
  };

  // Magic Import Parser (Preview Mode & Direct Save)
  const handleMagicImportPreview = async () => {
    if (!magicImportText.trim()) return;
    setImporting(true);
    try {
      const data = await api.post('/pantry/magic-import?preview=true', {
        text: magicImportText,
        raw_text: magicImportText,
        preview_only: true
      });
      setMagicPreviewItems(data.items || []);
      toast.success(`Parsed ${data.items?.length || 0} items! Review below.`);
    } catch (err) {
      toast.error(err.message || 'Import parsing failed.');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmMagicImport = async () => {
    if (!magicPreviewItems || !magicPreviewItems.length) return;
    setImporting(true);
    try {
      await api.post('/pantry/batch-add', { items: magicPreviewItems });
      toast.success(`Added ${magicPreviewItems.length} items to your pantry ✓`);
      setMagicPreviewItems(null);
      setMagicImportText('');
      fetchPantry(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save parsed items');
    } finally {
      setImporting(false);
    }
  };

  const handleRemovePreviewItem = (index) => {
    setMagicPreviewItems(prev => prev.filter((_, i) => i !== index));
  };

  // AI Recipe Generator
  const handleGenerateAI = async () => {
    setGeneratingRecipe(true);
    setGeneratedRecipe(null);
    try {
      const data = await api.post('/pantry/generate-recipe');
      setGeneratedRecipe(data);
      toast.success('Crafted a custom recipe with your ingredients!');
    } catch (err) {
      toast.error(err.message || 'Recipe generation failed.');
    } finally {
      setGeneratingRecipe(false);
    }
  };

  // Deduct Recipe Ingredients
  const handleDeductRecipeIngredients = async (recipe) => {
    if (!recipe) return;
    const ingList = (recipe.ingredients || []).map(i => {
      if (typeof i === 'string') return { name: i, qty: 1, unit: '' };
      return { name: i.name || i.title || '', qty: i.amount || 1, unit: i.unit || '' };
    });

    try {
      const res = await api.post('/pantry/deduct-recipe', { ingredients: ingList });
      toast.success(res.message || 'Updated pantry stock!');
      fetchPantry(false);
      if (activeTab === 'cook') fetchMatchedRecipes();
    } catch (err) {
      toast.error(err.message || 'Failed to update pantry stock.');
    }
  };

  // Shopping List Export Content Generator
  const generateShoppingListText = () => {
    const lowStock = safeItems.filter(item => getFillPercentage(item) <= 25);
    const expired = safeItems.filter(item => getFreshnessStatus(item).status === 'expired');

    let text = `🛒 CHEF SMART SHOPPING LIST — ${new Date().toLocaleDateString()}\n\n`;
    if (lowStock.length > 0) {
      text += `📦 REPLENISH LOW STOCK:\n`;
      lowStock.forEach(i => {
        text += `• ${i.ingredient_name} (Current: ${i.quantity} ${i.unit})\n`;
      });
      text += `\n`;
    }
    if (expired.length > 0) {
      text += `⏰ REPLACE EXPIRED ITEMS:\n`;
      expired.forEach(i => {
        text += `• ${i.ingredient_name} (${i.location || 'Pantry'})\n`;
      });
      text += `\n`;
    }
    if (lowStock.length === 0 && expired.length === 0) {
      text += `✨ All pantry staples are currently well-stocked!\n`;
    }
    return text;
  };

  const handleCopyShoppingList = () => {
    const text = generateShoppingListText();
    navigator.clipboard.writeText(text);
    toast.success('Shopping list copied to clipboard! 📋');
    setExportModalOpen(false);
  };

  // Filtered and Sorted Pantry Items
  const filteredItems = useMemo(() => {
    return safeItems.filter(item => {
      if (!item || !item.ingredient_name) return false;
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesLocation = selectedLocation === 'All Locations' || (item.location || 'Pantry') === selectedLocation;
      const matchesSearch = item.ingredient_name.toLowerCase().includes((searchQuery || '').toLowerCase());

      const status = getFreshnessStatus(item);
      const isLowStock = getFillPercentage(item) <= 25 && (item.quantity || 0) > 0;

      let matchesFreshness = true;
      if (freshnessFilter === 'fresh') matchesFreshness = status.status === 'fresh';
      else if (freshnessFilter === 'expiring') matchesFreshness = status.status === 'expiring';
      else if (freshnessFilter === 'expired') matchesFreshness = status.status === 'expired';
      else if (freshnessFilter === 'low_stock') matchesFreshness = isLowStock;

      return matchesCategory && matchesLocation && matchesSearch && matchesFreshness;
    }).sort((a, b) => {
      if (sortOption === 'name-asc') return (a.ingredient_name || '').localeCompare(b.ingredient_name || '');
      if (sortOption === 'name-desc') return (b.ingredient_name || '').localeCompare(a.ingredient_name || '');
      if (sortOption === 'qty-asc') return (a.quantity || 0) - (b.quantity || 0);
      if (sortOption === 'qty-desc') return (b.quantity || 0) - (a.quantity || 0);
      if (sortOption === 'location') return (a.location || '').localeCompare(b.location || '');

      const getExpiryTime = (item) => {
        const d = item && item.updated_at ? new Date(item.updated_at).getTime() : Date.now();
        const validD = isNaN(d) ? Date.now() : d;
        return validD + (item.days_fresh || 7) * 24 * 60 * 60 * 1000;
      };
      if (sortOption === 'exp-soon') return getExpiryTime(a) - getExpiryTime(b);
      if (sortOption === 'exp-late') return getExpiryTime(b) - getExpiryTime(a);
      return 0;
    });
  }, [safeItems, selectedCategory, selectedLocation, freshnessFilter, searchQuery, sortOption]);

  return (
    <section className="page active pantry-page-wrapper">
      {/* ── Sleek Compact Header Bar ── */}
      <div className="pantry-compact-header fade-in-up" style={{ '--delay': '0ms' }}>
        <div className="pantry-title-group">
          <h1 className="pantry-main-title">
            <Package className="text-accent" size={26} /> Smart Pantry
          </h1>
          <p className="pantry-main-subtitle">
            Manage your kitchen ingredients, monitor freshness, and find recipes you can cook right now.
          </p>
        </div>

        {token && (
          <div className="pantry-header-actions">
            <button
              className="btn-secondary small"
              onClick={() => setExportModalOpen(true)}
              title="View & copy depleted items"
            >
              <ShoppingBag size={14} /> Shopping List
            </button>
            {expiringSoonCount > 0 && (
              <button
                className="btn-secondary small danger-accent"
                onClick={handleClearExpired}
                title="Remove expired items"
              >
                <Trash2 size={13} /> Clean Expired
              </button>
            )}
          </div>
        )}
      </div>

      {!token ? (
        <div className="empty-state fade-in-up" style={{ '--delay': '100ms', padding: '60px 20px', textAlign: 'center' }}>
          <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>Personal Kitchen Storage</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '460px', margin: '0 auto 20px' }}>
            Log in to manage shelf stocks, monitor freshness across Fridge and Pantry, and automatically match with 7,000+ recipes.
          </p>
          <button className="btn-primary" onClick={() => setAuthModalOpen(true)} style={{ padding: '10px 24px', fontSize: '0.95rem', borderRadius: '12px' }}>
            🔐 Log In / Sign Up
          </button>
        </div>
      ) : (
        <div className="pantry-main-container">
          
          {/* ── Primary Navigation Tabs (Prominently Placed at the Top) ── */}
          <div className="pantry-nav-tabstrip fade-in-up" style={{ '--delay': '40ms' }}>
            <button
              className={`pantry-nav-tab ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <Package size={16} />
              <span>My Inventory</span>
              <span className="pantry-tab-count">{totalItems}</span>
            </button>

            <button
              className={`pantry-nav-tab ${activeTab === 'cook' ? 'active' : ''}`}
              onClick={() => setActiveTab('cook')}
            >
              <UtensilsCrossed size={16} />
              <span>What Can I Cook?</span>
              <span className="pantry-tab-count highlight">Pantry Matcher</span>
            </button>

            <button
              className={`pantry-nav-tab ${activeTab === 'ai_chef' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai_chef')}
            >
              <Sparkles size={16} />
              <span>AI Chef Studio</span>
            </button>

            <button
              className={`pantry-nav-tab ${activeTab === 'kits' ? 'active' : ''}`}
              onClick={() => setActiveTab('kits')}
            >
              <Zap size={16} />
              <span>Quick Kits</span>
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              TAB 1: MY INVENTORY
             ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'inventory' && (
            <div className="pantry-tab-content fade-in-up" style={{ '--delay': '60ms' }}>
              
              {/* Compact Horizontal Quick Status Strip */}
              <div className="pantry-quick-stats-strip">
                <div 
                  className={`pantry-stat-pill ${selectedCategory === 'All' && freshnessFilter === 'all' ? 'active' : ''}`}
                  onClick={() => { setSelectedCategory('All'); setSelectedLocation('All Locations'); setFreshnessFilter('all'); setSearchQuery(''); }}
                  title="Show all items"
                >
                  <Package size={14} className="text-accent" />
                  <span><strong>{totalItems}</strong> In Stock</span>
                </div>

                <div 
                  className={`pantry-stat-pill ${freshnessFilter === 'expiring' ? 'active' : ''} ${expiringSoonCount > 0 ? 'warning' : ''}`}
                  onClick={() => setFreshnessFilter(freshnessFilter === 'expiring' ? 'all' : 'expiring')}
                  title="Filter expiring soon items"
                >
                  <Clock size={14} />
                  <span><strong>{expiringSoonCount}</strong> Expiring Soon</span>
                </div>

                <div 
                  className={`pantry-stat-pill ${freshnessFilter === 'low_stock' ? 'active' : ''}`}
                  onClick={() => setFreshnessFilter(freshnessFilter === 'low_stock' ? 'all' : 'low_stock')}
                  title="Filter low stock items"
                >
                  <AlertTriangle size={14} />
                  <span><strong>{lowStockCount}</strong> Low Stock</span>
                </div>

                <div 
                  className="pantry-stat-pill cookable-btn"
                  onClick={() => { setActiveTab('cook'); setMatchFilterType('cookable'); }}
                  title="Explore cookable recipes"
                >
                  <Flame size={14} />
                  <span>Explore Matched Recipes &rarr;</span>
                </div>
              </div>

              {/* Zero-Waste Action Alert Banner (Compact Inline) */}
              {expiringSoonCount > 0 && freshnessFilter !== 'expiring' && (
                <div className="pantry-compact-alert">
                  <div className="pantry-compact-alert-text">
                    <span>⏰</span>
                    <span><strong>{expiringSoonCount} item(s)</strong> expiring soon! Cook them first to reduce waste.</span>
                  </div>
                  <button
                    className="pantry-compact-alert-action"
                    onClick={() => { setActiveTab('cook'); setMatchFilterType('expiring'); }}
                  >
                    Find Recipes &rarr;
                  </button>
                </div>
              )}

              {/* Kitchen Two-Column Layout */}
              <div className="kitchen-layout" style={{ marginTop: '14px' }}>
                
                {/* Left Side: Add Ingredient & Smart Text Import */}
                <div className="kitchen-side-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Manual Add Card */}
                  <div className="card glass pantry-form-card">
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', fontSize: '1rem' }}>
                      <Plus size={16} /> Add Ingredient
                    </h3>
                    
                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="form-group">
                        <label className="pantry-field-label">Ingredient Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Eggs, Chicken, Spinach"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pantry-input"
                        />
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <label className="pantry-field-label">Quantity</label>
                          <input
                            type="number"
                            required
                            min="0.1"
                            step="any"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="pantry-input"
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="pantry-field-label">Unit</label>
                          <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="pantry-input"
                          >
                            {UNIT_OPTIONS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <label className="pantry-field-label">Category</label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="pantry-input"
                          >
                            {PANTRY_CATEGORIES.filter(c => c !== 'All').map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ flex: 1 }}>
                          <label className="pantry-field-label">Location</label>
                          <select
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="pantry-input"
                          >
                            {STORAGE_LOCATIONS.filter(l => l !== 'All Locations').map(l => (
                              <option key={l} value={l}>{getLocationEmoji(l)} {l}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="pantry-field-label">Days Fresh</label>
                        <input
                          type="number"
                          min="1"
                          max="730"
                          value={daysFresh}
                          onChange={(e) => setDaysFresh(e.target.value)}
                          className="pantry-input"
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: '10px', marginTop: '2px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
                      >
                        <Plus size={16} /> Add to Stock
                      </button>
                    </form>
                  </div>

                  {/* Smart Magic Import Card */}
                  <div className="card glass pantry-form-card">
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0', fontSize: '1rem' }}>
                      <Wand2 size={16} /> Smart Text Import
                    </h3>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                      Paste receipt or list text to extract and add items automatically.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <textarea
                        rows={2}
                        placeholder="e.g. 2 cartons milk, 12 eggs, 500g chicken..."
                        value={magicImportText}
                        onChange={(e) => setMagicImportText(e.target.value)}
                        className="pantry-textarea"
                      />
                      
                      <button
                        type="button"
                        onClick={handleMagicImportPreview}
                        disabled={importing || !magicImportText.trim()}
                        className="btn-secondary small"
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '12px'
                        }}
                      >
                        {importing ? <Sparkles size={14} className="animate-spin" /> : <Wand2 size={14} />}
                        {importing ? 'Parsing...' : 'Parse Text'}
                      </button>
                    </div>
                  </div>

                  {/* Quick Presets Grid */}
                  <div className="card glass" style={{ padding: '14px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ⚡ Instant Presets
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      {QUICK_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handlePresetClick(preset)}
                          className="pantry-preset-btn"
                          title={`Add ${preset.amount} ${preset.unit} of ${preset.name}`}
                        >
                          <span className="pantry-preset-emoji">{preset.emoji}</span> {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side: Inventory Grid / Table */}
                <div className="kitchen-main-col" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Search, Filter & View Controls */}
                  <div className="card glass pantry-filter-card">
                    
                    {/* Row 1: Search + View Modes + Multi-Select */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div className="pantry-search-wrap">
                        <span className="pantry-search-icon"><Search size={15} /></span>
                        <input
                          type="text"
                          placeholder="Search ingredients..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pantry-search-input"
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="pantry-search-clear"
                            title="Clear search"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* View Mode Toggle */}
                        <div className="pantry-view-toggle">
                          <button
                            type="button"
                            className={`pantry-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                          >
                            <LayoutGrid size={15} />
                          </button>
                          <button
                            type="button"
                            className={`pantry-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title="Table / List View"
                          >
                            <ListIcon size={15} />
                          </button>
                        </div>

                        {/* Select Mode Toggle */}
                        <button
                          type="button"
                          className={`btn-secondary small ${isSelectMode ? 'active' : ''}`}
                          onClick={() => {
                            setIsSelectMode(!isSelectMode);
                            if (isSelectMode) setSelectedIds(new Set());
                          }}
                          style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <CheckSquare size={13} /> {isSelectMode ? 'Cancel' : 'Select'}
                        </button>
                      </div>
                    </div>

                    {/* Batch Action Bar if items selected */}
                    {isSelectMode && selectedIds.size > 0 && (
                      <div className="pantry-batch-bar fade-in-up">
                        <span><strong>{selectedIds.size}</strong> item(s) selected</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn-danger small" 
                            onClick={handleBatchDelete}
                            style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={12} /> Delete Selected
                          </button>
                          <button
                            className="btn-secondary small"
                            onClick={() => handleSelectAll(filteredItems)}
                            style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                          >
                            {selectedIds.size === filteredItems.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Category Filter Pills */}
                    <div className="pantry-cat-selector">
                      {PANTRY_CATEGORIES.map(tab => (
                        <button
                          key={tab}
                          type="button"
                          className={`pantry-cat-pill ${selectedCategory === tab ? 'active' : ''}`}
                          onClick={() => setSelectedCategory(tab)}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Sub-Filters: Storage Location, Freshness Status, Sort */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border-glass)' }}>
                      
                      {/* Location Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Location:</span>
                        <select
                          value={selectedLocation}
                          onChange={(e) => setSelectedLocation(e.target.value)}
                          className="pantry-select-sm"
                        >
                          {STORAGE_LOCATIONS.map(l => (
                            <option key={l} value={l}>{l === 'All Locations' ? '🌐 All Locations' : `${getLocationEmoji(l)} ${l}`}</option>
                          ))}
                        </select>
                      </div>

                      {/* Freshness Status Filter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Status:</span>
                        <select
                          value={freshnessFilter}
                          onChange={(e) => setFreshnessFilter(e.target.value)}
                          className="pantry-select-sm"
                        >
                          <option value="all">All Freshness</option>
                          <option value="fresh">🌿 Fresh Only</option>
                          <option value="expiring">⏰ Expiring Soon</option>
                          <option value="expired">⚠️ Expired</option>
                          <option value="low_stock">📉 Low Stock (&le;25%)</option>
                        </select>
                      </div>

                      {/* Sort */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Sort:</span>
                        <select
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value)}
                          className="pantry-select-sm"
                        >
                          <option value="name-asc">Name (A-Z)</option>
                          <option value="name-desc">Name (Z-A)</option>
                          <option value="exp-soon">Expiring Soonest</option>
                          <option value="exp-late">Expiring Latest</option>
                          <option value="qty-desc">Quantity (High-Low)</option>
                          <option value="qty-asc">Quantity (Low-High)</option>
                          <option value="location">Storage Location</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Items List Content */}
                  {loading ? (
                    <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <Package className="animate-bounce" size={32} style={{ marginBottom: '10px', opacity: 0.7 }} />
                      <p>Loading your pantry inventory...</p>
                    </div>
                  ) : error ? (
                    <div className="card glass" style={{ color: 'var(--danger)', padding: '16px', textAlign: 'center' }}>
                      <AlertCircle size={22} style={{ marginBottom: '6px' }} />
                      <p>{error}</p>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="empty-state card glass" style={{ padding: '36px 20px', textAlign: 'center' }}>
                      <Package size={44} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
                      <h3 style={{ fontSize: '1.15rem', margin: '0 0 6px 0' }}>No ingredients found</h3>
                      <p style={{ color: 'var(--text-secondary)', margin: '0 0 14px 0', fontSize: '13px' }}>
                        {searchQuery || selectedCategory !== 'All' || freshnessFilter !== 'all'
                          ? 'Try clearing your search filters to view stocked items.'
                          : 'Add ingredients or pick a Quick Kit to build your pantry stock!'}
                      </p>
                      {(searchQuery || selectedCategory !== 'All' || freshnessFilter !== 'all') && (
                        <button
                          className="btn-secondary small"
                          onClick={() => { setSelectedCategory('All'); setSelectedLocation('All Locations'); setFreshnessFilter('all'); setSearchQuery(''); }}
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  ) : viewMode === 'grid' ? (
                    /* ── GRID CARDS VIEW ── */
                    <div className="pantry-grid-container">
                      {filteredItems.map((item, idx) => {
                        const freshness = getFreshnessStatus(item);
                        const fillPercentage = getFillPercentage(item);
                        const isLowStock = fillPercentage <= 25;
                        const accentClass = getCategoryAccentClass(item.category);
                        const emoji = getItemEmoji(item.ingredient_name, item.category);
                        const locEmoji = getLocationEmoji(item.location);
                        const step = getStepForUnit(item.unit);
                        const stockLevel = fillPercentage > 50 ? 'high' : fillPercentage > 25 ? 'medium' : 'low';
                        const isSelected = selectedIds.has(item.id);

                        return (
                          <div 
                            key={item.id} 
                            className={`card pantry-item-card fade-in-up ${isSelected ? 'selected' : ''}`}
                            style={{ animationDelay: `${Math.min(idx * 25, 300)}ms` }}
                          >
                            <div className={`pantry-card-accent ${accentClass}`} />

                            {/* Multi-Select Checkbox Overlay */}
                            {isSelectMode && (
                              <button
                                type="button"
                                className="pantry-select-checkbox"
                                onClick={() => handleToggleSelect(item.id)}
                              >
                                {isSelected ? <CheckSquare size={17} className="text-accent" /> : <Square size={17} style={{ color: 'var(--text-muted)' }} />}
                              </button>
                            )}

                            <div className="pantry-category-emoji">{emoji}</div>

                            <div className="pantry-card-body">
                              {/* Freshness & Location Badges */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                <div className={`pantry-freshness-badge ${freshness.status}`}>
                                  {freshness.status === 'fresh' && <Leaf size={10} />}
                                  {freshness.status === 'expiring' && <Clock size={10} />}
                                  {freshness.status === 'expired' && <AlertCircle size={10} />}
                                  {freshness.label}
                                </div>

                                <span className="pantry-location-pill" title={`Stored in ${item.location || 'Pantry'}`}>
                                  {locEmoji} {item.location || 'Pantry'}
                                </span>
                              </div>
                              
                              <h3 className="pantry-item-name" title={item.ingredient_name}>
                                {item.ingredient_name}
                              </h3>
                              
                              {/* Stock Gauge */}
                              <div className="pantry-stock-gauge">
                                <div className="pantry-stock-label" style={{ color: isLowStock ? '#e67e22' : 'var(--text-secondary)' }}>
                                  <span className="pantry-stock-qty">
                                    {isLowStock && <AlertTriangle size={11} />}
                                    {item.quantity} {item.unit}
                                  </span>
                                  <span>{Math.round(fillPercentage)}%</span>
                                </div>
                                <div className="pantry-stock-bar-bg">
                                  <div 
                                    className={`pantry-stock-bar-fill ${stockLevel}`}
                                    style={{ width: `${fillPercentage}%` }} 
                                  />
                                </div>
                              </div>

                              {/* Actions & Steppers */}
                              <div className="pantry-card-footer">
                                <div className="pantry-qty-stepper">
                                  <HoldablePantryQtyBtn 
                                    item={item} 
                                    step={step} 
                                    direction={-1} 
                                    onAdjust={handleQuantityAdjust} 
                                    title={`Decrease by ${step} ${item.unit}`} 
                                  />
                                  <div className="pantry-qty-divider" />
                                  <span className="pantry-qty-label">qty</span>
                                  <div className="pantry-qty-divider" />
                                  <HoldablePantryQtyBtn 
                                    item={item} 
                                    step={step} 
                                    direction={1} 
                                    onAdjust={handleQuantityAdjust} 
                                    title={`Increase by ${step} ${item.unit}`} 
                                  />
                                </div>

                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    onClick={() => handleOpenEditModal(item)}
                                    className="pantry-icon-btn"
                                    title="Edit details"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  
                                  <button 
                                    onClick={() => handleDelete(item.id, item.ingredient_name)}
                                    className="pantry-delete-btn"
                                    title="Remove item"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* ── COMPACT TABLE VIEW ── */
                    <div className="card glass pantry-table-wrapper">
                      <table className="pantry-table">
                        <thead>
                          <tr>
                            {isSelectMode && <th style={{ width: '36px' }}></th>}
                            <th>Ingredient</th>
                            <th>In Stock</th>
                            <th>Category</th>
                            <th>Location</th>
                            <th>Freshness</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredItems.map(item => {
                            const freshness = getFreshnessStatus(item);
                            const emoji = getItemEmoji(item.ingredient_name, item.category);
                            const locEmoji = getLocationEmoji(item.location);
                            const step = getStepForUnit(item.unit);
                            const isSelected = selectedIds.has(item.id);

                            return (
                              <tr key={item.id} className={isSelected ? 'selected-row' : ''}>
                                {isSelectMode && (
                                  <td>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSelect(item.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                      {isSelected ? <CheckSquare size={15} className="text-accent" /> : <Square size={15} style={{ color: 'var(--text-muted)' }} />}
                                    </button>
                                  </td>
                                )}
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '17px' }}>{emoji}</span>
                                    <strong>{item.ingredient_name}</strong>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <HoldablePantryQtyBtn item={item} step={step} direction={-1} onAdjust={handleQuantityAdjust} />
                                    <span style={{ fontWeight: 'bold', minWidth: '55px', textAlign: 'center' }}>
                                      {item.quantity} {item.unit}
                                    </span>
                                    <HoldablePantryQtyBtn item={item} step={step} direction={1} onAdjust={handleQuantityAdjust} />
                                  </div>
                                </td>
                                <td>
                                  <span className="pantry-cat-tag">{item.category}</span>
                                </td>
                                <td>
                                  <span className="pantry-location-pill">{locEmoji} {item.location || 'Pantry'}</span>
                                </td>
                                <td>
                                  <span className={`pantry-freshness-badge ${freshness.status}`} style={{ display: 'inline-flex' }}>
                                    {freshness.label}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                    <button
                                      onClick={() => handleOpenEditModal(item)}
                                      className="pantry-icon-btn"
                                      title="Edit"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(item.id, item.ingredient_name)}
                                      className="pantry-delete-btn"
                                      title="Delete"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB 2: WHAT CAN I COOK? (PANTRY RECIPE MATCHER)
             ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'cook' && (
            <div className="pantry-matcher-section fade-in-up" style={{ '--delay': '60ms' }}>
              
              {/* Top Filter Bar */}
              <div className="card glass pantry-filter-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ChefHat className="text-accent" size={18} /> Recipes Matched with Your Stock
                    </h2>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                      Recipes cross-referenced from catalog based on your ingredients.
                    </p>
                  </div>

                  {/* Search Recipe */}
                  <div className="pantry-search-wrap" style={{ minWidth: '220px' }}>
                    <span className="pantry-search-icon"><Search size={14} /></span>
                    <input
                      type="text"
                      placeholder="Search recipe or cuisine..."
                      value={matchSearch}
                      onChange={(e) => setMatchSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') fetchMatchedRecipes(); }}
                      className="pantry-search-input"
                    />
                    {matchSearch && (
                      <button 
                        onClick={() => setMatchSearch('')}
                        className="pantry-search-clear"
                        title="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter & Sort Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border-glass)' }}>
                  <div className="pantry-cat-selector">
                    <button
                      className={`pantry-cat-pill ${matchFilterType === 'all' ? 'active' : ''}`}
                      onClick={() => setMatchFilterType('all')}
                    >
                      All Matches ({matchStats.total_matched})
                    </button>
                    <button
                      className={`pantry-cat-pill ${matchFilterType === 'cookable' ? 'active' : ''}`}
                      onClick={() => setMatchFilterType('cookable')}
                    >
                      🔥 100% Cookable ({matchStats.cookable_now_count})
                    </button>
                    <button
                      className={`pantry-cat-pill ${matchFilterType === 'almost' ? 'active' : ''}`}
                      onClick={() => setMatchFilterType('almost')}
                    >
                      ⚡ Missing &le; 2 Items ({matchStats.almost_cookable_count || 0})
                    </button>
                    <button
                      className={`pantry-cat-pill ${matchFilterType === 'expiring' ? 'active' : ''}`}
                      onClick={() => setMatchFilterType('expiring')}
                    >
                      ⏰ Uses Expiring ({matchStats.expiring_soon_count})
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Sort Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Sort:</span>
                      <select
                        value={matchSortBy}
                        onChange={(e) => setMatchSortBy(e.target.value)}
                        className="pantry-select-sm"
                      >
                        <option value="match">Best Match %</option>
                        <option value="fastest">⏱️ Fastest (&lt; 30m)</option>
                        <option value="nutri">🥗 Highest Nutri-Score</option>
                      </select>
                    </div>

                    {/* Meal Type */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Meal:</span>
                      <select
                        value={matchMealType}
                        onChange={(e) => setMatchMealType(e.target.value)}
                        className="pantry-select-sm"
                      >
                        <option value="all">All Meals</option>
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="snack">Snack & Appetizer</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matched Recipes Results */}
              {loadingMatched ? (
                <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <ChefHat className="animate-spin" size={32} style={{ marginBottom: '10px' }} />
                  <p>Matching your pantry ingredients against 7,000+ recipes...</p>
                </div>
              ) : matchedRecipes.length === 0 ? (
                <div className="card glass empty-state" style={{ padding: '40px 20px', textAlign: 'center', marginTop: '15px' }}>
                  <UtensilsCrossed size={44} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
                  <h3 style={{ fontSize: '1.15rem' }}>No matching recipes found</h3>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 14px', fontSize: '13px' }}>
                    Add more ingredients to your pantry or try relaxing your filter criteria.
                  </p>
                  <button className="btn-secondary small" onClick={() => { setMatchFilterType('all'); setMatchMealType('all'); setMatchSearch(''); }}>
                    Show All Matches
                  </button>
                </div>
              ) : (
                <div className="pantry-recipes-grid">
                  {matchedRecipes.map((recipe) => {
                    const is100 = recipe.is_cookable_now;
                    const imgUrl = recipe.image_url || recipe.image;
                    const grade = recipe.nutri_score_grade || recipe.nutri_score?.grade || 'B';

                    return (
                      <div key={recipe.id} className="card glass pantry-recipe-card fade-in-up">
                        {imgUrl && (
                          <div className="pantry-recipe-img-wrap">
                            <img src={imgUrl} alt={recipe.title} className="pantry-recipe-img" />
                            <div className="pantry-recipe-match-chip" style={{ background: is100 ? '#27ae60' : recipe.match_pct >= 70 ? '#e67e22' : '#7f8c8d' }}>
                              {is100 ? '✓ 100% Ready' : `${recipe.match_pct}% Match`}
                            </div>
                            {recipe.uses_expiring && (
                              <div className="pantry-recipe-expiring-chip">
                                ⏰ Uses Expiring
                              </div>
                            )}
                          </div>
                        )}

                        <div className="pantry-recipe-body">
                          <h3 className="pantry-recipe-title" title={recipe.title}>{recipe.title}</h3>

                          <div className="pantry-recipe-meta">
                            <span>⏱️ {recipe.ready_in_minutes}m</span>
                            <span>🍽️ {recipe.servings} serv</span>
                            <span className="nutri-badge-sm">Nutri-Score {grade}</span>
                          </div>

                          {/* Ingredient Match Breakdown */}
                          <div className="pantry-recipe-ing-breakdown">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                              <span>In Stock: {recipe.matched_count} / {recipe.total_count}</span>
                              {recipe.missing_ingredients.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(`🛒 Missing for ${recipe.title}:\n• ` + recipe.missing_ingredients.join('\n• '));
                                    toast.success(`Copied ${recipe.missing_ingredients.length} missing items to clipboard! 📋`);
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}
                                  title="Copy missing ingredients to clipboard"
                                >
                                  <ShoppingBag size={11} /> Missing {recipe.missing_ingredients.length} (Copy)
                                </button>
                              )}
                            </div>

                            {/* Matched Ingredients Chips */}
                            <div className="pantry-ing-chips">
                              {recipe.matched_ingredients.slice(0, 3).map((ing, i) => (
                                <span key={i} className="pantry-chip matched">
                                  ✓ {ing.length > 18 ? `${ing.slice(0, 16)}...` : ing}
                                </span>
                              ))}
                              {recipe.missing_ingredients.slice(0, 2).map((ing, i) => (
                                <span key={i} className="pantry-chip missing">
                                  ✗ {ing.length > 18 ? `${ing.slice(0, 16)}...` : ing}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pantry-recipe-actions">
                            <button
                              className="btn-secondary small"
                              onClick={() => setSelectedRecipeForModal(recipe)}
                              style={{ flex: 1, padding: '7px', fontSize: '12px' }}
                            >
                              View Recipe
                            </button>
                            
                            <button
                              className="btn-primary small"
                              onClick={() => handleDeductRecipeIngredients(recipe)}
                              style={{ flex: 1, padding: '7px', fontSize: '12px', background: is100 ? '#27ae60' : undefined }}
                              title="Cook recipe and deduct ingredients from your pantry"
                            >
                              <Check size={13} /> Cook & Deduct
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB 3: SMART AI CHEF GENERATOR
             ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'ai_chef' && (
            <div className="card glass fade-in-up" style={{ '--delay': '60ms', padding: '24px', maxWidth: '780px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <Sparkles size={34} className="text-accent" style={{ marginBottom: '8px' }} />
                <h2 style={{ fontSize: '1.35rem', fontWeight: 'bold', margin: '0 0 6px 0' }}>Michelin AI Kitchen Assistant</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', maxWidth: '520px', margin: '0 auto' }}>
                  Generative culinary AI reviews your active kitchen inventory and crafts a balanced custom recipe.
                </p>
              </div>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '14px', marginBottom: '20px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  AVAILABLE UNEXPIRED STAPLES ({safeItems.filter(i => getFreshnessStatus(i).status !== 'expired').length}):
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {safeItems.filter(i => getFreshnessStatus(i).status !== 'expired').map(item => (
                    <span key={item.id} className="pantry-chip matched">
                      {getItemEmoji(item.ingredient_name, item.category)} {item.ingredient_name} ({item.quantity} {item.unit})
                    </span>
                  ))}
                  {safeItems.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>No items in stock. Add some ingredients first!</p>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  className="btn-primary"
                  onClick={handleGenerateAI}
                  disabled={generatingRecipe || safeItems.length === 0}
                  style={{
                    padding: '12px 28px',
                    fontSize: '0.95rem',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <ChefHat size={18} />
                  {generatingRecipe ? 'Chef AI is Creating Recipe...' : 'Generate Creative AI Recipe'}
                </button>
              </div>

              {generatedRecipe && (
                <div className="card glass fade-in-up" style={{ marginTop: '24px', padding: '20px', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: 'bold', textTransform: 'uppercase', color: '#27ae60', letterSpacing: '0.5px' }}>
                        ✨ AI CHEF CREATION
                      </span>
                      <h3 style={{ fontSize: '1.25rem', margin: '3px 0 4px 0' }}>{generatedRecipe.title}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>{generatedRecipe.description}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className="pantry-location-pill">⏱️ {generatedRecipe.prep_time || 20} mins</span>
                      {generatedRecipe.macros?.calories && (
                        <span className="pantry-location-pill">🔥 {generatedRecipe.macros.calories} kcal</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ fontSize: '13px', marginBottom: '6px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '3px' }}>
                        Ingredients
                      </h4>
                      <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                        {(generatedRecipe.ingredients || []).map((ing, i) => (
                          <li key={i}>{typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ''}`}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '13px', marginBottom: '6px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '3px' }}>
                        Instructions
                      </h4>
                      <ol style={{ paddingLeft: '16px', margin: 0, fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                        {(generatedRecipe.instructions || []).map((step, i) => (
                          <li key={i} style={{ marginBottom: '5px' }}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      className="btn-primary small"
                      onClick={() => handleDeductRecipeIngredients(generatedRecipe)}
                      style={{ padding: '8px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Check size={14} /> Cook & Deduct Stock
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB 4: QUICK RESTOCK KITS
             ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'kits' && (
            <div className="fade-in-up" style={{ '--delay': '60ms' }}>
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0' }}>Curated Kitchen Restock Kits</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Restock multiple kitchen staples in 1 click to jumpstart your cooking plans.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '14px' }}>
                {QUICK_KITS.map((kit) => (
                  <div key={kit.id} className="card glass pantry-kit-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '28px' }}>{kit.emoji}</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{kit.title}</h3>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{kit.items.length} staples included</span>
                      </div>
                    </div>

                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 12px 0', minHeight: '34px' }}>
                      {kit.subtitle}
                    </p>

                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '8px 10px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {kit.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                          <span>{getItemEmoji(it.ingredient_name, it.category)} {it.ingredient_name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>+{it.quantity} {it.unit}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      className="btn-primary small"
                      onClick={() => handleApplyKit(kit)}
                      style={{ width: '100%', padding: '9px', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Plus size={15} /> Add Bundle to Pantry
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODALS & DRAWERS
         ═══════════════════════════════════════════════════════════ */}

      {/* 1. Edit Item Modal */}
      {editingItem && (
        <div className="modal-backdrop fade-in" onClick={() => setEditingItem(null)}>
          <div className="card glass modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} /> Edit Pantry Item
              </h3>
              <button 
                onClick={() => setEditingItem(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label className="pantry-field-label">Ingredient Name</label>
                <input
                  type="text"
                  required
                  value={editForm.ingredient_name}
                  onChange={(e) => setEditForm({ ...editForm, ingredient_name: e.target.value })}
                  className="pantry-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label className="pantry-field-label">Quantity</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="pantry-input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="pantry-field-label">Unit</label>
                  <select
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="pantry-input"
                  >
                    {UNIT_OPTIONS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label className="pantry-field-label">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="pantry-input"
                  >
                    {PANTRY_CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label className="pantry-field-label">Location</label>
                  <select
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="pantry-input"
                  >
                    {STORAGE_LOCATIONS.filter(l => l !== 'All Locations').map(l => (
                      <option key={l} value={l}>{getLocationEmoji(l)} {l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="pantry-field-label">Shelf Life (Days Fresh)</label>
                <input
                  type="number"
                  min="1"
                  max="730"
                  value={editForm.days_fresh}
                  onChange={(e) => setEditForm({ ...editForm, days_fresh: parseInt(e.target.value, 10) || 7 })}
                  className="pantry-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary small" onClick={() => setEditingItem(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary small">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Magic Import Preview Modal */}
      {magicPreviewItems && (
        <div className="modal-backdrop fade-in" onClick={() => setMagicPreviewItems(null)}>
          <div className="card glass modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} /> Review Parsed Ingredients ({magicPreviewItems.length})
              </h3>
              <button 
                onClick={() => setMagicPreviewItems(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Verify parsed items before committing them to your pantry inventory:
            </p>

            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {magicPreviewItems.map((item, idx) => (
                <div key={idx} className="pantry-preview-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{getItemEmoji(item.ingredient_name, item.category)}</span>
                    <div>
                      <strong>{item.ingredient_name}</strong>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        ({item.quantity} {item.unit} • {item.location || 'Pantry'})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePreviewItem(idx)}
                    style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }}
                    title="Remove item"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn-secondary small" onClick={() => setMagicPreviewItems(null)}>
                Discard
              </button>
              <button type="button" className="btn-primary small" onClick={handleConfirmMagicImport} disabled={importing}>
                {importing ? 'Saving...' : 'Add All to Pantry ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Shopping List Export Modal */}
      {exportModalOpen && (
        <div className="modal-backdrop fade-in" onClick={() => setExportModalOpen(false)}>
          <div className="card glass modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={16} /> Smart Shopping List
              </h3>
              <button 
                onClick={() => setExportModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Replenishment list for depleted and expired items:
            </p>

            <pre style={{
              background: 'var(--bg-secondary)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              fontFamily: 'monospace',
              fontSize: '11.5px',
              whiteSpace: 'pre-wrap',
              maxHeight: '200px',
              overflowY: 'auto',
              color: 'var(--text-primary)',
              marginBottom: '14px'
            }}>
              {generateShoppingListText()}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn-secondary small" onClick={() => setExportModalOpen(false)}>
                Close
              </button>
              <button type="button" className="btn-primary small" onClick={handleCopyShoppingList} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Copy size={13} /> Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Full Recipe Detail Modal */}
      {selectedRecipeForModal && (
        <RecipeModal
          recipe={selectedRecipeForModal}
          onClose={() => setSelectedRecipeForModal(null)}
        />
      )}

      {/* 5. Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </section>
  );
}
