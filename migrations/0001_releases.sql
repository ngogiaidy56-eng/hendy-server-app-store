-- Cloudflare D1 schema. Render's server.js provisions the equivalent PostgreSQL schema on first use.
CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  build INTEGER NOT NULL DEFAULT 0,
  platform TEXT NOT NULL CHECK (platform IN ('windows','android','ios')),
  channel TEXT NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable','beta','preview')),
  release_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  file_size INTEGER NOT NULL DEFAULT 0,
  download_url TEXT,
  sha256 TEXT,
  release_notes TEXT NOT NULL DEFAULT '',
  mandatory INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(platform, channel, version)
);
CREATE INDEX IF NOT EXISTS releases_public_channel_idx
  ON releases(platform, channel, status, release_date);
CREATE INDEX IF NOT EXISTS releases_updated_idx
  ON releases(updated_at);
