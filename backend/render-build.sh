#!/usr/bin/env bash
# Build script for Render deployment

echo "🔨 Building PokerLedger Pro Backend..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

echo "✅ Build complete!"
