# Secure Password Setup for iOS Submissions

## ⚠️ Important Security Note

**NEVER store your Apple ID password in configuration files!**

I've updated your Apple ID (`ludmilpaulo@gmail.com`) in `eas.json`, but your password should NOT be stored there.

## Recommended: Use App-Specific Password

Instead of your main Apple ID password, use an App-Specific Password:

### Step 1: Generate App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with `ludmilpaulo@gmail.com` and your password
3. Go to **Sign-In and Security** → **App-Specific Passwords**
4. Click **Generate an app-specific password**
5. Label it: "EAS Submit" or "Expo EAS"
6. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)

### Step 2: Use with EAS

When you run `eas submit`, it will prompt for credentials. Use:
- **Apple ID**: `ludmilpaulo@gmail.com`
- **Password**: The app-specific password (not your main password)

## Option 1: Let EAS Prompt You (Recommended)

When you run:
```bash
cd mobile
eas submit --platform ios --profile production
```

EAS will prompt you for:
- Apple ID: `ludmilpaulo@gmail.com` (already in eas.json)
- Password: Enter your app-specific password
- App Store Connect App ID: (you'll need to find this)
- Apple Team ID: (you'll need to find this)

## Option 2: Use EAS Credentials Command

Run:
```bash
cd mobile
eas credentials
```

Select iOS → Production, then:
- It will use `ludmilpaulo@gmail.com` from eas.json
- It will prompt for password (use app-specific password)
- It will prompt for App Store Connect App ID
- It will prompt for Apple Team ID

## Still Need: App Store Connect App ID & Team ID

You still need to find:

1. **App Store Connect App ID** (numeric):
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Select your app (or create one)
   - Look at URL: `https://appstoreconnect.apple.com/apps/{APP_ID}/...`
   - Or: App Information → General Information → Apple ID

2. **Apple Team ID** (10 characters):
   - Go to [developer.apple.com/account](https://developer.apple.com/account)
   - Click "Membership" in sidebar
   - Your Team ID is displayed

## Quick Test

After you have all credentials, test with:

```bash
cd mobile
eas submit --platform ios --profile production --non-interactive
```

## Security Best Practices

✅ **DO:**
- Use App-Specific Passwords
- Let EAS manage credentials securely
- Use environment variables in CI/CD

❌ **DON'T:**
- Store passwords in eas.json
- Commit passwords to git
- Share passwords in plain text
