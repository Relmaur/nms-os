// The sync code and the encryption of the synced copy (ADR-0005), on Web Crypto, which browsers, Node and Workers
// share. One random 32-byte secret is the whole code; everything else is derived from it, so the server only ever
// sees a vault id, a hash of the access token and ciphertext.

const SECRET_BYTES = 32;
const IV_BYTES = 12;
// First byte of every sealed copy. 1: [1][iv][ciphertext], bound to the vault (3.10). 2 (3.15): [2][version, 4 bytes
// big-endian][iv][ciphertext], bound to the vault, the format and the version the relay will give the copy, so the
// relay can't relabel an old copy as a newer one (a rollback) without the copy failing to open. 1 still opens.
const FORMAT = 2;
const HEADER_BYTES = 5;
export const MAX_OPENED_BYTES = 8 * 1024 * 1024; // a log is ~1 KB gzipped today; past this a copy is a gzip bomb
const SALT = new TextEncoder().encode('atlas-sync-v1');
const CODE = /^[A-Za-z0-9_-]{43}$/;

// CryptoKey is only a value in Node's globals, so the type comes from what deriveKey returns.
type AesKey = Awaited<ReturnType<typeof crypto.subtle.deriveKey>>;

export interface SyncKeys {
  vaultId: string;
  token: string;
  key: AesKey;
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

export function newSyncCode(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(SECRET_BYTES)));
}

// Accepts a code as pasted: inside the pairing link, or split by spaces and line breaks.
export function parseSyncCode(text: string): string | null {
  const code = (/#pair=([^&\s]+)/.exec(text)?.[1] ?? text).replace(/\s+/g, '');
  return CODE.test(code) ? code : null;
}

export async function deriveSyncKeys(code: string): Promise<SyncKeys> {
  const secret = await crypto.subtle.importKey('raw', fromBase64Url(code), 'HKDF', false, ['deriveBits', 'deriveKey']);
  const params = (info: string) => ({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: SALT,
    info: new TextEncoder().encode(info)
  });
  const bits = async (info: string, length: number) =>
    new Uint8Array(await crypto.subtle.deriveBits(params(info), secret, length * 8));
  return {
    vaultId: toBase64Url(await bits('atlas-sync/vault-id', 16)),
    token: toBase64Url(await bits('atlas-sync/token', 32)),
    key: await crypto.subtle.deriveKey(params('atlas-sync/aes-gcm'), secret, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt'
    ])
  };
}

// A short name for a vault, the same on every paired device ("4F2A-91C0"), so a player can see two devices share one
// copy, and spot a pairing that went to someone else's. It's part of the vault id, which the relay knows anyway.
export function fingerprint(vaultId: string): string {
  const hex = [...fromBase64Url(vaultId).slice(0, 4)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 4)}-${hex.slice(4)}`.toUpperCase();
}

// The server stores this, never the token itself.
export async function hashToken(token: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))));
}

const bound = (keys: SyncKeys, version?: number) =>
  new TextEncoder().encode(
    version === undefined ? `atlas-sync/${keys.vaultId}` : `atlas-sync/${keys.vaultId}/2/${String(version)}`
  );

// Copied into a plain ArrayBuffer: some runtimes type TextEncoder's output as possibly shared memory. Reading stops
// past `max` bytes.
async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream, max = Infinity) {
  // (De)compression streams yield bytes; their types leave the chunks untyped.
  const reader = new Blob([new Uint8Array(bytes)])
    .stream()
    .pipeThrough(transform)
    .getReader() as ReadableStreamDefaultReader<Uint8Array>;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new Error('sync copy too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

// gzip, then AES-GCM with a fresh IV. `version` is the one the relay will store it as (the version it replaces + 1).
export async function sealState(keys: SyncKeys, json: string, version: number): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const packed = await pipe(new TextEncoder().encode(json), new CompressionStream('gzip'));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: bound(keys, version) }, keys.key, packed)
  );
  const out = new Uint8Array(HEADER_BYTES + IV_BYTES + sealed.length);
  out[0] = FORMAT;
  new DataView(out.buffer, out.byteOffset, out.byteLength).setUint32(1, version);
  out.set(iv, HEADER_BYTES);
  out.set(sealed, HEADER_BYTES + IV_BYTES);
  return out;
}

export interface Opened {
  json: string;
  version: number | null; // the version it was sealed for (null: format 1, which didn't record it)
}

// Throws on a wrong key, a damaged or oversized copy, or an unknown format; the caller keeps the local log either way.
export async function openState(keys: SyncKeys, blob: Uint8Array<ArrayBuffer>): Promise<Opened> {
  const format = blob[0];
  if (format !== 1 && format !== 2) throw new Error(`unknown sync format ${String(format)}`);
  const version =
    format === 2 && blob.length > HEADER_BYTES
      ? new DataView(blob.buffer, blob.byteOffset, blob.byteLength).getUint32(1)
      : undefined;
  const start = format === 2 ? HEADER_BYTES : 1;
  const packed = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: blob.slice(start, start + IV_BYTES), additionalData: bound(keys, version) },
    keys.key,
    blob.slice(start + IV_BYTES)
  );
  const json = new TextDecoder().decode(
    await pipe(new Uint8Array(packed), new DecompressionStream('gzip'), MAX_OPENED_BYTES)
  );
  return { json, version: version ?? null };
}
