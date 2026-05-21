# Production fixtures (JSON)

Load CMS and app content on PythonAnywhere after migrations:

```bash
cd backend
python manage.py migrate
python manage.py load_production_data   # portfolio app management command
```

Or load individually:

```bash
python manage.py loaddata portfolio_cms      # website CMS (60 records)
python manage.py loaddata courses_content    # 2 courses, 6 lessons
python manage.py loaddata exchange_rates       # FX rates for converter
```

## Regenerate from dev seeds

After editing seed commands, rebuild JSON:

```bash
python manage.py generate_portfolio_fixtures
python manage.py generate_courses_fixtures
python manage.py generate_exchange_rates_fixtures
```

Commit the updated `*/fixtures/*.json` files, deploy, then run `load_production_data` on production.

## Existing database

`loaddata` upserts by primary key. If rows already exist with the same PK, Django updates them. For a clean slate, use a fresh DB or remove conflicting rows in Django admin before loading.
