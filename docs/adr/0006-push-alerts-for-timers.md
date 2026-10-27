# ADR-0006: Push alerts for finished timers

- **Status:** Accepted (2026-10-27). The owner chose an opt-in switch and cleared the Data Privacy gate for this design. It extends ADR-0005's relay and amends ADR-0002's "Privacy" point.

## Context
Timers (3.9.0) alert only while the browser runs the app. A phone that suspends the app shows the alert when the player returns, which is too late for a refiner or a crop. A web app can't wake itself; only Web Push can. That needs a server to send the push at the right time. The sync relay (ADR-0005) is already that server.

## Decision
- **Consent:** a switch, "Alerts when the app is asleep", in the Session sheet and in More → This device. It's off by default and independent of sync. Turning it on asks for notification permission if needed.
- **What the device sends** (`PUT /v1/push/:deviceId`, Bearer token):
  - its push subscription: the browser vendor's push address and its public keys;
  - the **ids and end times** of its running timers, not yet announced and at most 50.

  Each request replaces the whole schedule and carries the device's clock, so the relay corrects for a wrong one. Entries the relay can't use (a malformed or repeated id, over an hour late, past 30 days) are dropped one by one instead of refusing the schedule. The device id (16 random bytes) and token (32 random bytes) live only on the device (`nms_master_os_push`); the relay keeps a SHA-256 of the token.
- **What never leaves the device:** timer names, kinds, and anything else from the log.
  - The notification's words are kept in a Cache API entry (`atlas-timer-notes`, keyed by timer id) that the service worker reads.
  - The push payload is `{ t: timerId }`, encrypted to the device's keys by the Web Push standard (RFC 8291).
  - Without the words (the cache cleared), the notification says "A timer is done".
- **Sending:**
  - A Worker cron runs every minute. It sends each due timer one push (VAPID, `@pushforge/builder`; the private key is a Wrangler secret), with `TTL` 1 h and `urgency: high`, then deletes the row.
  - A 404/410 from the push service removes the device. A failure that can't succeed (other 4xx, keys that can't be encrypted to) drops that alert. A 429, 5xx or unreachable service retries until an hour late.
  - Each run claims its rows first (`next_try` moves 2 minutes on), so overlapping runs never send twice and a failing row waits instead of blocking the queue.
  - A run sends at most 40 pushes, at most 5 per device, 6 at a time, within a Free-plan invocation's budget. Re-sending a schedule doesn't reset a waiting row's turn.
  - Alerts arrive within about a minute of the end time.
- **Keeping the schedule current:**
  - The app sends it as soon as it changes (no delay, `keepalive`), because players go straight back to the game.
  - A failed send retries after 30 s, 2 min, then 5 min, and again whenever the app comes back into view or online.
  - Turning alerts off waits for any send under way, and a removal the relay didn't get is retried later. Other tabs follow the switch.
  - When the browser replaces a subscription while the app sleeps, the service worker subscribes again and re-sends the schedule. It does this from a device note in the same cache: the device id, the token and the last schedule.
- **No doubles:**
  - The notification's tag is the timer id, the same tag the open app's own alert uses (one per timer), so the two replace each other. The open app shows a system notification only when it isn't focused; the in-app toast is enough otherwise.
  - A timer the app announced itself leaves the schedule on the next send.
  - Browsers expect a notification for every push (Safari revokes subscriptions that stay silent), so the service worker always shows one.
- **Abuse limits:**
  - Subscriptions must point at a browser push service (Google, Mozilla, Apple, Microsoft hosts, default port), so the relay can't be made to post anywhere else. Their keys must have a real key's shape (a 65-byte P-256 point and a 16-byte secret).
  - Bodies are capped at 16 KB, and end times at 30 days ahead.
  - The rate limit is shared with sync.

## Privacy (the gate's checklist)
- **Data minimisation:** per device, a random id, the token hash, the push subscription and a last-contact time. Per pending timer, its id and end time. The timer id is the app's own (`timer-<created time in base36><random>`), so it also tells when the timer was set.
- **Retention:**
  - a timer's row is deleted once sent, when it's no longer pending (dismissed, announced, removed), or an hour after its time;
  - the device is deleted when the switch is turned off, when the push service says the subscription is gone, or after 60 days without contact.
- **What the operator learns:** the relay operator (the owner, Cloudflare) can see *when* a device's timers end, and that device's push address. Push services (Apple, Google…) see that a push was sent, but its content is encrypted.
- **Secrets:** the VAPID private key is a Worker secret, never in the repo. The device token is kept on the device only (`localStorage`, and the device note in Cache Storage for the service worker) and never exported.

## Trade-offs
- **Rejected: push turned on with notification permission.** Fewer taps, but the server part would be implied rather than chosen (owner's choice).
- **Rejected: labels in the payload.** Simpler service worker, but the relay would read every timer's name.
- **Rejected: Durable Object alarms** for exact timing. The minute cron is simpler, free, and a minute's lateness is fine for refiners and crops.
- **Accepted limits:**
  - On iPhone and iPad, Web Push needs the app on the Home Screen (iOS 16.4+); a Safari tab is told so.
  - With sync on, every device with the switch on alerts for the timers it holds, which is usually what a player wants.
