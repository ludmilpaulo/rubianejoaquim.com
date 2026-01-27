# iOS Simulator Setup Guide

## Problem
When starting Expo on iOS simulator, you may see:
```
Error: Simulator device failed to open exp://192.168.1.139:8081
Operation timed out
```

## Solution

### Option 1: Use the updated npm script (Recommended)
```bash
cd mobile
npm run ios
```
This now uses `EXPO_USE_LOCALHOST=1` which forces Expo to use `localhost` for the simulator.

### Option 2: Manual start with localhost flag
```bash
cd mobile
EXPO_USE_LOCALHOST=1 expo start --ios
```

### Option 3: Start Expo first, then open simulator
```bash
cd mobile
expo start --localhost
# Then press 'i' in the terminal to open iOS simulator
```

## API Configuration

The API base URL is now set to `http://localhost:8000/api` for iOS by default.

- **iOS Simulator**: Uses `localhost` ✅
- **Physical iOS Device**: Change `mobile/src/services/api.ts` line 19 to use `DEV_IP` instead of `'localhost'`

## Testing on Physical Device

If you need to test on a physical iOS device:

1. Update `mobile/src/services/api.ts`:
   ```typescript
   // Change line 19 from:
   return 'http://localhost:8000/api'
   // To:
   return `http://${DEV_IP}:8000/api`
   ```

2. Use the network start command:
   ```bash
   npm run ios:network
   ```

3. Make sure your device and computer are on the same WiFi network.
