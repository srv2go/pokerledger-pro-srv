#!/bin/bash

# PokerLedger Pro - APK Build Script
# This script rebuilds the Android APK after making changes

set -e  # Exit on error

echo "🃏 Building Ledger AI APK..."
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
mkdir -p ~/Downloads/LedgerAI
cp app/build/outputs/apk/debug/app-debug.apk ~/Downloads/LedgerAI/LedgerAI.apk

echo ""
echo "✅ Build complete!"
echo ""
echo "📍 APK Location: ~/Downloads/LedgerAI/LedgerAI.apk"
ls -lh ~/Downloads/LedgerAI/LedgerAI.apk
echo ""
echo "🚀 You can now transfer this APK to your Android device!"
