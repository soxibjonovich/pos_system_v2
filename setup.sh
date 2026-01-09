#!/bin/bash
set -e

echo "=============================="
echo "Setting up project"
echo "=============================="

# ---------- Backend ----------
echo ""
echo "🔧 Setting up backend..."

cd backend || exit 1

# Create venv if missing
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  uv venv
fi

# Activate venv
source .venv/bin/activate

# Install dependencies
if [ -f "pyproject.toml" ]; then
  echo "Installing Python dependencies from pyproject.toml..."
  uv pip install -r pyproject.toml
elif [ -f "requirements.txt" ]; then
  echo "Installing Python dependencies from requirements.txt..."
  uv pip install -r requirements.txt
else
  echo "❌ No pyproject.toml or requirements.txt found"
  exit 1
fi

deactivate
cd ..

# ---------- Frontend ----------
echo ""
echo "🔧 Setting up frontend..."

cd frontend || exit 1

if [ -f "package.json" ]; then
  npm install
else
  echo "❌ package.json not found"
  exit 1
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo "Run ./run.sh to start the project"
