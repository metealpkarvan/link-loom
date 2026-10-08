import { addLinks, exportLinks, filterLinks, MAX_BACKUP_BYTES, mergeBackup, parseLinks, readBackup, serializeBackup } from './links.js';
import { createCollectionStore } from './storage.js';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'link-loom:v1';
let links = [];
let starredOnly = false;
let editingUrl = null;
let editingSnapshot = null;
let sessionDirty = false;
let storage;
try { storage = window.localStorage; }
catch { storage = { getItem() { throw new Error('Storage access is unavailable.'); } }; }
const store = createCollectionStore(storage, STORAGE_KEY);
links = store.load().links;

function notify(text) {
  $('message').textContent = text;
  if ($('edit-dialog').open) $('edit-message').textContent = store.state.mode === 'protected'
    ? text + ' Saving is paused; your draft is kept. Cancel to download the original or restore a valid backup.'
    : text;
}

function updateStorageStatus() {
  const { mode, raw } = store.state;
  const protectedData = mode === 'protected';
  $('storage-status').textContent = protectedData ? 'Saved data protected' : mode === 'unavailable' ? 'Session only — export to keep' : 'Saved in this browser';
  $('storage-warning').hidden = mode === 'ready';
  $('storage-warning-title').textContent = protectedData ? 'Your saved data is protected.' : 'This collection is session only.';
  $('storage-warning-text').textContent = protectedData
    ? 'The stored collection could not be read. Changes are paused; your last readable links are kept. Download the original or import a valid JSON backup to recover.'
    : 'Browser storage is unavailable. Export your collection before closing this page, or retry reading saved data.';
  $('download-original').hidden = typeof raw !== 'string';
  $('add-button').disabled = protectedData;
  $('save-edit').disabled = protectedData;
  if (protectedData && $('edit-dialog').open) $('edit-message').textContent = 'Saving is paused to protect unreadable data. Your draft is kept. Cancel to download the original or restore a valid backup.';
}

function commit(next, options) {
  try {
    if (store.state.mode === 'unavailable') {
      links = readBackup(serializeBackup(next));
      sessionDirty = true;
    } else {
      links = store.save(next, options).links;
      sessionDirty = false;
    }
  } catch (error) {
    if (error.code === 'changed' && store.state.mode === 'ready') links = store.state.links;
    updateStorageStatus();
    render();
    throw error;
  }
  updateStorageStatus();
  render();
}

function iconButton(label, glyph, onClick, pressed, mutates = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-button';
  button.textContent = glyph;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.disabled = mutates && store.state.mode === 'protected';
  if (pressed !== undefined) button.setAttribute('aria-pressed', String(pressed));
  button.addEventListener('click', () => {
    try { onClick(); } catch (error) { notify(error.message); }
  });
  return button;
}

function render() {
  const selectedCollection = $('collection-filter').value;
  const groups = [...new Set(links.map(link => link.collection).filter(Boolean))].sort();
  const options = [new Option('All collections', ''), ...groups.map(group => new Option(group, group))];
  $('collection-filter').replaceChildren(...options);
  $('collection-filter').value = groups.includes(selectedCollection) ? selectedCollection : '';
  const filtered = filterLinks(links, { search: $('search-input').value, collection: $('collection-filter').value, starred: starredOnly });
  $('link-list').replaceChildren();
  for (const link of filtered) {
    const item = document.createElement('li');
    item.className = 'link-card';
    const domain = new URL(link.url).hostname;
    const tile = document.createElement('span');
    tile.className = 'domain-tile';
    tile.textContent = domain.replace(/^www\./, '').slice(0, 1).toUpperCase();
    tile.setAttribute('aria-hidden', 'true');
    const content = document.createElement('div');
    content.className = 'link-content';
    const anchor = document.createElement('a');
    anchor.className = 'link-title';
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.title;
    anchor.title = link.url;
    const meta = document.createElement('div');
    meta.className = 'link-meta';
    const domainText = document.createElement('span');
    domainText.textContent = domain;
    meta.append(domainText);
    if (link.collection) {
      const tag = document.createElement('span');
      tag.className = 'collection-tag';
      tag.textContent = link.collection;
      meta.append(tag);
    }
    content.append(anchor, meta);
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.append(
      iconButton(`${link.starred ? 'Unstar' : 'Star'} ${link.title}`, link.starred ? '★' : '☆', () => {
        commit(links.map(entry => entry.url === link.url ? { ...entry, starred: !entry.starred } : entry));
        notify(link.starred ? 'Star removed.' : 'Link starred.');
      }, link.starred, true),
      iconButton(`Edit ${link.title}`, '✎', () => {
        editingUrl = link.url;
        editingSnapshot = JSON.stringify(link);
        $('edit-title').value = link.title;
        $('edit-collection').value = link.collection;
        $('edit-message').textContent = '';
        $('edit-dialog').showModal();
        $('edit-title').focus();
      }, undefined, true),
      iconButton(`Copy ${link.title}`, '⧉', async () => {
        try { await navigator.clipboard.writeText(link.url); notify('Clean link copied.'); }
        catch { notify('Clipboard is unavailable. Open the link and copy its address, or use Export.'); }
      }),
      iconButton(`Remove ${link.title}`, '×', () => {
        commit(links.filter(entry => entry.url !== link.url));
        notify('Link removed.');
      }, undefined, true)
    );
    item.append(tile, content, actions);
    $('link-list').append(item);
  }
  $('link-count').textContent = links.length;
  $('empty-state').hidden = links.length !== 0;
  $('no-results').hidden = links.length === 0 || filtered.length !== 0;
  $('results-count').hidden = filtered.length === links.length;
  $('results-count').textContent = `Showing ${filtered.length} of ${links.length} links`;
  $('export-button').disabled = links.length === 0;
  $('collection-summary').textContent = links.length ? `${links.length} link${links.length === 1 ? '' : 's'} · ${groups.length} collection${groups.length === 1 ? '' : 's'}` : 'Ready for your first link.';
}

