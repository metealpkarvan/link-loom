export const MAX_LINKS = 1000;
export const TRACKERS = new Set(['fbclid', 'gclid', 'dclid', 'msclkid', 'mc_cid', 'mc_eid', '_hsenc', '_hsmi']);

export function normalizeUrl(raw, cleanTracking = true) {
  let value = raw.trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = `https://${value}`;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') && url.hostname !== 'localhost') {
    throw new Error('Use a complete HTTP or HTTPS URL.');
  }
  if (url.username || url.password) throw new Error('URLs containing credentials are not supported.');
  if (cleanTracking) {
    // Delete only known trackers. Do not sort or rebuild legitimate query parameters:
    // signed URLs and repeated query values may depend on their original encoding/order.
    for (const name of [...url.searchParams.keys()]) {
      if (name.toLowerCase().startsWith('utm_') || TRACKERS.has(name.toLowerCase())) url.searchParams.delete(name);
    }
  }
  return url.href;
}

function trimPunctuation(value) {
  let result = value.replace(/[.,;!]+$/, '');
  while (result.endsWith(')') && (result.match(/\)/g) || []).length > (result.match(/\(/g) || []).length) {
    result = result.slice(0, -1);
  }
  return result;
}

export function parseLinks(text, cleanTracking = true) {
  const links = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)) {
    const embedded = line.match(/https?:\/\/[^\s<>"`]+|www\.[^\s<>"`]+/gi);
    const candidates = embedded || [line];
    for (const candidate of candidates) {
      try { links.push(normalizeUrl(trimPunctuation(candidate), cleanTracking)); }
      catch { skipped++; }
    }
  }
  return { links, skipped };
}

export function defaultTitle(url) {
  const parsed = new URL(url);
  const path = parsed.pathname.replace(/^\/+|\/+$/g, '');
  if (!path) return parsed.hostname;
  let title;
  try { title = decodeURIComponent(path); } catch { title = path; }
  return `${parsed.hostname} / ${title}`.slice(0, 200);
}

export function addLinks(existing, urls, collection = '', now = new Date().toISOString()) {
  const result = [...existing];
  const known = new Set(existing.map(link => link.url));
  let duplicates = 0;
  for (const url of urls) {
    if (known.has(url)) { duplicates++; continue; }
    if (result.length >= MAX_LINKS) throw new Error(`A collection can hold up to ${MAX_LINKS} links. Export a backup first.`);
    result.push({ url, title: defaultTitle(url), collection: collection.trim().slice(0, 40), starred: false, addedAt: now });
    known.add(url);
  }
  return { links: result, added: result.length - existing.length, duplicates };
}

export function filterLinks(links, { search = '', collection = '', starred = false } = {}) {
  const query = search.trim().toLocaleLowerCase();
  return links.filter(link => (!starred || link.starred) && (!collection || link.collection === collection)
    && `${link.title} ${link.url} ${link.collection}`.toLocaleLowerCase().includes(query));
}

export function readBackup(text) {
  if (text.length > 2_000_000) throw new Error('Backup is too large (maximum 2 MB).');
  const data = JSON.parse(text);
  if (data?.version !== 1 || !Array.isArray(data.links) || data.links.length > MAX_LINKS) {
    throw new Error('Use a Link Loom JSON backup with version 1.');
  }
  const known = new Set();
  return data.links.map(link => {
    if (!link || typeof link.url !== 'string' || typeof link.title !== 'string'
      || !link.title.trim() || link.title.length > 200 || typeof link.collection !== 'string'
      || link.collection.length > 40 || typeof link.starred !== 'boolean'
      || typeof link.addedAt !== 'string' || Number.isNaN(Date.parse(link.addedAt))) {
      throw new Error('Backup contains an invalid link. Nothing was imported.');
    }
    const url = normalizeUrl(link.url, false);
    if (known.has(url)) throw new Error('Backup contains duplicate links. Nothing was imported.');
    known.add(url);
    return { url, title: link.title.trim(), collection: link.collection, starred: link.starred, addedAt: link.addedAt };
  });
}

export function mergeBackup(existing, imported) {
  const known = new Set(existing.map(link => link.url));
  const additions = imported.filter(link => !known.has(link.url));
  if (existing.length + additions.length > MAX_LINKS) throw new Error(`Import would exceed the ${MAX_LINKS}-link limit.`);
  return { links: [...existing, ...additions], added: additions.length };
}

export function escapeHtml(text) {
  return text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function escapeMarkdown(text) { return text.replace(/([\\`*_{}\[\]<>#+.!|()])/g, '\\$1'); }

export function exportLinks(links, format) {
  if (format === 'json') return { text: JSON.stringify({ version: 1, links }, null, 2) + '\n', type: 'application/json', extension: 'json' };
  const groups = new Map();
  for (const link of links) {
    const name = link.collection || 'Unsorted';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(link);
  }
  if (format === 'markdown') {
    let text = '# Link Loom\n\n';
    for (const [name, entries] of groups) {
      text += `## ${escapeMarkdown(name)}\n\n`;
      for (const link of entries) {
        const url = link.url.replaceAll('(', '%28').replaceAll(')', '%29').replaceAll('<', '%3C').replaceAll('>', '%3E');
        text += `- ${link.starred ? '★ ' : ''}[${escapeMarkdown(link.title)}](<${url}>)\n`;
      }
      text += '\n';
    }
    return { text, type: 'text/markdown', extension: 'md' };
  }
  if (format !== 'html') throw new Error('Unknown export format.');
  let text = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Link Loom</TITLE>\n<H1>Link Loom</H1>\n<DL><p>\n';
  for (const [name, entries] of groups) {
    text += `  <DT><H3>${escapeHtml(name)}</H3>\n  <DL><p>\n`;
    for (const link of entries) text += `    <DT><A HREF="${escapeHtml(link.url)}">${escapeHtml(link.title)}</A>\n`;
    text += '  </DL><p>\n';
  }
  text += '</DL><p>\n';
  return { text, type: 'text/html', extension: 'html' };
}
