# Setting Up iOS Credentials

## I Cannot Access Your Credentials Directly

I don't have access to your Apple Developer account, so I cannot retrieve your credentials automatically. However, I can guide you through the process.

## Option 1: Use EAS Credentials Management (Easiest & Most Secure)

EAS can securely manage your credentials. Run this command:

```bash
cd mobile
eas credentials
```

**What will happen:**
1. EAS will prompt you to log in (if not already logged in)
2. It will ask for your Apple ID
3. It will ask for your App Store Connect App ID
4. It will ask for your Apple Team ID
5. EAS will securely store these credentials

**Benefits:**
- Credentials are stored securely by EAS
- No need to edit `eas.json`
- Works across different machines
- More secure than storing in files

## Option 2: Run the Setup Script

I've created a helper script:

```bash
cd mobile
./setup-ios-credentials.sh
```

This will guide you through the process.

## Option 3: Manual Configuration

If you prefer to store credentials in `eas.json`:

1. **Find your credentials** (see `IOS_CREDENTIALS_GUIDE.md`):
   - Apple ID: Your Apple Developer email
   - App Store Connect App ID: Numeric ID from App Store Connect
   - Apple Team ID: 10-character ID from developer.apple.com

2. **Edit `mobile/eas.json`**:
   ```json
   "ios": {
     "appleId": "your-actual-email@example.com",
     "ascAppId": "1234567890",
     "appleTeamId": "ABC123DEF4",
     "sku": "com.rubianejoaquim.zenda"
   }
   ```

3. **Replace the placeholder values**

## Option 4: Environment Variables

Set these before running `eas submit`:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
```

Then run:
```bash
eas submit --platform ios --profile production
```

## Finding Your Credentials

### Apple ID
- The email you use to log into [developer.apple.com](https://developer.apple.com)

### App Store Connect App ID
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Look at the URL: `https://appstoreconnect.apple.com/apps/{APP_ID}/...`
4. Or go to: App Information → General Information → Apple ID

### Apple Team ID
1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Click "Membership" in the sidebar
3. Your Team ID is displayed (format: `XXXXXXXXXX`)

## Testing Your Setup

After configuring credentials, test with:

```bash
cd mobile
eas submit --platform ios --profile production --non-interactive
```

If credentials are correct, it will proceed. If not, you'll get an error message.

## Need Help?

- See `IOS_CREDENTIALS_GUIDE.md` for detailed instructions
- See `QUICK_START_IOS.md` for a quick reference
- Run `eas credentials --help` for EAS CLI help

## Security Note

⚠️ **Never commit real credentials to git!**

If you manually edit `eas.json` with real credentials:
- Consider using environment variables instead
- Or use `eas credentials` which stores them securely
- Or add `eas.json` to `.gitignore` (not recommended as it contains other config)
