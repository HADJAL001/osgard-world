# Checkout revenue attribution — 13 October 2026

## Purpose
Connect verified payment state to the game/campaign context that sent a visitor to the OSGARD hosted checkout. This adds an attribution dimension without changing product prices, entitlement policy, or payment activation switches.

## Data contract
- Optional client fields: `attribution.gameId`, `attribution.source`, and `attribution.campaign`.
- Game IDs are normalized against the first-party allow-list; unknown or invalid values become `unknown`.
- Source and campaign are short lowercase slugs (letters, digits, underscore, hyphen); unsafe values fall back to `direct` or the empty campaign.
- Existing clients remain compatible and default to `unknown / direct / no campaign`.
- The same safe values are stored on the order and copied into Stripe Checkout metadata. No email, phone, contact, or free text is placed in attribution metadata.

## Admin reporting
The protected `/v1/admin/overview` response includes `paidRevenueByAttribution`: orders whose persisted status is currently `paid`, created in the last 30 days, grouped by game, source, campaign, mode, and currency. The admin screen renders values as text, not interpolated HTML.

## Interpretation limits
- Attribution values come from URL parameters and can be edited by a visitor; they classify campaign links but do not prove a human's identity or that a specific promotion caused a purchase.
- Amounts are gross provider-reported Checkout totals before processor fees and operating costs. Currency groups must never be added together.
- For a subscription, this report describes the original Checkout amount on the order, not monthly recurring revenue or all renewal invoices.
- Refunds and orders no longer in `paid` status are excluded. The reporting window is based on order creation time.
- Production checkout and this report remain dormant until the operator configures Stripe, verified webhooks, PostgreSQL, API URL, price IDs and deployment secrets. The public config must not contain private keys.

## Server integrity fix
The current master version accidentally duplicated admin handler code inside the social-share aggregation query and after shutdown hooks. This branch rebuilds the server from the last clean revision, restores the intended social-share query in the correct location, and adds a check for exactly one admin overview route. The service workflow runs `node --check src/server.mjs`.

## Validation
New service tests cover safe attribution slugs, backwards-compatible defaults, invalid URL values, and the tenth game ID. `scripts/commerce-rollout-smoke.mjs` adds source-contract checks.
