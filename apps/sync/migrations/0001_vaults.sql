-- One sealed copy of a player's log per vault (ADR-0005). The server can't open `blob`; `token_hash` is a SHA-256 of
-- the access token derived from the sync code; `updated_at` (ms) drives the one-year purge.
CREATE TABLE vaults (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  version INTEGER NOT NULL,
  blob BLOB NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX vaults_updated_at ON vaults (updated_at);
