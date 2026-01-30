# 🚀 Deploy PokerLedger Pro to Render (FREE)

This guide will walk you through deploying your backend to Render's free tier.

## Prerequisites

- GitHub account (free)
- Render account (free) - https://render.com

## Step 1: Push Code to GitHub

### Option A: Create New Repository via GitHub Website

1. Go to https://github.com/new
2. Name your repository (e.g., `pokerledger-pro`)
3. Keep it **Private** (recommended) or Public
4. Don't initialize with README
5. Click "Create repository"

6. In your terminal, run these commands:
   ```bash
   cd /Users/srinivasvaradan/Downloads/pokerledger-pro
   
   # Add your GitHub repository as remote
   git remote add origin https://github.com/YOUR_USERNAME/pokerledger-pro.git
   
   # Push your code
   git branch -M main
   git push -u origin main
   ```

### Option B: Use GitHub CLI (if installed)

```bash
cd /Users/srinivasvaradan/Downloads/pokerledger-pro

# Create repository and push
gh repo create pokerledger-pro --private --source=. --push
```

## Step 2: Deploy to Render

### 2.1 Sign Up / Login to Render

1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended)
4. Authorize Render to access your repositories

### 2.2 Create PostgreSQL Database

1. On Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Fill in:
   - **Name**: `pokerledger-db`
   - **Database**: `pokerledger`
   - **User**: (auto-generated, keep it)
   - **Region**: Choose closest to you (e.g., Oregon)
   - **Plan**: **Free**
3. Click **"Create Database"**
4. Wait for database to be created (~2 minutes)
5. **Copy the "Internal Database URL"** - you'll need this!

### 2.3 Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository:
   - Click "Connect" next to your `pokerledger-pro` repository
3. Fill in the configuration:

   **Basic Info:**
   - **Name**: `pokerledger-backend`
   - **Region**: Same as database (e.g., Oregon)
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: **Node**
   
   **Build & Deploy:**
   - **Build Command**: 
     ```
     cd backend && chmod +x render-build.sh && ./render-build.sh
     ```
   - **Start Command**: 
     ```
     cd backend && npm start
     ```
   
   **Plan:**
   - Select **Free**

4. Click **"Advanced"** to add environment variables

### 2.4 Add Environment Variables

Click "Add Environment Variable" for each:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `DATABASE_URL` | Paste the **Internal Database URL** from Step 2.2 |
| `JWT_SECRET` | Generate a random string (32+ characters)* |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | `*` |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | `100` |

*For `JWT_SECRET`, you can generate one by running:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Optional WhatsApp Variables (Skip for now):
- `WHATSAPP_API_URL`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

5. Click **"Create Web Service"**

## Step 3: Wait for Deployment

- Render will now build and deploy your backend
- This takes ~5-10 minutes for the first deployment
- Watch the build logs in real-time
- Look for: **"Your service is live 🎉"**

## Step 4: Get Your Backend URL

1. Once deployed, you'll see your service URL at the top:
   ```
   https://pokerledger-backend.onrender.com
   ```
2. **SAVE THIS URL** - you'll need it for the mobile app!

3. Test it by visiting:
   ```
   https://pokerledger-backend.onrender.com/health
   ```
   You should see:
   ```json
   {"status":"healthy","timestamp":"2026-01-30T..."}
   ```

## Step 5: Update Mobile App with Backend URL

Now that your backend is live, update the mobile app:

### 5.1 Update API Configuration

Edit the file: `frontend/src/services/api.js`

Find this line (around line 6):
```javascript
const API_BASE = '/api';
```

Change it to your Render URL:
```javascript
const API_BASE = 'https://pokerledger-backend.onrender.com/api';
```

### 5.2 Update WebSocket Configuration (if exists)

Check if file exists: `frontend/src/services/websocket.js`

If it has a WebSocket URL, update it to:
```javascript
const WS_URL = 'wss://pokerledger-backend.onrender.com';
```

### 5.3 Rebuild the APK

```bash
cd /Users/srinivasvaradan/Downloads/pokerledger-pro
./build-apk.sh
```

### 5.4 Test the New APK

The new APK will be at: `~/Downloads/PokerLedgerPro.apk`

Transfer it to your Android device and test:
1. Try registering a new user
2. Try logging in
3. Create a game

## 🎉 You're Done!

Your complete stack is now live:
- ✅ Backend API running on Render (free)
- ✅ PostgreSQL database on Render (free)  
- ✅ Mobile app connected to live backend
- ✅ Ready to share with your friend!

## Important Notes About Free Tier

### Render Free Tier Limits:
- ⚠️ **Service spins down after 15 minutes of inactivity**
- First request after inactivity takes ~30-60 seconds to wake up
- Database sleeps after 90 days of inactivity
- 750 hours/month of uptime (enough for testing)
- 100GB bandwidth/month

### To Keep Service Active:
You can use a free uptime monitor:
1. Sign up at https://uptimerobot.com (free)
2. Add your Render URL as a monitor
3. Set ping interval to 14 minutes
4. This keeps your service awake 24/7

## Troubleshooting

### Build Fails
- Check the build logs in Render dashboard
- Ensure all environment variables are set correctly
- Verify DATABASE_URL is the **Internal** URL, not External

### Database Connection Error
- Make sure you used the **Internal Database URL**
- Wait 2-3 minutes for database to be fully ready
- Check DATABASE_URL format: `postgresql://user:password@host/database`

### App Can't Connect to Backend
- Test backend URL in browser: `https://your-url.onrender.com/health`
- Make sure you updated `API_BASE` in `frontend/src/services/api.js`
- Rebuild the APK after updating the URL
- Check for typos in the URL (no trailing slash)

### First Request Very Slow
- This is normal on free tier
- Service spins down after 15 minutes of inactivity
- Use UptimeRobot to keep it awake (see above)

## Updating Your App

When you make changes to the backend:

```bash
cd /Users/srinivasvaradan/Downloads/pokerledger-pro

# Make your changes, then:
git add -A
git commit -m "Your change description"
git push origin main
```

Render will automatically redeploy!

When you make changes to the frontend:

```bash
cd /Users/srinivasvaradan/Downloads/pokerledger-pro
./build-apk.sh
```

## Next Steps

1. **WhatsApp Integration** (Optional):
   - Set up Meta Business Account
   - Get WhatsApp API credentials
   - Add credentials to Render environment variables
   - Redeploy

2. **Custom Domain** (Optional):
   - Purchase a domain
   - Add it in Render dashboard (free SSL included)

3. **Monitoring**:
   - Use Render's built-in logs
   - Set up UptimeRobot for monitoring

---

**Need Help?**
- Render Docs: https://render.com/docs
- Render Community: https://community.render.com/
