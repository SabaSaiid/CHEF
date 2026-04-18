import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Ingredients from './pages/Ingredients';
import Recipes from './pages/Recipes';
import Nutrition from './pages/Nutrition';
import Detection from './pages/Detection';
import TDEEProfile from './pages/TDEEProfile';
import SavedRecipes from './pages/SavedRecipes';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <main id="app-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/ingredients" element={<Ingredients />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/nutrition" element={<Nutrition />} />
              <Route path="/detection" element={<Detection />} />
              <Route path="/tdee" element={<TDEEProfile />} />
              <Route path="/saved" element={<SavedRecipes />} />
            </Routes>
          </main>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
