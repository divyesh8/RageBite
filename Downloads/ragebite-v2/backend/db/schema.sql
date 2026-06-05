-- ============================================================
--  RageBite v2 — Complete Database Schema
--  Run: psql -U postgres -d ragebite -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE user_rank AS ENUM (
  'Rookie', 'Flame Starter', 'Roast Apprentice',
  'Savage', 'Inferno', 'Aura God'
);

-- ─── USERS ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username          CITEXT      NOT NULL UNIQUE,
  email             CITEXT      NOT NULL UNIQUE,
  password_hash     TEXT        NOT NULL,
  email_verified    BOOLEAN     NOT NULL DEFAULT FALSE,
  display_name      VARCHAR(50),
  bio               VARCHAR(280),
  profile_image     TEXT        DEFAULT 'default',
  -- Stats
  aura              INTEGER     NOT NULL DEFAULT 0,
  wins              INTEGER     NOT NULL DEFAULT 0,
  losses            INTEGER     NOT NULL DEFAULT 0,
  total_battles     INTEGER     NOT NULL DEFAULT 0,
  current_streak    INTEGER     NOT NULL DEFAULT 0,
  highest_streak    INTEGER     NOT NULL DEFAULT 0,
  rank              user_rank   NOT NULL DEFAULT 'Rookie',
  -- Auth
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at     TIMESTAMPTZ,
  login_attempts    INTEGER     NOT NULL DEFAULT 0,
  locked_until      TIMESTAMPTZ,
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_aura     ON users (aura DESC);

-- ─── OTP VERIFICATIONS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS otp_verifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_code      VARCHAR(6)  NOT NULL,
  otp_type      VARCHAR(20) NOT NULL DEFAULT 'email_verify', -- email_verify | password_reset
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  used          BOOLEAN     NOT NULL DEFAULT FALSE,
  attempts      INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_user    ON otp_verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_otp_code    ON otp_verifications (otp_code);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications (expires_at);

-- ─── SESSIONS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jwt_token     TEXT        NOT NULL UNIQUE,
  refresh_token TEXT        UNIQUE,
  ip_address    INET,
  user_agent    TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token   ON sessions (jwt_token);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions (refresh_token);

-- ─── BATTLES (future use) ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS battles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id   UUID        NOT NULL REFERENCES users(id),
  opponent_id     UUID        NOT NULL REFERENCES users(id),
  winner_id       UUID        REFERENCES users(id),
  topic           TEXT        NOT NULL,
  group_id        UUID,
  aura_delta      INTEGER     NOT NULL DEFAULT 0,
  ai_verdict      TEXT,
  challenger_score INTEGER,
  opponent_score  INTEGER,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_battles_challenger ON battles (challenger_id);
CREATE INDEX IF NOT EXISTS idx_battles_opponent   ON battles (opponent_id);

-- ─── RAGE GROUPS (future use) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rage_groups (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(50) NOT NULL,
  emoji         VARCHAR(10) NOT NULL DEFAULT '🔥',
  topic         TEXT,
  created_by    UUID        NOT NULL REFERENCES users(id),
  member_count  INTEGER     NOT NULL DEFAULT 1,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id    UUID NOT NULL REFERENCES rage_groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- ─── AUTO UPDATE updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── AUTO UPDATE RANK BASED ON AURA ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_user_rank()
RETURNS TRIGGER AS $$
BEGIN
  NEW.rank := CASE
    WHEN NEW.aura >= 10000 THEN 'Aura God'::user_rank
    WHEN NEW.aura >= 5000  THEN 'Inferno'::user_rank
    WHEN NEW.aura >= 2500  THEN 'Savage'::user_rank
    WHEN NEW.aura >= 1000  THEN 'Roast Apprentice'::user_rank
    WHEN NEW.aura >= 300   THEN 'Flame Starter'::user_rank
    ELSE                        'Rookie'::user_rank
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_rank ON users;
CREATE TRIGGER auto_rank
  BEFORE UPDATE OF aura ON users
  FOR EACH ROW EXECUTE FUNCTION update_user_rank();

-- ─── CLEANUP EXPIRED SESSIONS (run periodically) ─────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_expired() RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  DELETE FROM otp_verifications WHERE expires_at < NOW() AND used = FALSE;
END;
$$ LANGUAGE plpgsql;
