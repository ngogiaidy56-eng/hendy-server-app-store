PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS apps (
  app_slug TEXT PRIMARY KEY,
  app_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  app_slug TEXT NOT NULL,
  app_name TEXT NOT NULL,
  version TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web','windows','android','ios','macos','linux')),
  file_name TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  sha256 TEXT NOT NULL,
  release_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','withdrawn')),
  created_by TEXT NOT NULL,
  published_at TEXT NOT NULL,
  FOREIGN KEY (app_slug) REFERENCES apps(app_slug)
);
CREATE INDEX IF NOT EXISTS idx_releases_status_date ON releases(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_releases_app_version ON releases(app_slug, version);
CREATE INDEX IF NOT EXISTS idx_releases_platform ON releases(platform, status);

CREATE TABLE IF NOT EXISTS storefront_settings (
  setting_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('started','success','failed','warning')),
  message TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  sha256 TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  encryption_algorithm TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_certificates_uploaded_at ON certificates(uploaded_at DESC);
