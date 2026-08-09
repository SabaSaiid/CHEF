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
cd backend
if [ -n "$VIRTUAL_ENV" ]; then
    pip install -r requirements.txt
else
    pip install -r requirements.txt || pip install -r requirements.txt --break-system-packages || true
fi
cd ..

echo "Build complete!"
