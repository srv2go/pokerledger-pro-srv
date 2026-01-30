#!/usr/bin/env bash
# Build script for Render deployment

set -e  # Exit on any error

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

# Verify migrations
echo "✅ Verifying database setup..."
npx prisma db pull || echo "Note: Schema may not be fully synced yet"

echo "✅ Build complete!"
