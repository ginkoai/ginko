-- Device Authentication Requests
-- Implements device code flow for CLI authentication (like GitHub CLI)
--
-- Flow:
-- 1. CLI calls /api/auth/device/init -> creates pending row with device_id + user_code
-- 2. User opens browser, logs in, enters user_code
-- 3. Dashboard calls /api/auth/device/authorize -> validates code, generates API key
-- 4. CLI polls /api/auth/device/status -> receives API key when authorized

CREATE TABLE IF NOT EXISTS device_auth_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL UNIQUE,
  user_code VARCHAR(16) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'expired', 'denied')),
  api_key TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_github_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  authorized_at TIMESTAMPTZ
);

-- Index for CLI polling (by device_id)
CREATE INDEX idx_device_auth_device_id ON device_auth_requests(device_id);

-- Index for user code lookup (case-insensitive)
CREATE INDEX idx_device_auth_user_code ON device_auth_requests(UPPER(user_code)) WHERE status = 'pending';

-- Index for cleanup of expired requests
CREATE INDEX idx_device_auth_expires ON device_auth_requests(expires_at) WHERE status = 'pending';

-- RLS policies
ALTER TABLE device_auth_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can create a device auth request (CLI is unauthenticated at this point)
CREATE POLICY "Anyone can create device auth requests"
  ON device_auth_requests
  FOR INSERT
  WITH CHECK (true);

-- Anyone can read device auth requests by device_id (CLI polling)
CREATE POLICY "Anyone can read device auth requests by device_id"
  ON device_auth_requests
  FOR SELECT
  USING (true);

-- Only authenticated users can authorize (update) requests
CREATE POLICY "Authenticated users can authorize requests"
  ON device_auth_requests
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Cleanup function for expired requests (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_device_auth_requests()
RETURNS void AS $$
BEGIN
  UPDATE device_auth_requests
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();

  -- Delete old requests (older than 1 hour)
  DELETE FROM device_auth_requests
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE device_auth_requests IS 'Stores device code flow authentication requests for CLI login';
