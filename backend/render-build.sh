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

# Push schema to database (adds missing columns)
echo "🗄️ Pushing schema to database..."
npx prisma db push --accept-data-loss

echo "✅ Build complete!"