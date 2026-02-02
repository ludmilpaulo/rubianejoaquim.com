# Direct Links to Find iOS Credentials

## 1. App Store Connect App ID

### Direct Link
👉 **[App Store Connect - My Apps](https://appstoreconnect.apple.com/apps)**

### Steps:
1. Click the link above (or go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com))
2. Sign in with: `ludmilpaulo@gmail.com` and your password
3. Click **"My Apps"** in the top menu
4. **If you have an app already:**
   - Click on your app
   - Look at the URL: `https://appstoreconnect.apple.com/apps/{APP_ID}/...`
   - The `{APP_ID}` is your App Store Connect App ID (numeric, like `1234567890`)
   - Or go to: **App Information** → **General Information** → Look for **"Apple ID"** (this is the numeric ID)

5. **If you need to create an app:**
   - Click the **"+"** button (top left)
   - Select **"New App"**
   - Fill in the required information
   - After creating, the App ID will be shown in the URL and App Information

### What it looks like:
- Format: Numeric only (e.g., `1234567890`, `9876543210`)
- Location: In the URL after `/apps/` or in App Information → Apple ID field

---

## 2. Apple Team ID

### Direct Link
👉 **[Apple Developer Account - Membership](https://developer.apple.com/account)**

### Steps:
1. Click the link above (or go to [developer.apple.com/account](https://developer.apple.com/account))
2. Sign in with: `ludmilpaulo@gmail.com` and your password
3. In the left sidebar, click **"Membership"**
4. Your **Team ID** is displayed at the top of the page
   - Format: 10 characters, alphanumeric (e.g., `ABC123DEF4`, `XYZ789GHI0`)
   - It's labeled as **"Team ID"** or **"Identifier"**

### What it looks like:
- Format: 10 characters, letters and numbers (e.g., `ABC123DEF4`)
- Location: Membership page, top section
- Label: "Team ID" or "Team Identifier"

---

## Quick Reference

### App Store Connect App ID
- **Link**: [appstoreconnect.apple.com/apps](https://appstoreconnect.apple.com/apps)
- **Login**: `ludmilpaulo@gmail.com`
- **Find**: URL or App Information → Apple ID
- **Format**: Numeric (e.g., `1234567890`)

### Apple Team ID
- **Link**: [developer.apple.com/account](https://developer.apple.com/account)
- **Login**: `ludmilpaulo@gmail.com`
- **Find**: Membership → Team ID
- **Format**: 10 alphanumeric characters (e.g., `ABC123DEF4`)

---

## After You Find Them

Once you have both values, you can either:

### Option 1: Update eas.json
Share the values with me and I'll update `eas.json`:
- App Store Connect App ID: `_____________`
- Apple Team ID: `_____________`

### Option 2: Use EAS Credentials Command
```bash
cd mobile
eas credentials
```
Then enter:
- Apple ID: `ludmilpaulo@gmail.com`
- Password: `ucwv-fkdi-nxuv-sxde` (your app-specific password)
- App Store Connect App ID: (the numeric ID you found)
- Apple Team ID: (the 10-character ID you found)

### Option 3: Submit Directly
```bash
cd mobile
eas submit --platform ios --profile production
```
EAS will prompt you for all values interactively.

---

## Troubleshooting

### Can't access App Store Connect?
- Make sure you're signed in with `ludmilpaulo@gmail.com`
- Verify you have an active Apple Developer Program membership
- Check that you have access to the app (if it was created by someone else)

### Can't find Team ID?
- Make sure you're on the Membership page
- Verify your Apple Developer Program membership is active
- The Team ID should be visible if you have an active membership

### Need to create an app in App Store Connect?
1. Go to [appstoreconnect.apple.com/apps](https://appstoreconnect.apple.com/apps)
2. Click **"+"** → **"New App"**
3. Fill in:
   - Platform: iOS
   - Name: Zenda (or your app name)
   - Primary Language: Portuguese (or your choice)
   - Bundle ID: Select `com.rubianejoaquim.zenda`
   - SKU: `com.rubianejoaquim.zenda`
4. After creating, the App ID will be shown

---

## Visual Guide

### App Store Connect App ID Location:
```
App Store Connect → My Apps → [Your App] → App Information
                                              ↓
                                    Apple ID: 1234567890 ← This is it!
```

### Apple Team ID Location:
```
Apple Developer → Account → Membership
                              ↓
                    Team ID: ABC123DEF4 ← This is it!
```
