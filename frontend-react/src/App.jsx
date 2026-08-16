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
import Community from './pages/Community';
import SubmitRecipe from './pages/SubmitRecipe';
import UserProfile from './pages/UserProfile';
import './index.css';

import TermsAndConditions from './pages/TermsAndConditions';
import HelpCenter from './pages/HelpCenter';
import Attributions from './pages/Attributions';
import Footer from './components/Footer';

import CookieConsentBanner from './components/CookieConsentBanner';
import FeedbackModal from './components/FeedbackModal';

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
        <Route path="/meal-planner" element={<MealPlanner />} />
        <Route path="/tracker" element={<NutritionTracker />} />
        <Route path="/pantry" element={<Pantry />} />
        <Route path="/community" element={<Community />} />
        <Route path="/community/submit-recipe" element={<SubmitRecipe />} />
        <Route path="/profile/:username" element={<UserProfile />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/attributions" element={<Attributions />} />
      </Routes>
    </div>
  );
}

function App() {
  const [isSidebarOpen, setSidebarOpen] = React.useState(window.innerWidth > 1100);
  const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false);

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
                  <Footer onOpenFeedback={() => setIsFeedbackOpen(true)} />
                </main>
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} onOpenFeedback={() => setIsFeedbackOpen(true)} />
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
              <button
                className="feedback-floating-btn"
                onClick={() => setIsFeedbackOpen(true)}
                title="Send Feedback or Report Inaccurate Data"
              >
                💬 Feedback
              </button>
              <CookieConsentBanner onOpenSettings={() => {}} />
              <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
            </BrowserRouter>
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
