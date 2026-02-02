#!/bin/bash
# iOS Credentials Setup Script
# This script helps you set up iOS credentials using EAS

echo "=========================================="
echo "iOS Credentials Setup for EAS Submit"
echo "=========================================="
echo ""
echo "This script will guide you through setting up iOS credentials."
echo "You'll need:"
echo "  1. Your Apple ID (email)"
echo "  2. Your App Store Connect App ID (numeric)"
echo "  3. Your Apple Team ID (10 characters)"
echo ""
echo "Option 1: Use EAS Credentials Management (Recommended)"
echo "  This will securely store your credentials with EAS"
echo ""
read -p "Do you want to use EAS credentials management? (y/n): " use_eas

if [ "$use_eas" = "y" ] || [ "$use_eas" = "Y" ]; then
    echo ""
    echo "Running: eas credentials"
    echo "Follow the prompts to enter your iOS credentials."
    echo ""
    eas credentials
else
    echo ""
    echo "Option 2: Manual Configuration"
    echo "You can manually edit mobile/eas.json and replace:"
    echo "  - REPLACE_WITH_YOUR_APPLE_ID"
    echo "  - REPLACE_WITH_YOUR_APP_STORE_CONNECT_APP_ID"
    echo "  - REPLACE_WITH_YOUR_APPLE_TEAM_ID"
    echo ""
    echo "See IOS_CREDENTIALS_GUIDE.md for detailed instructions."
    echo ""
fi

echo ""
echo "After setup, test with:"
echo "  eas submit --platform ios --profile production --non-interactive"
echo ""
