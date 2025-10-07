# Phase 8 Test Cases – Warranty & Claims

This file contains Phase 8 core test cases in a simple table format. You can export this table as an image using VS Code extensions (e.g., Markdown Preview Enhanced) or by pasting into a spreadsheet and exporting.

## Scope (Phase 8)
Covers warranty registration, claim initiation, eligibility checks (serial match, purchase date, warranty terms), proof/evidence (photos, receipts), claim statuses (submitted → under review → approved/rejected → fulfilled), repair vs replacement workflow, RMA/shipping and technician inspections, parts availability & SLA timelines, fraud detection, notifications, role-based access, audit logs, and reporting.

## Legend
- Priority: H = High, M = Medium, L = Low
- Status: Not Run / Pass / Fail / Blocked
- Role Abbrev: SO = Store Owner, CA = Cashier, SR = Sales Rep, INV = Inventory Manager, SUP = Supplier, WTY = Warranty Coordinator, TECH = Technician

---

| Test Case ID | Test Case Scenario | Test Case | Pre-Conditions | Test Steps | Test Data | Expected Results | Post-Condition | Priority | Actual Results | Status |
|--------------|--------------------|----------|----------------|-----------|-----------|------------------|----------------|----------|----------------|--------|
| WTY-001 | Register warranty | Register product warranty post-sale | Completed sale with serial | 1. Open Warranty 2. Register product 3. Enter serial & purchase date 4. Save | serial=SN123, date=today | Warranty registered; terms applied; expiry date calculated | Warranty record stored | H | | Not Run |
| WTY-002 | Duplicate registration prevention | Prevent duplicate warranty for same serial | Warranty exists | 1. Attempt register same serial | serial=SN123 | Validation error; no duplicate created | Integrity maintained | H | | Not Run |
| WTY-003 | Claim initiation | Start claim for covered product | Warranty exists and within term | 1. New Claim 2. Select warranty 3. Enter issue details 4. Submit | defect=screen flicker | Claim created with status Submitted | Claim stored | H | | Not Run |
| WTY-004 | Eligibility check | Validate purchase date/terms | Warranty terms configured | 1. Initiate claim 2. System checks eligibility | warranty term=12m | If expired → rejection; if valid → proceed | Eligibility enforced | H | | Not Run |
| WTY-005 | Proof/evidence upload | Upload photos/receipt | Claim Submitted | 1. Attach photos and receipt 2. Save | 3 photos, receipt.pdf | Files stored; preview available | Evidence linked | M | | Not Run |
| WTY-006 | Technician inspection | Schedule and record inspection | TECH available | 1. Assign TECH 2. Schedule inspection 3. Record findings | findings=defect confirmed | Status → Under Review; inspection notes saved | Inspection record stored | M | | Not Run |
| WTY-007 | Supplier RMA | Request RMA from supplier | Supplier supports RMA | 1. Request RMA 2. Receive number 3. Attach confirmation | RMA=ACME-445 | RMA stored; claim status updated | RMA linked | M | | Not Run |
| WTY-008 | Approve claim (repair) | Approve path for repair | Claim Under Review | 1. Approve claim 2. Choose Repair 3. Create work order | parts=LCD | Status → Approved; repair WO created | Repair process started | H | | Not Run |
| WTY-009 | Approve claim (replacement) | Approve path for replacement | Claim Under Review | 1. Approve claim 2. Choose Replacement 3. Reserve stock | SKU=LCD-15 | Status → Approved; replacement DO/issue created | Replacement process started | H | | Not Run |
| WTY-010 | Reject claim | Reject with reason | Claim Under Review | 1. Reject claim 2. Provide reason 3. Notify customer | reason=user damage | Status → Rejected; customer notified | Claim closed (rejected) | H | | Not Run |
| WTY-011 | SLA tracking | Track timeline breaches | SLA rules configured | 1. Progress claim through stages 2. Verify timers | SLA=7d review | Breach flagged; escalations/alerts generated | SLA metrics stored | M | | Not Run |
| WTY-012 | Parts availability | Handle parts out-of-stock | Parts DB integrated | 1. Approve repair 2. Parts shortage 3. Backorder parts | parts=LCD | Claim waits; customer notified; ETA updated | Parts backorder linked | M | | Not Run |
| WTY-013 | Repair completion | Close repair WO | Repair in progress | 1. Complete repair 2. Confirm tests 3. Close | pass tests | Claim status → Fulfilled; item returned | Claim fulfilled | H | | Not Run |
| WTY-014 | Replacement delivery | Deliver replacement item | Replacement approved | 1. Create DO 2. Deliver item 3. POD capture | DO#5002 | Claim status → Fulfilled; inventory adjusted | Claim fulfilled | H | | Not Run |
| WTY-015 | Fraud detection | Detect suspicious patterns | Fraud rules enabled | 1. Initiate atypical claim 2. System flags rule | multiple claims same serial | Flag added; manual review required | Fraud flag stored | M | | Not Run |
| WTY-016 | Customer communication | Notifications across lifecycle | SMTP/SMS configured | 1. Submit claim 2. Approval/Reject 3. Fulfillment 4. Observe notifications | N/A | Emails/SMS sent; logs created | Communication logged | L | | Not Run |
| WTY-017 | Role-based access | Coordinator vs Tech vs Cashier | Roles exist | 1. Login CA 2. Try approve claim 3. Login WTY 4. Approve | credentials | CA blocked; WTY allowed; TECH only inspection | Access enforced | H | | Not Run |
| WTY-018 | Audit logs | Full audit trail | Claims moving through stages | 1. Create/update/approve/reject/fulfill 2. Check audit | N/A | Audit entries present with actor/timestamp/action | Auditable actions | M | | Not Run |
| WTY-019 | Reporting | Claims report by status, reason | Seeded claims | 1. Run report filters 2. Export CSV | filters | Correct aggregates; CSV downloads | Report generated | L | | Not Run |
| WTY-020 | Error handling | API/server errors surfaced | Simulate 500/timeout | 1. Trigger error scenario (mock) | N/A | User-friendly error; retry guidance | UX resilience | L | | Not Run |

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
- Phase 8: Warranty & Claims (this file)
- Phase 9: Reporting & Dashboard
- Phase 10: Settings, Notifications & Security Hardening
