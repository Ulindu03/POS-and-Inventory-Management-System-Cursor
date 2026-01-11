# Architecture — VoltZone POS

This file summarizes the system architecture and main components.

Overview
- Client: React + TypeScript + Vite (SPA). Components under `client/src/components`, pages under `client/src/pages`.
- Server: Node + TypeScript with Mongoose (MongoDB). Services under `server/src/services`, models under `server/src/models`.
- Data: MongoDB with models: `Sale`, `Product`, `Customer`, `ReturnTransaction`, `ExchangeSlip`, `CustomerOverpayment`, `Inventory`, `StockMovement`, `ReturnPolicy`.

Key Responsibilities
- Frontend: UI, form validation, API calls, preview UIs (exchange slip preview), local state stores.
- Backend: Business logic, validation, transactional processing (MongoDB sessions), exchange slip creation, inventory adjustments.

Notable modules
- `client/src/components/returns/SaleLookup.tsx` — sale search UI and results.
- `client/src/components/returns/ReturnProcessor.tsx` — select return items, validate, and process returns; preview exchange slips.
- `server/src/services/ReturnService.ts` — central logic for lookupSales, validateReturn, processReturn, createExchangeSlip, and inventory adjustments.

Design notes
- Service layer performs heavy lifting; controllers should be thin wrappers.
- Use population (`populate`) for `items.product` and `customer` before reading nested fields.
- Defensive coding patterns: handle populated/unpopulated shapes and missing arrays (`sale?.items || []`).

Deployment notes
- Frontend built with Vite. Backend built with `tsc` and runs on Node.
- Ensure environment variables for MongoDB connection and app ports are configured.
