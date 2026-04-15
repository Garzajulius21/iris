#!/bin/bash
# IRIS launcher — starts backend and frontend

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "══════════════════════════════════════════"
echo "  IRIS — Incident Response Intelligence"
echo "══════════════════════════════════════════"
echo ""

# ── Backend ────────────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
  echo "→ Creating Python virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate

echo "→ Installing backend dependencies..."
pip install -q -r requirements.txt

# Copy .env if missing
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  echo ""
  echo "⚠  Created .env from example."
  echo "   Open backend/.env and set your ANTHROPIC_API_KEY, then re-run."
  echo ""
fi

# Warn if key not set
if grep -q "your-key-here" .env 2>/dev/null; then
  echo ""
  echo "⚠  ANTHROPIC_API_KEY is not set in backend/.env"
  echo "   Edit backend/.env and replace 'your-key-here' with your real key."
  echo ""
fi

echo "→ Starting backend on http://localhost:3002 ..."
python server.py &
BACKEND_PID=$!

# ── Frontend ───────────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  echo "→ Installing frontend dependencies..."
  npm install
fi

echo "→ Starting frontend on http://localhost:5175 ..."
npm run dev &
FRONTEND_PID=$!

# ── Open browser ──────────────────────────────────────────────────────────────
sleep 3
open http://localhost:5175

echo ""
echo "IRIS is running."
echo "  Frontend:  http://localhost:5175"
echo "  Backend:   http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Wait and clean up on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'IRIS stopped.'" EXIT INT TERM
wait
