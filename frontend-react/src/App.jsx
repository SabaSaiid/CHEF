import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Ingredients from './pages/Ingredients';
import Recipes from './pages/Recipes';
import Nutrition from './pages/Nutrition';
import Detection from './pages/Detection';
import TDEEProfile from './pages/TDEEProfile';
import SavedRecipes from './pages/SavedRecipes';
import MealPlanner from './pages/MealPlanner';
import NutritionTracker from './pages/NutritionTracker';
import Pantry from './pages/Pantry';
import './index.css';

import TermsAndConditions from './pages/TermsAndConditions';
import Footer from './components/Footer';

import CookieConsentBanner from './components/CookieConsentBanner';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-transition-enter">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/ingredients" element={<Ingredients />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/detection" element={<Detection />} />
        <Route path="/tdee" element={<TDEEProfile />} />
        <Route path="/saved" element={<SavedRecipes />} />
        <Route path="/planner" element={<MealPlanner />} />
        <Route path="/tracker" element={<NutritionTracker />} />
        <Route path="/pantry" element={<Pantry />} />
        <Route path="/terms" element={<TermsAndConditions />} />
      </Routes>
    </div>
  );
}

function App() {
  const [isSidebarOpen, setSidebarOpen] = React.useState(window.innerWidth > 1100);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1100) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <BrowserRouter>
              <Navbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
              <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                <main id="app-main">
                  <AnimatedRoutes />
                  <Footer />
                </main>
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
              </div>
              {!isSidebarOpen && (
                <button 
                  className="sidebar-floating-toggle"
                  onClick={() => setSidebarOpen(true)}
                  title="Open Preferences & Profile Sidebar"
                  aria-label="Open Sidebar"
                >
                  📋
                </button>
              )}
              <CookieConsentBanner />
            </BrowserRouter>
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
