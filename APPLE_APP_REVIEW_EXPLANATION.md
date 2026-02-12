# App Review Notes for Apple - Guideline 3.1.1 Compliance

## Subject: Compliance with App Store Guideline 3.1.1 - In-App Purchase

Dear App Review Team,

Thank you for your feedback regarding App Store Guideline 3.1.1. We have implemented In-App Purchase (IAP) functionality to ensure full compliance with Apple's requirements.

## Summary of Changes

We have added In-App Purchase capabilities so that **all paid digital content** (courses, mentorship packages, and app subscriptions) that users can purchase on our website is **also available for purchase directly within the app** using Apple's In-App Purchase system.

## Compliance Details

### Guideline 3.1.1 - In-App Purchase Requirement

**Requirement**: "Apps that unlock or enable additional features or functionality with mechanisms other than the App Store will be rejected unless they are also available for purchase using in-app purchase."

**Our Implementation**: 
- ✅ All paid courses are now available for purchase via IAP within the app
- ✅ All mentorship packages are now available for purchase via IAP within the app  
- ✅ App subscription (Zenda Monthly) is now available as an auto-renewable subscription via IAP

### Guideline 3.1.3(b) - Multiplatform Services

**Requirement**: "Apps that offer paid digital services and content across multiple platforms may allow customers to access the content they acquired outside the app as long as it is also available for purchase using in-app purchase."

**Our Implementation**:
- ✅ Users who purchase courses/mentorship/subscriptions on our website can access that content in the app (multiplatform access)
- ✅ The **same** content is also available for purchase within the app via IAP
- ✅ Both purchase methods grant access to the same digital content and services

## Technical Implementation

### In-App Purchase Products

We have created the following IAP products in App Store Connect:

1. **Courses** (Consumable Products)
   - Product IDs: `course_1`, `course_2`, `course_3`, etc.
   - Each product corresponds to a specific course available on our website
   - Users can purchase individual courses directly in the app

2. **Mentorship Packages** (Consumable Products)
   - Product IDs: `mentorship_1`, `mentorship_2`, etc.
   - Each product corresponds to a mentorship package available on our website
   - Users can purchase mentorship packages directly in the app

3. **App Subscription** (Auto-Renewable Subscription)
   - Product ID: `zenda_monthly`
   - Monthly subscription for full app access
   - Same subscription available on our website

### Purchase Flow

1. **User initiates purchase** within the app by tapping "Buy" or "Subscribe"
2. **StoreKit presents** the Apple payment dialog
3. **Upon successful purchase**, the app receives the receipt from Apple
4. **Receipt is verified** server-side with Apple's `verifyReceipt` API
5. **Access is granted** immediately upon successful verification
6. **User gains access** to the purchased content without requiring proof of payment upload

### Server-Side Receipt Verification

- All IAP receipts are verified server-side using Apple's `verifyReceipt` endpoint
- We use the App-Specific Shared Secret for secure verification
- Receipt verification occurs before granting any access to paid content
- We validate the `product_id` and `original_transaction_id` to prevent duplicate grants

## User Experience

### Purchase Options Available

Users now have **two ways** to purchase the same content:

1. **In-App Purchase (New)**
   - Purchase directly within the app using Apple IAP
   - Immediate access upon successful purchase
   - Uses Apple's secure payment system

2. **Website Purchase (Existing)**
   - Purchase on our website via bank transfer
   - Upload proof of payment
   - Admin approval required
   - Access granted after approval
   - Content accessible in both web and app (multiplatform)

Both methods provide access to the **same digital content** and services.

## Testing Information

### Sandbox Testing Account

For testing purposes, please use a sandbox Apple ID account. The app will:
- Display IAP products correctly
- Process test purchases through Apple's sandbox
- Verify receipts with Apple's sandbox endpoint
- Grant access immediately upon successful verification

### Test Scenarios

1. **Course Purchase**: Purchase a course via IAP → Verify immediate course access
2. **Mentorship Purchase**: Purchase a mentorship package via IAP → Verify mentorship request is created and approved
3. **Subscription Purchase**: Subscribe via IAP → Verify app subscription is activated
4. **Multiplatform Access**: Purchase on website → Verify content accessible in app

## Additional Information

### What We've Implemented

- ✅ In-App Purchase integration using StoreKit
- ✅ Server-side receipt verification with Apple
- ✅ Product IDs matching backend course/mentorship/subscription IDs
- ✅ Immediate access grant upon successful IAP purchase
- ✅ Support for both IAP and web purchases (multiplatform)

### What Remains Unchanged

- ✅ Website purchases continue to work as before
- ✅ Users who purchased on the website can access content in the app
- ✅ Admin approval workflow for website purchases remains unchanged
- ✅ All existing functionality preserved

## Compliance Statement

We confirm that:

1. ✅ All paid digital content (courses, mentorship, subscriptions) is available for purchase within the app using In-App Purchase
2. ✅ The same content available via IAP is identical to content available on our website
3. ✅ Users who purchase on the website can access that content in the app (multiplatform service)
4. ✅ All IAP receipts are verified server-side with Apple's `verifyReceipt` API
5. ✅ We comply with App Store Guideline 3.1.1 and 3.1.3(b)

## Contact Information

If you have any questions or need additional information, please contact us at:
- **Email**: [Your support email]
- **App Support URL**: [Your support URL]

Thank you for your review. We believe this implementation fully complies with Apple's App Store guidelines.

---

**App Information:**
- **App Name**: Zenda - Educação Financeira
- **Bundle ID**: com.rubianejoaquim.zenda
- **Version**: [Current version number]
