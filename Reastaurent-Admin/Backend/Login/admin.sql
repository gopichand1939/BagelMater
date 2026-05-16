CREATE TABLE IF NOT EXISTS admin (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  profile_image VARCHAR(255),
  password_hash TEXT NOT NULL,
  current_session_id TEXT,
  session_expires_at TIMESTAMPTZ,
  refresh_token_hash TEXT,
  refresh_token_expires_at TIMESTAMPTZ,
  reset_password_token_hash TEXT,
  reset_password_expires_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  is_active SMALLINT NOT NULL DEFAULT 1,
  is_deleted SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE admin
ADD COLUMN IF NOT EXISTS current_session_id TEXT,
ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT,
ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reset_password_token_hash TEXT,
ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_active SMALLINT NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_deleted SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  refresh_token_hash TEXT NOT NULL,
  session_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create an admin manually after generating a bcrypt hash for the password.
-- Example:
-- INSERT INTO admin (name, email, phone, password_hash)
-- VALUES ('Admin', 'admin@example.com', '9999999999', '$2b$10$replace_with_bcrypt_hash');
