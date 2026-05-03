-- Initial schema for Flow-Media Pipeline
-- Created: 2026-05-01

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  notification_preferences JSONB DEFAULT '{"youtube":false,"instagram":false,"tiktok":false,"linkedin":false}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create productions table
CREATE TABLE IF NOT EXISTS productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  type TEXT DEFAULT 'video', -- video, audio, image
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID REFERENCES productions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL, -- mp4, mp3, png, etc.
  size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create distributions table
CREATE TABLE IF NOT EXISTS distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID REFERENCES productions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- youtube, instagram, tiktok, linkedin
  status TEXT DEFAULT 'pending', -- pending, scheduled, posted, failed
  external_url TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Productions: Users can view/modify their own productions
CREATE POLICY "Users can view own productions" ON productions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own productions" ON productions FOR ALL USING (auth.uid() = user_id);

-- Assets: Users can view assets for their own productions
CREATE POLICY "Users can view assets" ON assets FOR SELECT USING (
  production_id IN (SELECT id FROM productions WHERE user_id = auth.uid())
);

-- Distributions: Users can view/modify distributions for their own productions
CREATE POLICY "Users can view distributions" ON distributions FOR SELECT USING (
  production_id IN (SELECT id FROM productions WHERE user_id = auth.uid())
);
CREATE POLICY "Users can modify distributions" ON distributions FOR ALL USING (
  production_id IN (SELECT id FROM productions WHERE user_id = auth.uid())
);
