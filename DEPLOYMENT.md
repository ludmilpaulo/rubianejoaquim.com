# Production Deployment

## URLs

| Service | URL |
|--------|-----|
| **Backend (API)** | https://ludmilpaulo.pythonanywhere.com/ |
| **Frontend (site)** | https://www.rubianejoaquim.com/ |
| **API base (used by frontend & mobile)** | https://ludmilpaulo.pythonanywhere.com/api |

---

## Backend (PythonAnywhere)

1. **Web app** on PythonAnywhere:
   - Set **Source code** to your repo (or upload);
   - **WSGI file**: e.g. `/home/YourUsername/repo/backend/config/wsgi.py`;
   - **Working directory**: `/home/YourUsername/repo/backend`.

2. **Virtualenv**: create one in the backend folder and install:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Environment**: in the PythonAnywhere web app config, or in a `.env` under `backend/`:
   - Copy from `backend/.env.example` and set at least:
     - `DEBUG=False`
     - `SECRET_KEY=<strong-secret-key>`
     - `ALLOWED_HOSTS=ludmilpaulo.pythonanywhere.com`
     - `CORS_ALLOWED_ORIGINS=https://www.rubianejoaquim.com,https://rubianejoaquim.com`
     - `FRONTEND_URL=https://www.rubianejoaquim.com`

4. **Static files** (if you serve them via Django):
   ```bash
   python manage.py collectstatic --noinput
   ```
   Point the static URL in the web app to your `staticfiles` directory.

5. **Migrations**:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser  # if needed
   ```

6. **CMS & course content** (JSON fixtures):
   ```bash
   python manage.py load_production_data
   ```
   Or: `loaddata portfolio_cms`, `loaddata courses_content`, `loaddata exchange_rates`.  
   See `backend/fixtures/README.md`.

7. **Reload** the PythonAnywhere web app after changes.

8. **Apple In-App Purchases (required for App Store review)** — in `backend/.env`:
   ```env
   APPLE_BUNDLE_ID=com.rubianejoaquim.zenda
   APPLE_SHARED_SECRET=<from App Store Connect → App Information → App-Specific Shared Secret>
   ```
   Deploy IAP backend changes:
   ```bash
   cd ~/rubianejoaquim.com && git pull origin main
   python3 backend/scripts/check_iap_production.py
   ```
   The script must print `OK status=200`. StoreKit 2 (sandbox) works without the shared secret once the latest `iap_views.py` is deployed; legacy receipts still need `APPLE_SHARED_SECRET`.

---

## Frontend (www.rubianejoaquim.com)

Typical hosts: **Vercel**, **Netlify**, or your own server.

### Vercel / Netlify

1. Connect the repo and set **Root Directory** to `frontend`.
2. **Build**: `npm run build` (or `npm ci && npm run build`).
3. **Environment variables**:
   - `NEXT_PUBLIC_API_URL=https://ludmilpaulo.pythonanywhere.com/api`
   - (Or rely on the default in code when `NODE_ENV=production`.)

If you use a custom domain (e.g. `www.rubianejoaquim.com`), add it in the hosting dashboard.

### Build locally

```bash
cd frontend
npm ci
NEXT_PUBLIC_API_URL=https://ludmilpaulo.pythonanywhere.com/api npm run build
npm run start
```

---

## Mobile app (Expo)

- **Production API** (default): `https://ludmilpaulo.pythonanywhere.com/api`  
  Used on physical devices, preview/production EAS builds, and when `EXPO_PUBLIC_API_URL` is unset.
- **Local backend**: set in `mobile/.env`:
  ```env
  EXPO_PUBLIC_USE_DEV_API=true
  EXPO_PUBLIC_DEV_API_HOST=192.168.1.100
  ```
  Emulator uses `10.0.2.2:8000` (Android) or `127.0.0.1:8000` automatically when `EXPO_PUBLIC_USE_DEV_API=true`.

EAS `production` and `preview` profiles set `EXPO_PUBLIC_API_URL` in `mobile/eas.json`.

---

## Portfolio CMS content (production)

After migrations, load the default site content (homepage sections, services, portfolio samples, Zenda copy, navigation, FAQs, SEO):

```bash
cd backend   # or your PythonAnywhere project path
python manage.py migrate
python manage.py loaddata portfolio_cms
```

Fixture file: `backend/portfolio/fixtures/portfolio_cms.json` (60 records, PT/EN/FR/ES translations).

To regenerate the fixture after editing `seed_portfolio_data`:

```bash
python manage.py generate_portfolio_fixtures
```

**Note:** `loaddata` expects primary keys that do not conflict with existing rows. On a **fresh** database (or empty portfolio tables), it is safe. If you already have portfolio data, use `seed_portfolio_data` instead (upserts) or clear portfolio tables before loading.

---

## Checklist

- [ ] Backend: `DEBUG=False`, `SECRET_KEY` and `ALLOWED_HOSTS` set on PythonAnywhere.
- [ ] Backend: `python manage.py loaddata portfolio_cms` on first deploy (or `seed_portfolio_data`).
- [ ] Backend: CORS includes `https://www.rubianejoaquim.com` and `https://rubianejoaquim.com`.
- [ ] Frontend: `NEXT_PUBLIC_API_URL=https://ludmilpaulo.pythonanywhere.com/api` in production (or default in code).
- [ ] Domain `www.rubianejoaquim.com` points to the frontend host.
- [ ] Mobile production builds use the API URL above (automatic in this repo).
