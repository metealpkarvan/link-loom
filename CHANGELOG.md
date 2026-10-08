# Changelog

## 1.1.0 — 2026-10-08

- Keep unreadable saved data behind a persistent recovery notice. Preserve the last readable collection and edit draft; block ordinary changes until recovery.
- Download the original stored text without parsing or reformatting it. Merge a validated backup with the last readable collection, preserving existing metadata on duplicates, then replace protected data after confirmation and an original-text download.
- Reread current storage on other-tab updates and before writes. Reject detected stale changes without applying the attempted edit.
- Use one 2,000,000-byte UTF-8 limit for portable JSON backups and accepted collections. Keep version 1 backups and normal additive import behavior.
- Add a Turkish guide, recovery instructions, a verification record, and a focused roadmap. Package a standalone ZIP with source-byte checks and SHA-256 checksums using Python's standard library; run packaging alongside tests in Linux and native Intel/Apple Silicon Mac CI.

## 1.0.0

- Pasted-link extraction, common tracking cleanup, and duplicate detection.
- Local collections, custom titles, starred links, and search.
- Markdown, browser-bookmark HTML, and JSON exports.
- Validated JSON backup imports, storage failure handling, and cross-tab refresh.
- Responsive interface and automated core tests.
