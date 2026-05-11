#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/backend"
.venv/bin/python3 -m uvicorn app.main:app --reload --port 8001 &
BACKEND_PID=$!
sleep 5

cd "$SCRIPT_DIR/frontend-react"
npx vite --port 5173 &
FRONTEND_PID=$!
sleep 3

echo "CHEF is running!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

wait
