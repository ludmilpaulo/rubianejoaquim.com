# Apple App Store Guideline 3.1.1 – In-App Purchase Compliance

## What Apple Said (Summary)

- **Guideline 3.1.1 - Business - Payments - In-App Purchase**
- The app gives access to digital content (paid courses, mentorship, subscription) that is purchased **outside** the app. That content is **not** currently available to buy **inside** the app with In-App Purchase (IAP).
- **Requirement:** The same paid digital content, services, or subscriptions that the app can access must **also** be available for purchase **inside the app using in-app purchase**.

## What This Means

1. **Keep web purchases**  
   Users can continue to buy on the website (bank transfer + proof of payment). They can keep accessing that content in the app. No need to remove web purchases.

2. **Add in-app purchase**  
   The **same** content must also be purchasable **inside the app** via Apple IAP:
   - **Paid courses** → IAP product(s) for course access (e.g. one product per course or one “course unlock” product).
   - **Mentorship** → IAP product(s) for mentorship packages (e.g. one product per package).
   - **Zenda app subscription** → IAP subscription (e.g. monthly) for app access.

3. **Multiplatform (3.1.3(b))**  
   “Apps that offer paid digital services and content across multiple platforms may allow customers to access the content they acquired outside the app **as long as it is also available for purchase using in-app purchase**.”  
   So: **web + IAP** is compliant; **web only** is not.

4. **US storefront**  
   On the US storefront, apps may also link out to the browser for other payment methods (e.g. “Pay on web”). For other storefronts, IAP is required. Implementing IAP satisfies the guideline everywhere.

## Current State

| Content / product | Web (current) | In-app (current) | Needed |
|-------------------|---------------|-------------------|--------|
| Paid courses      | Buy → upload proof → admin approves → enrollment | Not available | Add IAP for same courses |
| Mentorship        | Request → upload proof → admin approves | Not available | Add IAP for same packages |
| App subscription  | Trial → bank transfer + proof → admin approves | Not available | Add IAP subscription |

## Implementation Plan

### 1. App Store Connect (Apple)

- Create **In-App Purchase** products and match them to your backend:
  - **Courses:** e.g. `course_1`, `course_2`, … (or one product per course).
  - **Mentorship:** e.g. `mentorship_1`, `mentorship_2`, … (one per package).
  - **App access:** e.g. `zenda_monthly` as an **auto-renewable subscription**.
- Set prices (e.g. in USD; Apple handles conversion).
- Use **Shared Secret** (App → App Store Connect → In-App Purchase → App-Specific Shared Secret) for server-side receipt validation.

### 2. Backend (Django)

- **Receipt verification**
  - New endpoint (e.g. `POST /api/subscriptions/iap/verify-apple/`) that:
    - Accepts `receipt_data` (base64) and `product_id` from the app.
    - Verifies the receipt with Apple (`verifyReceipt`), using the app’s **Bundle ID** and **Shared Secret**.
  - Environment variables: `APPLE_SHARED_SECRET`, `APPLE_BUNDLE_ID` (and optionally `APPLE_VERIFY_RECEIPT_URL` for sandbox/production).

- **Grant access by product_id**
  - `course_<id>` → create or set `Enrollment` for that course to `active` for the current user.
  - `mentorship_<id>` → create MentorshipRequest for that package and mark as approved (or your chosen “paid via IAP” flow).
  - `zenda_monthly` (or your subscription product id) → create/update `MobileAppSubscription`: set status `active` and set `subscription_ends_at` (e.g. now + 1 month for a monthly product; for auto-renewable, you may extend on each validated renewal).

- **Idempotency / security**
  - Validate receipt only server-side; do not trust the client for “already paid”.
  - Use `original_transaction_id` (or equivalent) to avoid granting the same purchase twice.
  - Optionally store `original_transaction_id` (and product_id, user, expiry) in a small “IAP purchase” table for audits and renewal handling.

### 3. Mobile App (Expo / React Native)

- **Use a dev / production build** (IAP does not work in Expo Go).
- **Libraries (choose one):**
  - **expo-in-app-purchases** – Expo’s IAP module (development build, native config).
  - **react-native-purchases (RevenueCat)** – Handles StoreKit, subscriptions, and can send server notifications to your backend for verification.
- **Flow:**
  1. Fetch products (course, mentorship, subscription) from the store.
  2. User taps “Buy” → start purchase with StoreKit.
  3. On success, send **receipt** (and `product_id`) to your backend `POST .../iap/verify-apple/`.
  4. Backend verifies with Apple and grants access (enrollment, mentorship, subscription).
  5. App refreshes access (e.g. `checkPaidAccess` or equivalent) and shows the new content.

- **UI**
  - **Education:** List paid courses; each has a “Buy” button that uses IAP (same courses as on web).
  - **Mentorship:** List packages; “Request / Buy” uses IAP for the chosen package.
  - **Subscription:** “Subscribe” uses IAP subscription product instead of (or in addition to) “pay by bank + proof”.

### 4. “Same in web is on mobile”

- **Web:** Keep current flow (bank transfer + proof, admin approval). No change required for compliance.
- **Mobile:** Add IAP for the **same** courses, same mentorship packages, and same app subscription.  
- Result: same content and services available on web and in the app, with IAP available in the app as required by Guideline 3.1.1.

## Checklist for Resubmission

- [ ] IAP products created in App Store Connect (courses, mentorship, app subscription).
- [ ] Backend endpoint for Apple receipt verification implemented and secured.
- [ ] Backend grants course enrollment, mentorship access, and subscription access based on verified `product_id`.
- [ ] Mobile app uses StoreKit (via expo-in-app-purchases or RevenueCat) to offer the same content for purchase in-app.
- [ ] After IAP purchase, app calls backend to verify receipt and refresh access.
- [ ] Test with sandbox Apple ID; then submit new binary and explain in App Review notes that the same digital content is now also available via in-app purchase.

## Project files

- **Backend:** `backend/subscriptions/iap_views.py` – Apple receipt verification and access grant; `POST /api/subscriptions/iap/verify-apple/`
- **Mobile:** `mobile/APPLE_IAP_INTEGRATION.md` – Step-by-step IAP integration in the app (StoreKit, product IDs, UI placement)

## References

- [App Store Review Guidelines 3.1.1](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase)
- [Guideline 3.1.3(b) Multiplatform Services](https://developer.apple.com/app-store/review/guidelines/#multiplatform-services)
- [Expo – In-App Purchases](https://docs.expo.dev/guides/in-app-purchases/)
- [Apple – Verify Receipt](https://developer.apple.com/documentation/appstorereceipts/verifyreceipt)
