# PokerLedger Pro v3.0

A mobile-first web application for managing private poker games with complete financial tracking, player management, and real-time updates.

## Features

### Core Features
- **Game Management**: Create, start, pause, resume, and end games
- **Player Tracking**: Buy-ins, top-ups, cash-outs with session tracking
- **Points System**: Currency-free point tracking (no $ symbols)
- **Real-time Updates**: WebSocket-powered live dashboard
- **Excel Export**: Download game summaries after completion

### Role-Based Access
| Role | Permissions |
|------|-------------|
| **SUPER_ADMIN** | Full access, manage admins (max 3) |
| **ADMIN** | Manage hosts, view all games |
| **HOST** | Create/manage games, see rake |
| **PLAYER** | Join games, view personal stats |

### Financial Tracking
- **Rolling Balances**: Cross-game player balances per host
- **Float Tracking**: Dealer escrow/buffer chips
- **Expenses**: Food, Rent, Dealer, Misc categories
- **Rake Tally**: `(Float + Buy-ins) - Cash-outs - Expenses = Rake`
- **Settlement Reminders**: WhatsApp + in-app notifications

### Session Management
- **Remember Me**: 90-day auto-login tokens
- **PIN Unlock**: Quick 4-6 digit PIN access
- **Player Rejoin**: Return after cash-out (session tracking)

### Cash-out Options
1. **Individual**: Per-player button with flexible amounts
2. **Table**: All active players + expenses at once
3. **Close**: End game and update rolling balances

### Notifications
- **WhatsApp**: Simple point-based messages (no game details)
- **In-App Inbox**: Premium messaging system
- **Privacy Toggle**: Per-player WhatsApp preferences

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and secrets

# Initialize database
npm run db:migrate
npx prisma generate

# (Optional) seed default staging data
npm run db:seed

# Start server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Environment Variables

**Backend `.env`:**
```
DATABASE_URL="postgresql://user:password@localhost:5432/pokerledger"
JWT_SECRET="your-secret-key"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Optional: WhatsApp Cloud API
WHATSAPP_TOKEN=your-token
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_VERIFY_TOKEN=your-verify-token
```

## API Reference

### Authentication
```
POST /api/auth/register     - Register (role: PLAYER or HOST)
POST /api/auth/login        - Login (rememberMe option)
POST /api/auth/auto-login   - Auto-login with remember token
POST /api/auth/verify-pin   - PIN verification
POST /api/auth/set-pin      - Set/update PIN
GET  /api/auth/me           - Get profile
PUT  /api/auth/profile      - Update profile
POST /api/auth/promote      - Promote user (admin only)
```

### Games
```
GET    /api/games           - List games (subscription filtered)
POST   /api/games           - Create game (HOST+)
GET    /api/games/:id       - Get game details + stats
PUT    /api/games/:id       - Update game
DELETE /api/games/:id       - Cancel game
POST   /api/games/:id/start - Start game
POST   /api/games/:id/pause - Pause game
POST   /api/games/:id/resume - Resume game
POST   /api/games/:id/end   - End game (updates rolling balances)
POST   /api/games/:id/float - Add float (dealer escrow)
POST   /api/games/:id/expense - Add expense
POST   /api/games/:id/table-cashout - Batch cash-out all players
POST   /api/games/:id/invite - Invite players
```

### Transactions
```
POST /api/transactions/buy-in     - Initial buy-in or rejoin
POST /api/transactions/top-up     - Add chips during game
POST /api/transactions/cash-out   - Cash out (flexible amount)
POST /api/transactions/adjustment - Host correction
PUT  /api/transactions/:id        - Edit transaction (HOST+)
GET  /api/transactions/game/:id   - Game transactions
GET  /api/transactions/player/:id - Player transactions
```

### Players
```
GET  /api/players              - List all players (search)
POST /api/players              - Create player
GET  /api/players/:id          - Get player details
GET  /api/players/:id/history  - Player game history
GET  /api/players/balances/rolling - All rolling balances
POST /api/players/reminder/:id - Send settlement reminder
```

### Stats
```
GET /api/stats/host-dashboard  - Host dashboard (grid view)
GET /api/stats/my-stats        - Personal statistics
GET /api/stats/game-history    - Completed games list
```

### Export
```
GET /api/export/game/:id - Download Excel (4 sheets)
```

### Notifications
```
GET /api/notifications/inbox      - Get inbox messages
PUT /api/notifications/inbox/:id/read - Mark read
PUT /api/notifications/inbox/read-all - Mark all read
PUT /api/notifications/whatsapp-toggle - Toggle WhatsApp
GET /api/notifications/preferences - Get preferences
```

## Database Schema

### Models
- **User**: Players, hosts, admins with roles and subscriptions
- **Game**: Game sessions with status tracking
- **GamePlayer**: Junction table with session support for rejoin
- **Transaction**: All financial transactions
- **GameFloat**: Dealer escrow tracking (renamed from Float)
- **Expense**: Game expenses (food, rent, etc.)
- **RollingBalance**: Cross-game player-host balances
- **Notification**: Notification log
- **InboxMessage**: In-app messages

## Mobile Optimization

- **Safe Areas**: iOS/Android notch and navigation bar support
- **Back Button**: Android back button navigates (doesn't close app)
- **PWA Ready**: Add manifest.json for installability
- **Touch Friendly**: 44x44px minimum touch targets

## Project Structure

```
pokerledger-pro/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── index.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── games.js
│   │   │   ├── transactions.js
│   │   │   ├── players.js
│   │   │   ├── stats.js
│   │   │   ├── export.js
│   │   │   ├── notifications.js
│   │   │   └── webhooks.js
│   │   └── services/
│   │       ├── websocket.js
│   │       └── whatsapp.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── services/
    │   │   ├── api.js
    │   │   └── websocket.js
    │   ├── hooks/
    │   │   └── index.js
    │   ├── components/
    │   │   └── ui.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── CreateGame.jsx
    │   │   ├── GameDetail.jsx
    │   │   ├── Players.jsx
    │   │   ├── Stats.jsx
    │   │   ├── History.jsx
    │   │   ├── Inbox.jsx
    │   │   └── Profile.jsx
    │   └── styles/
    │       └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

## Subscription Model

| Tier | Limits |
|------|--------|
| FREE | Last 3 games visible |
| PREMIUM | Full access |

## WhatsApp Messages

Simple, privacy-focused notifications:
- Buy-in: "100 points credited at 8:30 PM"
- Cash-out: "Debited 300 points, balance 450 points. Net: +150 points"
- Reminder: "Outstanding balance: 200 points"

## License

MIT
