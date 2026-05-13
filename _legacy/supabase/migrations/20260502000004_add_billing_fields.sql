-- Migration: Add Billing & Stripe Fields to Flow-Media Profiles
-- Created: 2026-05-02
-- Purpose: Weaponize Flow-Media for production billing

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS last_payment_failed_at TIMESTAMP WITH TIME ZONE;

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Commentary
COMMENT ON COLUMN profiles.subscription_active IS 'TomorrowNow AI — Billing status (MOD-D14)';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe CID for customer management';
