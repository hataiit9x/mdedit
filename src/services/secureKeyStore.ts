// Encrypted-at-rest storage for user API keys (Gemini / OpenAI-compatible).
//
// Security model:
// - "Session only" mode (default): the key lives in a module-level variable,
//   never touches disk, and disappears when the tab closes.
// - "Remember" mode: the key is encrypted with AES-GCM using a Web Crypto key
//   marked non-extractable and stored in IndexedDB. Reading the raw database
//   file yields only ciphertext; the key material itself cannot be exported
//   even by script running in the page (it can only be *used* to decrypt).
// - Web Crypto requires a secure context (https or localhost). Outside of one
//   we silently degrade to session-only storage rather than writing plaintext.
//
// Honest limit: any script running in this origin can request the decrypted
// key — that is inherent to every browser BYOK design. What this store
// guarantees is that keys never persist in plaintext on disk.

import Dexie, { Table } from 'dexie';

export type SecretName = 'gemini' | 'openai';

interface CryptoKeyRow {
  id: string;
  key: CryptoKey;
}

interface SecretRow {
  name: string;
  iv: ArrayBuffer;
  data: ArrayBuffer;
}

class SecureStoreDB extends Dexie {
  cryptoKeys!: Table<CryptoKeyRow, string>;
  secrets!: Table<SecretRow, string>;

  constructor() {
    super('MDEditSecureStore');
    this.version(1).stores({
      cryptoKeys: 'id',
      secrets: 'name',
    });
  }
}

const sdb = new SecureStoreDB();
const memoryKeys = new Map<SecretName, string>();

export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getMasterKey(): Promise<CryptoKey> {
  const existing = await sdb.cryptoKeys.get('master');
  if (existing) return existing.key;
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable: raw bytes can never leave Web Crypto
    ['encrypt', 'decrypt']
  );
  await sdb.cryptoKeys.put({ id: 'master', key });
  return key;
}

export async function setSecret(name: SecretName, value: string, persist: boolean): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    await clearSecret(name);
    return;
  }

  memoryKeys.set(name, trimmed);

  if (!persist || !isCryptoAvailable()) {
    await sdb.secrets.delete(name).catch(() => undefined);
    return;
  }

  const master = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, master, encoder.encode(trimmed));
  await sdb.secrets.put({ name, iv: iv.buffer as ArrayBuffer, data });
}

export async function getSecret(name: SecretName): Promise<string> {
  const memory = memoryKeys.get(name);
  if (memory) return memory;

  if (!isCryptoAvailable()) return '';

  try {
    const row = await sdb.secrets.get(name);
    if (!row) return '';
    const master = await getMasterKey();
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(row.iv) },
      master,
      row.data
    );
    const value = decoder.decode(plain);
    memoryKeys.set(name, value);
    return value;
  } catch {
    // Wrong/corrupted ciphertext — treat as no key rather than crashing.
    return '';
  }
}

export function hasSecretInMemory(name: SecretName): boolean {
  return Boolean(memoryKeys.get(name)?.trim());
}

export async function hasSecret(name: SecretName): Promise<boolean> {
  if (hasSecretInMemory(name)) return true;
  if (!isCryptoAvailable()) return false;
  const row = await sdb.secrets.get(name).catch(() => undefined);
  return Boolean(row);
}

export async function isSecretPersisted(name: SecretName): Promise<boolean> {
  if (!isCryptoAvailable()) return false;
  const row = await sdb.secrets.get(name).catch(() => undefined);
  return Boolean(row);
}

export async function clearSecret(name: SecretName): Promise<void> {
  memoryKeys.delete(name);
  await sdb.secrets.delete(name).catch(() => undefined);
}

export async function clearAllSecrets(): Promise<void> {
  memoryKeys.clear();
  await Promise.all([
    sdb.secrets.clear().catch(() => undefined),
    sdb.cryptoKeys.clear().catch(() => undefined),
  ]);
}

// For logs / status chips: never render a full key.
export function redactKey(key: string): string {
  const trimmed = (key || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.substring(0, 4)}…${trimmed.slice(-2)} (${trimmed.length} ký tự)`;
}
