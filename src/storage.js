import { readBackup, serializeBackup } from './links.js';

export class StoreError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'StoreError';
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

// Storage is injected so failures and other-tab changes can be checked without
// accessing a real browser profile. Failed writes retain the last valid links.
export function createCollectionStore(storage, key) {
  let current = { mode: 'unavailable', raw: undefined, links: [], error: null };
  let initialized = false;
  const snapshot = () => ({ ...current, links: current.links.map(link => ({ ...link })) });

  function unavailable(cause) {
    const error = new StoreError('unavailable', 'Browser storage could not be read. Your current collection was kept.', cause);
    current = { ...current, mode: 'unavailable', raw: undefined, error };
    initialized = true;
    return error;
  }

  function adopt(raw) {
    try {
      const links = raw === null ? [] : readBackup(raw);
      current = { mode: 'ready', raw, links, error: null };
    } catch (cause) {
      const error = new StoreError('protected', 'Saved data could not be read. It is protected until you explicitly restore a valid backup.', cause);
      current = { ...current, mode: 'protected', raw, error };
    }
    initialized = true;
  }

  function load() {
    try { adopt(storage.getItem(key)); }
    catch (cause) { unavailable(cause); }
    return snapshot();
  }

  function save(next, { replaceProtected = false } = {}) {
    // Validate before touching storage, including the bytes of the portable JSON.
    const raw = serializeBackup(next);
    const links = readBackup(raw);
    if (!initialized) load();

    let latest;
    try { latest = storage.getItem(key); }
    catch (cause) { throw unavailable(cause); }

    if (latest !== current.raw) {
      adopt(latest);
      const error = new StoreError('changed', 'Saved data changed in another tab. Review the refreshed collection before trying again.');
      current = { ...current, error };
      throw error;
    }
    if (current.mode === 'protected' && !replaceProtected) {
      const error = new StoreError('protected', 'Unreadable saved data was kept. Export its raw copy or explicitly restore a valid backup.');
      current = { ...current, error };
      throw error;
    }
    if (current.mode === 'unavailable') throw unavailable();

    try { storage.setItem(key, raw); }
    catch (cause) {
      const error = new StoreError('write', 'Browser storage is full or unavailable. This change was not saved; your current collection was kept.', cause);
      current = { ...current, error };
      throw error;
    }
    current = { mode: 'ready', raw, links, error: null };
    return snapshot();
  }

  return { load, save, get state() { return snapshot(); } };
}
