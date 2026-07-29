# 👨‍🍳 CHEF — Constraint-based Hybrid Eating Framework

> **Your ingredients. Our intelligence.**  
> An AI-powered nutritional assistant that transforms whatever is in your kitchen into healthy, personalized meals.  
> *Developed as a Capstone Project at **Indian Institute of Technology Patna (IIT Patna)**.*

---

[![Python](https://img.shields.io/badge/Python-3.14+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 🌟 Overview

**CHEF** is a full-stack web application that helps users find recipes based on the ingredients they already have at home. Users can type ingredients in plain text or upload a photo to detect them using a **YOLOv8** object detection model. The system then searches a local database of **7,100+ recipes** and filters results based on:
- 🥗 **Dietary Rules**: Vegetarian, Vegan, Keto, Gluten-Free, High-Protein
- 🎯 **Nutritional Targets**: Daily calorie & macro goals (calculated via TDEE)
- ⏱️ **Cooking Constraints**: Maximum available cooking & prep time
- ⚕️ **Health Profiles**: Customized filtering for Diabetes, Hypertension, PCOS, Thyroid, and Allergens

---

## 🔥 Key Features

- **📷 AI Food Detection**: Identify ingredients from images using integrated **YOLOv8** computer vision.
- **📝 Intelligent Text Parser**: Parses natural language quantities, fractions, ranges, and metric/imperial units.
- **📊 6-Tier Nutri-Score Engine**: Rates recipes from **S (Superior)** to **E (Very Poor)** using the 2023 FSA-NPS algorithm.
- **🗓️ Weekly Meal Planner & Shopping List**: Drag-and-drop meal planning with automated, aggregated grocery lists.
- **🥑 Smart Pantry & Expiry Tracking**: Keep track of ingredients at home, quantities, and freshness.
- **📉 TDEE & Weight Tracking**: Calculate daily expenditure with Mifflin-St Jeor and track weight trends over time.
- **🔄 Ingredient Substitutions**: Real-time ingredient swap recommendations.
- **📄 Export & Print**: Download meal plans and recipes clean for printing or offline PDF saving.

---

## 🚀 Quick Start

### 1. One-Click Launch (macOS / Linux)
```bash
./start.sh
```
Starts both the FastAPI backend (`http://localhost:8001`) and Vite React frontend (`http://localhost:5173`).

---

### 2. Manual Setup

#### Backend (FastAPI + Python)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001
```

#### Frontend (React + Vite)
```bash
cd frontend-react
npm install
npm run dev
```
Open **http://localhost:5173** in your browser.

---

### 3. Docker Setup

```bash
# Run with Docker Compose (PostgreSQL + FastAPI + React)
docker compose up -d
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 8, React Router 7, Axios, Lucide Icons, Glassmorphism UI Design
- **Backend**: Python 3.14, FastAPI, SQLAlchemy, Alembic, Pydantic v2
- **Database**: SQLite (Development) / PostgreSQL 16 (Production)
- **Machine Learning**: YOLOv8 Nano (Ultralytics) for real-time food detection
- **Authentication**: JWT (python-jose) + bcrypt password hashing

---

## 📂 Project Structure

```
CHEF/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── main.py           # Application Entrypoint & Middleware
│   │   ├── routers/          # API Route Controllers (17 routers)
│   │   ├── scoring/          # FSA-NPS 2023 Nutri-Score Engine
│   │   ├── models.py         # SQLAlchemy Database Models
│   │   └── schemas.py        # Pydantic Schemas
│   └── requirements.txt      # Python Dependencies
├── frontend-react/           # React SPA
│   ├── src/
│   │   ├── pages/            # 10 Application Pages
│   │   ├── components/       # UI Components & Modals
│   │   └── context/          # React Context (Auth, Theme, Settings)
│   └── package.json          # Node Dependencies
├── docs/                     # Detailed System Documentation
├── docker-compose.yml        # Docker Development Setup
└── start.sh                  # One-click startup script
```

---

## 📡 Core API Endpoints

| Method | Endpoint | Function | Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/recipes/search` | Constraint-based recipe search | ❌ |
| `POST` | `/api/detect/image` | YOLOv8 food detection from image | ❌ |
| `POST` | `/api/ingredients/parse` | Natural language ingredient parser | ❌ |
| `POST` | `/api/nutrition/analyze` | Per-100g nutritional lookup | ❌ |
| `POST` | `/api/tdee/calculate` | TDEE & macro target calculator | ❌ |
| `GET`  | `/api/mealplan` | Fetch weekly meal plan | ✅ |
| `GET`  | `/api/pantry` | List user pantry inventory | ✅ |
| `GET`  | `/api/tracker/daily` | Fetch daily calorie & macro log | ✅ |

---

## 👥 Authors & Capstone Team (IIT Patna)

- **Saba Saeed**
- **Aryan Sah**
- **Banshika Saha**
- **Hemnarayan Sahu**
- **Swastika Sahoo**

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
