# ADR-0005: Encrypted, opt-in sync between a player's devices

- **Status:** Accepted (2026-10-27). The owner chose this option and cleared the Data Privacy gate for it. It amends ADR-0002's "Between devices" and "Privacy" points.

## Context
Players use the app on more than one device: a PC next to the game and a phone in the hand. Export and Import (ADR-0002) move the log, but by hand, and the last copy imported replaces the other.

The owner's constraints:
- It must work out of the box for them.
- It must be free or nearly free.
- It must scale cheaply if others adopt it.
- It must not be a SaaS: no accounts and no business around personal data. Donations (Ko-fi) may cover hosting.

The log is small (well under 1 MB of JSON) and personal.

## Decision
- **Relay:** a small Cloudflare Worker with D1 (`apps/sync`) stores one **sealed** copy of the log per vault, with a version number for compare-and-swap. It can't open the copy.
- **Sync code:** one random 32-byte secret, created on the device that turns sync on.
  - HKDF-SHA-256 derives three things from it: the vault id, an access token, and an AES-GCM-256 key.
  - The relay sees the vault id, a SHA-256 of the token, and ciphertext. There's no account, email or name.
  - Another device joins by scanning a QR link (`…/#pair=<code>`; the fragment is never sent to the web host) or by pasting the code. The app removes the code from the address at once and asks before pairing.
- **Sealing:** the JSON is gzipped, then encrypted with AES-GCM and a fresh 12-byte IV, behind a format byte (`[1][iv][ciphertext+tag]`). The vault id is bound in as associated data, so a copy moved to another vault won't open. All of it is Web Crypto, in `@atlas/core/sync-crypto`.
- **Merging:** a three-way merge (`@atlas/core/sync`) against the last copy both sides agreed on, kept on the device as `nms_master_os_state.synced`:
  - Records merge by key: systems, planets and timers by `id`, visits by `at`, past sessions by `startedAt`. Tags merge as sets.
  - Removing something wins over an untouched copy; an edit wins over a removal.
  - A value both sides changed goes to the copy saved last.
  - On a first pairing there's no common copy yet. The state every device starts from (defaults + the repo's `nms_state.json`) stands in, so starter data removed or changed on one device isn't revived by a fresh device's untouched copy.
  - The cloud copy is merged whenever its version **or its content** differs from the base, since a vault deleted and recreated restarts its versions.
  - The state shape doesn't change: no tombstones, no per-record timestamps.
  - A merged result passes `validateState` and `buildState` before it's adopted, and adopting a merge doesn't count as an edit, so devices don't ping-pong.
- **Cycle safety:**
  - Turning sync off, on, or pairing again bumps a generation number. A sync already in flight checks it after every wait and stops without writing or sending, so an opt-out is never undone.
  - One tab syncs at a time (Web Locks), and it first adopts another tab's newer save.
- **Consent:** off by default. Nothing is sent until the person taps Turn on sync or Pair. Builds without a relay address (`VITE_SYNC_URL`) carry no sync code at all.

## Privacy (the gate's checklist)
- **Data minimisation:** the relay keeps ciphertext, a token hash, a version and an update time. Worker logs are off (`observability.enabled = false`), so no vault ids or IPs are recorded by the app. The per-client rate limit keeps counters only in Cloudflare's memory. Cloudflare itself handles requests as any host does.
- **Retention:**
  - A daily cron deletes vaults neither read nor written for 12 months. A read refreshes the date at most once a day.
  - **Delete cloud copy** removes a vault at once for every device.
  - **Turn off on this device** forgets the code and the base copy there.
- **Secrets:** the sync code lives only in the paired devices' `localStorage` (`nms_master_os_sync`). It's never in exports, logs or diagnostics. The UI warns that anyone holding the code can read the log.
- **Threats:**
  - A leaked code exposes the log; delete the cloud copy and start again with a new code.
  - A lost code with every device lost means the cloud copy can't be recovered. That's said in the UI, by design.
  - The relay operator (the owner, or Cloudflare) can delete or withhold copies but not read them. A tampered copy fails AES-GCM and is never adopted.
  - A malicious relay could replay an **older** sealed copy of the same vault. A merge would then treat what was added since as removed. This is accepted: the relay is the owner's own, and detecting rollbacks would need a counter kept on every device.
  - The QR link carries the code in its `#fragment`. The app removes it from the tab's address and history at once, but the browser's own history list may note it (and a browser that syncs history would copy it). That's the device receiving the code anyway; pasting the code avoids it.
- **Sharing:** none. Nothing goes to analytics or third parties.

## Trade-offs
- **Rejected: the player's own Google Drive or Dropbox.**
  - It would cost $0 at any scale.
  - But it means a sign-in on every device and app-review processes (Dropbox requires production approval after 50 users).
  - It also gives no path to the Web Push alerts the timers need.
- **Rejected: Supabase or Firebase with accounts.**
  - They're account-centric and the provider can read the data unless it's encrypted anyway.
  - Supabase's free projects pause after a week idle, and its next tier is $25/month.
  - They bring the PII and GDPR/LFPDPPP duties ADR-0002 avoided.
