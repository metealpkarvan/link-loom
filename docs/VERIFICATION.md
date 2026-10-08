# Verification record

Release: 1.1.0 · Date: 2026-10-08

## Reproduced problems

Synthetic saved text that could not be parsed opened the previous app in a session-only state without a way to download the original. An unreadable update from another tab could instead reach a later write and be replaced. The recovery flow now preserves the stored text and blocks ordinary writes while it is protected.

The previous importer checked the string's character count against a 2 MB limit, while JSON export had no matching limit. Multibyte text and large collections could produce backups beyond the advertised byte bound. The same canonical JSON serializer now checks UTF-8 bytes before a collection is accepted or exported.

No private bookmarks or browser-profile data were used to reproduce these problems.

## Automated checks

60 rule and storage tests passed locally during this update. They cover URL normalization, import validation, collection limits, portable JSON round trips, UTF-8 byte boundaries, safe exports, unreadable initial and external saves, raw-text preservation, explicit replacement, storage failures, and detected stale writes. Storage tests use an injected synthetic store.

CI retains the Node 22/24 Linux matrix and native Node 24 checks on `macos-15-intel` (`x64`) and `macos-latest` (`arm64`). Each of the four jobs also runs `python3 scripts/package.py`. The standard-library packager includes the static app and public guides, checks ZIP entries against source bytes, and writes a SHA-256 manifest. Actual remote results are available in [GitHub Actions](https://github.com/metealpkarvan/link-loom/actions/workflows/ci.yml); the local checks recorded here do not establish a passing remote release run.

## Local browser acceptance

**38 Chromium browser checks passed, with zero page errors.** The app was served over local HTTP and tested with fictional links and synthetic saved data. Two real tabs exercised an unreadable external update while an edit draft was open; the draft remained intact. An actual downloaded recovery file matched the original Unicode stored text exactly.

Checks also covered cancelled and confirmed recovery imports, merging restored links while keeping existing metadata on duplicates, normal reload and additive imports, rejected stale writes and stale edits, queued old storage events without rolling back the latest state, and saved-data removal by another tab. Quota failures preserved the collection; storage-unavailable sessions could export their data.

Screenshots were visually inspected at desktop width 1440 and mobile widths 320 and 390 pixels. The protected view at 320 pixels and normal view at 390 pixels had no horizontal overflow.

[Desktop](screenshot.png) · [Mobile](mobile.png) · [Recovery desktop](recovery-desktop.png) · [Recovery mobile](recovery-mobile.png)

## Release packaging

Run `python3 scripts/package.py` to produce the standalone ZIP and SHA-256 manifest. The ZIP contains the static app and public guides. Extract it and serve its directory over local HTTP with the same ES module paths; no dependency installation or build step is needed. From `dist`, run `shasum -a 256 -c SHA256SUMS.txt` to verify the archive.

The local browser results above cover the workspace app. They do not establish a verified public release download or deployment. Release assets and checksums are available from [GitHub Releases](https://github.com/metealpkarvan/link-loom/releases).

## Limits

The write guard compares the current stored text before writing. `localStorage` offers no cross-tab transaction, so a change between that check and the write remains possible. The app does not provide device synchronization or version history.

A recovery download preserves the original text; it does not repair invalid JSON. Backups and recovery files are unencrypted. Browser download and storage permissions can prevent saving, and a started download does not establish that the user retained the file.

Native Mac rule tests do not establish Safari, Firefox, assistive-technology, or real-device coverage. No user study, security audit, adoption measurement, or productivity result is claimed.
