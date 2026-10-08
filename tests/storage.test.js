import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BACKUP_BYTES, serializeBackup } from '../src/links.js';
import { createCollectionStore, StoreError } from '../src/storage.js';

const KEY = 'test:links';
const link = (url = 'https://example.com/', extra = {}) => ({ url, title: 'Example', collection: '', starred: false, addedAt: '2026-01-01T12:00:00Z', ...extra });
const isError = code => error => error instanceof StoreError && error.code === code;

function fixture(raw = null) {
  const data = new Map();
  if (raw !== null) data.set(KEY, raw);
  const access = { getCalls: 0, setCalls: 0, getFailure: false, setFailure: false };
  const storage = {
    getItem(key) {
      access.getCalls++;
      if (access.getFailure) throw new Error('read blocked');
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      access.setCalls++;
      if (access.setFailure) throw new Error('quota exceeded');
      data.set(key, value);
    }
  };
  return { data, access, storage, store: createCollectionStore(storage, KEY) };
}

test('loads legacy compact data and writes only canonical validated JSON', () => {
  const original = [link()];
  const compact = JSON.stringify({ version: 1, links: original });
  const { store, data } = fixture(compact);
  assert.deepEqual(store.load(), { mode: 'ready', raw: compact, links: original, error: null });
  const next = [link(undefined, { starred: true })];
  assert.deepEqual(store.save(next), { mode: 'ready', raw: serializeBackup(next), links: next, error: null });
  assert.equal(data.get(KEY), serializeBackup(next));
});
test('empty storage is ready and save initializes the store when needed', () => {
  const { store, data } = fixture();
  const saved = store.save([link()]);
  assert.equal(saved.mode, 'ready');
  assert.deepEqual(saved.links, [link()]);
  assert.equal(data.get(KEY), serializeBackup([link()]));
});
test('unreadable initial storage is protected from ordinary mutations', () => {
  const raw = '{broken';
  const { store, data, access } = fixture(raw);
  const loaded = store.load();
  assert.equal(loaded.mode, 'protected');
  assert.equal(loaded.error.code, 'protected');
  assert.deepEqual(loaded.links, []);
  assert.throws(() => store.save([link()]), isError('protected'));
  assert.equal(data.get(KEY), raw);
  assert.equal(access.setCalls, 0);
});
test('unreadable external data keeps the last valid links and the latest raw record', () => {
  const { store, data, access } = fixture(serializeBackup([link()]));
  store.load();
  data.set(KEY, '{external broken record');
  const loaded = store.load();
  assert.equal(loaded.mode, 'protected');
  assert.equal(loaded.raw, '{external broken record');
  assert.deepEqual(loaded.links, [link()]);
  assert.throws(() => store.save([link(undefined, { starred: true })]), isError('protected'));
  assert.equal(data.get(KEY), '{external broken record');
  assert.equal(access.setCalls, 0);
});
test('a stale save refreshes newer valid data and aborts before writing', () => {
  const { store, data, access } = fixture(serializeBackup([link()]));
  store.load();
  const newest = [link('https://other.example/', { title: 'Other tab' })];
  data.set(KEY, serializeBackup(newest));
  assert.throws(() => store.save([link(undefined, { starred: true })]), isError('changed'));
  assert.equal(store.state.mode, 'ready');
  assert.equal(store.state.error.code, 'changed');
  assert.deepEqual(store.state.links, newest);
  assert.equal(data.get(KEY), serializeBackup(newest));
  assert.equal(access.setCalls, 0);
});
test('an unreadable change discovered immediately before save is protected', () => {
  const { store, data, access } = fixture(serializeBackup([link()]));
  store.load();
  data.set(KEY, '{changed before save');
  assert.throws(() => store.save([]), isError('changed'));
  assert.equal(store.state.mode, 'protected');
  assert.equal(store.state.raw, '{changed before save');
  assert.deepEqual(store.state.links, [link()]);
  assert.equal(access.setCalls, 0);
});
test('external removal refreshes to an empty collection and aborts a stale save', () => {
  const { store, data, access } = fixture(serializeBackup([link()]));
  store.load();
  data.delete(KEY);
  assert.throws(() => store.save([link()]), isError('changed'));
  assert.deepEqual(store.state.links, []);
  assert.equal(store.state.raw, null);
  assert.equal(access.setCalls, 0);
});
test('write failure leaves both the saved record and current links intact', () => {
  const raw = serializeBackup([link()]);
  const { store, data, access } = fixture(raw);
  store.load();
  access.setFailure = true;
  assert.throws(() => store.save([]), isError('write'));
  assert.equal(store.state.mode, 'ready');
  assert.equal(store.state.error.code, 'write');
  assert.equal(store.state.raw, raw);
  assert.deepEqual(store.state.links, [link()]);
  assert.equal(data.get(KEY), raw);
});
test('failed storage reads mark storage unavailable and retain the last valid links', () => {
  const raw = serializeBackup([link()]);
  const { store, data, access } = fixture(raw);
  store.load();
  access.getFailure = true;
  assert.throws(() => store.save([]), isError('unavailable'));
  assert.equal(store.state.mode, 'unavailable');
  assert.equal(store.state.raw, undefined);
  assert.deepEqual(store.state.links, [link()]);
  assert.equal(data.get(KEY), raw);
  assert.equal(access.setCalls, 0);
  assert.equal(store.load().error.code, 'unavailable');
  access.getFailure = false;
  assert.equal(store.load().mode, 'ready');
  assert.equal(store.state.raw, raw);
});
test('initial unavailable storage cannot be written', () => {
  const { store, access } = fixture();
  access.getFailure = true;
  assert.equal(store.load().mode, 'unavailable');
  assert.throws(() => store.save([link()]), isError('unavailable'));
  assert.deepEqual(store.state.links, []);
  assert.equal(access.setCalls, 0);
});
test('invalid and oversized mutations fail before accessing storage', () => {
  const raw = serializeBackup([link()]);
  const { store, data, access } = fixture(raw);
  store.load();
  const readsBefore = access.getCalls;
  assert.throws(() => store.save([link(undefined, { title: '' })]), /invalid link/);
  assert.throws(() => store.save([link('https://example.com/?q=' + 'x'.repeat(MAX_BACKUP_BYTES))]), /UTF-8/);
  assert.equal(access.getCalls, readsBefore);
  assert.equal(access.setCalls, 0);
  assert.equal(data.get(KEY), raw);
  assert.deepEqual(store.state.links, [link()]);
});
test('explicit recovery accepts only a valid backup and preserves protected data on failure', () => {
  const { store, data, access } = fixture('{protected');
  store.load();
  assert.throws(() => store.save([link('javascript:alert(1)')], { replaceProtected: true }));
  assert.equal(data.get(KEY), '{protected');
  assert.equal(access.setCalls, 0);
  const next = [link('https://restored.example/')];
  assert.equal(store.save(next, { replaceProtected: true }).mode, 'ready');
  assert.deepEqual(store.state.links, next);
  assert.equal(data.get(KEY), serializeBackup(next));
});
test('quota failure during explicit recovery keeps the unreadable raw record', () => {
  const { store, data, access } = fixture('{protected');
  store.load();
  access.setFailure = true;
  assert.throws(() => store.save([link()], { replaceProtected: true }), isError('write'));
  assert.equal(store.state.mode, 'protected');
  assert.equal(store.state.raw, '{protected');
  assert.equal(data.get(KEY), '{protected');
});
test('recovery aborts when the unreadable record changed before the final read', () => {
  const { store, data, access } = fixture('{first protected record');
  store.load();
  data.set(KEY, '{different protected record');
  assert.throws(() => store.save([link()], { replaceProtected: true }), isError('changed'));
  assert.equal(store.state.mode, 'protected');
  assert.equal(store.state.raw, '{different protected record');
  assert.equal(data.get(KEY), '{different protected record');
  assert.equal(access.setCalls, 0);
});
test('recovery aborts when another tab replaced corrupt data with a valid collection', () => {
  const { store, data, access } = fixture('{protected');
  store.load();
  const latest = [link('https://new.example/')];
  data.set(KEY, serializeBackup(latest));
  assert.throws(() => store.save([link()], { replaceProtected: true }), isError('changed'));
  assert.equal(store.state.mode, 'ready');
  assert.deepEqual(store.state.links, latest);
  assert.equal(data.get(KEY), serializeBackup(latest));
  assert.equal(access.setCalls, 0);
});
test('returned state and caller arrays cannot mutate the retained collection', () => {
  const { store } = fixture(serializeBackup([link()]));
  const loaded = store.load();
  loaded.links[0].title = 'Changed outside store';
  assert.equal(store.state.links[0].title, 'Example');
  const next = [link('https://next.example/')];
  const saved = store.save(next);
  next[0].title = 'Changed caller array';
  saved.links.push(link());
  assert.deepEqual(store.state.links, [link('https://next.example/')]);
});
