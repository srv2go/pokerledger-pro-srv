#!/bin/bash

# Diagnostic script to check backend health and database connectivity

echo "🔍 PokerLedger Backend Diagnostics"
echo "=================================="
echo ""

BACKEND_URL="https://pokerledger-backend.onrender.com"

echo "1️⃣ Testing Health Endpoint..."
HEALTH=$(curl -s "$BACKEND_URL/health")
echo "Response: $HEALTH"
echo ""

echo "2️⃣ Testing Registration Endpoint..."
REGISTER=$(curl -s -X POST "$BACKEND_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456","displayName":"Test User"}')
echo "Response: $REGISTER"
echo ""

if [[ "$REGISTER" == *"Internal server error"* ]]; then
    echo "❌ Registration Failed - Internal Server Error"
    echo ""
    echo "📋 Common Causes:"
    echo "  1. Database migrations not run"
    echo "  2. Database connection failed"
    echo "  3. Prisma client not generated"
    echo ""
    echo "🔧 Solutions:"
    echo "  1. Go to Render Dashboard → pokerledger-backend → Logs"
    echo "  2. Look for Prisma/Database errors"
    echo "  3. Use Shell tab to run: cd backend && npx prisma migrate deploy"
    echo "  4. Or click 'Manual Deploy' → 'Clear build cache & deploy'"
    echo ""
elif [[ "$REGISTER" == *"error"* ]]; then
    echo "⚠️  Registration Failed - Check error message above"
    echo ""
elif [[ "$REGISTER" == *"token"* ]] || [[ "$REGISTER" == *"user"* ]]; then
    echo "✅ Registration Working!"
    echo ""
else
    echo "⚠️  Unexpected response - Check logs"
    echo ""
fi

echo "3️⃣ Next Steps:"
echo "  • Check Render logs: https://dashboard.render.com"
echo "  • Look for build/migration errors"
echo "  • Verify DATABASE_URL is set correctly"
