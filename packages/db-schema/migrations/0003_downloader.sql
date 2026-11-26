ALTER TABLE releases ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'stable';

CREATE TABLE IF NOT EXISTS download_events (
  id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  downloaded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_download_events_release_date
  ON download_events(release_id, downloaded_at DESC);
