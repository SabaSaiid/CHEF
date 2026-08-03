import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, 
  Database, 
  Cpu, 
  Code, 
  ExternalLink, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles,
  Heart
} from 'lucide-react';

const ATTRIBUTION_DATA = [
  {
    category: 'data',
    categoryName: 'Nutritional Datasets & APIs',
    items: [
      {
        name: 'USDA FoodData Central',
        provider: 'U.S. Department of Agriculture',
        license: 'Public Domain / U.S. Government Work',
        description: 'Standard reference database providing accurate macronutrient, micronutrient, and caloric values for food ingredients.',
        url: 'https://fdc.nal.usda.gov/'
      },
      {
        name: 'Open Food Facts',
        provider: 'Open Food Facts Contributors',
        license: 'Open Database License (ODbL 1.0)',
        description: 'Global open food database providing barcode data, ingredient listings, and packaging metadata.',
        url: 'https://world.openfoodfacts.org/'
      },
      {
        name: 'Spoonacular Food API',
        provider: 'Spoonacular LLC',
        license: 'Commercial & Open Benchmarks',
        description: 'Nutritional benchmarks and recipe parsing dictionaries for culinary measurement conversions.',
        url: 'https://spoonacular.com/food-api'
      }
    ]
  },
  {
    category: 'ai',
    categoryName: 'AI & Machine Learning Models',
    items: [
      {
        name: 'Google MediaPipe Vision',
        provider: 'Google LLC / DeepMind',
        license: 'Apache License 2.0',
        description: 'On-device computer vision and object detection framework powering CHEF ingredient photo recognition.',
        url: 'https://ai.google.dev/edge/mediapipe/technologies/vision'
      },
      {
        name: 'TensorFlow.js COCO-SSD',
        provider: 'TensorFlow.js Open Source Team',
        license: 'Apache License 2.0',
        description: 'Pre-trained object detection model for food bounding box identification and visual location estimation.',
        url: 'https://github.com/tensorflow/tfjs-models'
      }
    ]
  },
  {
    category: 'libraries',
    categoryName: 'Software Libraries & Frameworks',
    items: [
      {
        name: 'React & React DOM',
        provider: 'Meta Platforms, Inc. & Community',
        license: 'MIT License',
        description: 'JavaScript library for building user interfaces and component architecture.',
        url: 'https://react.dev/'
      },
      {
        name: 'Vite Build Engine',
        provider: 'Evan You & Vite Core Team',
        license: 'MIT License',
        description: 'Next-generation frontend tooling and fast module bundler.',
        url: 'https://vitejs.dev/'
      },
      {
        name: 'Lucide Icons',
        provider: 'Lucide Project Contributors',
        license: 'ISC License',
        description: 'Beautiful & consistent icon set designed for modern web applications.',
        url: 'https://lucide.dev/'
      },
      {
        name: 'DOMPurify',
        provider: 'Mario Heiderich (Cure53) & Community',
        license: 'Apache 2.0 / MPL 2.0',
        description: 'DOM-only, super-fast XSS sanitizer for safe HTML rendering.',
        url: 'https://github.com/cure53/DOMPurify'
      },
      {
        name: 'Inter & Playfair Display Fonts',
        provider: 'Rasmus Andersson & Claus Eggers Sørensen',
        license: 'SIL Open Font License 1.1',
        description: 'Typography fonts providing modern readability and elegant culinary headings.',
        url: 'https://fonts.google.com/'
      }
    ]
  }
];

export default function Attributions() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredData = ATTRIBUTION_DATA.filter(cat => 
    activeCategory === 'all' || cat.category === activeCategory
  );

  return (
    <div className="attributions-page-wrapper">
      {/* Top Banner */}
      <div className="attributions-header-banner">
        <div className="attributions-header-content">
          <button className="terms-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
            <span>Back to CHEF</span>
          </button>

          <div className="attributions-title-group">
            <h1 className="attributions-main-title">Open Source Credits & Attributions</h1>
            <p className="attributions-subtitle">
              CHEF is built on the shoulders of giants. We gratefully credit the open datasets, computer vision models, and open-source software libraries that power our platform.
            </p>
          </div>

          <div className="attributions-stats-row">
            <div className="stat-badge">
              <Database size={15} /> 3 Nutritional Datasets
            </div>
            <div className="stat-badge">
              <Cpu size={15} /> 2 AI Vision Models
            </div>
            <div className="stat-badge">
              <Code size={15} /> 5 Open Source Libraries
            </div>
          </div>
        </div>
      </div>

      <div className="attributions-main-container">
        {/* Filter Pills */}
        <div className="help-category-pills">
          <button 
            className={`help-pill ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            🌟 All Credits
          </button>
          <button 
            className={`help-pill ${activeCategory === 'data' ? 'active' : ''}`}
            onClick={() => setActiveCategory('data')}
          >
            📊 Data Sources
          </button>
          <button 
            className={`help-pill ${activeCategory === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveCategory('ai')}
          >
            🤖 AI & ML Models
          </button>
          <button 
            className={`help-pill ${activeCategory === 'libraries' ? 'active' : ''}`}
            onClick={() => setActiveCategory('libraries')}
          >
            💻 Open Source Libraries
          </button>
        </div>

        {/* Categories List */}
        <div className="attributions-list-section">
          {filteredData.map(cat => (
            <div key={cat.category} className="attributions-group">
              <h3 className="attributions-group-title">
                {cat.category === 'data' && <Database size={20} className="cat-icon" />}
                {cat.category === 'ai' && <Cpu size={20} className="cat-icon" />}
                {cat.category === 'libraries' && <Code size={20} className="cat-icon" />}
                <span>{cat.categoryName}</span>
              </h3>

              <div className="attributions-grid">
                {cat.items.map((item, idx) => (
                  <div key={idx} className="attribution-card">
                    <div className="card-top">
                      <h4 className="item-name">{item.name}</h4>
                      <span className="license-tag">{item.license}</span>
                    </div>

                    <p className="item-provider">Provided by <strong>{item.provider}</strong></p>
                    <p className="item-desc">{item.description}</p>

                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="attribution-link"
                    >
                      <span>Visit Resource Homepage</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Open Source Notice */}
        <div className="open-source-notice-card">
          <Heart size={20} className="notice-icon" />
          <p>
            CHEF is committed to supporting open science, open data, and open-source software development for health and nutrition research.
          </p>
        </div>
      </div>
    </div>
  );
}
