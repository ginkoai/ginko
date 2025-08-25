-- Add missing columns to user_profiles table for MVP schema
-- This is a minimal migration to add the required hashed API key columns

-- Enable pgcrypto extension for bcrypt functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add missing columns
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS api_key_hash TEXT,
ADD COLUMN IF NOT EXISTS api_key_prefix TEXT;

-- Create unique index on api_key_hash (will be made NOT NULL after migration)
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_api_key_hash_idx ON public.user_profiles (api_key_hash);

-- Add index for api_key_prefix
CREATE INDEX IF NOT EXISTS user_profiles_api_key_prefix_idx ON public.user_profiles (api_key_prefix);

-- Function to generate API keys matching MCP server format (if not exists)
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
    
    -- Generate base64url encoded secret
    key_secret := encode(gen_random_bytes(32), 'hex');
    
    RETURN 'wmcp_sk_' || environment || '_' || key_secret;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing plaintext api_key values to hashed format
-- This will hash existing keys and populate the new columns
DO $$
DECLARE
    user_record RECORD;
    hashed_key TEXT;
    key_prefix TEXT;
BEGIN
    FOR user_record IN 
        SELECT id, api_key 
        FROM public.user_profiles 
        WHERE api_key IS NOT NULL 
        AND (api_key_hash IS NULL OR api_key_prefix IS NULL)
    LOOP
        -- Hash the existing API key
        hashed_key := crypt(user_record.api_key, gen_salt('bf', 12));
        
        -- Extract prefix (first 8 chars after the environment part)
        -- Format: wmcp_sk_test_XXXXXXXXX -> extract first 8 chars of secret
        key_prefix := CASE 
            WHEN user_record.api_key LIKE 'wmcp_sk_%' OR user_record.api_key LIKE 'cmcp_sk_%' THEN
                substring(split_part(user_record.api_key, '_', 4), 1, 8)
            ELSE
                substring(user_record.api_key, 1, 8)
        END;
        
        -- Update the user with hashed values
        UPDATE public.user_profiles 
        SET 
            api_key_hash = hashed_key,
            api_key_prefix = key_prefix
        WHERE id = user_record.id;
        
        RAISE NOTICE 'Migrated API key for user %', user_record.id;
    END LOOP;
END $$;

-- Update function to create user profile on signup (updated for new columns)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_api_key TEXT;
    hashed_key TEXT;
    key_prefix TEXT;
BEGIN
    -- Enable pgcrypto extension if not already enabled
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    
    -- Generate new API key
    new_api_key := generate_api_key();
    
    -- Hash the API key with bcrypt (cost factor 12)
    hashed_key := crypt(new_api_key, gen_salt('bf', 12));
    
    -- Extract prefix (first 8 chars of secret part)
    key_prefix := substring(split_part(new_api_key, '_', 4), 1, 8);
    
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        avatar_url, 
        github_username, 
        github_id,
        api_key,        -- Keep plaintext for backward compatibility
        api_key_hash,   -- Add hashed version for security
        api_key_prefix  -- Add prefix for display
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'user_name',
        NEW.raw_user_meta_data->>'provider_id',
        new_api_key,    -- Store plaintext (for now)
        hashed_key,     -- Store hash (for security)
        key_prefix      -- Store prefix (for display)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        github_username = EXCLUDED.github_username,
        github_id = EXCLUDED.github_id,
        api_key = EXCLUDED.api_key,
        api_key_hash = EXCLUDED.api_key_hash,
        api_key_prefix = EXCLUDED.api_key_prefix;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;