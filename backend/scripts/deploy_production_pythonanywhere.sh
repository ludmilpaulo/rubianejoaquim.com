#!/bin/bash
# Run in a PythonAnywhere Bash console (Web tab → Consoles → Bash).
# Safe for production: fetch, pull, migrate, collectstatic, reload WSGI.
set -euo pipefail

REPO="${HOME}/rubianejoaquim.com"
cd "$REPO"

echo "==> git fetch + pull"
git fetch --all --prune
git pull --rebase origin main

cd backend

if [ -d venv ]; then
  # shellcheck disable=SC1091
  source venv/bin/activate
elif [ -d "${HOME}/myenv" ]; then
  # shellcheck disable=SC1091
  source "${HOME}/myenv/bin/activate"
fi

echo "==> pip install"
pip install -r requirements.txt -q

echo "==> django checks + migrate"
python manage.py check
python manage.py makemigrations --check
python manage.py migrate
python manage.py collectstatic --noinput

echo "==> reload web app"
touch /var/www/ludmilpaulo_pythonanywhere_com_wsgi.py 2>/dev/null \
  || touch /var/www/*pythonanywhere_com_wsgi.py 2>/dev/null \
  || true

echo "DEPLOY_OK — reload Web tab if the site did not pick up changes."
