// The sync code and the encryption of the synced copy (ADR-0005), on Web Crypto, which browsers, Node and Workers
// share. One random 32-byte secret is the whole code; everything else is derived from it, so the server only ever
// sees a vault id, a hash of the access token and ciphertext.

const SECRET_BYTES = 32;
const IV_BYTES = 12;
const FORMAT = 1; // first byte of every sealed copy, so a later format can still read this one
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

// The server stores this, never the token itself.
export async function hashToken(token: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))));
}

const bound = (keys: SyncKeys) => new TextEncoder().encode(`atlas-sync/${keys.vaultId}`);

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream) {
  // Copied into a plain ArrayBuffer: some runtimes type TextEncoder's output as possibly shared memory.
  return new Uint8Array(
    await new Response(new Blob([new Uint8Array(bytes)]).stream().pipeThrough(transform)).arrayBuffer()
  );
}

// gzip, then AES-GCM with a fresh IV: [format][iv][ciphertext + tag]. The vault id is bound in as associated data,
// so a copy moved to another vault fails to open.
export async function sealState(keys: SyncKeys, json: string): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const packed = await pipe(new TextEncoder().encode(json), new CompressionStream('gzip'));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: bound(keys) }, keys.key, packed)
  );
  const out = new Uint8Array(1 + IV_BYTES + sealed.length);
  out[0] = FORMAT;
  out.set(iv, 1);
  out.set(sealed, 1 + IV_BYTES);
  return out;
}

// Throws on a wrong key, a damaged copy or an unknown format; the caller keeps the local log either way.
export async function openState(keys: SyncKeys, blob: Uint8Array<ArrayBuffer>): Promise<string> {
  if (blob[0] !== FORMAT) throw new Error(`unknown sync format ${String(blob[0])}`);
  const iv = blob.slice(1, 1 + IV_BYTES);
  const packed = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: bound(keys) },
    keys.key,
    blob.slice(1 + IV_BYTES)
  );
  return new TextDecoder().decode(await pipe(new Uint8Array(packed), new DecompressionStream('gzip')));
}
