-- The relay's own use of its plan's daily limits (ADR-0005, ADR-0006): one row per UTC day, added to by each Worker
-- isolate every 30 s or so. db_bytes is the largest database size D1 reported that day; vaults and push_devices are
-- counted once a day by the daily cron. Aggregates only: no ids, no IPs.
CREATE TABLE usage (
  day TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0,
  rows_read INTEGER NOT NULL DEFAULT 0,
  rows_written INTEGER NOT NULL DEFAULT 0,
  db_bytes INTEGER NOT NULL DEFAULT 0,
  vaults INTEGER,
  push_devices INTEGER
);

-- The minute cron drops timers over an hour late; without this index that delete reads every row, every minute.
CREATE INDEX push_due_at ON push_due (at);
