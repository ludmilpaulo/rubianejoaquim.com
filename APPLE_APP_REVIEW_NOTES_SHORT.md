# App Review Notes - Short Version (For App Store Connect)

## Guideline 3.1.1 Compliance - In-App Purchase Implementation

We have implemented In-App Purchase (IAP) so that all paid digital content (courses, mentorship packages, and app subscriptions) available on our website is **also available for purchase within the app** using Apple's In-App Purchase system.

### What's Available via IAP:
- ✅ **Courses**: Individual course purchases (product IDs: `course_1`, `course_2`, etc.)
- ✅ **Mentorship**: Mentorship package purchases (product IDs: `mentorship_1`, `mentorship_2`, etc.)
- ✅ **App Subscription**: Monthly subscription (product ID: `zenda_monthly`)

### Compliance:
- All paid content is purchasable via IAP within the app
- Same content available on website is also available via IAP (Guideline 3.1.1)
- Users who purchase on website can access content in app (Guideline 3.1.3(b) - Multiplatform)
- All receipts verified server-side with Apple's `verifyReceipt` API

### Testing:
Please use a sandbox Apple ID to test IAP purchases. The app will verify receipts server-side and grant immediate access to purchased content.

---

**For detailed technical information, see:** `APPLE_APP_REVIEW_EXPLANATION.md`
