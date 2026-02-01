# PokerLedger Pro v3.0

Mobile-first web app for managing private poker games — designed for high-trust, close-knit groups.

## What's New in v3

### Role-Based Access
| Role | Permissions | Limit |
|------|-------------|-------|
| **Super Admin** | Full system access, promote admins | Max 3 |
| **Admin** | Manage hosts, view all data, host games | Unlimited |
| **Host** | Create tables, manage players, record transactions | Unlimited |
| **Player** | View own game history & stats only | Read-only |

### Session Persistence
- **Remember Me** — auto-login on app reopen (90-day token)
- **PIN unlock** — optional 4-6 digit quick unlock
- **Android back button** — navigates to previous screen, doesn't close app

### Points System (Currency-Free)
All amounts display as **points** (e.g., "300 pts" not "$300") — works for any geo-location.

### Subscription Model (Future)
- **Free**: View last 3 games only
- **Premium**: Full history, extended inbox

### Game Features
- **Player Rejoin** — cashed-out players can rejoin same game (session tracking, no duplicates)
- **Individual Cash-out** — settle one player while game continues
- **Table Cash-out** — settle all remaining players at once, with expense fields
- **Close Table** — end game with full tally
- **Float** — host buffer/escrow chips with dealer, tracked in rake formula
- **Expenses** — food, rent, dealer, misc — deducted in tally
- **Rake Formula**: `(Float + Player Buy-ins) - Cash-outs - Expenses = Rake`
- **Flexible Cash-out** — player can cash out any amount (including 0 if they owe host)
- **Excel Export** — download complete game data after closing

### Rolling Balance & Settlement
- Cross-game running balance per player-host pair
- Send settlement reminders via WhatsApp or in-app
- Host can send balance summaries outside games

### WhatsApp Integration (Simplified)
Plain notifications — no game details exposed:
- Buy-in: `"100 points credited at 8:30 PM"`
- Cash-out: `"Debited 300 points, balance 450 points. Net: +150 points"`
- Toggle WhatsApp on/off per player for privacy

### In-App Inbox
- Premium users see last 6+ games of messages
- Settlement reminders, balance updates, game summaries

### Rake Privacy
- Only Super Admin, Admin, and Host see rake percentage
- Players never see rake data

## Quick Start

```bash
# 1. Backend
cd backend
cp .env.example .env  # Edit with your DB credentials
npm install
npx prisma migrate dev --name init
npm run dev

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Backend: http://localhost:3001
Frontend: http://localhost:3000

## API Reference

### Auth
```
POST /api/auth/register        - Register (choose HOST or PLAYER role)
POST /api/auth/login           - Login with Remember Me
POST /api/auth/auto-login      - Auto-login with remember token
POST /api/auth/verify-pin      - Quick unlock with PIN
POST /api/auth/set-pin         - Set/change PIN
GET  /api/auth/me              - Get profile
PUT  /api/auth/profile         - Update profile
POST /api/auth/promote         - Promote user role (admin+)
```

### Games
```
GET    /api/games              - List games (role-filtered)
GET    /api/games/:id          - Game detail with stats & tally
POST   /api/games              - Create game (host+)
POST   /api/games/:id/start    - Start game
POST   /api/games/:id/pause    - Pause
POST   /api/games/:id/resume   - Resume
POST   /api/games/:id/end      - End game (updates rolling balances)
POST   /api/games/:id/float    - Add float
POST   /api/games/:id/expense  - Add expense
POST   /api/games/:id/table-cashout - Cash out all + expenses
POST   /api/games/:id/invite   - Invite players (WhatsApp)
```

### Transactions
```
POST /api/transactions/buy-in       - Buy-in / rejoin (host)
POST /api/transactions/top-up       - Add points (host)
POST /api/transactions/cash-out     - Individual cash-out (host)
POST /api/transactions/adjustment   - Balance correction (host)
PUT  /api/transactions/:txId        - Edit past transaction
GET  /api/transactions/game/:id     - Game transactions
GET  /api/transactions/player/:id   - Player transaction history
```

### Stats & Export
```
GET  /api/stats/host-dashboard     - Host grid view (all players, rolling balances)
GET  /api/stats/my-stats           - Player personal stats
GET  /api/stats/game-history       - Completed games
GET  /api/export/game/:id          - Download game Excel
```

### Players & Settlement
```
GET  /api/players                  - List players
POST /api/players                  - Create player (host)
GET  /api/players/balances/rolling - Rolling balances
POST /api/players/reminder/:id     - Send settlement reminder
POST /api/players/send-summary/:id - Send balance summary
```

### Notifications
```
GET  /api/notifications/inbox      - In-app inbox
PUT  /api/notifications/inbox/:id/read - Mark read
PUT  /api/notifications/whatsapp-toggle - Enable/disable WhatsApp
```

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, React Router
- **Backend**: Node.js, Express, Prisma ORM, PostgreSQL
- **Real-time**: WebSocket
- **Notifications**: WhatsApp Cloud API
- **Export**: ExcelJS
