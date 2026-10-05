import { addLinks, exportLinks, filterLinks, mergeBackup, parseLinks, readBackup } from './links.js';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'link-loom:v1';
let links = [];
let starredOnly = false;
let editingUrl = null;
let storageAvailable = true;

function notify(text) { $('message').textContent = text; }

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) links = readBackup(saved);
} catch {
  storageAvailable = false;
  $('storage-status').textContent = 'Session only — export to keep';
  notify('Saved data could not be read. This session will not overwrite it. Export a JSON backup before leaving.');
}

function commit(next) {
  if (storageAvailable) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, links: next })); }
    catch { throw new Error('Browser storage is full or unavailable. Export your current collection; this change was not saved.'); }
  }
  links = next;
  render();
}

function iconButton(label, glyph, onClick, pressed) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-button';
  button.textContent = glyph;
  button.setAttribute('aria-label', label);
  button.title = label;
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
      }, link.starred),
      iconButton(`Edit ${link.title}`, '✎', () => {
        editingUrl = link.url;
        $('edit-title').value = link.title;
        $('edit-collection').value = link.collection;
        $('edit-dialog').showModal();
        $('edit-title').focus();
      }),
      iconButton(`Copy ${link.title}`, '⧉', async () => {
        try { await navigator.clipboard.writeText(link.url); notify('Clean link copied.'); }
        catch { notify('Clipboard is unavailable. Open the link and copy its address, or use Export.'); }
      }),
      iconButton(`Remove ${link.title}`, '×', () => {
        commit(links.filter(entry => entry.url !== link.url));
        notify('Link removed.');
      })
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
    commit(links.map(link => link.url === editingUrl ? { ...link, title, collection: $('edit-collection').value.trim() } : link));
    $('edit-dialog').close();
    notify('Link updated.');
  } catch (error) { notify(error.message); }
});
$('cancel-edit').addEventListener('click', () => $('edit-dialog').close());
$('export-button').addEventListener('click', () => {
  const exported = exportLinks(links, $('export-format').value);
  const url = URL.createObjectURL(new Blob([exported.text], { type: `${exported.type};charset=utf-8` }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `link-loom.${exported.extension}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  notify(`Exported all ${links.length} links. Choose JSON backup to re-import them later.`);
});
$('import-button').addEventListener('click', () => $('import-input').click());
$('import-input').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('Backup is too large (maximum 2 MB).');
    const imported = readBackup(await file.text());
    const result = mergeBackup(links, imported);
    commit(result.links);
    notify(`Imported ${result.added} links. Existing links were kept.`);
  } catch (error) { notify(`Import failed: ${error.message}`); }
  finally { event.target.value = ''; }
});

// A second open tab can update the collection. Never silently overwrite newer data.
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY) return;
  try {
    links = event.newValue ? readBackup(event.newValue) : [];
    render();
    notify('Collection refreshed from another tab.');
  } catch { notify('Another tab saved unreadable data. Reload before making changes.'); }
});
render();
