#!/bin/bash
# Run in a PythonAnywhere Bash console. Never flush or drop tables.
set -euo pipefail

REPO="${HOME}/rubianejoaquim.com"
cd "$REPO"
git fetch --all --prune
git pull --rebase origin main

cd backend
if [ -d venv ]; then
  # shellcheck disable=SC1091
  source venv/bin/activate
fi
pip install -r requirements.txt
python manage.py check
python manage.py makemigrations --check
python manage.py migrate
python manage.py collectstatic --noinput

if [ -f .env ]; then
  python3 - <<'PY'
from pathlib import Path
env_path = Path(".env")
lines = env_path.read_text().splitlines()
wanted = {
    "APP_LATEST_VERSION_IOS": "1.0.9",
    "APP_LATEST_VERSION_ANDROID": "1.0.9",
}
seen = set()
out = []
for line in lines:
    stripped = line.strip()
    key = None
    if stripped and not stripped.startswith("#") and "=" in stripped:
        key = stripped.split("=", 1)[0]
    if key in wanted:
        out.append(f"{key}={wanted[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, value in wanted.items():
    if key not in seen:
        out.append(f"{key}={value}")
env_path.write_text("\n".join(out) + "\n")
print("Updated APP_LATEST_VERSION_* to 1.0.9 (minimum unchanged)")
PY
fi

touch /var/www/*pythonanywhere_com_wsgi.py 2>/dev/null || true
echo "Done. Confirm Web tab reload if WSGI touch did not apply."
