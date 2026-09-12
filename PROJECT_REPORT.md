# Capstone Project Report: CHEF
*Your ingredients. Our intelligence.*

**Indian Institute of Technology Patna, UG Program in CS & Data Analytics**

---

## Abstract
**CHEF (Constraint-based Hybrid Eating Framework)** is a full-stack nutritional platform developed as a Capstone Project at IIT Patna to solve the daily "what to eat" dilemma. Rather than requiring users to search by dish name, the platform takes whatever ingredients users have at home—inputted via natural language text, scanned receipts, or photographed with computer vision—and pairs them with constraint-based optimization to recommend nutritionally balanced meals from a repository of **7,100+ recipes** (featuring 5,250 curated local recipes enriched with USDA and ICMR-NIN nutritional values).

To make ingredient entry effortless, the project implements a hybrid intake architecture: a regex-driven natural language parser, multimodal receipt parsing via **Google Gemini 1.5 Flash**, and a multi-tier **YOLOv8** computer vision model supporting 101 dish categories (Food-101) with geometric portion size and caloric estimation. Recipes are evaluated via a 6-tier Nutri-Score engine (extended with an S-Tier) and filtered against personalized macro targets calculated through Mifflin-St Jeor TDEE with adaptive telemetry. The complete system integrates a high-performance **FastAPI** backend (20 router modules), a modern **React 19 + Vite 8** frontend with glassmorphism design (16 application pages), and dual-backend **SQLite/PostgreSQL** support.

---

## 1. Introduction
In the contemporary digital era, the global nutritional landscape is shifting toward a crisis of convenience. Despite India's rich culinary heritage, the nation currently faces major public health challenges, including rising rates of obesity, type-2 diabetes, hypertension, cardiovascular disorders, and micronutrient malnutrition. This decline is largely driven by an increasing reliance on ultra-processed convenience foods, refined carbohydrates, and sugary beverages, which contribute to lifestyle-related chronic diseases among young adults and working professionals. While healthcare delivery continues to advance, **preventive health through informed, accessible dietary choices remains the primary lever for reversing these trends.**

**CHEF (Constraint-based Hybrid Eating Framework)** was created at IIT Patna to bridge the gap between ingredient availability and rigorous nutritional compliance. The framework empowers users to navigate decision fatigue and adhere to strict dietary constraints (such as vegetarian, vegan, keto, gluten-free, or high-protein) without abandoning culturally resonant meals or spending excessive time on meal preparation.

Unlike conventional recipe apps that rely on rigid title-based searches or external rate-limited APIs, CHEF operates with an offline-first, high-speed architecture. Combining computer vision, generative AI for grocery receipts, clinical condition rule-sets (Diabetes, Hypertension, PCOS, Thyroid, Kidney Disease), real-time hydration tracking, and a 6-tier Nutri-Score rating algorithm, CHEF transforms the kitchen into a personalized preventive health command center.

---

## 2. Methodology & System Architecture

- **FastAPI Backend (Python 3.14+)**: Modular asynchronous API architecture featuring 20 dedicated route modules covering authentication, recipe indexing, smart pantry matching, computer vision, nutritional rating, social community feeds, and file exports.
- **Dual Database Persistence**: Local zero-configuration SQLite for rapid development, fully swappable to PostgreSQL 16 via SQLAlchemy 2.0 ORM and Alembic migrations for scalable multi-container production deployments.
- **Client Application (React 19 & Vite 8)**: Single Page Application (SPA) designed with a bespoke glassmorphism aesthetic, responsive sidebar navigation (CHEF Hub), live macro progress synchronization widgets, and 16 client routes.
- **Multi-Tier Computer Vision (YOLOv8 + Food-101)**: Real-time image inference using YOLOv8 Nano trained on the ETH Food-101 dataset (101 culinary classes), featuring bounding-box geometric portion estimation and automatic caloric calculations, backed by a stock COCO (10 classes) fallback.
- **Multimodal AI Integration (Google Gemini 1.5 Flash)**: Optical and natural language parsing of grocery receipts and handwritten lists, alongside creative zero-waste recipe synthesis using exact pantry stock.
- **Nutri-Score Rating Engine (FSA-NPS 2023 Revision)**: 6-tier nutritional quality algorithm ($S, A, B, C, D, E$) with category routing (`general`, `beverage`, `fats_oils`, `cheese`) and an S-Tier threshold rewarding high positive nutrient density with near-zero negative penalties.
- **Clinical Health Engine**: Algorithmic dietary adaptations adjusting sodium, glycemic index, fiber, and macronutrient distributions for diagnosed health conditions (Diabetes, Hypertension, PCOS, Thyroid, Renal, GERD).
- **Adaptive TDEE Telemetry**: Integrates Mifflin-St Jeor basal metabolic rate calculations with historical weight logs to dynamically recalibrate daily caloric targets based on real-world weight velocity.

