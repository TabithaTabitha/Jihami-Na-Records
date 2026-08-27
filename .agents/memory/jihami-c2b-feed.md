---
name: Jihami C2B feed contract
description: Non-obvious upstream contract for the waste-collection payment feed.
---

The waste-collection payment feed is served at `/wcol-c2b` on the Jihami upstream and returns ISO-8601 transaction timestamps; dashboard requests must preserve the user's bearer authorization when routed through the local API.

**Why:** The similarly named `/api/payments/c2b` route returned validation errors, while the working feed returned records with a different timestamp format.

**How to apply:** Keep the browser on the same-origin `/api` route for CORS and authentication, rewrite only that local alias to the upstream `/wcol-c2b` path, and parse both ISO and legacy compact timestamps.