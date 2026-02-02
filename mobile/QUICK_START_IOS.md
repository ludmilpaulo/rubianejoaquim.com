# Quick Start: iOS Credentials Setup

## Option 1: Use EAS Credentials (Recommended - Most Secure)

EAS can manage your credentials securely. Just run:

```bash
cd mobile
eas credentials
```

Follow the prompts to set up your iOS credentials. EAS will store them securely and you won't need to update `eas.json`.

## Option 2: Update eas.json Directly

If you prefer to store credentials in `eas.json`, edit `mobile/eas.json` and replace:

- `REPLACE_WITH_YOUR_APPLE_ID` → Your Apple ID email
- `REPLACE_WITH_YOUR_APP_STORE_CONNECT_APP_ID` → Your App Store Connect App ID (numeric)
- `REPLACE_WITH_YOUR_APPLE_TEAM_ID` → Your Apple Team ID (10 characters)

**See `IOS_CREDENTIALS_GUIDE.md` for detailed instructions on finding these values.**

## Option 3: Use Environment Variables

Set these before running `eas submit`:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
```

Then EAS will use these automatically.

## After Setup

Test your configuration:

```bash
cd mobile
eas submit --platform ios --profile production
```

For detailed instructions, see `IOS_CREDENTIALS_GUIDE.md`.
