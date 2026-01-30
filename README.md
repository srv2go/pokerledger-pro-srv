# PokerLedger Pro 🃏

A mobile-first web application for hosts of private Texas Hold'em and Omaha poker games to streamline financial tracking, player management, and communication during home games.

![PokerLedger Pro](https://img.shields.io/badge/version-1.0.0-green)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D14-blue)

## Features

### Core Features
- **Game Management**: Create, start, pause, and end poker games
- **Player Tracking**: Manage players, buy-ins, re-buys, and cash-outs
- **Real-time Updates**: WebSocket-powered live dashboard
- **WhatsApp Notifications**: Instant notifications for top-up requests
- **Financial Tracking**: Automatic profit/loss calculations

### Host Capabilities
- Create games with custom buy-ins, blinds, and rake
- Invite players via email/phone
- Approve/reject top-up requests via WhatsApp
- Track house collections and game statistics
- View player performance history

### Player Features
- Join games via invitation
- Request top-ups during games
- View personal statistics and history
- Track profit/loss across sessions

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** with Prisma ORM
- **WebSocket** for real-time updates
- **JWT** authentication
- **WhatsApp Cloud API** for notifications

### Frontend
- **React 18** with Vite
- **Tailwind CSS** with custom poker theme
- **React Router** for navigation
- **Lucide Icons** for UI elements

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- WhatsApp Business Account (for notifications)

### 1. Clone and Install

```bash
# Navigate to project
cd pokerledger-pro

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb pokerledger

# Copy environment file
cd backend
cp .env.example .env

# Update DATABASE_URL in .env with your PostgreSQL credentials
# Example: postgresql://username:password@localhost:5432/pokerledger

# Run database migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

### 3. Configure Environment

Edit `backend/.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/pokerledger"

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# WhatsApp Cloud API (optional - for notifications)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-token

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Start Development Servers

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend  
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

## WhatsApp Integration Setup

### 1. Create Meta Business Account
1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Create a Business account
3. Navigate to WhatsApp Business API

### 2. Configure WhatsApp Business API
1. Get your Phone Number ID
2. Generate a permanent access token
3. Add these to your `.env` file

### 3. Set Up Webhook
1. Configure your webhook URL: `https://yourdomain.com/webhooks/whatsapp`
2. Set the verify token (same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
3. Subscribe to `messages` webhook events

### How WhatsApp Notifications Work
This is a high-trust system designed for close-knit poker groups. The host has full authority to record all transactions, and players receive courtesy notifications:

1. **Host records buy-in** → Player receives WhatsApp confirmation
2. **Host adds top-up** → Player receives notification with new total
3. **Host records cash-out** → Player receives summary with profit/loss

No approval queues - the host's word is final, just like a real home game!

## API Documentation

### Authentication
```
POST /api/auth/register - Register new user
POST /api/auth/login    - Login user
GET  /api/auth/me       - Get current user profile
```

### Games
```
GET    /api/games           - List all games
POST   /api/games           - Create new game
GET    /api/games/:id       - Get game details
PUT    /api/games/:id       - Update game
DELETE /api/games/:id       - Delete game
POST   /api/games/:id/start - Start game
POST   /api/games/:id/pause - Pause game
POST   /api/games/:id/end   - End game
```

### Transactions
```
POST /api/transactions/buy-in          - Record buy-in (host only, notifies player)
POST /api/transactions/top-up          - Add chips to player (host only, notifies player)
POST /api/transactions/cash-out        - Record cash-out (host only, sends summary)
POST /api/transactions/adjustment      - Balance correction (host only)
GET  /api/transactions/game/:gameId    - Get game transactions
GET  /api/transactions/player/:playerId - Get player history
```

### Players
```
GET  /api/players          - List all players
POST /api/players          - Create player
GET  /api/players/:id      - Get player details
GET  /api/players/:id/history - Get player game history
```

## Project Structure

```
pokerledger-pro/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   ├── src/
│   │   ├── index.js          # Express server entry
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.js       # Auth endpoints
│   │   │   ├── games.js      # Game management
│   │   │   ├── players.js    # Player management
│   │   │   ├── transactions.js # Financial tracking
│   │   │   ├── notifications.js # Notification management
│   │   │   └── webhooks.js   # WhatsApp webhooks
│   │   └── services/
│   │       ├── websocket.js  # Real-time updates
│   │       └── whatsapp.js   # WhatsApp Cloud API
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui.jsx        # Reusable UI components
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Authentication state
│   │   ├── hooks/
│   │   │   └── index.js      # Custom React hooks
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CreateGame.jsx
│   │   │   └── GameDetail.jsx
│   │   ├── services/
│   │   │   ├── api.js        # API client
│   │   │   └── websocket.js  # WebSocket client
│   │   ├── styles/
│   │   │   └── index.css     # Tailwind + custom styles
│   │   ├── App.jsx           # Routes configuration
│   │   └── main.jsx          # Entry point
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

## Key Workflows

### Creating a Game
1. Host clicks "New Game" on Dashboard
2. Fills in game details (name, type, buy-in, blinds)
3. Invites players from their contact list
4. Players receive WhatsApp invitations
5. Game is created in SCHEDULED status

### During Active Game
1. Host starts game → Status changes to ACTIVE
2. Host adds players and records buy-ins → Players get WhatsApp confirmations
3. Player needs more chips → Host adds top-up directly
4. Player gets WhatsApp notification of new balance
5. All balances update in real-time for the host

### Ending a Game
1. Host records cash-outs for remaining players
2. Host clicks "End Game"
3. Final balances calculated
4. Profit/loss displayed for each player
5. Game moves to COMPLETED status

## Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Start production server
cd ../backend
NODE_ENV=production npm start
```

### Environment Variables (Production)
- Use strong JWT_SECRET
- Configure proper CORS origins
- Set up SSL/TLS
- Use production PostgreSQL instance
- Configure WhatsApp Business API with verified number

## Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS configuration
- Helmet.js security headers
- SQL injection prevention via Prisma

## Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
MIT License - see LICENSE file for details.

## Support
For support, email support@pokerledger.pro or create an issue in this repository.

---

Built with ♠️ ♥️ ♣️ ♦️ by the PokerLedger Team
