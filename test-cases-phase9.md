# Phase 9 Test Cases – Reporting & Dashboard

This file contains Phase 9 core test cases in a simple table format. You can export this table as an image using VS Code extensions (e.g., Markdown Preview Enhanced) or by pasting into a spreadsheet and exporting.

## Scope (Phase 9)
Covers reporting (sales, inventory, returns, suppliers, deliveries, claims), dashboard widgets, filters, exports, permissions, data freshness, error handling, notifications, audit logs, and role-based access.

## Legend
- Priority: H = High, M = Medium, L = Low
- Status: Not Run / Pass / Fail / Blocked
- Role Abbrev: SO = Store Owner, CA = Cashier, SR = Sales Rep, INV = Inventory Manager, LOG = Logistics Coordinator, WTY = Warranty Coordinator, AD = Admin

---

| Test Case ID | Test Case Scenario | Test Case | Pre-Conditions | Test Steps | Test Data | Expected Results | Post-Condition | Priority | Actual Results | Status |
|--------------|--------------------|----------|----------------|-----------|-----------|------------------|----------------|----------|----------------|--------|
| REP-001 | Sales report by date | Generate sales report for date range | Sales data exists | 1. Open Reports 2. Select Sales 3. Set date range 4. Run | from=2025-09-01, to=2025-09-30 | Report shows correct sales, totals, breakdowns | Report viewable | H | | Not Run |
| REP-002 | Inventory report | Generate inventory snapshot | Inventory data exists | 1. Open Reports 2. Select Inventory 3. Run | N/A | Report lists all SKUs, stock, locations | Report viewable | H | | Not Run |
| REP-003 | Returns report | Generate returns/exchanges report | Returns data exists | 1. Open Reports 2. Select Returns 3. Set filters 4. Run | filters | Report lists returns, reasons, status | Report viewable | M | | Not Run |
| REP-004 | Supplier report | Generate supplier performance report | Supplier data exists | 1. Open Reports 2. Select Suppliers 3. Set filters 4. Run | filters | Report shows supplier metrics (on-time, fill rate) | Report viewable | M | | Not Run |
| REP-005 | Delivery report | Generate delivery/trip report | Delivery data exists | 1. Open Reports 2. Select Deliveries 3. Set filters 4. Run | filters | Report lists trips, stops, status, times | Report viewable | M | | Not Run |
| REP-006 | Claims report | Generate warranty claims report | Claims data exists | 1. Open Reports 2. Select Claims 3. Set filters 4. Run | filters | Report lists claims, status, SLA, outcome | Report viewable | M | | Not Run |
| REP-007 | Dashboard widgets | View sales, inventory, delivery widgets | Data exists | 1. Open Dashboard 2. Observe widgets | N/A | Widgets show correct metrics, charts, trends | Dashboard loaded | H | | Not Run |
| REP-008 | Widget drilldown | Click widget to view details | Widgets present | 1. Click sales widget 2. View detailed report | N/A | Navigates to filtered report view | Drilldown works | M | | Not Run |
| REP-009 | Filter application | Apply filters to reports | Data exists | 1. Set filters (date, SKU, supplier) 2. Run report | filters | Report reflects filters; no unrelated data | Filtered report | H | | Not Run |
| REP-010 | Export to CSV/XLS | Export report data | Report generated | 1. Click Export 2. Download file 3. Open in Excel | N/A | File downloads; data matches report | Exported file | H | | Not Run |
| REP-011 | Permissions | Restrict report access by role | Roles configured | 1. Login as CA 2. Try access sales report 3. Login as SO 4. Access sales report | credentials | CA denied; SO allowed; error or UI block | Access enforced | H | | Not Run |
| REP-012 | Data freshness | Reports reflect latest data | Recent transactions | 1. Complete sale 2. Run sales report | N/A | Report includes new sale | Data up-to-date | M | | Not Run |
| REP-013 | Scheduled reports | Email scheduled reports | SMTP configured | 1. Schedule report 2. Wait for email | schedule=daily | Email received with report attached | Email sent | L | | Not Run |
| REP-014 | Error handling | Handle report generation errors | Simulate backend error | 1. Trigger error 2. Observe UI | N/A | User-friendly error shown; retry option | UX resilience | L | | Not Run |
| REP-015 | Audit logs | Report access logged | Reports enabled | 1. Run report 2. Check audit logs | N/A | Access recorded with user, time, report | Audit entry created | L | | Not Run |
| REP-016 | Notifications | Notify on report completion | Long-running report | 1. Run report 2. Wait for notification | N/A | Notification sent when ready | Notification received | L | | Not Run |
| REP-017 | Custom report builder | Build/save custom report | Builder enabled | 1. Open builder 2. Add fields/filters 3. Save | custom fields | Custom report saved; reusable | Custom report listed | L | | Not Run |
| REP-018 | Chart export | Export dashboard chart as image | Chart present | 1. Click export on chart 2. Download image | N/A | Image downloads; matches chart | Image file saved | L | | Not Run |
| REP-019 | Data privacy | Mask sensitive data in reports | Privacy rules enabled | 1. Run report with sensitive fields | N/A | Sensitive fields masked or hidden | Privacy enforced | H | | Not Run |
| REP-020 | API access | Fetch report data via API | API enabled | 1. Call /api/reports with token 2. Parse response | N/A | JSON data returned; respects permissions | API data received | M | | Not Run |

---

### Export Tips
1. Copy this table into an Excel/Google Sheet and format header with color, then export as PNG.
2. Or use a VS Code extension like Markdown Preview Enhanced and its screenshot export.
3. Keep Status/Actual Results columns updated during execution.

### Related Phases
- Phase 1: Authentication & Access Control (`test-cases-phase1.md`)
- Phase 2: Product & Category Management
- Phase 3: Sales & Payments
- Phase 4: Returns & Exchanges
- Phase 5: Inventory & Stock Movements
- Phase 6: Purchase Orders & Suppliers (`test-cases-phase6.md`)
- Phase 7: Delivery & Trip Logistics (`test-cases-phase7.md`)
- Phase 8: Warranty & Claims (`test-cases-phase8.md`)
- Phase 9: Reporting & Dashboard (this file)
- Phase 10: Settings, Notifications & Security Hardening
