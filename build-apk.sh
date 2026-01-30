#!/bin/bash

# PokerLedger Pro - APK Build Script
# This script rebuilds the Android APK after making changes

set -e  # Exit on error

echo "🃏 Building PokerLedger Pro APK..."
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

echo "📦 Step 1: Building React app..."
npm run build

echo ""
echo "🔄 Step 2: Syncing to Android..."
npx cap sync android

echo ""
echo "🏗️  Step 3: Building APK with Gradle..."
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
cd android
./gradlew assembleDebug

echo ""
echo "📱 Step 4: Copying APK to Downloads..."
cp app/build/outputs/apk/debug/app-debug.apk ~/Downloads/PokerLedgerPro.apk

echo ""
echo "✅ Build complete!"
echo ""
echo "📍 APK Location: ~/Downloads/PokerLedgerPro.apk"
ls -lh ~/Downloads/PokerLedgerPro.apk
echo ""
echo "🚀 You can now transfer this APK to your Android device!"
