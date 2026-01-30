# Building PokerLedger Pro APK

## ✅ Successfully Built!

Your APK is ready at: **`/Users/srinivasvaradan/Downloads/PokerLedgerPro.apk`** (4.0 MB)

## 📱 Installing on Android Device

### Option 1: Transfer via USB
1. Connect your Android device to your Mac
2. Copy `PokerLedgerPro.apk` to your phone
3. On your phone, go to Settings > Security > Enable "Install from Unknown Sources"
4. Use a file manager to locate and tap the APK
5. Tap "Install"

### Option 2: Transfer via Cloud/Email
1. Upload `PokerLedgerPro.apk` to Google Drive, Dropbox, or email it
2. Download on your Android device
3. Enable "Install from Unknown Sources" in Settings
4. Open and install the APK

### Option 3: Transfer via AirDrop/Nearby Share
1. Send the APK file to your Android device
2. Follow installation steps above

## ⚠️ Important Notes

### Backend Configuration
The app currently points to `/api` which will only work if:
- Your backend is running on the same device (localhost)
- You configure a production backend URL

To make the app work with a remote backend:

1. **Edit the API configuration:**
   - File: `frontend/src/services/api.js`
   - Change `const API_BASE = '/api';` to your backend URL
   - Example: `const API_BASE = 'https://your-server.com/api';`

2. **Rebuild the app:**
   ```bash
   cd frontend
   npm run build
   npx cap sync android
   export JAVA_HOME=$(/usr/libexec/java_home -v 21)
   cd android
   ./gradlew assembleDebug
   ```

3. **New APK location:**
   ```
   frontend/android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Backend Setup Required
For the app to function, you need:
1. A running PostgreSQL database
2. Backend server deployed and accessible
3. WhatsApp Business API configured (optional, for notifications)

## 🛠️ Development Setup

### Prerequisites (Already Installed ✓)
- ✓ Node.js (npm)
- ✓ Java 21 JDK
- ✓ Android Studio & Android SDK
- ✓ Capacitor

### Future Builds

Quick rebuild after code changes:
```bash
# Navigate to frontend
cd /Users/srinivasvaradan/Downloads/pokerledger-pro/frontend

# Build the web app
npm run build

# Sync to Android
npx cap sync android

# Build APK
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
cd android
./gradlew assembleDebug

# Copy to Downloads
cp app/build/outputs/apk/debug/app-debug.apk ~/Downloads/PokerLedgerPro.apk
```

Or use the provided script:
```bash
cd /Users/srinivasvaradan/Downloads/pokerledger-pro
./build-apk.sh
```

## 🚀 Building Production APK

For a release build (smaller, optimized):
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
cd frontend/android
./gradlew assembleRelease
```

**Note:** Production builds require signing with a keystore. See Android documentation for details.

## 🐛 Troubleshooting

### Java Version Issues
If you get Java version errors:
```bash
# List installed Java versions
/usr/libexec/java_home -V

# Use Java 21
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

### SDK Not Found
If you get SDK errors, ensure Android SDK path is set:
```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > frontend/android/local.properties
```

### App Crashes on Launch
Check that:
1. Backend URL is correctly configured
2. Backend is accessible from the device
3. CORS is configured on backend to allow requests from the app

## 📦 What Was Done

1. ✅ Installed Capacitor packages
2. ✅ Initialized Capacitor project
3. ✅ Added Android platform
4. ✅ Built React app for production
5. ✅ Synced web assets to Android
6. ✅ Installed Android SDK & Java 21
7. ✅ Built debug APK

## 🌐 Next Steps for Production

1. **Deploy Backend:**
   - Set up PostgreSQL database on a server
   - Deploy backend to a cloud service (AWS, Heroku, DigitalOcean, etc.)
   - Configure environment variables
   - Set up HTTPS

2. **Configure App:**
   - Update API_BASE in `frontend/src/services/api.js`
   - Rebuild and test

3. **WhatsApp Integration:**
   - Set up Meta Business account
   - Configure WhatsApp Cloud API
   - Update backend .env with WhatsApp credentials

4. **App Store Distribution:**
   - Create signed release APK
   - Consider publishing to Google Play Store
   - Or distribute directly to users

---

**Built on:** January 30, 2026
**APK Location:** `/Users/srinivasvaradan/Downloads/PokerLedgerPro.apk`
**Size:** 4.0 MB
