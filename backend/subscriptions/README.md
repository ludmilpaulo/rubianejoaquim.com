# Mobile App Subscription (Zenda)

Subscrição do app móvel Zenda: 1 semana grátis, depois subscrição mensal. O admin ativa/desativa ao aprovar comprovativos de pagamento. Notificação 3 dias antes do fim do período.

## Modelos

- **MobileAppSubscription**: Um por utilizador. `status`: trial | active | expired | cancelled. `trial_ends_at` (fim da semana grátis), `subscription_ends_at` (fim do período pago).
- **MobileAppSubscriptionPaymentProof**: Comprovativos de pagamento mensal. Admin aprova → subscrição ativada/renovada 30 dias.

## API (autenticada)

- `GET /api/subscriptions/mobile/` – lista a subscrição do user (um ou zero).
- `GET /api/subscriptions/mobile/me/` – estado atual: `has_access`, `subscription`.
- `POST /api/subscriptions/mobile/subscribe/` – inscrever (1 semana grátis). Cria ou reativa trial.
- `POST /api/subscriptions/mobile/{id}/upload-proof/` – upload de comprovativo (multipart: `file`, opcional `notes`).

## Acesso ao app

O app móvel considera que o utilizador tem acesso se:
- tem pelo menos um enrollment ativo (curso), ou
- tem mentoria aprovada/agendada/concluída, ou
- **tem subscrição do app com `has_access`** (em trial dentro do prazo ou subscrição ativa dentro do prazo).

## Admin

- **Subscrições App Móvel**: listar, filtrar, desativar, estender 30 dias.
- **Comprovativos Subscrição App**: listar, aprovar (ativa/renova 30 dias), rejeitar.

Ao aprovar um comprovativo, a subscrição fica `active` e `subscription_ends_at` é definido/estendido em 30 dias.

## Notificação 3 dias antes do fim

Comando (executar diariamente, ex.: cron):

```bash
python manage.py send_subscription_expiry_reminders
```

Opção `--dry-run` para apenas listar quem seria notificado.

Envia email quando:
- trial termina em 3 dias, ou
- subscrição paga termina em 3 dias.

Cada subscrição só recebe um aviso por período (campo `expiry_reminder_sent_at`).
