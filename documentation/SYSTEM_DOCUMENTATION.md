# VoltZone POS — System Documentation

Last updated: 2025-12-16

This document describes the VoltZone POS codebase present in this workspace. It provides a clear, simple overview of the architecture, the key components (client and server), setup and run instructions, important flows (sale lookup, returns, exchange slips), recent fixes applied, troubleshooting tips, and recommended next steps.

---

## 1. Project Overview

- Repository: VoltZone POS (local workspace path: `d:\STUFF\MY PROJECTS\voltzone-pos Cursor`).
- Purpose: A point-of-sale web application with a client (React + Vite/TypeScript) and a server (Node/TypeScript + Express-like services + MongoDB models). It supports sales, returns, exchange slips, overpayments, and store inventory handling.

Top-level folders:
- `client/` — Frontend single-page application (React + Vite + TypeScript).
- `server/` — Backend TypeScript services, controllers and models (Node). Uses Mongoose models and a modular service layer.
- `docs/` — Documentation files and guides.
- `uploads/` — (Static) uploads used by the app.

Key top-level files: `README.md`, `package.json`, `docker-compose.yml`, and a number of project documentation and test-case files.

---

## 2. Architecture

High-level architecture:
- Frontend (client): React + TypeScript + Vite. Components are under `client/src/components`, pages under `client/src/pages`. State management uses small stores under `client/src/store` and custom hooks under `client/src/hooks`.
- Backend (server): TypeScript Node app with services under `server/src/services`, models under `server/src/models`, controllers under `server/src/controllers`. Mongoose is used for MongoDB interaction.
- API contract: The frontend calls backend REST endpoints (or RPC-like endpoints) implemented by server controllers that delegate to service functions (e.g., `ReturnService`).
- Data persistence: MongoDB using Mongoose models such as `Sale`, `Product`, `Customer`, `ReturnTransaction`, `ExchangeSlip`, etc.

Design notes:
- The backend service layer (e.g., `ReturnService`) centralizes return/exchange logic and enforces validation and transactional operations with MongoDB sessions.
- The client presents a polished UI with reusable UI components and carefully styled panels (rounded cards, gradients). Forms are validated before calling backend endpoints.

---

## 3. Key Components and Files

Frontend (client):
- `client/src/pages/ReturnsPage.tsx` and `client/src/components/returns/` — primary UI for searching sales and processing returns.
  - `SaleLookup.tsx` — sale search form and search results list (invokes `returnsApi.lookupSales`).
  - `ReturnProcessor.tsx` — UI to select return items, set reasons/conditions, validate and process returns.
- `client/src/lib/api/returns.api.ts` — client-side API wrapper that calls server endpoints for lookup, validation, and processing of returns.
- `client/src/lib/supabase.ts`, `client/src/lib/realtime.ts` — real-time and backend proxy utilities (project-specific helpers).

Backend (server):
- `server/src/services/ReturnService.ts` — core server-side logic for returns and exchange slips. Responsibilities:
  - Generate unique return and exchange-slip numbers.
  - Lookup sales (with flexible phone/invoice/product filters), populate necessary fields, and return normalized sale items.
  - Validate return requests against policies and sale history.
  - Process return transactions (create `ReturnTransaction`, optionally create `ExchangeSlip` and `CustomerOverpayment`, update sale records, adjust inventory and stock movement) inside MongoDB transactions.
  - Create exchange slips and include item-level name/sku information where available.
- `server/src/models/*` — Mongoose models: `Sale`, `Product`, `Customer`, `ReturnTransaction`, `ExchangeSlip`, `CustomerOverpayment`, `Inventory`, `StockMovement`, `ReturnPolicy`.

Configuration & utilities:
- Frontend: `client/package.json`, `vite.config.ts`, `tailwind.config.js`.
- Backend: `server/package.json`, `tsconfig.json`, nodemon config.

---

## 4. Important Flows (detailed)

This section explains the main flows and how they are implemented.

4.1 Sale Lookup (frontend -> backend)
- Frontend: `SaleLookup.tsx` collects search criteria (invoice number, customer name, phone) and calls `returnsApi.lookupSales`.
- Backend: `ReturnService.lookupSales(options)` builds flexible filters:
  - Date range (default last 365 days).
  - Invoice number regex match.
  - Customer search: constructs phone variants (local, international, +94 variants), searches `Customer`, then adds `customer` filter.
  - Product search: finds matching `Product` IDs and filters `items.product`.
  - Performs population of `customer` and `items.product` and returns normalized sale objects with `items` and `returnSummary` present.
- Notes: backend returns `items` with `productDetails` when populated; frontend should handle missing or partial data gracefully.

4.2 Return Validation
- Frontend collects selected return items and builds a `ReturnRequest` including `saleId`, `items[]`, `returnType`, `refundMethod`, `discount`, `notes`.
- Backend: `ReturnService.validateReturn(request)`:
  - Loads sale and applicable return policy.
  - Checks return window (day count) and computes days since sale date.
  - Builds a map of sale items and calculates already returned quantities.
  - For each requested item, validates qty vs available and flags errors/warnings for amounts exceeding proportional original price.
  - Confirms refund method allowed by policy and checks approval thresholds.
  - Returns `valid`, list of `errors` and `warnings`, `requiresApproval`, and `policy`.

4.3 Processing Returns
- Frontend: after validation returns success, user calls process. The UI calls `returnsApi.processReturn`.
- Backend: `ReturnService.processReturn(request, processedBy)`:
  - Runs full validation again.
  - Opens a MongoDB session and transaction.
  - Creates `ReturnTransaction` document; may create an `ExchangeSlip` (if refundMethod is `exchange_slip`) or `CustomerOverpayment` for overpayments/store credit.
  - Updates sale document: appends return info, updates `returnSummary`, and adjusts sale status.
  - Adjusts inventory and logs stock movement if policy requires auto-restock.
  - Saves everything in the transaction and returns created objects.

