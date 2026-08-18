# Wallet Provider Decision — Angola

**Status:** Research complete — **no live integration until legal/commercial sign-off.**

## Regulatory context (BNA)

| Resource | URL |
|----------|-----|
| BNA home | https://www.bna.ao/ |
| Payment / fintech themes | https://www.bna.ao/Conteudos/Temas/lista_temas.aspx?idc=16624 |
| Legislation | https://www.bna.ao/pt/legislacao |
| Customer portal | https://servicosclientebancario.bna.ao/ |
| Fraud alerts | https://www.bna.ao/alertas-fraudes |
| Unlicensed operators (2025) | https://angop.ao/en/noticias/economia/bna-divulga-entidades-sem-habilitacao-para-exercicio-de-actividade-financeira/ |

### Applicable law (verify with counsel)

- **Lei n.º 40/20** — Payment System of Angola (LSPA)
- **Lei n.º 14/21** — General Regime of Financial Institutions
- **Aviso n.º 07/2017** — Payment services licensing
- **Aviso n.º 07/2018** — Non-banking financial institution authorization
- **Aviso n.º 1/26 (Jan 2026)** — Non-bank acquirer rules: https://lex.ao/docs/banco-nacional-de-angola/2026/aviso-n-o-1-26-de-28-de-janeiro/

**Key point:** E-money wallets and payment services require **BNA authorization**. Do not enable real-money flows without a licensed partner or own licence.

---

## Option A — EMIS / Multicaixa GPO (domestic Angola)

| | |
|---|---|
| Operator | EMIS — https://emis.ao/solucoes/ |
| Product | Gateway de Pagamentos Online (GPO) — https://multicaixa.ao/pt/oferta/canais/comerciantes/gateway-de-pagamentos-online/ |
| Onboarding | Via **commercial bank** (not direct self-serve API signup) |
| Integration | API (certified) or iFrame (simpler) |
| Use cases | Collect payments (MCX Express, QR), domestic card rails |
| Contact | https://multicaixa.ao/contactos/ |

**Pros:** Official domestic rails; MCX Express / QR; regulatory alignment when onboarded through bank.

**Cons:** Bank-led onboarding; API certification + security inspection; not a turnkey remittance API for diaspora corridors.

**Recommendation:** Primary path for **AOA collections** and domestic bill pay once Zenda has a merchant relationship with a supporting bank.

---

## Option B — Flutterwave for Business (cross-border)

| | |
|---|---|
| Docs | https://developer.flutterwave.com/docs |
| Features | Collections, transfers, FX, idempotency keys, webhooks |
| Angola | Claims presence — **must verify BNA licence alignment with compliance team** |
| Sandbox | Available via developer portal |

**Pros:** Mature REST API; multi-country; transfers + FX; documented idempotency.

**Cons:** Regulatory status in Angola must be confirmed; not a substitute for domestic MCX rails for all use cases.

**Recommendation:** Evaluate for **ZAR↔AOA / diaspora remittance** corridors after legal review. Use official partnership only.

---

## Option C — Bank PSP / sub-acquirer

Partner with a **BNA-licensed bank or PSP** as sub-acquirer under Aviso 1/26. Banks in Angola (BFA, BAI, Standard Bank, etc.) offer GPO onboarding.

**Pros:** Strongest regulatory cover for Zenda as technology layer.

**Cons:** Longest commercial timeline.

---

## Options NOT to pursue

| Provider | Reason |
|----------|--------|
| Mukuru / Mama Money / AfriMoney consumer apps | **UX reference only** — no scraping, reverse engineering, or unofficial APIs |
| Unlicensed FX/crypto operators (BNA list) | Illegal — see BNA alerts |

---

## Comparison matrix

| Criterion | EMIS/GPO | Flutterwave | Bank PSP |
|-----------|----------|-------------|----------|
| Domestic AOA | Strong | Partial | Strong |
| Cross-border | Limited | Strong | Via bank |
| API maturity | Certified API | High | Varies |
| KYC burden | Bank + EMIS | Provider KYC | Bank-led |
| Time to sandbox | Weeks–months | Days (sandbox) | Months |
| BNA alignment | High (when licensed) | Verify | Highest |

---

## Recommended phased approach

1. **Now:** Build ledger + `MockProvider` sandbox (`WALLET_LIVE_ENABLED=false`).
2. **Parallel:** Begin bank conversations for GPO merchant onboarding.
3. **Parallel:** Flutterwave partnership / compliance review for remittance corridors.
4. **Gate:** Legal sign-off + signed contract before any production credentials.
5. **Go-live checklist:** KYC/AML, velocity limits, webhook verification, idempotency tests, audit logs.

---

## Do not go live until

- [ ] BNA-applicable licence path documented and approved by counsel
- [ ] Signed provider contract
- [ ] KYC/AML architecture implemented and tested
- [ ] Sandbox test matrix passed (success, fail, timeout, duplicate, reversal)
- [ ] `WALLET_LIVE_ENABLED=true` explicitly set in production env after above