- **Rejected: share-sheet transfer only.** No server, but it stays manual.
- **Cost:** Workers Free covers about 100k requests a day, enough for thousands of players. The $5/month paid plan lifts the daily caps.
- **Accepted limits:**
  - There's no recovery without the code.
  - A clash on one field goes to the copy saved last, not the one edited last.
  - Lists without unique keys (the legacy fleet's multi-tools) are taken whole from the newer copy. Gear and notes (3.14.0, ADR-0007) carry ids, so they merge record by record.

## Consequences
- The same Worker can later send Web Push for finished timers, which a static site can't.
- The AGENTS.md privacy invariant now reads "except the opt-in, encrypted sync copy (ADR-0005)".

## Guardrails on the free plan (3.13.0)
A security audit found that on Cloudflare's free plan one client with a script could fill the 500 MB database, or spend the day's 100k requests or D1 writes, stopping sync and alerts for everyone. Cloudflare's free plan can't bill; it just stops. So the relay protects the allowance and says plainly when it runs out (`apps/sync/src/capacity.ts`, `docs/deploy.md`):
- **Rate limits:**
  - per client, keyed by IPv4 address or IPv6 /64: 60 requests a minute, 3 new vaults or push devices a minute, 4 push schedules a minute;
  - bodies are read as a stream and capped (sealed copies at 256 KB).
- **Self-metering and capacity:**
  - The relay counts its requests and D1's own rows read and written per UTC day.
  - At 80% of any daily limit it stops taking new vaults and devices (`busy`).
  - At 95% it answers `503 { capacity: "full" }` with `Retry-After` until midnight UTC, so clients get a clear message before Cloudflare's hard stop.
  - At 90% of the database it stops taking new vaults.
  - A D1 failure is a `503` with CORS headers, not an error page.
- **In the app:** a full relay pauses automatic syncs and push sends on that device until the reset, and survives reloads. A banner (once a day, dismissible) says the log is safe, when sync resumes, and that a Ko-fi coffee helps upgrade the server.
- **Ownership in the SQL:** updates and deletes also match the token hash.
- **Knowing when to upgrade:** `GET /v1/status` reports aggregate usage (no ids or IPs). A daily workflow opens an issue once any day reaches 60% of a free limit. Upgrading means switching to Workers Paid and setting `PLAN = "paid"`.

## Hardening after the security audit (3.15.0)
- **Format 2.** Each sealed copy is `[2][version, 4 bytes][iv][ciphertext]`. The AES-GCM associated data binds the vault id, the format and the version the relay will store the copy as (the version it replaces + 1). A relay that labels an old copy with a newer version produces a copy that fails to open, and a device refuses a cloud version lower than the one it last synced ("older"). Format 1 copies (3.10–3.14) still open; every write is format 2.
- **Size and shape:**
  - Copies over 512 KB are refused before decrypting.
  - Decompression stops at 8 MB, so a gzip bomb can't fill memory.
  - JSON nested more than 64 deep is refused before any recursive walk.
- **The merge:**
  - Only own keys are read: no `constructor` or `toString` from the prototype.
  - Save times are clamped to "now", in the comparison and in the result, so a future-stamped copy can't win every clash.
- **The mass-deletion guard.** A merge that would remove more than 10 records, or more than 20% of them (at least 3), waits for the person. It counts systems (once each, with their planets and visits), planets and visits of systems that stay, gear and notes, as removed from this device's log by the other side's changes. "Apply" keeps the log from before under `nms_master_os_state.before-sync` (More → Sync → Put it back); "Keep this device's log" replaces the cloud copy. This catches:
  - a damaged copy;
  - a crafted copy from someone holding the code.

  A device whose own log was lost is handled by the recovered-log rule below.
- **A recovered log.** When this device's stored log was unreadable and fell back to defaults, sync drops its base, so the next sync combines both copies. That restores the cloud copy instead of reading the empty log as deletions.
- **Pairing:**
  - The prompt says to pair only with a code from your own device. Replacing a sync already on takes a second tap.
  - Pairing with a code no device uploaded (404) is refused; only "Turn on sync" creates a vault.
  - Both devices show a short copy ID (from the vault id).
  - The code card stays hidden behind a streamer warning until asked for.
  - A `#pair=` link leaves the address before anything else on the page runs.
- **Import (ADR-0002) with sync on.** Import resets the base, so the imported log is combined with the synced one rather than deleting what the file lacks from every device.
- **What format 2 can't prevent:**
  - Once a device has seen a format-2 copy, format 1 is refused, so the relay can't replay a 3.10–3.14 copy.
  - A conflict answer must carry a newer version than the one written against.
  - A losing concurrent write is still a validly sealed copy for its version, so the relay could later serve it instead of the winner (a fork). The merge keeps both sides' records, and the removal guard catches a fork that would remove many.
  - Devices still on 3.14 or older can't open format 2 and say "couldn't be opened with this code" until they update, which happens on their next visit. Nothing needs re-pairing.
- **The removal guard counts what the other side's changes would take from this device.** A removed system counts once. This device's own deletions never ask.