4.4 Exchange Slip Generation
- Backend: `createExchangeSlip` uses sale data (populating `items.product` with `name` and `sku`) to annotate slip items with `name` and `sku` when creating the slip. This ensures the frontend preview shows item names.
- Frontend: `ReturnProcessor` contains `openExchangeSlipPreview` which opens a printable preview window using the slip data returned from the server and displays `item.name`, `sku`, `qty`, and `value`.

---

## 5. Setup, Build and Run (simple steps)

Prerequisites:
- Node.js (14+ or LTS recommended), npm.
- MongoDB instance (local or cloud) reachable via configured connection string in the `server` environment/config.

To run frontend (development):
```bash
cd client
npm install
npm run dev
```

To build frontend:
```bash
cd client
npm install
npm run build
```

To run backend (development):
```bash
cd server
npm install
# configure .env or environment variables for MongoDB, PORT, etc.
npm run dev   # if dev script uses nodemon/ts-node
```

To build backend (TypeScript):
```bash
cd server
npm install
npm run build   # runs tsc
```

To run production (example):
- Build server with `npm run build`, then start with `node dist/server.js` (or whatever your start script points to). Confirm your `package.json` scripts.

---

## 6. Recent Fixes and Important Implementation Notes

During recent debugging and fixes the following changes were applied (these are important to be aware of):

- SaleLookup date formatting crash fixed:
  - Problem: `date-fns` `format` was called with invalid date values causing `RangeError: Invalid time value`.
  - Fix: `SaleLookup.tsx` now uses a `formatDate` helper that safely parses ISO strings (`parseISO`) and validates with `isValid` before calling `format`. Invalid or missing dates are displayed as `-`.

- ReturnProcessor crash when `sale.items` missing:
  - Problem: UI assumed `sale.items` always exists and called `.map`, causing `TypeError` when undefined.
  - Fix: `ReturnProcessor.tsx` now safely maps `(sale?.items || [])` and its handlers check `sale?.items?.[index]` before accessing index-based fields.

- Exchange slip item names displayed in preview:
  - Backend (`ReturnService.createExchangeSlip`) was updated to populate `items` with `name` and `sku` fields (using populated sale item product info when available).
  - Frontend (`ReturnProcessor.mapSlipItems`) preferrers `item.name` / `item.sku` from the slip payload and falls back to sale item product details.

- TypeScript errors fixed in `ReturnService.ts` by providing safe `any` casts when accessing `product.name` and `product.sku` in created slip items (to satisfy strict TS types for populated/unpopulated cases).

These changes improve runtime robustness and ensure the UI shows product names in search results and slip previews.

---

## 7. Troubleshooting & Common Issues

- Build TypeScript errors complaining about property access on `ObjectId` or subdocuments:
  - Cause: code accesses fields like `product.name` when TypeScript types indicate `product` may be an `ObjectId`.
  - Fixes: either populate the field before use, adjust Mongoose type definitions, or cast to `any` when safe and add runtime guards.

- Invalid date formatting errors in the UI:
  - Ensure the backend returns properly formatted ISO date strings (or frontend safely handles missing/invalid dates using `parseISO` and `isValid`).

- `sale.items` undefined in UI:
  - Frontend must always guard against missing arrays from backend responses: use `(sale?.items || [])` and add fallbacks.

- Exchange slip shows empty item names:
  - Verify the backend populated `items.product` (or included `name`/`sku` fields on slip items). If not, generate the slip server-side using populated sale data.

- Searching by phone returns no results:
  - The lookup generates multiple phone variants. Ensure the phone number provided is normalized and the customers collection has matching canonical or alternate phone fields. Use logs from `ReturnService.lookupSales` (it prints filter JSON when searching by phone/invoice) to debug.

---

## 8. File Map — Notable locations

Frontend (client):
- `client/src/components/returns/SaleLookup.tsx` — sale search UI, result list.
- `client/src/components/returns/ReturnProcessor.tsx` — return configuration, validation, process UI.
- `client/src/lib/api/returns.api.ts` — REST API wrappers.

Backend (server):
- `server/src/services/ReturnService.ts` — central return/exchange logic, recommended starting point for changes.
- `server/src/models/*` — Mongoose schema definitions (Sale, Product, Customer, ReturnTransaction, ExchangeSlip, etc.).

Docs:
- `docs/*` — assorted guides (ImageProxy, Backup notes, Face ID flow, etc.).

---

## 9. Recommendations & Next Steps

- Expand the server TypeScript types for populated vs unpopulated fields. Consider creating helper types or small utility functions to safely extract `name` / `sku` from possible shapes.
- Add unit tests for `ReturnService.validateReturn` and `processReturn` flows using a mocked MongoDB (or in-memory MongoDB) to prevent regressions.
- Add backend logging (structured) for key operations (lookups, validation failures, transaction errors) to ease debugging in production.
- Consider adding more defensive checks and user-friendly error messages on the frontend where we still see potential undefined data.
- Add an integration test that performs a sale lookup, then validates and processes a simple return (end-to-end smoke test).

---

## 10. Contact / Ownership

- This document was generated from the local workspace on your machine. Use it as an operational reference. If you want, I can extend this by adding diagrams, sequence flows for return processing, or automated checks (linting, tests) to improve developer confidence.

---

If you'd like this documentation split into separate files (architecture, setup, troubleshooting), or want diagrams or an API reference file, tell me which parts to expand and I will generate them.
