# POS & Inventory System — Sample Bug List

This document captures a curated set of example bugs for documentation, onboarding, and QA drills. It mixes open, resolved, and deferred items to illustrate the full lifecycle.

## Legend
- Status: OPEN | IN-PROGRESS | RESOLVED | DEFERRED
- Severity: Critical | High | Medium | Low
- Module: POS | Products | Inventory | Purchase Orders | Reports | Auth | Printing | Settings | API | DevX

---

## Summary table
| ID | Title | Module | Severity | Status |
|----|-------|--------|----------|--------|
| BUG-001 | Low-stock badge position | POS | Low | RESOLVED |
| BUG-002 | Receipt too tall on thermal | Printing | Medium | RESOLVED |
| BUG-003 | Warranty period missing on receipt | Printing | Low | RESOLVED |
| BUG-004 | PO email shows 0.00 column | Purchase Orders | Low | RESOLVED |
| BUG-005 | Customer phone lookup 401 | POS/Auth | High | RESOLVED |
| BUG-006 | Brand select resets on category change | Products | Medium | RESOLVED |
| BUG-007 | Excess /auth/me calls in dev | DevX | Low | RESOLVED |
| BUG-008 | Console source map spam (lucide) | DevX | Low | RESOLVED |
| BUG-009 | Inline supplier create not applied | Products | Medium | RESOLVED |
| BUG-010 | PO pending stats incorrect | Purchase Orders | Medium | RESOLVED |

---

## Detailed reports

### BUG-001 — Low-stock badge position
- Module: POS
- Severity: Low
- Status: RESOLVED
- Introduced: ProductGrid badge layout
- Fixed in: `client/src/features/pos/ProductGrid.tsx`
- Description: Low stock badge appeared bottom-left; requirement is top-right (similar to "Out of stock").
- Steps to Reproduce:
  1. Open POS
  2. Locate any product where currentStock <= minimum
  3. Observe badge position
- Expected: "Low" chip at top-right; discount chip stacks below if present.
- Actual: Badge shown bottom-left.
- Resolution: Move badge to `top-2 right-2`; offset discount chip when both render.

### BUG-002 — Receipt too tall on thermal
- Module: Printing
- Severity: Medium
- Status: RESOLVED
- Fixed in: `client/src/styles/print.css`, `client/src/features/pos/ReceiptModal.tsx`
- Description: Thermal receipts had excessive spacing and large fonts.
- Resolution: Reduced paddings/margins/fonts; compacted layout; kept 80mm/58mm support.

### BUG-003 — Warranty period missing on receipt
- Module: Printing
- Severity: Low
- Status: RESOLVED
- Fixed in: `client/src/features/pos/ReceiptModal.tsx`
- Description: Warranty note did not include period and end date.
- Resolution: Added compact summary line and separate period line (e.g., `Period: 1y (ends 2026-10-15)`).

### BUG-004 — PO email shows 0.00 column
- Module: Purchase Orders
- Severity: Low
- Status: RESOLVED
- Fixed in: `server/src/controllers/purchaseOrder.controller.ts`
- Description: Supplier email included a unit price column that sometimes showed `0.00`.
- Resolution: Removed unit price column; kept SKU/Product/Qty only; updated fallback colspan.

### BUG-005 — Customer phone lookup 401
- Module: POS/Auth
- Severity: High
- Status: RESOLVED
- Fixed in: `client/src/features/pos/PaymentModal.tsx`, `client/src/lib/api/customers.api.ts`
- Description: Direct calls without auth caused 401 and broken flow.
- Resolution: Centralized on authenticated API helpers with refresh interceptors; improved 401 handling.

### BUG-006 — Brand select resets on category change
- Module: Products
- Severity: Medium
- Status: RESOLVED
- Fixed in: `client/src/features/products/ProductForm.tsx`
- Description: Changing category cleared previously selected brand even if still valid.
- Resolution: Preserve brand selection and inject it into options if missing.

### BUG-007 — Excess /auth/me calls in dev
- Module: DevX
- Severity: Low
- Status: RESOLVED
- Description: Duplicate identity calls during hot reloads cluttered logs.
- Resolution: Debounced/reduced calls and consolidated usage.

### BUG-008 — Console source map spam (lucide)
- Module: DevX
- Severity: Low
- Status: RESOLVED
- Fixed in: `client/vite.config.ts`
- Description: Numerous `No sources are declared in this source map` warnings from lucide-react.
- Resolution: Dev-only Vite plugin strips inline sourceMappingURL comments for lucide icon ESM files.

### BUG-009 — Inline supplier create not applied
- Module: Products
- Severity: Medium
- Status: RESOLVED
- Fixed in: `client/src/features/products/ProductForm.tsx`
- Description: Creating a supplier inline didn’t refresh/select it in the form.
- Resolution: Added inline modal flow and auto-select on success.

### BUG-010 — PO pending stats incorrect
- Module: Purchase Orders
- Severity: Medium
- Status: RESOLVED
- Fixed in: server controllers + client stats view
- Description: "Pending" counted wrong state; needed to reflect drafts.
- Resolution: Backend counts `draft` for pending; frontend cards updated; added completed metric.

---

## Known limitations / deferred
- None tracked currently.

---

## New Bug Template
Copy/paste for fresh reports.

```
ID: BUG-XXX
Title:
Module:
Severity: Critical | High | Medium | Low
Status: OPEN
Introduced:
Environment: Browser/OS/Version

Description:

Steps to Reproduce:
1.
2.
3.

Expected:

Actual:

Logs/Screenshots:

Impact:

Workaround:

Owner:
Links:
- Commit:
- PR:
- Ticket:
```