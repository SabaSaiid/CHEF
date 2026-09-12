# CHEF Frontend — React 19 + Vite 8

The single-page client application for the **CHEF (Constraint-based Hybrid Eating Framework)** platform. Built with React 19, Vite 8, and a custom glassmorphism design system.

---

## 🛠️ Tech Stack

- **React 19**: Modern component architecture with JSX and hooks.
- **Vite 8**: Ultra-fast build tool and local development server with Hot Module Replacement (HMR).
- **React Router 7**: Declarative client-side routing with smooth page transition animations.
- **Axios**: HTTP client configured with JWT interceptors for automated Bearer token attachment.
- **Lucide React**: Crisp, modern icon suite.
- **Custom Glassmorphism CSS Design System**: Responsive CSS variables, HSL color tokens, dark/light themes, and micro-animations.

---

## 🚀 Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The Vite dev server runs at **http://localhost:5173** and proxies all `/api/*` network requests to **http://127.0.0.1:8001** (the FastAPI backend), configured in `vite.config.js`.

---

## 📦 Production Build

```bash
# Compile and bundle assets for production
npm run build
```

The compiled distribution bundle is output to `dist/`. In production, these static assets are served directly by Nginx (in Docker) or mounted by the FastAPI backend.

---

## 🧭 Application Routes

The application features **16 client routes** managed by `src/App.jsx`:

| Route | Component | Description |
| :--- | :--- | :--- |
| `/` | `Home` | Kitchen Cockpit, persistent Recipe of the Day, and Daily Targets telemetry. |
| `/ingredients` | `Ingredients` | Natural language ingredient quantity parser and 50+ substitution lookup. |
| `/recipes` | `Recipes` | Constraint-based search with time, calorie, diet, and allergen filters. |
| `/nutrition` | `Nutrition` | Nutritional lookup across 350+ foods with on-demand Nutri-Score calculator. |
| `/detection` | `Detection` | YOLOv8 + Food-101 multi-tier food detection, bounding boxes, and calorie estimation. |
| `/tdee` | `TDEEProfile` | Mifflin-St Jeor TDEE calculator, weight log analytics, and adaptive expenditure. |
| `/saved` | `SavedRecipes` | Bookmarked favorite recipes with star ratings, notes, and search filter. |
| `/planner` | `MealPlanner` | Weekly drag-and-drop meal planner, automated shopping list, and live macro sync. |
| `/tracker` | `NutritionTracker` | Daily food intake log, water/hydration tracker, day-copy, and AI coach tips. |
| `/pantry` | `Pantry` | Smart pantry, "What Can I Cook" engine, Gemini receipt scanner & Surprise Me recipe synthesis. |
| `/community` | `Community` | Social activity feed, community posts, shared meal plans, and diet challenges. |
| `/community/submit-recipe` | `SubmitRecipe` | Community recipe authoring tool with custom ingredient & step builders. |
| `/profile/:username` | `UserProfile` | Public profile view, user stats, bookmarks, and shared creations. |
| `/terms` | `TermsAndConditions` | Comprehensive Terms of Service, Privacy Policy, Medical & AI Image Policy. |
| `/help` | `HelpCenter` | User manual, interactive FAQ accordion, and kitchen tips. |
| `/attributions` | `Attributions` | Source attributions for USDA FoodData Central, ICMR-NIN, and open datasets. |

---

## 🧩 State Management & Context Providers

Global application state is managed cleanly using React Context providers wrapped at the root in `App.jsx`:

- **`AuthProvider`** (`src/context/AuthContext.jsx`): Manages user sessions, JWT token persistence in `localStorage`, login/logout flows, and current user profile metadata.
- **`ThemeProvider`** (`src/context/ThemeContext.jsx`): Manages light/dark mode toggling, accent color selection, and CSS root attribute switching.
- **`ToastContext`** (`src/context/ToastContext.jsx`): Provides a non-intrusive notification dispatch system for success, error, warning, and info toasts.
- **`SettingsContext`** (`src/context/SettingsContext.jsx`): Persists client-side user preferences (measurement units, default diet tags, allergen exclusions, animation toggles).

---

## 🎨 Key UI Components

- **CHEF Hub Sidebar** (`src/components/Sidebar.jsx`): Responsive drawer featuring quick navigation, tools launcher grid, profile shortcut, and system status indicators.
- **DailyTargetsWidget** (`src/components/DailyTargetsWidget.jsx`): Live macro progress bar with remaining calories, macro splits, and a quick-log intake modal.
- **Notification Center** (`src/components/NotificationCenter.jsx`): Flyout notification panel with category filtering (All, Alerts, Meal Plan, Social), read/unread state tracking, relative timestamps, and persistent history.
- **CookieConsentBanner** (`src/components/CookieConsentBanner.jsx`): GDPR/privacy-friendly cookie preference manager.
- **FeedbackModal** (`src/components/FeedbackModal.jsx`): Floating user feedback submission modal.
- **SettingsModal** (`src/components/SettingsModal.jsx`): Command center for configuring accents, measurement units, allergen filters, and factory resets.
