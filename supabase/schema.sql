-- FLO_MEDIA Pipeline Database Schema
-- Isolated Supabase instance for FLO_MEDIA only
-- NO connection to AGENTO, AVER, AVENTRA, or TNAI

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Productions table (video projects)
CREATE TABLE IF NOT EXISTS public.productions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  script TEXT,
  status TEXT DEFAULT 'scripting' CHECK (status IN ('scripting', 'rendering', 'processing', 'ready', 'posted')),
  heygen_job_id TEXT,
  output_url TEXT,
  platforms TEXT[], -- ['youtube', 'instagram', 'linkedin', 'tiktok', 'twitter']
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own productions" ON public.productions USING (auth.uid() = user_id);

-- Assets table (media library)
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'image', 'audio', 'caption')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own assets" ON public.assets USING (auth.uid() = user_id);

-- Distribution table (social media posts)
CREATE TABLE IF NOT EXISTS public.distribution (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  production_id UUID REFERENCES public.productions(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'posted', 'failed')),
  posted_url TEXT,
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.distribution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own distribution" ON public.distribution USING (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_productions_user_id ON public.productions(user_id);
CREATE INDEX IF NOT EXISTS idx_productions_status ON public.productions(status);
CREATE INDEX IF NOT EXISTS idx_productions_scheduled ON public.productions(scheduled_at) WHERE status = 'ready';
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(type);
CREATE INDEX IF NOT EXISTS idx_distribution_production ON public.distribution(production_id);
CREATE INDEX IF NOT EXISTS idx_distribution_status ON public.distribution(status);
CREATE INDEX IF NOT EXISTS idx_distribution_scheduled ON public.distribution(scheduled_at) WHERE status = 'scheduled';

-- Triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_productions_updated_at BEFORE UPDATE ON public.productions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_distribution_updated_at BEFORE UPDATE ON public.distribution FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
