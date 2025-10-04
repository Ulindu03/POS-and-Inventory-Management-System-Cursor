# POS and Inventory Management System – Comprehensive Summary

This document explains the whole system in simple English. It covers what the app does, who uses it, how it is built, the main features, data model, and how to run it.

## 1) What this system is
A modern Point of Sale (POS) and Inventory Management system for retail/wholesale stores. It helps staff sell products, manage stock, handle returns and warranties, track deliveries, and generate reports. It supports English and Sinhala, LKR currency, and works in real time.

## 2) Who uses it
- Store Owner / Admin: manages products, users, prices, taxes, and settings. Views reports.
- Cashier / Sales Rep: creates sales, applies discounts, accepts different payment methods, prints receipts, processes returns and exchanges.
- Inventory Manager: tracks stock, creates purchase orders, receives stock, logs damages and stock movements.
- Customer Support: manages warranties and claim workflows.

## 3) Main features
- POS sales with barcode scanning, multiple payments (cash/card/digital/credit), and printable receipts
- Customers and Suppliers management
- Products and Categories with pricing, taxes, variants, bundles, images, and tags
- Inventory tracking (stock levels, re-order points, batches, expiries)
- Purchase Orders for restocking
- Returns and Exchanges (return policies, exchange slips, customer overpayments/credits)
- Warranty and Warranty Claims lifecycle
- Deliveries and Trips (routes, shops, proof of delivery, damages in transit)
- Damage logging and write-offs
- Discounts and Taxes configuration
- Real-time updates via WebSockets
- Multi-language (EN/SI) and LKR currency
- Reports and dashboard

## 4) Tech stack (at a glance)
- Frontend: React + Vite + TypeScript, Tailwind CSS, Zustand, React Query, Framer Motion
- Backend: Node.js + Express + TypeScript
- Database: MongoDB + Mongoose
- Realtime: Socket.IO
- Docs: Swagger UI for API
- Optional: Supabase for file storage; SMTP for emails (OTP/reset)

## 5) Data model (key entities)
- User: store_owner/admin/cashier/sales_rep, authentication, permissions, OTP, 2FA flags
- Customer: profile, contact, type (retail/wholesale/corporate), credit, loyalty
- Supplier: contact, banking, performance
- Category: hierarchical categories
- Product: SKU, barcode, pricing, tax, stock fields, warranty config, supplier link
- Inventory: stock snapshot per product (with expiry/batch/location)
- Sale and Sale Items: invoice, items, discounts, taxes, totals, status
- Payment: methods (cash/card/bank/digital/cheque/credit), transaction details
- Return Transaction and Items: reasons, dispositions, refund method
- Exchange Slip and Items: store-credit style exchanges
- Customer Overpayment and Usage: store credits from refunds/overpayments
- Purchase Order and Items: supplier orders with costs and receiving info
- Delivery with Shops and Items: trip deliveries to customers, proofs and stats
- Damage and Items: causes and write-off actions
- Stock Movement: audit log of every stock change
- Tax, Discount, Return Policy: configuration entities
- Warranty and Warranty Claim: warranty lifecycle and case handling
- Store, Settings, Notification, ActivityLog, Counter, StickerBatch, UnitBarcode

The full Mermaid UML is in `STRUCTURE.md` under “Domain Model (Mermaid UML)”.

## 6) Typical flows (simple)
- Make a Sale: cashier scans items → system calculates totals and tax → customer pays (one or more methods) → receipt printed → inventory decreases → optional email/SMS.
- Return/Exchange: match original sale → pick items and reasons → refund (cash/card/bank/digital/store credit) or issue exchange slip → inventory restocked or written off → overpayment credit created if needed.
- Purchase Stock: create purchase order → receive items (mark received/damaged) → inventory increases → supplier balance/payment.
- Warranty: warranty issued at sale or after → if issue arises, create claim → inspect, approve/reject → repair/replace/refund → update warranty status.
- Delivery/Trip: plan route → deliver to shops → capture proof/signature → log damaged/returned → update stock.

## 7) Security and settings
- JWT-based auth with refresh tokens
- Role-based permissions
- Optional two-factor/OTP flows
- Rate limiting, sanitization, and standard security headers
- Settings for POS behavior, taxation, receipts, stickers, inventory thresholds, delivery, notifications, backup, and currency

## 8) How to run (short)
- Backend
  - Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `APP_URL`
  - In `server/`: `npm install` then `npm run dev`
  - Swagger: http://localhost:5000/api/docs
- Frontend (optional UI)
  - In `client/`: `npm install` then `npm run dev`
  - Open http://localhost:5173
- Docker (MongoDB): run `docker-compose up -d` at repo root

## 9) Notable APIs
- Auth, Users, Products, Categories, Sales, Returns, Inventory, Suppliers, Purchase Orders
- Deliveries, Trips, Damages
- Warranty and Warranty Claims
- Reports, Dashboard, Settings

## 10) Development helpers
- Dev seeding endpoints (users/products/customers/suppliers) for quick demos
- Swagger UI for trying APIs
- Realtime logs and basic health endpoints

## 11) Roadmap ideas
- Multi-branch inventory and cashier sessions
- Advanced promotions engine
- Deeper accounting exports
- Mobile-first cashier app

---
This summary is intentionally simple and high-level. For full details, see `STRUCTURE.md` and Swagger (API docs).