-- Push alerts for finished timers (ADR-0006). A device's push subscription (the browser's push service address and
-- its public keys) and, per running timer, only its random id and end time (ms). No labels or log contents.
CREATE TABLE push_devices (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  subscription TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE push_due (
  device_id TEXT NOT NULL REFERENCES push_devices (id) ON DELETE CASCADE,
  timer_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  next_try INTEGER NOT NULL, -- when a run may (re)try it: `at`, then pushed back while a send is claimed or failing
  PRIMARY KEY (device_id, timer_id)
);
CREATE INDEX push_due_next_try ON push_due (next_try);
CREATE INDEX push_devices_updated_at ON push_devices (updated_at);
