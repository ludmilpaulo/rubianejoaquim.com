# Google Play Subscriptions Policy - Compliance Fixes

## Issues Addressed

### 1. Currency Differences with Prominent Display Price
**Violation:** Currency displayed inconsistently across screens (offers page vs payment cart).

**Fixes Applied:**
- Standardized all currency to **AOA** (ISO 4217 code for Angolan Kwanza)
- Updated `formatCurrency()` and `formatCurrencyAOA()` to use "AOA"
- Updated backend `payment_info` to return `currency: 'AOA'`
- Replaced all "Kz", "KZ" references with "AOA" across:
  - AccessDeniedScreen (subscription offer)
  - ProfileScreen (payment details)
  - PersonalFinanceScreen (labels)
  - TirarDinheiroOrcamentoScreen
  - RegisterScreen
  - HelpSupportScreen
  - TargetsScreen
  - MarketScreen
  - OrcamentoPrincipiosScreen

### 2. Terms of Trial Offer or Introductory Pricing Unclear
**Violation:** Trial terms must clearly explain when the offer ends, the price after the offer, and how to cancel.

**Fixes Applied:**
- Added explicit **"Termos da oferta de teste"** (Terms of trial offer) section on AccessDeniedScreen
- Clear terms now include:
  - **When the offer ends:** "O período de teste dura 7 dias e termina 7 dias após a ativação."
  - **Price after trial:** "Após o período de teste, a subscrição custa 10.000 AOA/mês."
  - **How to cancel:** "Pode cancelar a qualquer momento durante o teste: simplesmente não efetue o pagamento. Não será cobrado automaticamente."
  - **How to subscribe after trial:** "Para subscrever após o teste, efetue o pagamento e envie o comprovativo na app."

## Files Modified

### Mobile
- `src/screens/AccessDeniedScreen.tsx` - Terms block, currency AOA
- `src/screens/ProfileScreen.tsx` - Currency AOA
- `src/screens/PersonalFinanceScreen.tsx` - Labels AOA
- `src/screens/TirarDinheiroOrcamentoScreen.tsx` - Label AOA
- `src/screens/RegisterScreen.tsx` - Currency AOA
- `src/screens/HelpSupportScreen.tsx` - Currency AOA
- `src/screens/TargetsScreen.tsx` - Example AOA
- `src/screens/MarketScreen.tsx` - Currency AOA
- `src/screens/OrcamentoPrincipiosScreen.tsx` - Currency AOA
- `src/utils/currency.ts` - CURRENCY_LABEL and formatCurrency to AOA

### Backend
- `subscriptions/views.py` - payment_info returns `currency: 'AOA'`

## Next Steps

1. **Build and submit** a new version to Google Play:
   ```bash
   cd mobile
   npm run build:production
   npm run submit:android
   ```

2. **In Google Play Console**, ensure your subscription product (if using Play Billing) also displays AOA consistently. This fix addresses the in-app experience; if you use Google Play In-App Billing, verify product listings match.

3. **Resubmit for review** - The policy status should update after the new version is submitted.

## Reference

- [Google Play Subscriptions Policy](https://support.google.com/googleplay/android-developer/answer/10173017)
- ISO 4217: AOA = Angolan Kwanza
