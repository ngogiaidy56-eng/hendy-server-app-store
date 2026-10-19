CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  build INTEGER NOT NULL DEFAULT 0,
  platform TEXT NOT NULL CHECK (platform IN ('windows','android','ios')),
  channel TEXT NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable','beta','preview')),
  release_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_size BIGINT NOT NULL DEFAULT 0,
  download_url TEXT,
  sha256 TEXT,
  release_notes TEXT NOT NULL DEFAULT '',
  mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  r2_key TEXT,
  downloads BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform, channel, version)
);
CREATE INDEX IF NOT EXISTS releases_public_lookup ON releases(status, platform, channel, release_date DESC);
CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  release_id TEXT,
  actor TEXT NOT NULL DEFAULT 'admin-token',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);