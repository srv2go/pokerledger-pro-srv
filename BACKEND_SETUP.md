# Backend Configuration for Mobile App

## 🚨 Important: Your App Needs a Backend Server

The APK you just built is a **frontend-only** mobile app. For it to work properly, you need:

1. **A running backend server** (accessible via the internet)
2. **A PostgreSQL database**
3. **Backend API configuration in the mobile app**

## Current Status

Right now, the mobile app points to `/api` which means:
- It expects the backend to be on the same device (won't work)
- You need to update the API URL to point to a real server

## Quick Setup Options

### Option 1: Deploy Backend to Cloud (Recommended)

#### Using Railway (Easy, Free Tier Available)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your backend folder
5. Add PostgreSQL database (Railway provides this)
6. Set environment variables from `backend/.env.example`
7. Get your deployment URL (e.g., `https://your-app.railway.app`)

#### Using Render (Free Tier)
1. Go to [render.com](https://render.com)
2. Connect your GitHub repo
3. Create a "Web Service" for backend
4. Create a "PostgreSQL" database
5. Configure environment variables
6. Get your service URL

#### Using Heroku
1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create poker-ledger-backend`
4. Add PostgreSQL: `heroku addons:create heroku-postgresql:hobby-dev`
5. Deploy: `git push heroku main`

### Option 2: Local Testing (Temporary)

For testing on your local network only:

1. **Find your Mac's IP address:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Example: `192.168.1.100`

2. **Update backend to allow connections:**
   ```bash
   cd backend
   # Edit src/index.js - ensure Express listens on 0.0.0.0
   ```

3. **Run backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

4. **Update mobile app API URL:**
   Edit `frontend/src/services/api.js`:
   ```javascript
   const API_BASE = 'http://192.168.1.100:3001/api';  // Use your Mac's IP
   ```

5. **Rebuild the APK:**
   ```bash
   ./build-apk.sh
   ```

**Note:** This only works when your phone and Mac are on the same WiFi network.

## Updating the Mobile App to Use Your Backend

### Step 1: Update API Configuration

Edit `frontend/src/services/api.js`:

```javascript
// Change this line:
const API_BASE = '/api';

// To your backend URL:
const API_BASE = 'https://your-backend-url.com/api';
// Example: 'https://poker-ledger-backend.railway.app/api'
```

### Step 2: Update WebSocket Configuration

Edit `frontend/src/services/websocket.js` (if exists):

```javascript
// Update WebSocket URL to match your backend
const WS_URL = 'wss://your-backend-url.com';  // Use wss:// for https backends
```

### Step 3: Rebuild the APK

```bash
cd /Users/srinivasvaradan/Downloads/pokerledger-pro
./build-apk.sh
```

### Step 4: Transfer New APK to Phone

The new APK will be at: `~/Downloads/PokerLedgerPro.apk`

## Backend Setup Checklist

Before deploying your backend, ensure:

- [ ] PostgreSQL database is created and accessible
- [ ] `DATABASE_URL` environment variable is set
- [ ] `JWT_SECRET` is set to a secure random string
- [ ] `FRONTEND_URL` is updated (can use `*` for testing)
- [ ] CORS is configured to allow mobile app requests
- [ ] WhatsApp API credentials are configured (if using notifications)
- [ ] Backend is accessible via HTTPS (required for production)

## Testing the Connection

After updating and rebuilding:

1. Install the new APK on your Android device
2. Try to register/login
3. Check backend logs for incoming requests
4. If it fails:
   - Check backend is running
   - Verify the URL in the app is correct
   - Check CORS settings on backend
   - Ensure backend is accessible from internet (not localhost)

## Environment Variables for Backend

Required in your backend deployment:

```env
# Server
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=postgresql://username:password@host:5432/database

# JWT
JWT_SECRET=your-secret-key-minimum-32-characters-long

# Frontend (for CORS)
FRONTEND_URL=*  # Or your specific domain

# WhatsApp (Optional)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-token
```

## Common Issues

### ❌ "Network request failed"
- Backend is not running or not accessible
- Check the API URL in your app
- Ensure backend is deployed and live

### ❌ "CORS error"
- Backend needs to allow requests from mobile app
- Add CORS middleware in `backend/src/index.js`:
  ```javascript
  app.use(cors({ origin: '*' }));  // For testing
  ```

### ❌ "404 Not Found"
- API endpoint path is incorrect
- Verify backend routes match what app expects
- Check backend logs

### ❌ "SSL/TLS error"
- Backend must use HTTPS for production
- Most cloud platforms provide this automatically

## Next Steps

1. **Choose a deployment platform** (Railway, Render, Heroku, AWS, etc.)
2. **Deploy your backend** with PostgreSQL
3. **Get your backend URL**
4. **Update the mobile app** with the new URL
5. **Rebuild the APK** using `./build-apk.sh`
6. **Test on your Android device**

---

**Need Help?**
- Railway Docs: https://docs.railway.app/
- Render Docs: https://render.com/docs
- Heroku Docs: https://devcenter.heroku.com/
