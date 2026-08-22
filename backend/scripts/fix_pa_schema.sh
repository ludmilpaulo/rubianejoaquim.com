#!/bin/bash
# Run in a PythonAnywhere Bash console. Never flush or drop tables.
# Fixes: OperationalError no such column: finance_budget.last_budget_alert_level
set -euo pipefail

if [ -f "${HOME}/myenv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "${HOME}/myenv/bin/activate"
elif [ -f "${HOME}/rubianejoaquim.com/backend/venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "${HOME}/rubianejoaquim.com/backend/venv/bin/activate"
fi

REPO="${HOME}/rubianejoaquim.com"
if [ -d "${REPO}/backend" ] && [ -f "${REPO}/backend/manage.py" ]; then
  cd "${REPO}/backend"
elif [ -f "${REPO}/manage.py" ]; then
  cd "${REPO}"
else
  echo "Could not find manage.py under ${REPO}" >&2
  exit 1
fi

echo "Working directory: $(pwd)"
echo "Python: $(command -v python)"
python manage.py showmigrations finance
python manage.py migrate --noinput
python manage.py showmigrations finance
touch /var/www/ludmilpaulo_pythonanywhere_com_wsgi.py 2>/dev/null \
  || touch /var/www/*pythonanywhere_com_wsgi.py 2>/dev/null \
  || true
echo "Done. Confirm Web tab Reload if the dashboard still 500s."
