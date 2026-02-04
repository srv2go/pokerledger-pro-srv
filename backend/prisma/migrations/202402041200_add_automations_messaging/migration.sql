-- Enable UUID generation when available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Automation enums
DO $$ BEGIN
    CREATE TYPE "AutomationTrigger" AS ENUM ('PRE_GAME_REMINDER','IN_SESSION_ALERT','POST_GAME_SUMMARY','WEEKLY_DIGEST','MONTHLY_REPORT','CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "AutomationPreset" AS ENUM ('TWO_HOURS_BEFORE','ONE_HOUR_BEFORE','THIRTY_MINUTES_BEFORE','DAY_AFTER','WEEKLY_SUMMARY','MONTHLY_REPORT','CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Consent enum
DO $$ BEGIN
    CREATE TYPE "ConsentStatus" AS ENUM ('ALLOWED','REVOKED','PENDING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Automations table
CREATE TABLE IF NOT EXISTS "automations" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "hostId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" "AutomationTrigger" NOT NULL DEFAULT 'PRE_GAME_REMINDER',
    "preset" "AutomationPreset" NOT NULL DEFAULT 'TWO_HOURS_BEFORE',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "cronExpression" TEXT,
    "channels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "automations_hostId_key_idx" ON "automations" ("hostId","key");

-- Automation overrides
CREATE TABLE IF NOT EXISTS "automation_overrides" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "automationId" TEXT NOT NULL REFERENCES "automations"("id") ON DELETE CASCADE,
    "playerId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "channels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "muted" BOOLEAN NOT NULL DEFAULT FALSE,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "automation_overrides_unique" ON "automation_overrides" ("automationId","playerId");

-- Messaging consent tracking
CREATE TABLE IF NOT EXISTS "messaging_consents" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "channel" "NotificationChannel" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'ALLOWED',
    "source" TEXT,
    "capturedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "revokedAt" TIMESTAMPTZ,
    "metadata" JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS "messaging_consents_user_channel" ON "messaging_consents" ("userId","channel");
