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

6. **Reload** the PythonAnywhere web app after changes.

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

- **Development**: `src/services/api.ts` uses local/dev URLs (e.g. `localhost`, device IP).
- **Production**: when `__DEV__` is false (release/standalone build), the app uses:
  `https://ludmilpaulo.pythonanywhere.com/api`

No extra config needed for production; the built app already points to the PythonAnywhere API.

---

## Checklist

- [ ] Backend: `DEBUG=False`, `SECRET_KEY` and `ALLOWED_HOSTS` set on PythonAnywhere.
- [ ] Backend: CORS includes `https://www.rubianejoaquim.com` and `https://rubianejoaquim.com`.
- [ ] Frontend: `NEXT_PUBLIC_API_URL=https://ludmilpaulo.pythonanywhere.com/api` in production (or default in code).
- [ ] Domain `www.rubianejoaquim.com` points to the frontend host.
- [ ] Mobile production builds use the API URL above (automatic in this repo).
