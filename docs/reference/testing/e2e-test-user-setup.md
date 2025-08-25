# E2E Test User Setup Guide

**Goal**: Create a real OAuth-generated test user for reliable E2E testing.

## Current Issue

The current E2E tests use a hardcoded API key:
```
cmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk
```

But this user doesn't exist in the MVP schema `user_profiles` table, causing authentication failures.

## Solution: Create Real OAuth Test User

### Step 1: Access OAuth Dashboard
1. Navigate to production OAuth dashboard: `https://ginkocmp-dashboard.vercel.app`
2. Sign in with GitHub using a dedicated test account (create if needed)
3. The OAuth flow will automatically:
   - Create entry in `auth.users` (Supabase managed)
   - Trigger `handle_new_user()` function
   - Generate entry in `user_profiles` with hashed API key

### Step 2: Extract API Key
1. Access Supabase dashboard
2. Navigate to Table Editor → user_profiles
3. Find the test user's record
4. Copy the `api_key_hash` value for debugging (if needed)
5. **Note**: The plaintext API key is only available during user creation

### Step 3: Alternative - Direct Database Insert
If OAuth dashboard isn't available, manually create test user:

```sql
-- Insert test user into auth.users (Supabase managed)
INSERT INTO auth.users (
  id, 
  email, 
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  'e2e-test-user-001',
  'e2e-test@ginko.ai', 
  NOW(),
  NOW(),
  NOW()
);

-- The handle_new_user() trigger will automatically create user_profiles entry
-- But we need to know the generated API key...
```

### Step 4: Temporary Solution - Log API Keys
For E2E testing setup, temporarily modify the `handle_new_user()` trigger to log the plaintext API key:

```sql
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
    
    -- TEMPORARY: Log the plaintext API key for E2E setup
    RAISE NOTICE 'E2E API KEY FOR USER %: %', NEW.id, new_api_key;
    
    INSERT INTO public.user_profiles (
        id, email, full_name, avatar_url, github_username, 
        github_id, api_key_hash, api_key_prefix
    ) VALUES (
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
```

### Step 5: Create Test User via OAuth
1. Navigate to OAuth dashboard
2. Sign in with test GitHub account  
3. Check Supabase logs for the API key output
4. Update E2E test configuration with real API key

### Step 6: Update Test Configuration
Once you have the real API key, update:

```typescript
// In api/_utils.ts
if (apiKey === 'YOUR_REAL_OAUTH_GENERATED_KEY') {
  // Use OAuth-generated user info
}
```

## Security Note

**Remember to remove the logging from `handle_new_user()` after E2E setup is complete!**

```sql
-- Remove logging after setup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_api_key TEXT;
    hashed_key TEXT;
BEGIN
    new_api_key := generate_api_key();
    hashed_key := crypt(new_api_key, gen_salt('bf', 12));
    
    -- Logging removed for security
    
    INSERT INTO public.user_profiles (
        id, email, full_name, avatar_url, github_username, 
        github_id, api_key_hash, api_key_prefix
    ) VALUES (
        NEW.id,
        COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
        -- ... rest of insert
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Next Steps

1. Chris: Create OAuth test user via dashboard
2. Extract the generated API key  
3. Update E2E test configuration
4. Run end-to-end tests with real OAuth user