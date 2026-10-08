import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BACKUP_BYTES, MAX_LINKS, addLinks, defaultTitle, escapeHtml, exportLinks, filterLinks, mergeBackup, normalizeUrl, parseLinks, readBackup, serializeBackup } from '../src/links.js';

const link = (url = 'https://example.com/', extra = {}) => ({ url, title: 'Example', collection: 'Reading', starred: false, addedAt: '2026-01-01T12:00:00Z', ...extra });

test('removes known trackers while retaining meaningful query and fragment', () => {
  assert.equal(normalizeUrl('https://Example.com:443/read?utm_source=a&q=book&fbclid=x#chapter'), 'https://example.com/read?q=book#chapter');
});
test('tracking cleanup is optional and does not rewrite signed query encoding', () => {
  assert.equal(normalizeUrl('https://example.com/?q=hello%20world&sig=ab%2Fcd&utm_source=x', false), 'https://example.com/?q=hello%20world&sig=ab%2Fcd&utm_source=x');
});
test('preserves a query byte-for-byte when there are no trackers', () => {
  assert.equal(normalizeUrl('https://example.com/?q=hello%20world&x=2&x=1'), 'https://example.com/?q=hello%20world&x=2&x=1');
});
test('cleans uppercase tracker names', () => assert.equal(normalizeUrl('https://example.com/?UTM_CAMPAIGN=x&GCLID=y'), 'https://example.com/'));
test('adds HTTPS to bare domains', () => assert.equal(normalizeUrl('developer.mozilla.org/en-US/'), 'https://developer.mozilla.org/en-US/'));
test('keeps distinct legitimate queries distinct', () => assert.notEqual(normalizeUrl('https://example.com/?id=1'), normalizeUrl('https://example.com/?id=2')));
test('keeps fragments because they can identify different documents', () => assert.notEqual(normalizeUrl('https://example.com/#one'), normalizeUrl('https://example.com/#two')));
for (const invalid of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///tmp/file', 'https://user:password@example.com/', 'not a url', 'https://']) {
  test(`rejects unsafe or invalid URL: ${invalid}`, () => assert.throws(() => normalizeUrl(invalid)));
}
test('extracts links from prose, Markdown, and a bare-domain line', () => {
  const parsed = parseLinks('Read [this](https://example.com/a). And https://example.org/b!\nwww.example.net\nexample.edu/lesson\ninvalid text');
  assert.deepEqual(parsed, { links: ['https://example.com/a', 'https://example.org/b', 'https://www.example.net/', 'https://example.edu/lesson'], skipped: 1 });
});
test('retains balanced parentheses in URLs', () => assert.equal(parseLinks('[wiki](https://en.wikipedia.org/wiki/Function_(mathematics))').links[0], 'https://en.wikipedia.org/wiki/Function_(mathematics)'));
test('empty input has no candidates', () => assert.deepEqual(parseLinks(' \n'), { links: [], skipped: 0 }));
test('deduplicates both existing links and links in one paste', () => {
  const original = [link()];
  const result = addLinks(original, ['https://example.com/', 'https://example.org/', 'https://example.org/'], ' New ');
  assert.equal(result.added, 1);
  assert.equal(result.duplicates, 2);
  assert.equal(result.links[1].collection, 'New');
  assert.equal(original.length, 1);
});
test('rejects an over-limit addition without changing the existing list', () => {
  const original = Array.from({ length: MAX_LINKS }, (_, i) => link(`https://example.com/${i}`));
  assert.throws(() => addLinks(original, ['https://new.example/']));
  assert.equal(original.length, MAX_LINKS);
});
test('titles handle encoded Unicode and malformed encodings', () => {
  assert.equal(defaultTitle('https://example.com/%C3%A7ay'), 'example.com / çay');
  assert.equal(defaultTitle('https://example.com/%ZZ'), 'example.com / %ZZ');
});
test('search combines title, URL, collection, and starred filters', () => {
  const links = [link(), link('https://example.org/', { starred: true, collection: 'Work', title: 'My API' })];
  assert.equal(filterLinks(links, { search: 'API', collection: 'Work', starred: true }).length, 1);
  assert.equal(filterLinks(links, { collection: 'Reading', starred: true }).length, 0);
  assert.equal(filterLinks(links, { search: 'EXAMPLE.COM' }).length, 1);
});
test('JSON export round-trips every field', () => {
  const original = [link('https://example.com/?utm_source=kept', { starred: true, title: 'Çay' })];
  assert.deepEqual(readBackup(exportLinks(original, 'json').text), original);
});
test('backup import reconstructs fields and drops unrecognized keys', () => {
  const imported = readBackup(JSON.stringify({ version: 1, links: [{ ...link(), unexpected: 'ignored' }] }));
  assert.deepEqual(imported, [link()]);
});
for (const data of [
  { version: 2, links: [] },
  { version: 1, links: [link('javascript:alert(1)')] },
  { version: 1, links: [link(), link()] },
  { version: 1, links: [link(undefined, { starred: 'yes' })] },
  { version: 1, links: [link(undefined, { title: '' })] },
  { version: 1, links: [link(undefined, { addedAt: 'nonsense' })] },
  { version: 1, links: [null] }
]) test('invalid backups fail atomically', () => assert.throws(() => readBackup(JSON.stringify(data))));
test('rejects malformed and oversized backup JSON', () => {
  assert.throws(() => readBackup('{'));
  assert.throws(() => readBackup('x'.repeat(2_000_001)));
});
test('merging backups keeps existing titles and adds new metadata', () => {
  const original = [link()];
  const incoming = [link(undefined, { title: 'Changed' }), link('https://example.org/', { starred: true })];
  const merged = mergeBackup(original, incoming);
  assert.equal(merged.added, 1);
  assert.equal(merged.links[0].title, 'Example');
  assert.equal(merged.links[1].starred, true);
});
test('merging over-limit backups fails without changing original data', () => {
  const original = Array.from({ length: MAX_LINKS }, (_, i) => link(`https://example.com/${i}`));
  assert.throws(() => mergeBackup(original, [link('https://extra.example/')]));
  assert.equal(original.length, MAX_LINKS);
});
test('HTML bookmarks escape titles, collection names, and URL attributes', () => {
  const exported = exportLinks([link('https://example.com/?a=1&b=2', { title: '<img onerror="alert(1)">', collection: 'A & B' })], 'html');
  assert.match(exported.text, /&lt;img onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(exported.text, /A &amp; B/);
  assert.match(exported.text, /a=1&amp;b=2/);
  assert.doesNotMatch(exported.text, /<img/);
});
test('Markdown export escapes labels and protects parentheses in URLs', () => {
  const exported = exportLinks([link('https://example.com/a(b)', { title: '[bad](url)', collection: 'A # B', starred: true })], 'markdown');
  assert.match(exported.text, /A \\# B/);
  assert.match(exported.text, /%28b%29/);
  assert.match(exported.text, /★/);
});
test('uncollected links have a readable export heading', () => assert.match(exportLinks([link(undefined, { collection: '' })], 'markdown').text, /## Unsorted/));
test('unknown export formats fail', () => assert.throws(() => exportLinks([], 'xml')));
test('all five HTML-sensitive characters are escaped', () => assert.equal(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;'));

function collectionAtBytes(bytes) {
  const entry = link('https://example.com/?q=', { title: 'Çay ★' });
  const baseBytes = new TextEncoder().encode(serializeBackup([entry])).byteLength;
  entry.url += 'x'.repeat(bytes - baseBytes);
  return [entry];
}

test('canonical JSON is the export format and round-trips at the UTF-8 byte limit', () => {
  const original = collectionAtBytes(MAX_BACKUP_BYTES);
  const text = serializeBackup(original);
  assert.equal(new TextEncoder().encode(text).byteLength, MAX_BACKUP_BYTES);
  assert.ok(text.length < MAX_BACKUP_BYTES);
  assert.equal(exportLinks(original, 'json').text, text);
  assert.deepEqual(readBackup(text), original);
});
test('rejects JSON one byte above the shared limit', () => {
  const text = serializeBackup(collectionAtBytes(MAX_BACKUP_BYTES));
  assert.throws(() => readBackup(text + ' '), /UTF-8/);
  assert.throws(() => serializeBackup(collectionAtBytes(MAX_BACKUP_BYTES + 1)), /UTF-8/);
});
test('raw backup byte limits include Unicode and unrecognized fields', () => {
  const text = JSON.stringify({ version: 1, links: [link()], padding: 'ç'.repeat(1_000_000) });
  assert.ok(text.length < MAX_BACKUP_BYTES);
  assert.throws(() => readBackup(text), /UTF-8/);
});
test('compact saves must fit their canonical portable backup before being accepted', () => {
  const original = collectionAtBytes(MAX_BACKUP_BYTES + 1);
  const compact = JSON.stringify({ version: 1, links: original });
  assert.ok(new TextEncoder().encode(compact).byteLength < MAX_BACKUP_BYTES);
  assert.throws(() => readBackup(compact), /UTF-8/);
});
test('oversized pasted additions fail without modifying the previous collection', () => {
  const original = [link()];
  assert.throws(() => addLinks(original, ['https://new.example/?q=' + 'x'.repeat(MAX_BACKUP_BYTES)]), /UTF-8/);
  assert.deepEqual(original, [link()]);
});
test('merging individually valid backups rejects an oversized combined collection', () => {
  const original = [link('https://first.example/?q=' + 'x'.repeat(1_000_000))];
  const incoming = [link('https://second.example/?q=' + 'x'.repeat(1_000_000))];
  assert.deepEqual(readBackup(serializeBackup(original)), original);
  assert.deepEqual(readBackup(serializeBackup(incoming)), incoming);
  assert.throws(() => mergeBackup(original, incoming), /UTF-8/);
  assert.equal(original.length, 1);
});
test('canonical serialization validates and reconstructs link fields', () => {
  const entry = link('https://EXAMPLE.com/', { title: ' Example ', unexpected: 'ignored' });
  const restored = readBackup(serializeBackup([entry]));
  assert.deepEqual(restored, [link()]);
  assert.throws(() => serializeBackup([link(undefined, { starred: 'yes' })]), /invalid link/);
});
