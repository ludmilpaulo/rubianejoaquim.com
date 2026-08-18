# Zenda Production QA Checklist

## Receipt scanner

- [ ] Camera permission prompt (iOS + Android)
- [ ] Take photo → OCR → review screen
- [ ] Low-confidence amount shows confirmation dialog
- [ ] User can edit merchant, amount, currency
- [ ] Category + budget assignment
- [ ] Expense saved with FX snapshot
- [ ] Receipt linked to expense
- [ ] Budget alerts at 70/80/90/100%
- [ ] Transaction history filters work
- [ ] Receipt file access requires auth/signed token

## AI Copilot

- [ ] Financial health screen shows real income/expenses
- [ ] Pattern insights from actual data
- [ ] Goal coach returns required monthly saving
- [ ] AI cannot execute wallet transfers
- [ ] Disclaimer shown on health/advice views

## Wallet (sandbox)

- [ ] `WALLET_LIVE_ENABLED=false` in production
- [ ] Mock deposit creates ledger entry
- [ ] Idempotency key prevents duplicate transfer
- [ ] Insufficient balance fails on withdrawal
- [ ] Webhook rejected when live disabled

## Builds

```bash
cd frontend && npm run typecheck && npm run build
cd backend && python manage.py test && python manage.py check
cd mobile && npm run typecheck
```

## Security

- [ ] No payment secrets in mobile bundle or git
- [ ] Receipt images not publicly served
- [ ] FX endpoints rate-limited
- [ ] All wallet endpoints require authentication
- [ ] KYC gate before live wallet (when enabled)
