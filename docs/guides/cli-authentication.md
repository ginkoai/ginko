# CLI Authentication Guide

## Overview

The Ginko CLI uses **Supabase OAuth with GitHub** for authentication. This provides a secure, user-friendly authentication flow that works seamlessly between the dashboard and CLI.

**Key Features:**
- Browser-based OAuth flow (no manual token copy-paste)
- Automatic token refresh
- Secure local token storage (~/.ginko/auth.json)
- Works with same user accounts as dashboard

## Architecture

### Authentication Flow

```
1. User runs: ginko login
   ↓
2. CLI starts localhost server on port 8765
   ↓
3. CLI opens browser to Supabase OAuth page
   ↓
4. User authenticates with GitHub
   ↓
5. GitHub redirects to Supabase
   ↓
6. Supabase redirects to http://localhost:8765/callback?code=xxx
   ↓
7. CLI captures code from callback
   ↓
8. CLI calls /api/auth/cli to exchange code for tokens
   ↓
9. API returns access_token, refresh_token, user info
   ↓
10. CLI saves tokens to ~/.ginko/auth.json
    ↓
11. ✓ Authentication complete!
```

### Token Storage Format

Tokens are stored in `~/.ginko/auth.json` with restrictive permissions (0600):

```json
{
  "access_token": "eyJ...",
  "refresh_token": "...",
  "expires_at": 1730123456,
  "user": {
    "id": "uuid-xxx",
    "email": "user@example.com",
    "github_username": "username",
    "github_id": "12345",
    "full_name": "User Name"
  }
}
```

### Automatic Token Refresh

The CLI automatically refreshes expired access tokens:

1. When making API request, check if token expires in <5 minutes
2. If yes, call `/api/auth/cli` (PUT) with refresh_token
3. Get new access_token and refresh_token
4. Update ~/.ginko/auth.json
5. Retry original request with new token

**User never sees token expiration errors!**

## CLI Commands

### `ginko login`

Authenticate CLI with GitHub via Supabase OAuth.

```bash
# Standard login
ginko login

# Force re-authentication (even if already logged in)
ginko login --force
```

**Output:**
```
🔐 Authenticating Ginko CLI

✔ Local callback server started
✔ Opening browser for authentication...
✔ Waiting for authentication in browser...
✔ Exchanging code for tokens...
✔ Authentication successful!

✓ Successfully authenticated
  User: chris@example.com
  GitHub: @chrisnorton

  Your credentials are stored in ~/.ginko/auth.json
```

### `ginko logout`

Clear local authentication session.

```bash
ginko logout
```

**Output:**
```
✓ Successfully logged out
  User: chris@example.com
  Auth file removed: /Users/chris/.ginko/auth.json

  Use `ginko login` to authenticate again
```

### `ginko whoami`

Display current authentication status.

```bash
ginko whoami
```

**Output:**
```
🔐 Authentication Status

User Information:
  Email:          chris@example.com
  GitHub:         @chrisnorton
  GitHub ID:      123456
  Name:           Chris Norton
  User ID:        uuid-xxx

Session Status:
  Status:         Valid
  Expires in:     45 minutes
  Token prefix:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX...

  Use `ginko logout` to clear authentication
```

## API Integration

### For CLI Commands

Use the `api` utility for authenticated requests:

```typescript
import { api } from '../utils/api-client.js';

export async function myCommand() {
  // GET request
  const { data, error } = await api.get('/api/projects');

  if (error) {
    console.error('Failed to fetch projects:', error);
    return;
  }

  console.log('Projects:', data);

  // POST request
  const { data: newProject } = await api.post('/api/projects', {
    name: 'My Project',
    description: 'A new project'
  });

  console.log('Created:', newProject);
}
```

### For API Routes

Use the `withAuth` middleware for protected endpoints:

```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    // User is authenticated, query database
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id);

    return NextResponse.json({ projects });
  });
}
```

