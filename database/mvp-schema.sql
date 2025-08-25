-- ContextMCP MVP Database Schema
-- Production-ready schema for Supabase deployment
-- Supabase automatically creates auth.users table

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create sessions table for capture/resume functionality
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(title) <= 200),
    description TEXT CHECK (length(description) <= 1000),
    content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    quality_score INTEGER DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
    tags TEXT[] DEFAULT '{}',
    is_archived BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Search optimization (will be added via trigger)
    search_vector tsvector
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS sessions_search_idx ON public.sessions USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON public.sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON public.sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_updated_at_idx ON public.sessions (updated_at DESC);
CREATE INDEX IF NOT EXISTS sessions_quality_score_idx ON public.sessions (quality_score DESC);
CREATE INDEX IF NOT EXISTS sessions_tags_idx ON public.sessions USING GIN (tags);
CREATE INDEX IF NOT EXISTS sessions_archived_idx ON public.sessions (is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS sessions_public_idx ON public.sessions (is_public) WHERE is_public = true;

-- Row Level Security Policies
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON public.sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions" ON public.sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions" ON public.sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions" ON public.sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Create user_profiles table for additional user data
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    github_username TEXT,
    github_id TEXT,
    api_key_hash TEXT UNIQUE NOT NULL,
    api_key_prefix TEXT NOT NULL,
    api_key_created_at TIMESTAMPTZ DEFAULT NOW(),
    preferences JSONB DEFAULT '{}',
    usage_stats JSONB DEFAULT '{"sessions_created": 0, "last_active": null}',
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_profiles
CREATE INDEX IF NOT EXISTS user_profiles_github_username_idx ON public.user_profiles (github_username);
CREATE INDEX IF NOT EXISTS user_profiles_api_key_hash_idx ON public.user_profiles (api_key_hash);
CREATE INDEX IF NOT EXISTS user_profiles_subscription_tier_idx ON public.user_profiles (subscription_tier);
CREATE INDEX IF NOT EXISTS user_profiles_is_active_idx ON public.user_profiles (is_active) WHERE is_active = true;

-- Create session_analytics table for tracking usage
CREATE TABLE IF NOT EXISTS public.session_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'viewed', 'resumed', 'archived')),
    event_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for session_analytics
CREATE INDEX IF NOT EXISTS session_analytics_session_id_idx ON public.session_analytics (session_id);
CREATE INDEX IF NOT EXISTS session_analytics_user_id_idx ON public.session_analytics (user_id);
CREATE INDEX IF NOT EXISTS session_analytics_event_type_idx ON public.session_analytics (event_type);
CREATE INDEX IF NOT EXISTS session_analytics_created_at_idx ON public.session_analytics (created_at DESC);

-- RLS for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS for session_analytics
ALTER TABLE public.session_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics" ON public.session_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON public.session_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to generate API keys matching MCP server format
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
    environment TEXT;
    key_secret TEXT;
BEGIN
    -- Detect environment (defaulting to 'test' for development)
    environment := CASE 
        WHEN current_setting('app.environment', true) = 'production' THEN 'live'
        ELSE 'test'
    END;
    
    -- Generate base64url encoded secret (PostgreSQL doesn't have base64url, so we use hex for now)
    -- This matches the format: wmcp_sk_{environment}_{secret}
    key_secret := encode(gen_random_bytes(32), 'hex');
    
    RETURN 'wmcp_sk_' || environment || '_' || key_secret;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_api_key TEXT;
    hashed_key TEXT;
BEGIN
    -- Enable pgcrypto extension if not already enabled
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    
    -- Generate new API key
    new_api_key := generate_api_key();
    
    -- Hash the API key with bcrypt (cost factor 12)
    hashed_key := crypt(new_api_key, gen_salt('bf', 12));
    
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        avatar_url, 
        github_username, 
        github_id,
        api_key_hash,
        api_key_prefix
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'user_name',
        NEW.raw_user_meta_data->>'provider_id',
        hashed_key,
        left(new_api_key, 8)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.title, '') || ' ' || 
        COALESCE(NEW.description, '') || ' ' ||
        array_to_string(COALESCE(NEW.tags, '{}'), ' ')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to track session analytics
CREATE OR REPLACE FUNCTION public.track_session_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.session_analytics (session_id, user_id, event_type, event_data)
        VALUES (NEW.id, NEW.user_id, 'created', jsonb_build_object('title', NEW.title));
        
        -- Update user usage stats
        UPDATE public.user_profiles 
        SET usage_stats = jsonb_set(
            jsonb_set(
                COALESCE(usage_stats, '{}'), 
                '{sessions_created}', 
                to_jsonb(COALESCE((usage_stats->>'sessions_created')::int, 0) + 1)
            ),
            '{last_active}', 
            to_jsonb(NOW())
        )
        WHERE id = NEW.user_id;
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.session_analytics (session_id, user_id, event_type, event_data)
        VALUES (NEW.id, NEW.user_id, 'updated', jsonb_build_object(
            'old_title', OLD.title,
            'new_title', NEW.title
        ));
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for search vector
CREATE TRIGGER update_sessions_search_vector
    BEFORE INSERT OR UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Triggers for session analytics
CREATE TRIGGER track_session_events
    AFTER INSERT OR UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.track_session_event();

-- Function to regenerate API key
CREATE OR REPLACE FUNCTION public.regenerate_api_key(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    new_key TEXT;
BEGIN
    -- Check if user owns this profile
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = user_uuid AND id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    new_key := generate_api_key();
    
    UPDATE public.user_profiles 
    SET api_key = new_key, 
        api_key_created_at = NOW()
    WHERE id = user_uuid;
    
    RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;