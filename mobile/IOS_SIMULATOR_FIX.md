# iOS Simulator Connection Fix

## Problem
The iOS simulator times out when trying to automatically open the Expo URL (`exp://127.0.0.1:8081`).

## Solution

### Option 1: Manual Open (Recommended)

1. **Start Expo with localhost:**
   ```bash
   cd mobile
   npm run start:localhost
   # or
   EXPO_USE_LOCALHOST=1 expo start
   ```

2. **Wait for Expo to start** - you'll see a QR code and options in the terminal

3. **Manually open Expo Go in the simulator:**
   - Open the iOS Simulator
   - Find and open the "Expo Go" app
   - In Expo Go, tap "Enter URL manually"
   - Enter: `exp://127.0.0.1:8081`
   - Or scan the QR code if available

### Option 2: Use Expo Dev Tools

1. Start Expo:
   ```bash
   cd mobile
   npm run start:localhost
   ```

2. In the terminal, press `i` to open iOS simulator (this sometimes works better than `--ios` flag)

3. If that doesn't work, press `s` to switch to development build, or manually open Expo Go

### Option 3: Reset Simulator

If the simulator is having persistent issues:

```bash
# List all simulators
xcrun simctl list devices

# Shut down the current simulator
xcrun simctl shutdown E18DD11A-23A2-4DC0-AF1A-56F0ADF84DE7

# Boot it again
xcrun simctl boot E18DD11A-23A2-4DC0-AF1A-56F0ADF84DE7

# Open Simulator app
open -a Simulator
```

Then try Option 1 again.

## Current Status

- ✅ Expo dev server is running on port 8081
- ✅ Server is accessible at `http://127.0.0.1:8081`
- ✅ Simulator is booted (iPhone 16 Plus)
- ⚠️ Automatic URL opening is timing out (common iOS simulator issue)

## Why This Happens

iOS simulators sometimes have issues with the `xcrun simctl openurl` command timing out. This is a known issue and doesn't affect the actual functionality - you just need to manually open the app in the simulator instead of relying on automatic opening.
