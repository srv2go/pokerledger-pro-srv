# Poker Ledger Pro v2 - Installation & Testing Guide

## 📦 What's New in v2

### Critical Fixes
- ✅ **Android back button now navigates** instead of closing the app
- ✅ **+ button visible on all phones** (including Samsung with notch)
- ✅ **Auto-login working** - No need to login every time

### Major Changes
- 🎯 **Points System** - Removed $ symbols, using "points" for geo-neutral currency
- 📱 **Simplified WhatsApp** - Clean, short messages with just points, balance, time
- 🔐 **Role-Based System** - Super Admin, Admin, Host, Player roles (schema ready)
- 💰 **Float & Expenses** - Track dealer float, food, rent, misc expenses (schema ready)
- 🔄 **Player Rejoin** - Players can rejoin after cashing out (schema ready)

---

## 📥 Installation

### Download APK
Location: `~/Downloads/PokerLedgerPro-v2.apk` (3.1MB)

### Install on Android
1. Transfer APK to your Android phone
2. Open the APK file
3. Allow "Install from unknown sources" if prompted
4. Install the app
5. Open "PokerLedger Pro"

---

## 🧪 Testing Checklist

### 1. Android Back Button ✓
- [ ] Open app and login
- [ ] Navigate to Players page
- [ ] Press Android back button
- [ ] **Expected**: Returns to Dashboard (not closes app)
- [ ] Navigate to Game Detail
- [ ] Press back button
- [ ] **Expected**: Returns to Dashboard

### 2. + Button Visibility ✓
- [ ] Go to Players page
- [ ] Check top-right corner
- [ ] **Expected**: Green + button clearly visible (not hidden by time/notch)
- [ ] Tap + button
- [ ] **Expected**: Add Player modal opens

### 3. Auto-Login ✓
- [ ] Login to the app
- [ ] Close the app completely (swipe away from recents)
- [ ] Reopen the app
- [ ] **Expected**: Automatically logged in, shows Dashboard

### 4. WhatsApp Notifications (New Format)
- [ ] Create a game
- [ ] Add a player with phone: +19808751555
- [ ] Go into game detail
- [ ] Record a buy-in for that player
- [ ] **Expected WhatsApp message**:
  ```
  💵 Buy-in recorded
  100 points
  Time: 10:30 AM
  ```
- [ ] Record a top-up
- [ ] **Expected**:
  ```
  💵 Top-up credited
  50 points
  Total invested: 150 points
  Time: 11:00 AM
  ```
- [ ] Record a cash-out
- [ ] **Expected**:
  ```
  💸 Cash-out complete
  Debited: 120 points
  Balance: -30 points
  Time: 02:15 PM
  ```

### 5. WhatsApp Error Logging (Enhanced)
- [ ] Try adding phone: +917200424527 (India)
- [ ] Record a transaction
- [ ] Check Render logs at: https://dashboard.render.com
- [ ] **Expected**: Detailed error message showing why it failed
  - Error code
  - Error title
  - Error message
  - Error details

---

## 🐛 Known Issues

### 1. WhatsApp Messages Failing
**Issue**: Messages fail for numbers not in Meta allowed list  
**Affected**: +917200424527 (India), +447522868673 (UK)  
**Working**: +19808751555 (US)  
**Fix**: Add numbers to Meta Business WhatsApp settings → API Setup → Manage phone number list

### 2. Currency Still Shows $
**Issue**: Frontend components not yet updated to use points formatting  
**Affected**: Dashboard, GameDetail, modals  
**Status**: Utility ready at `/frontend/src/utils/currency.js`  
**Next**: Update all components to import `formatPoints()` instead of `formatCurrency()`

### 3. Database Migration Pending
**Issue**: Schema changes not applied to production database  
**Action Required**:
```bash
# On Render dashboard:
# 1. Go to your backend service
# 2. Click "Shell"
# 3. Run:
cd /opt/render/project/src/backend
npx prisma db push
```

---

## 📋 Database Migration Steps

