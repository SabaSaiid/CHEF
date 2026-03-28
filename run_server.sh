#!/bin/bash
# CHEF Quick Start Script
# Author: Capstone Project 1 Team

echo "========================================="
echo " Starting CHEF Application Stack "
echo "========================================="

# Check for virtual environment
if [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/Scripts/activate
else
    echo "Warning: .venv not found. Proceeding with global python..."
fi

# Navigate to backend and start server
echo "Starting FastAPI backend server on port 8000..."
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Note: The frontend is served statically alongside the backend.
# Open http://127.0.0.1:8000 in your browser.
