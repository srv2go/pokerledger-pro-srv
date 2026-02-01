-- Add missing columns to users table
-- PIN for quick unlock
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pin" TEXT;

-- Subscription tier (FREE or PREMIUM)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Subscription') THEN
        CREATE TYPE "Subscription" AS ENUM ('FREE', 'PREMIUM');
    END IF;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription" "Subscription" DEFAULT 'FREE';

-- WhatsApp enabled flag
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsappEnabled" BOOLEAN DEFAULT true;

-- Remember token for auto-login
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rememberToken" TEXT;
