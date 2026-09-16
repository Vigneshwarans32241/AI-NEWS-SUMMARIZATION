#!/usr/bin/env bash
# exit on error
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

# If Node.js is available in build environment, compile frontend
if command -v npm >/dev/null 2>&1; then
  echo "Building React frontend with npm..."
  cd frontend
  npm install
  npm run build
  cd ..
else
  echo "npm not found. Serving pre-compiled frontend/dist."
fi
