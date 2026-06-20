#!/bin/bash
# Run this in a PythonAnywhere Bash console to deploy IAP fixes.
set -euo pipefail

REPO="${HOME}/rubianejoaquim.com"
cd "$REPO"
git pull origin main

cd backend
# Optional: set once in backend/.env (App Store Connect → App Information → App-Specific Shared Secret)
# APPLE_SHARED_SECRET=your-secret-here
# APPLE_BUNDLE_ID=com.rubianejoaquim.zenda

python3 scripts/check_iap_production.py && echo "IAP verify OK" || echo "WARNING: IAP verify still failing — check backend/.env and reload"

touch /var/www/*pythonanywhere_com_wsgi.py 2>/dev/null || true
echo "Done. Reload the web app from the PythonAnywhere Web tab if needed."
