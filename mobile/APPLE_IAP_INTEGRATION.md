# Apple In-App Purchase – Mobile Integration (Guideline 3.1.1)

This doc describes how to add In-App Purchase to the Zenda app so the **same** digital content (courses, mentorship, app subscription) available on the web is also purchasable inside the app, as required by App Store Guideline 3.1.1.

## Backend (already in place)

- **Endpoint:** `POST /api/subscriptions/iap/verify-apple/`
- **Body:** `{ "receipt_data": "<base64 from StoreKit>", "product_id": "course_1" | "mentorship_1" | "zenda_monthly" }`
- **Auth:** Token (same as rest of app)
- **Env:** Set `APPLE_SHARED_SECRET` and optionally `APPLE_BUNDLE_ID` in backend `.env`

Product ID conventions:

| product_id       | Backend action                                      |
|------------------|-----------------------------------------------------|
| `course_<id>`    | Create/activate `Enrollment` for course `id`        |
| `mentorship_<id>`| Create `MentorshipRequest` for package `id` (approved) |
| `zenda_monthly`  | Create/expand `MobileAppSubscription` (1 month)     |

## 1. App Store Connect – Create IAP products

1. **App Store Connect** → Your app → **In-App Purchases**.
2. Create products that match the backend `product_id`:
   - **Courses:** e.g. “Course: [Course name]” with product ID `course_1`, `course_2`, … (match your course IDs).
   - **Mentorship:** e.g. “Mentorship: [Package name]” with product ID `mentorship_1`, `mentorship_2`, … (match package IDs).
   - **App subscription:** “Zenda Monthly” with product ID `zenda_monthly` as **Auto-Renewable Subscription**.
3. **App-Specific Shared Secret:** App → **App Information** → **App-Specific Shared Secret** → generate and put in backend `.env` as `APPLE_SHARED_SECRET`.

## 2. Native / development build (required)

In-App Purchase does **not** work in Expo Go. You need a **development build** or production build (e.g. EAS Build).

- Use **expo-dev-client** and run a dev/production build on device/simulator for testing IAP.

## 3. Choose an IAP library

**Option A – expo-in-app-purchases**

- Install: `npx expo install expo-in-app-purchases`
- Requires a config plugin / native build; see [Expo – In-App Purchases](https://docs.expo.dev/guides/in-app-purchases/).
- Use the product IDs you created in App Store Connect.

**Option B – RevenueCat (react-native-purchases)**

- Handles StoreKit, subscriptions, and can notify your backend.
- Install: `npx expo install react-native-purchases`
- Configure products in RevenueCat dashboard and map to same `product_id` values (`course_1`, `mentorship_1`, `zenda_monthly`) so the backend can grant access.

## 4. Flow in the app

1. **Fetch products** from the store (same IDs as in App Store Connect and backend).
2. **Show “Buy” / “Subscribe”** next to each course, mentorship package, and for the app subscription.
3. **Start purchase** with StoreKit (via your chosen library).
4. **On success**, get the **receipt** (base64) from the library.
5. **Call backend:**  
   `POST /api/subscriptions/iap/verify-apple/`  
   with `receipt_data` and `product_id`.
6. **On 200**, refresh access (e.g. call `checkPaidAccess()` or refetch enrollments/subscription) and navigate to the new content or home.

## 5. Where to add “Buy with IAP” in the app

- **Education / Courses:** For each paid course not yet enrolled, show a “Comprar” button that runs the IAP flow for `course_<id>`, then calls the verify endpoint and refreshes enrollments.
- **Mentorship:** For each package, offer “Comprar” with IAP for `mentorship_<id>`, then verify and refresh.
- **Subscription / Profile / Access denied:** Offer “Subscrever” with IAP product `zenda_monthly`, then verify and refresh subscription/access.

## 6. Testing

- Use an **Apple Sandbox** account (App Store Connect → Users and Access → Sandbox) to make test purchases.
- Backend will talk to Apple’s sandbox when the receipt is from sandbox (handled in `iap_views.py`).
- After a successful purchase and verify call, the user should see the new course, mentorship request, or subscription active without uploading proof of payment.

## 7. Resubmission notes for App Review

When resubmitting, you can say:

- The same paid digital content (courses, mentorship, app subscription) that users can buy on the web is now **also** available for purchase **inside the app** via In-App Purchase.
- Users who already bought on the web continue to access that content in the app (multiplatform, 3.1.3(b)); new in-app purchases use Apple IAP and the same backend access logic.

See also **APPLE_IAP_COMPLIANCE.md** in the project root for the full compliance plan and backend/product_id design.
