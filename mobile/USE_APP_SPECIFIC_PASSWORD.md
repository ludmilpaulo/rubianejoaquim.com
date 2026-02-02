# Using Your App-Specific Password

## Your App-Specific Password

✅ **Password Generated**: `ucwv-fkdi-nxuv-sxde`

## How to Use It

### Option 1: When EAS Prompts You (Recommended)

When you run:
```bash
cd mobile
eas submit --platform ios --profile production
```

EAS will prompt you for:
- **Apple ID**: `ludmilpaulo@gmail.com` (already in eas.json)
- **Password**: Enter `ucwv-fkdi-nxuv-sxde` (your app-specific password)
- **App Store Connect App ID**: (you'll need to find this)
- **Apple Team ID**: (you'll need to find this)

### Option 2: Use EAS Credentials Command

```bash
cd mobile
eas credentials
```

Select iOS → Production, then:
- Apple ID: `ludmilpaulo@gmail.com`
- Password: `ucwv-fkdi-nxuv-sxde`
- App Store Connect App ID: (enter when prompted)
- Apple Team ID: (enter when prompted)

EAS will securely store these credentials.

### Option 3: Environment Variable (For CI/CD)

If using in automated scripts:

```bash
export APPLE_ID="ludmilpaulo@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="ucwv-fkdi-nxuv-sxde"
```

Then run:
```bash
eas submit --platform ios --profile production --non-interactive
```

## Important Notes

✅ **DO:**
- Use this app-specific password (`ucwv-fkdi-nxuv-sxde`) for EAS submissions
- Keep it secure (don't commit to git)
- Use it instead of your main Apple ID password

❌ **DON'T:**
- Store it in `eas.json` (use EAS credentials management instead)
- Commit it to git
- Share it publicly
- Use your main Apple ID password (`Maitland@2021`)

## Next Steps

1. **Find your App Store Connect App ID**:
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Select your app (or create one)
   - The App ID is in the URL or under App Information

2. **Find your Apple Team ID**:
   - Go to [developer.apple.com/account](https://developer.apple.com/account)
   - Click "Membership"
   - Your Team ID is displayed (10 characters)

3. **Submit your app**:
   ```bash
   cd mobile
   eas submit --platform ios --profile production
   ```
   
   When prompted, use:
   - Apple ID: `ludmilpaulo@gmail.com`
   - Password: `ucwv-fkdi-nxuv-sxde`
   - App Store Connect App ID: (enter the value you found)
   - Apple Team ID: (enter the value you found)

## Security

This app-specific password is safer than using your main password because:
- It's scoped to specific apps/services
- You can revoke it without changing your main password
- It's less risky if compromised

If you need to revoke it later:
1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign-In and Security → App-Specific Passwords
3. Revoke the password and generate a new one
