-- How many vaults and push devices were used in the last 30 days, counted by the daily cron next to the totals:
-- the daily usage check's measure of how many people actually use sync and alerts. Aggregates only: no ids, no IPs.
ALTER TABLE usage ADD COLUMN active_vaults INTEGER;
ALTER TABLE usage ADD COLUMN active_push_devices INTEGER;