---

## 3. Results & Performance Milestones

- **Query Latency**: Inverted index lookups across 7,100+ recipes execute in $<40\text{ms}$ on local SQLite.
- **Nutritional Enrichment**: Successfully calculated and verified Nutri-Scores across all 5,250 curated recipes with balanced distribution ($S: 8.1\%, A: 27.0\%, B: 18.3\%, C: 29.4\%, D: 15.9\%, E: 1.3\%$).
- **Indian Culinary Validation**: Audited a 25-dish benchmark suite of authentic South Asian preparations confirming that legume fiber and vegetable percentages offset moderate oil/ghee usage without systematic scoring bias.
- **Client Build & Bundle Optimization**: Production frontend compiles into an optimized bundle via Vite 8 in $\sim320\text{ms}$ with full responsive support across desktop and mobile viewports.
- **Security & Reliability**: Implemented OWASP A07 brute-force mitigation using SlowAPI rate limiting, GZip payload compression for transfers $>1\text{KB}$, and cryptographically generated random fallback keys for JWT sessions.

---

## 4. Contribution Summary

- **Saba Saeed**: Lead project architecture, system design, UI/UX glassmorphism framework, documentation lifecycle, constraint engine optimization, and database schema design.
- **Aryan Sah**: Multi-media recipe enrichment (instructional video integration), image pipeline curation, FastAPI parameter validation, backend routing testing, and branch/release management.
- **Banshika Saha**: Constraint-based recipe search engine, Spoonacular API integration with 70/30 world-to-Indian ratio, dietary filtering logic, Vite dev proxy, and recipe dataset population.
- **Hemnarayan Sahu**: JWT authentication infrastructure (bcrypt + python-jose), frontend state management, CSS component engineering, accessibility standards, and UI design constraints.
- **Swastika Sahoo**: TDEE engine and adaptive telemetry, clinical nutrition logic, SQLite/PostgreSQL schema modeling, and Computer Vision Food Detection pipeline (YOLOv8 + Food-101).

---

## 5. Future Scope & Roadmap

While the CHEF platform has fulfilled all Capstone objectives and delivered a feature-complete v2.1.0 release, future development horizons include:

1. **Direct OCR Clinical Prescription Scanning**: Expanding the Gemini integration to ingest handwritten medical prescriptions, extracting clinical diagnoses and lab biomarkers (e.g., HbA1c, lipid panels, creatinine) to auto-tune nutritional constraints.
2. **Wearable IoT Telemetry Synchronization**: Integrating with health APIs (Apple HealthKit, Google Health Connect) to synchronize real-time active caloric expenditure and sleep metrics directly into adaptive TDEE calculations.
3. **Smart Kitchen & Barcode Integration**: Direct integration with barcode scanning APIs (Open Food Facts) and smart refrigerator inventory systems for automated pantry level tracking and replenishment.
4. **On-Device Edge ML Quantization**: Quantizing the Food-101 YOLOv8 model to ONNX / CoreML formats to enable client-side, zero-latency inference directly within the browser or mobile device without uploading images.

---

## 6. Conclusion
The CHEF project successfully demonstrates how constraint-based algorithms, modern web development, and applied artificial intelligence can be harmonized to address critical public health challenges. The resulting v2.1.0 platform delivers an accessible, production-ready nutritional companion that bridges the gap between medical guidance, dietary science, and daily kitchen reality.