## Environment Variables

### Dashboard (Next.js)

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### CLI

Optional environment variable (defaults to production):

```bash
# Override API URL (useful for local testing)
export GINKO_API_URL=http://localhost:3000
```

## Testing

### Test OAuth Flow Locally

1. **Start dashboard in dev mode:**
   ```bash
   cd dashboard
   npm run dev
   ```

2. **Set CLI to use local API:**
   ```bash
   export GINKO_API_URL=http://localhost:3000
   ```

3. **Test login flow:**
   ```bash
   ginko login
   ```

4. **Verify authentication:**
   ```bash
   ginko whoami
   ```

5. **Test logout:**
   ```bash
   ginko logout
   ```

### Test Production Flow

1. **Build and deploy dashboard:**
   ```bash
   cd dashboard
   npm run build
   vercel --prod
   ```

2. **Use production API (default):**
   ```bash
   unset GINKO_API_URL  # Use default https://app.ginko.ai
   ```

3. **Test login:**
   ```bash
   ginko login
   ```

## Database Schema

The OAuth system uses existing Supabase tables:

### `auth.users`

Created automatically by Supabase Auth. Contains:
- GitHub OAuth provider data
- Email, user metadata

### `user_profiles`

Extended user information (created by trigger):

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  github_username TEXT,
  github_id TEXT,
  api_key_hash TEXT,
  -- ... other fields
);
```

## Security Considerations

### Token Storage

- **Location:** `~/.ginko/auth.json`
- **Permissions:** 0600 (owner read/write only)
- **Encryption:** Tokens stored in plaintext locally (like git credentials)
- **Rotation:** Access tokens expire after 1 hour, auto-refreshed

### API Security

- **Bearer tokens:** Sent via `Authorization: Bearer <token>` header
- **HTTPS only:** Production API requires HTTPS
- **Token validation:** Every request verifies token with Supabase
- **RLS policies:** Database queries automatically scoped to user

### Best Practices

1. **Never commit** ~/.ginko/auth.json to git
2. **Logout on shared machines:** Always run `ginko logout` when done
3. **Rotate tokens:** Use `ginko login --force` to get new tokens
4. **Monitor usage:** Check `ginko whoami` for token status

## Troubleshooting

### "Port already in use"

Another `ginko login` is running. Kill it or wait for timeout (2 minutes).

```bash
# Find and kill process using port 8765
lsof -ti:8765 | xargs kill -9
```

### "Authentication timeout"

Complete OAuth flow within 2 minutes. Try again:

```bash
ginko login --force
```

### "Failed to refresh token"

Session expired. Re-authenticate:

```bash
ginko logout
ginko login
```

### "Not authenticated"

Token file missing or invalid:

```bash
ginko login
```

### "Could not connect to Ginko API"

API unreachable. Check:

1. **Internet connection**
2. **API URL:** `echo $GINKO_API_URL`
3. **Dashboard status:** https://app.ginko.ai

## Implementation Files

### CLI Files

- `packages/cli/src/commands/login.ts` - Login command
- `packages/cli/src/commands/logout.ts` - Logout command
- `packages/cli/src/commands/whoami.ts` - Status command
- `packages/cli/src/utils/auth-storage.ts` - Token storage utilities
- `packages/cli/src/utils/api-client.ts` - Authenticated API client

### Dashboard Files

- `dashboard/src/app/api/auth/cli/route.ts` - Token exchange endpoint
- `dashboard/src/lib/auth/middleware.ts` - Auth verification middleware
- `dashboard/src/lib/supabase/server.ts` - Supabase server client
- `database/mvp-schema.sql` - Database schema with user_profiles

## Future Enhancements

- **API keys:** Alternative to OAuth for CI/CD environments
- **Multi-project support:** Switch between different Ginko projects
- **Team management:** CLI commands for team operations
- **Offline mode:** Cache auth status for offline usage
