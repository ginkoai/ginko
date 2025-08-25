-- Migration: Add API Key Hashing to MVP Schema
-- Date: 2025-08-09
-- Purpose: Replace plaintext API keys with bcrypt hashes for security

-- Step 1: Add new columns for hashed API keys
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS api_key_hash TEXT,
ADD COLUMN IF NOT EXISTS api_key_prefix TEXT;

-- Step 2: Create temporary function to hash existing API keys
CREATE OR REPLACE FUNCTION migrate_api_keys()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    hashed_key TEXT;
BEGIN
    -- Enable pgcrypto extension if not already enabled
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    
    -- Hash all existing plaintext API keys
    FOR user_record IN 
        SELECT id, api_key 
        FROM public.user_profiles 
        WHERE api_key IS NOT NULL 
        AND api_key_hash IS NULL
    LOOP
        -- Generate bcrypt hash (cost factor 12, same as AuthManager)
        hashed_key := crypt(user_record.api_key, gen_salt('bf', 12));
        
        -- Update with hash and prefix
        UPDATE public.user_profiles 
        SET 
            api_key_hash = hashed_key,
            api_key_prefix = left(user_record.api_key, 8),
            updated_at = NOW()
        WHERE id = user_record.id;
        
        RAISE NOTICE 'Hashed API key for user %', user_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Execute migration
SELECT migrate_api_keys();

-- Step 4: Update the OAuth user creation function to use hashing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_api_key TEXT;
    hashed_key TEXT;
BEGIN
    -- Generate new API key
    new_api_key := generate_api_key();
    
    -- Hash the API key with bcrypt
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
    
    -- Log the plaintext API key temporarily (user needs to see it once)
    RAISE NOTICE 'Generated API key for user %: %', NEW.id, new_api_key;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create index on api_key_hash
CREATE INDEX IF NOT EXISTS user_profiles_api_key_hash_idx ON public.user_profiles (api_key_hash);

-- Step 6: Drop old plaintext api_key column (after verification)
-- ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS api_key;
-- DROP INDEX IF EXISTS user_profiles_api_key_idx;

-- Step 7: Clean up migration function
DROP FUNCTION IF EXISTS migrate_api_keys();

-- Migration complete: API keys are now securely hashed