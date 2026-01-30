#!/usr/bin/env bash
# Startup script that runs migrations before starting the server

echo "🚀 Starting PokerLedger Pro Backend..."

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Check if migrations succeeded
if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migration failed!"
    exit 1
fi

# Start the server
echo "🎯 Starting server..."
npm start