### Before Migration
Your database currently has:
- User roles: HOST, PLAYER, GUEST
- No subscription tiers
- No float/expense tracking
- Unique constraint prevents player rejoin

### After Migration
You'll have:
- User roles: SUPER_ADMIN, ADMIN, HOST, PLAYER
- Subscription tiers: FREE, PREMIUM
- Float & expense fields in Game model
- Players can rejoin after cashout
- Rolling balance tracking

### Run Migration
```bash
# Option 1: Via Render Shell
1. Open https://dashboard.render.com
2. Select your backend service
3. Click "Shell" tab
4. Run: npx prisma db push

# Option 2: Via Local (if DATABASE_URL is set)
cd /Users/srinivasvaradan/Downloads/pokerledger-pro/backend
npx prisma db push
```

### Verify Migration
```bash
# Check tables updated
npx prisma studio
# Look for new fields:
# - User: role (SUPER_ADMIN), subscriptionTier, adminId, notificationsEnabled
# - Game: floatAmount, foodExpense, rentExpense, dealerExpense, miscExpense
# - GamePlayer: profitLoss, sessionNumber
```

---

## 🔍 Troubleshooting

### App Crashes on Startup
- **Cause**: Render backend sleeping (free tier)
- **Fix**: Open https://pokerledger-backend.onrender.com/health
- **Expected**: `{"status":"healthy","timestamp":"..."}`
- **Wait**: 30 seconds, then reopen app

### Back Button Still Closes App
- **Check**: Capacitor App plugin installed
- **Verify**: Look for `@capacitor/app` in frontend/package.json
- **Reinstall**: APK from correct location (v2, not v1)

### + Button Still Hidden
- **Cause**: Using old APK (v1)
- **Check**: APK date (should be Feb 1, 2026)
- **Size**: v2 is 3.1MB, v1 was 4.0MB
- **Location**: `~/Downloads/PokerLedgerPro-v2.apk`

### Login Required Every Time
- **Check**: localStorage working
- **Test**: Open Chrome DevTools → Application → Local Storage
- **Expected**: Token key present after login
- **Android**: WebView may block localStorage if app data cleared

---

## 🎯 Next Steps

### Immediate (Do Now)
1. **Test new APK** - Verify back button, + button, auto-login
2. **Run database migration** - Apply schema changes on Render
3. **Test WhatsApp** - Use +19808751555, check new message format
4. **Add phone numbers** - Add India/UK numbers to Meta allowed list

### Short Term (This Week)
5. **Hide rake from players** - Update GameDetail.jsx role check
6. **Update currency display** - Import formatPoints() everywhere
7. **Build Stats page** - Player balance grid with send reminder

### Medium Term (Next 2 Weeks)
8. **Individual player cashout** - Allow cashing out while others play
9. **Player rejoin logic** - Frontend to create new GamePlayer session
10. **Free tier enforcement** - Show only last 3 games for FREE users

### Long Term (Future)
11. **Excel export** - Generate XLSX on game close
12. **In-app inbox** - Alternative to WhatsApp
13. **Float management UI** - Add/track dealer escrow
14. **Admin dashboard** - Manage hosts and view aggregated stats

---

## 📞 Support

- **Backend**: https://pokerledger-backend.onrender.com
- **GitHub**: https://github.com/srv2go/pokerledger-pro-srv
- **Logs**: https://dashboard.render.com (select backend service → Logs)
- **Documentation**: See ENHANCEMENT_SUMMARY.md for complete roadmap

---

## 📝 Version History

### v2.0 (Feb 1, 2026)
- Android back button navigation fix
- Improved + button visibility
- Role-based system schema
- Points currency system
- Simplified WhatsApp messages
- Float & expense tracking schema
- Player rejoin support
- Enhanced error logging

### v1.0 (Jan 31, 2026)
- Initial APK release
- Basic game management
- Player tracking
- WhatsApp notifications
- Free hosting on Render

---

**Current APK**: `~/Downloads/PokerLedgerPro-v2.apk` (3.1MB)  
**Build Date**: February 1, 2026  
**Status**: ✅ Ready for testing
