# App Updates Configuration

This app is configured for automatic Over-The-Air (OTA) updates using Expo Updates and direct production submissions to app stores.

## How It Works

### Automatic OTA Updates
- The app automatically checks for updates when it loads
- Updates are downloaded and applied automatically (with user confirmation)
- Works for JavaScript/TypeScript code changes without rebuilding native code
- Updates are delivered instantly to all users

### Production Submissions
- Submissions go directly to production (not draft/internal testing)
- iOS: Direct to App Store (production)
- Android: Direct to Google Play Store (production track)

## Update Channels

- **production**: Production builds and updates
- **preview**: Preview/internal testing builds
- **development**: Development builds

## Publishing Updates

### OTA Update (JavaScript/TypeScript changes only)

```bash
# Production update
npm run update:production

# Preview update
npm run update:preview

# Development update
npm run update:development
```

### Native Build (requires app store submission)

```bash
# Build and submit to both stores
npm run build:production
npm run submit:production

# Or submit individually
npm run submit:ios
npm run submit:android
```

## Configuration Files

### `app.json`
- `updates.checkAutomatically: "ON_LOAD"` - Checks for updates when app loads
- `updates.fallbackToCacheTimeout: 0` - No timeout, always check for updates
- `runtimeVersion.policy: "appVersion"` - Uses app version for runtime versioning

### `eas.json`
- **Build profiles**: Configured with update channels
- **Submit profiles**: 
  - `production`: Direct to production stores
  - `preview`: Internal testing (also goes to production track)
- **Update profiles**: Maps to update channels

## Important Notes

1. **OTA Updates Limitations**:
   - Can update JavaScript/TypeScript code
   - Can update assets (images, fonts, etc.)
   - Cannot update native code (requires new build)
   - Cannot change app version or build number

2. **When to Use OTA Updates**:
   - Bug fixes in JavaScript/TypeScript
   - UI/UX improvements
   - Feature additions (if no native changes)
   - Asset updates

3. **When to Build & Submit**:
   - Native code changes
   - New native dependencies
   - Version number changes
   - Major feature releases

4. **iOS Submission**:
   - Update `eas.json` with your Apple ID, App Store Connect App ID, and Team ID
   - Ensure you have proper App Store Connect access

5. **Android Submission**:
   - Already configured to go directly to production
   - Requires Google Play Console access

## Testing Updates

1. Build a production app: `npm run build:production`
2. Install on device
3. Make code changes
4. Publish update: `npm run update:production`
5. Restart app - update should be detected and applied

## Troubleshooting

- If updates don't appear, check:
  - Update channel matches build channel
  - Runtime version matches
  - Network connectivity
  - EAS project ID is correct
