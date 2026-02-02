# iOS Credentials Guide for EAS Submit

This guide explains how to find and configure your iOS credentials for App Store submissions.

## Required Credentials

### 1. Apple ID (`appleId`)
- **What it is**: Your Apple Developer account email address
- **Where to find**: The email you use to log into [developer.apple.com](https://developer.apple.com)
- **Example**: `your-email@example.com`

### 2. App Store Connect App ID (`ascAppId`)
- **What it is**: The numeric ID of your app in App Store Connect
- **Where to find**:
  1. Go to [App Store Connect](https://appstoreconnect.apple.com)
  2. Select your app
  3. Look at the URL: `https://appstoreconnect.apple.com/apps/{ascAppId}/...`
  4. Or go to App Information → General Information → Apple ID
- **Example**: `1234567890` (numeric only)

### 3. Apple Team ID (`appleTeamId`)
- **What it is**: Your Apple Developer Team ID
- **Where to find**:
  1. Go to [developer.apple.com/account](https://developer.apple.com/account)
  2. Click on "Membership" in the sidebar
  3. Your Team ID is displayed (format: `XXXXXXXXXX`)
- **Example**: `ABC123DEF4` (10 characters, alphanumeric)

## Option 1: Update eas.json Directly

Edit `mobile/eas.json` and replace the placeholder values:

```json
"ios": {
  "appleId": "your-actual-apple-id@example.com",
  "ascAppId": "1234567890",
  "appleTeamId": "ABC123DEF4",
  "sku": "com.rubianejoaquim.zenda"
}
```

## Option 2: Use EAS Credentials (Recommended)

EAS can manage credentials automatically. You can either:

### A. Let EAS prompt for credentials
When you run `eas submit`, it will prompt you for credentials interactively.

### B. Use environment variables
Set these in your shell or CI/CD:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
```

Then remove credentials from `eas.json` and let EAS handle them.

### C. Use EAS credentials service
```bash
eas credentials
```

This will guide you through setting up credentials securely.

## Option 3: Use App-Specific Password (More Secure)

Instead of your main Apple ID password, use an App-Specific Password:

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in → App-Specific Passwords
3. Generate a new password for "EAS Submit"
4. Use this password when prompted (not your main Apple ID password)

## Testing Your Configuration

After updating credentials, test with:

```bash
cd mobile
eas submit --platform ios --profile production --non-interactive
```

## Security Notes

⚠️ **Important**: 
- Never commit real credentials to git
- Consider using environment variables or EAS credentials service
- Use App-Specific Passwords instead of your main Apple ID password
- Add `eas.json` to `.gitignore` if it contains sensitive data (or use environment variables)

## Troubleshooting

### "Invalid credentials" error
- Verify your Apple ID and password are correct
- Use an App-Specific Password instead of your main password
- Check that your Apple Developer account is active

### "App not found" error
- Verify the `ascAppId` matches your App Store Connect app
- Ensure the app exists in App Store Connect
- Check that you have access to the app

### "Team not found" error
- Verify the `appleTeamId` is correct
- Ensure you're a member of the team
- Check your Apple Developer account membership status
