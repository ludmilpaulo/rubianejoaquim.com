from django.core.management.base import BaseCommand

from config.i18n_coverage import compute_coverage


class Command(BaseCommand):
    help = 'Fail if any supported locale is missing frontend translation keys'

    def handle(self, *args, **options):
        report = compute_coverage()
        if not report.get('available'):
            self.stdout.write(self.style.WARNING(report.get('note', 'Coverage unavailable')))
            return
        missing = report.get('missing') or {}
        failed = False
        for locale, keys in missing.items():
            unique = [k for k in keys if k]
            pct = report['coverage'].get(locale)
            self.stdout.write(f'{locale}: {pct}% ({len(unique)} missing)')
            if unique:
                failed = True
                for key in unique[:20]:
                    self.stdout.write(f'  - {key}')
        if failed:
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS('All locales have full coverage'))
