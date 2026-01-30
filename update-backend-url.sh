#!/bin/bash

# Script to update the mobile app with your backend URL and rebuild

echo "🔧 Update Mobile App Backend URL"
echo "================================"
echo ""

# Check if URL is provided
if [ -z "$1" ]; then
    echo "❌ Error: Backend URL is required!"
    echo ""
    echo "Usage: ./update-backend-url.sh <your-backend-url>"
    echo "Example: ./update-backend-url.sh https://pokerledger-backend.onrender.com"
    echo ""
    exit 1
fi

BACKEND_URL="$1"

# Remove trailing slash if present
BACKEND_URL="${BACKEND_URL%/}"

echo "📍 Backend URL: $BACKEND_URL"
echo ""

# Backup original file
echo "💾 Creating backup of api.js..."
cp frontend/src/services/api.js frontend/src/services/api.js.backup

# Update API_BASE in api.js
echo "🔄 Updating API configuration..."
sed -i '' "s|const API_BASE = .*|const API_BASE = '${BACKEND_URL}/api';|" frontend/src/services/api.js

echo "✅ API configuration updated!"
echo ""

# Check if websocket.js exists and update it
if [ -f "frontend/src/services/websocket.js" ]; then
    echo "🔄 Updating WebSocket configuration..."
    
    # Convert http to ws or https to wss
    WS_URL="${BACKEND_URL/http:/ws:}"
    WS_URL="${WS_URL/https:/wss:}"
    
    sed -i '' "s|const WS_URL = .*|const WS_URL = '${WS_URL}';|" frontend/src/services/websocket.js
    echo "✅ WebSocket configuration updated!"
    echo ""
fi

echo "📱 Building APK with new backend URL..."
echo ""

# Run the build script
./build-apk.sh

echo ""
echo "✅ Done! Your APK is ready at ~/Downloads/PokerLedgerPro.apk"
echo ""
echo "📤 You can now share this APK with your friend!"
echo ""
echo "To test if backend is working, visit:"
echo "   ${BACKEND_URL}/health"
echo ""
