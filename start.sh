#!/bin/bash
# ─────────────────────────────────────────────
#  CHEF — One-Click Start Script
#  Usage: ./start.sh
# ─────────────────────────────────────────────

echo ""
echo "  👨‍🍳  Starting CHEF Application..."
echo "  ─────────────────────────────────"
echo ""

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Start Backend ──────────────────────────
echo "  🔧 Starting backend server..."
source "$SCRIPT_DIR/backend/.venv/bin/activate"
cd "$SCRIPT_DIR/backend"
python3 -m uvicorn app.main:app --reload --port 8001 &
BACKEND_PID=$!

# Wait a moment for the backend to boot
sleep 2

# ── Start Frontend ─────────────────────────
echo "  ⚛️  Starting frontend dev server..."
cd "$SCRIPT_DIR/frontend-react"
npm run dev &
FRONTEND_PID=$!

# Wait a moment for Vite to boot
sleep 3

echo ""
echo "  ─────────────────────────────────"
echo "  ✅ CHEF is running!"
echo ""
echo "  🌐 Open in browser:  http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop everything."
echo "  ─────────────────────────────────"
echo ""

# Trap Ctrl+C to kill both processes
cleanup() {
    echo ""
    echo "  🛑 Shutting down CHEF..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "  👋 Goodbye!"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script alive until Ctrl+C
wait
