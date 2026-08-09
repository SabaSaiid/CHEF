#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Building React Frontend..."
cd frontend-react
npm install
rm -rf dist
npm run build
cd ..

echo "Installing Backend Dependencies..."
python3 -m pip install --upgrade pip setuptools wheel 2>/dev/null || true
python3 -m pip install -r backend/requirements.txt || pip install -r backend/requirements.txt || true

echo "Build complete!"
