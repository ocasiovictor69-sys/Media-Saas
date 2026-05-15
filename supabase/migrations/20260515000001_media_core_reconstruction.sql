-- Flow Media Core Schema (Reconstruction)

-- 1. Media Assets (MOD-M01 Storage)
CREATE TABLE public.media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    s3_key TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('VIDEO', 'IMAGE', 'AUDIO', 'DOCUMENT')),
    status TEXT DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'PROCESSING', 'READY', 'ARCHIVED')),
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Render Jobs (MOD-M02 Processing)
CREATE TABLE public.render_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL, -- e.g., 'UPSCALE', 'GENERATE_SCRIPT', 'TRANSCODE'
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    progress INTEGER DEFAULT 0,
    result_url TEXT,
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Social Distributions (MOD-M03 Distribution)
CREATE TABLE public.social_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,
    platform TEXT CHECK (platform IN ('YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'TWITTER', 'LINKEDIN')),
    status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'POSTED', 'FAILED')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    external_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_distributions ENABLE ROW LEVEL SECURITY;

-- 5. Team-Scoped RLS Policies
DO $$ 
BEGIN
    -- Media Assets
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'media_assets_team_all') THEN
        CREATE POLICY "media_assets_team_all" ON public.media_assets FOR ALL
        USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));
    END IF;

    -- Render Jobs
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'render_jobs_team_all') THEN
        CREATE POLICY "render_jobs_team_all" ON public.render_jobs FOR ALL
        USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));
    END IF;

    -- Social Distributions
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'social_dist_team_all') THEN
        CREATE POLICY "social_dist_team_all" ON public.social_distributions FOR ALL
        USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END $$;
