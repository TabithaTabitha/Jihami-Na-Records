---
name: Jihami C2B feed contract
description: Non-obvious upstream contract for the waste-collection payment feed.
---

The waste-collection payment feed is served at `/wcol-c2b` on the Jihami upstream and returns ISO-8601 transaction timestamps; dashboard requests must preserve the user's bearer authorization when routed through the local API.

**Why:** The similarly named `/api/payments/c2b` route returned validation errors, while the working feed returned records with a different timestamp format.

**How to apply:** Keep the browser on the same-origin `/api` route for CORS and authentication, rewrite only that local alias to the upstream `/wcol-c2b` path, and parse both ISO and legacy compact timestamps.

Customer creation uses a strict JSON contract: `full_name`, `phone`, `email`, `address`, `customer_type`, `waste_type`, `collection_frequency`, `status`, and numeric `plan_id`; `customer_code` is not part of the create payload.

**Why:** The create endpoint expects the server to handle customer-code assignment and rejects or ignores the older client-generated code field.

**How to apply:** Keep the client-code field available only when editing an existing customer, and require a selected plan before submitting a new customer.