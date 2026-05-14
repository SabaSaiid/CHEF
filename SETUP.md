# CHEF Setup & Installation Guide

This document covers the in-depth setup process for development and production environments.

## 1. Prerequisites
- **Python 3.14+**: Required for the latest Asyncio performance improvements.
- **Git**: For cloning the repository.
- **Node.js**: Required for running the React frontend development server and bundling the application.

## 2. Environment Variables Configuration
To use real Spoonacular APIs instead of the dummy dataset, you must configure your `.env` file in the `backend/` directory.

Create `backend/.env` with the following:
```env
SPOONACULAR_API_KEY="your_api_key_here"
JWT_SECRET_KEY="your_secret_key_here"
DEBUG=false
DATABASE_URL="sqlite:///./chef_prod.db"
```

## 3. Running the Application

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend-react
npm install
npm run dev
```

## 4. Database Migration 
CHEF uses SQLAlchemy schema migrations on-startup (via FastAPI `lifespan` events). 
To manually trigger or wipe the database during development:
```bash
rm backend/chef.db
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

## 5. Docker Deployment (Planned)
A `Dockerfile` and `docker-compose.yml` are planned for future CI/CD pipelines to allow immediate 1-click deployment to AWS/Heroku.
