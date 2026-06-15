# Reply to App Review – IAP Location Steps

Copy/paste this into App Store Connect → App Review → Reply to App Review.

---

Hello App Review Team,

Thank you for your feedback. We have implemented In-App Purchase in the app and created the subscription product `zenda_monthly` in App Store Connect.

**How to locate In-App Purchases in Zenda Gestão (sandbox testing):**

1. Install the app on iPad/iPhone and sign in with any test account (or create a new account).
2. On the **access screen** (shown when the user has no active subscription, course, or mentorship), tap **"Subscribe with Apple"** / **"Subscrever com Apple"**. This starts the StoreKit purchase for product ID **`zenda_monthly`** (monthly app subscription).
3. Alternatively, tap **"Browse courses & enroll"** / **"Ver cursos e inscrever-se"**, open the course catalog, and tap **"Buy with Apple"** / **"Comprar com Apple"** on any paid course. Product IDs follow the format **`course_<id>`** (e.g. `course_1`, `course_2`).
4. Use a **Sandbox Apple ID** (Settings → App Store → Sandbox Account) to complete test purchases. Receipts are verified server-side before access is granted.

**Products configured:**
- Auto-renewable subscription: `zenda_monthly` (Zenda Premium group)
- Consumable course products: `course_<id>` (one per paid course)

We have attached the subscription and IAP metadata for review with this resubmission.

Thank you.