$('capture-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const parsed = parseLinks($('paste-input').value, $('clean-toggle').checked);
    if (!parsed.links.length) { notify('No valid links found. Paste an HTTP/HTTPS URL or a domain such as example.com.'); return; }
    const result = addLinks(links, parsed.links, $('collection-input').value);
    commit(result.links);
    $('paste-input').value = '';
    notify(`${result.added} added · ${result.duplicates} duplicates skipped · ${parsed.skipped} invalid entries skipped.`);
  } catch (error) { notify(error.message); }
});
$('sample-button').addEventListener('click', () => {
  $('paste-input').value = 'https://developer.mozilla.org/en-US/?utm_source=sample\nhttps://www.gutenberg.org/\nhttps://radio.garden/\nhttps://developer.mozilla.org/en-US/?utm_source=another';
  $('collection-input').value = 'Good finds';
  $('paste-input').focus();
  notify('Sample links are ready. Add them to try cleaning and deduplication.');
});
$('search-input').addEventListener('input', render);
$('collection-filter').addEventListener('change', render);
$('favorite-filter').addEventListener('click', () => {
  starredOnly = !starredOnly;
  $('favorite-filter').setAttribute('aria-pressed', String(starredOnly));
  render();
});
$('reset-filters').addEventListener('click', () => {
  $('search-input').value = '';
  $('collection-filter').value = '';
  starredOnly = false;
  $('favorite-filter').setAttribute('aria-pressed', 'false');
  render();
});
$('edit-form').addEventListener('submit', event => {
  event.preventDefault();
  const title = $('edit-title').value.trim();
  if (!title) { notify('A title cannot be empty.'); return; }
  try {
    const current = links.find(link => link.url === editingUrl);
    if (!current || JSON.stringify(current) !== editingSnapshot) {
      throw new Error('This link changed elsewhere. Your draft is kept; copy it and reopen the editor before updating.');
    }
    commit(links.map(link => link.url === editingUrl ? { ...link, title, collection: $('edit-collection').value.trim() } : link));
    $('edit-dialog').close();
    notify('Link updated.');
  } catch (error) { notify(error.message); }
});
$('cancel-edit').addEventListener('click', () => $('edit-dialog').close());
function download(text, type, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
$('export-button').addEventListener('click', () => {
  try {
    const exported = exportLinks(links, $('export-format').value);
    download(exported.text, exported.type, `link-loom.${exported.extension}`);
    notify(`Exported all ${links.length} links. Choose JSON backup to re-import them later.`);
  } catch (error) { notify(error.message); }
});
$('download-original').addEventListener('click', () => {
  const { raw } = store.state;
  if (typeof raw !== 'string') return;
  download(raw, 'text/plain', 'link-loom-recovery.txt');
  notify('Original stored text downloaded. Keep this recovery copy; it may need repair before import.');
});
$('retry-storage').addEventListener('click', () => {
  if (sessionDirty && !window.confirm('Reload saved data? Session-only changes will be replaced. Export them first if you want to keep them.')) return;
  const next = store.load();
  if (next.mode === 'ready') { links = next.links; sessionDirty = false; }
  updateStorageStatus();
  render();
  notify(next.mode === 'ready' ? 'Saved collection loaded.' : next.mode === 'protected' ? 'Saved data is still unreadable. The original is protected.' : 'Storage is still unavailable. Export before closing this page.');
});
$('import-button').addEventListener('click', () => $('import-input').click());
$('import-input').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  const protectedRaw = store.state.mode === 'protected' ? store.state.raw : undefined;
  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup is too large (maximum 2 MB in UTF-8).');
    const imported = readBackup(await file.text());
    const result = mergeBackup(links, imported);
    if (protectedRaw !== undefined) {
      if (store.state.raw !== protectedRaw || store.state.mode !== 'protected') throw new Error('Saved data changed while opening the backup. Review it and select the backup again.');
      if (!window.confirm('Restore this valid backup? It will be merged with your last readable links. The unreadable stored text will be downloaded as a recovery copy before it is replaced.')) {
        notify('Restore cancelled. Original saved data was kept.');
        return;
      }
      const latest = store.load();
      if (latest.raw !== protectedRaw || latest.mode !== 'protected') {
        if (latest.mode === 'ready') links = latest.links;
        updateStorageStatus(); render();
        throw new Error('Saved data changed before restoration. Nothing was replaced. Review it and try again.');
      }
      download(protectedRaw, 'text/plain', 'link-loom-recovery.txt');
      commit(result.links, { replaceProtected: true });
    } else commit(result.links);
    notify(`Imported ${result.added} links. Existing links were kept.`);
  } catch (error) { notify(`Import failed: ${error.message}`); }
  finally { event.target.value = ''; }
});

// A second open tab can update the collection. Never silently overwrite newer data.
window.addEventListener('storage', event => {
  if ((event.key !== STORAGE_KEY && event.key !== null) || (event.storageArea && event.storageArea !== storage)) return;
  if (sessionDirty) { notify('Saved data changed in another tab. Export your session collection before retrying saved data.'); return; }
  const next = store.load(); // Read current content; queued events can contain older text.
  if (next.mode === 'ready') links = next.links;
  updateStorageStatus(); render();
  notify(next.mode === 'ready' ? 'Collection refreshed from another tab.' : next.mode === 'protected' ? 'Another tab saved unreadable data. It is protected; your last readable links are kept.' : 'Storage could not be read. Your collection is kept; export before leaving.');
});
updateStorageStatus();
render();
