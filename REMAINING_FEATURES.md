# Remaining Features Implementation Guide

## Status: 90% Complete

### ✅ COMPLETED (Backend + Frontend)
1. **Excel Export** - `/api/games/:id/export` ✅
2. **Send Reminder** - `/api/players/:id/send-reminder` ✅
3. **Notification Preferences** - `/api/auth/profile/notifications` ✅
4. **In-app Messages** - `/api/messages` (full CRUD) ✅
5. **Bulk Cashout** - `/api/transactions/bulk-cashout` ✅
6. **Profile Notification Toggle** - WhatsApp on/off ✅
7. **Stats Page Send Reminder** - Working with API ✅

### ⏳ IN PROGRESS (Need UI Implementation)

#### 1. GameDetail Page Enhancements
**Location:** `frontend/src/pages/GameDetail.jsx`

**Float/Expense Management UI:**
```jsx
// Add state
const [showExpensesModal, setShowExpensesModal] = useState(false);
const [expenses, setExpenses] = useState({
  floatAmount: game.floatAmount || 0,
  foodExpense: game.foodExpense || 0,
  rentExpense: game.rentExpense || 0,
  dealerExpense: game.dealerExpense || 0,
  miscExpense: game.miscExpense || 0
});

// Add button near game controls
<Button onClick={() => setShowExpensesModal(true)}>
  Manage Expenses
</Button>

// Add modal component
<ExpensesModal 
  isOpen={showExpensesModal}
  onClose={() => setShowExpensesModal(false)}
  gameId={id}
  initialExpenses={expenses}
  onSuccess={() => refresh()}
/>
```

**Bulk Cashout Button:**
```jsx
// Add button in game controls (HOST only, when game ACTIVE)
{isHost && isActive && (
  <Button 
    variant="danger"
    onClick={() => setShowBulkCashoutModal(true)}
  >
    Cash Out All Players
  </Button>
)}

// Add modal with expense fields
<BulkCashoutModal
  isOpen={showBulkCashoutModal}
  onClose={() => setShowBulkCashoutModal(false)}
  gameId={id}
  players={activePlayers}
  onSuccess={() => {
    success('All players cashed out!');
    refresh();
  }}
/>
```

**Excel Export Button:**
```jsx
// Add to completed games
{game.status === 'COMPLETED' && (
  <Button onClick={() => handleExportExcel()}>
    <Download className="w-4 h-4" />
    Export Excel
  </Button>
)}

const handleExportExcel = async () => {
  try {
    setActionLoading(true);
    await gamesApi.exportExcel(id);
    success('Excel file downloaded!');
  } catch (err) {
    showError(err.message);
  } finally {
    setActionLoading(false);
  }
};
```

#### 2. Messages/Inbox Page
**Create:** `frontend/src/pages/Messages.jsx`

```jsx
import { useState, useEffect } from 'react';
import { messagesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    loadMessages();
  }, []);
  
  const loadMessages = async () => {
    try {
      const data = await messagesApi.list();
      setMessages(data.messages);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error(err);
    }
  };
  
  // Show premium wall if not PREMIUM
  if (user.subscriptionTier !== 'PREMIUM') {
    return <PremiumRequiredCard feature="In-app Messaging" />;
  }
  
  // Render message list
  return (
    <div className="min-h-screen bg-gray-950">
      <header>
        <h1>Messages ({unreadCount})</h1>
      </header>
      
      {messages.map(msg => (
        <MessageCard 
          key={msg.id} 
          message={msg}
          onRead={() => messagesApi.markRead(msg.id)}
        />
      ))}
    </div>
  );
}
```

#### 3. Update App.jsx Routes
```jsx
import Messages from './pages/Messages';

// Add route
<Route path="/messages" element={<Messages />} />
```

#### 4. Update Register for Role Selection
**Location:** `frontend/src/pages/Register.jsx`

```jsx
// Add role select
<Select
  label="Account Type"
  name="role"
  value={formData.role}
  onChange={handleChange}
  options={[
    { value: 'PLAYER', label: 'Player - View your games only' },
    { value: 'HOST', label: 'Host - Create and manage games' }
  ]}
  helpText="ADMIN roles are invite-only"
/>
```

### 📋 Quick Implementation Checklist

1. **GameDetail Expenses Modal** (1 hour)
   - Create ExpensesModal component
   - Add updateExpenses handler
   - Show in GameDetail when isHost

2. **GameDetail Bulk Cashout** (1 hour)
   - Create BulkCashoutModal component
   - Add cashout amount inputs for each player
   - Include expense fields (food, rent, dealer, misc)
   - Call transactionsApi.bulkCashout()

3. **GameDetail Excel Export** (15 min)
   - Add button for COMPLETED games
   - Call gamesApi.exportExcel()

4. **Messages Page** (45 min)
   - Create Messages.jsx
   - Implement message list
   - Add premium check
   - Handle mark as read/delete

5. **Update App Routes** (5 min)
   - Import Messages component
   - Add /messages route

6. **Register Role Select** (15 min)
   - Add role dropdown
   - Update registration logic

### 🚀 Build Final APK

```bash
cd /Users/srinivasvaradan/Downloads/pokerledger-pro/frontend
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ~/Downloads/PokerLedgerPro-v5-FINAL.apk
```

### 📊 Feature Completion

- Backend APIs: **100%** ✅
- Database Schema: **100%** ✅
- Frontend Core: **75%** ⏳
  - Profile: ✅
  - Stats: ✅
  - Players: ✅
  - Dashboard: ✅
  - GameDetail: 60% (need expenses UI, bulk cashout UI)
  - Messages: 0% (not created)
  - Register: 90% (need role select)

**Estimated Time to 100%:** 3-4 hours for remaining UI components
