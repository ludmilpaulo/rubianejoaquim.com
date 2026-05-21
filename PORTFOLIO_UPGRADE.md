# Portfolio Platform Upgrade

Rubiane Joaquim site upgraded to a **multilingual creative portfolio + Zenda product platform**, built on the existing Next.js, Django, and Expo stack.

## Languages

- Portuguese (default fallback), English, French, Spanish
- Web: `middleware.ts` sets `NEXT_LOCALE` cookie from `Accept-Language` on first visit; `LanguageSwitcher` in navbar and footer
- Mobile: `Intl` device locale + override in Settings → Idioma

## Backend (`portfolio` Django app)

API base: `/api/portfolio/`

| Endpoint | Description |
|----------|-------------|
| `GET /home/?lang=pt` | Aggregated homepage payload |
| `GET /projects/` | Portfolio projects (filter: `category`, `featured`) |
| `GET /services/` | Services |
| `GET /showreel/` | Showreel videos |
| `GET /case-studies/` | Case studies |
| `GET /zenda/` | Zenda product content |
| `GET /settings/` | Contact & social settings |
| `POST /contact/` | Contact form submissions |
| `/admin/*` | Staff CRUD (Token auth, `is_staff`) |

### Admin (Django)

`/admin/portfolio/` — manage projects, services, testimonials, showreel, case studies, Zenda content, homepage sections, contact messages.

### Seed data

```bash
cd backend
python manage.py seed_portfolio_data
```

## Frontend

- Cinematic dark UI (Playfair Display + DM Sans)
- Homepage sections: Hero, About, Services, Portfolio, Showreel, Zenda, Case studies, Testimonials, CTA, Education banner, Contact
- `/portfolio` — full portfolio with category filters
- `/contact` — contact page
- `/admin/portfolio` — CMS overview + contact messages

## Mobile

- `src/i18n/` + `I18nContext` — tab labels and language picker in Settings
- Extend `locales/*.ts` for more screens over time

## Deploy checklist

1. Run migrations on production: `python manage.py migrate`
2. Seed or enter content in Django admin
3. Set `NEXT_PUBLIC_API_URL` to production API
4. Upload portfolio images, Zenda screenshots, OG image in Site Settings
