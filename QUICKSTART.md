# 🎯 Quick Start: Free Backend Deployment

## What You Need
1. GitHub account (free) - https://github.com
2. Render account (free) - https://render.com

## 5-Minute Setup

### Step 1: Push to GitHub

```bash
cd /Users/srinivasvaradan/Downloads/pokerledger-pro

# Login to GitHub (if not already logged in)
# Option 1: Using browser
git remote add origin https://github.com/YOUR_USERNAME/pokerledger-pro.git
git push -u origin main

# Option 2: Using GitHub CLI (if installed)
gh repo create pokerledger-pro --private --source=. --push
```

### Step 2: Deploy on Render

1. **Go to**: https://render.com → Sign up with GitHub
2. **New PostgreSQL Database**:
   - Name: `pokerledger-db`
   - Plan: **Free**
   - Click "Create"
   - **Copy the "Internal Database URL"**postgresql://pokerledger_db_user:OmssfsWZpGozcBZ9XsZm7vRtTIk26cHy@dpg-d5tvrnh4tr6s739l2hu0-a/pokerledger_db

3. **New Web Service**:
   - Connect your GitHub repo
   - Name: `pokerledger-backend`
   - **Build Command**: `cd backend && chmod +x render-build.sh && ./render-build.sh`
   - **Start Command**: `cd backend && npm start`
   - Plan: **Free**
   
4. **Add Environment Variables** (in Advanced section):
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=postgresql://pokerledger_db_user:OmssfsWZpGozcBZ9XsZm7vRtTIk26cHy@dpg-d5tvrnh4tr6s739l2hu0-a/pokerledger_db
   JWT_SECRET=<generate random 32-character string>
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=*
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```
   
   **Generate JWT_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Click "Create Web Service"** → Wait 5-10 minutes

### Step 3: Update Mobile App

Once deployed, you'll get a URL like: `https://pokerledger-backend.onrender.com`

Run this command:
```bash
cd /Users/srinivasvaradan/Downloads/pokerledger-pro
./update-backend-url.sh https://pokerledger-backend.onrender.com
```

This will:
- Update the API URL in your app
- Rebuild the APK automatically
- Place it in `~/Downloads/PokerLedgerPro.apk`

### Step 4: Test & Share

1. **Test backend**: Visit `https://your-url.onrender.com/health`
2. **Install APK** on your Android device
3. **Register** a new user
4. **Share APK** with your friend!

## ⚠️ Important

**Free tier limitations:**
- Service sleeps after 15 min of inactivity
- First request after sleep takes ~30-60 seconds

**To keep it awake:**
- Use https://uptimerobot.com (free)
- Ping your URL every 14 minutes

## 📚 Full Documentation

- Detailed guide: [DEPLOY_TO_RENDER.md](DEPLOY_TO_RENDER.md)
- Backend setup: [BACKEND_SETUP.md](BACKEND_SETUP.md)
- Build instructions: [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)

## 🆘 Need Help?

1. Check [DEPLOY_TO_RENDER.md](DEPLOY_TO_RENDER.md) for troubleshooting
2. Visit Render Community: https://community.render.com/
