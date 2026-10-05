# Contributing

Keep the app small, dependency-free, and usable without an account.

1. Serve the root with `python3 -m http.server 8080 --bind 127.0.0.1`.
2. Run `npm test` using Node 22+.
3. Check the affected flow at desktop and narrow mobile widths, using a keyboard as well as a pointer.

Add regression tests to `tests/links.test.js` for URL, import, or export behavior. Preserve fragments and legitimate query parameters. Render user strings as text and validate imported URLs before using them in links.

For a bug report, include a minimal example URL or a redacted backup. Never upload private bookmarks, access tokens, or signed URLs. A screenshot of the issue and browser version help.

Open a focused issue or pull request explaining the problem, the resulting behavior, and how you verified it. UI changes should include a screenshot. Please avoid introducing telemetry or automatic link fetching.
