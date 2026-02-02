# Finding Zenda Gestão App Store Connect App ID

## ✅ What We Have

- **Apple ID**: `ludmilpaulo@gmail.com` ✅
- **Team ID**: `WF3T257QTW` ✅
- **App Name**: Zenda Gestão ✅
- **App-Specific Password**: `ucwv-fkdi-nxuv-sxde` ✅

## 🔍 Finding the App Store Connect App ID

From your screenshot, I can see "Zenda Gestão" app exists. To find the App ID:

### Method 1: From the App Page URL

1. **Click on "Zenda Gestão"** in your App Store Connect dashboard
2. Look at the browser URL - it will be something like:
   ```
   https://appstoreconnect.apple.com/apps/1234567890/appstore
   ```
   The number `1234567890` is your **App Store Connect App ID**

### Method 2: From App Information

1. Click on **"Zenda Gestão"**
2. Go to **"App Information"** in the left sidebar
3. Click **"General Information"**
4. Look for **"Apple ID"** field - this is your App Store Connect App ID (numeric)

### Method 3: Quick Check

The App ID is a numeric value (usually 8-10 digits) that appears:
- In the URL when viewing the app
- In App Information → General Information → Apple ID field

## 📝 Once You Have It

Share the App Store Connect App ID and I'll update `eas.json` with it, or you can update it yourself:

```json
"ascAppId": "YOUR_APP_ID_HERE"
```

## 🚀 Ready to Submit

Once we have the App ID, you'll be ready to submit with:

```bash
cd mobile
eas submit --platform ios --profile production
```

When prompted:
- Apple ID: `ludmilpaulo@gmail.com` (auto-filled)
- Password: `ucwv-fkdi-nxuv-sxde` (your app-specific password)
- App Store Connect App ID: (the numeric ID from Zenda Gestão)
- Apple Team ID: `WF3T257QTW` (already configured)
