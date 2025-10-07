# Phase 7 Test Cases – Delivery & Trip Logistics

This file contains Phase 7 core test cases in a simple table format. You can export this table as an image using VS Code extensions (e.g., Markdown Preview Enhanced) or by pasting into a spreadsheet and exporting.

## Scope (Phase 7)
Covers delivery order creation, trip planning and scheduling, driver and vehicle assignment, route optimization, real-time status tracking (planned → en route → delivered/failed), proof of delivery (signature/photo/OTP), returns pickups, rescheduling, damage/loss incidents, capacity constraints, geolocation & ETA, notifications, role-based access, audit logs, and reporting.

## Legend
- Priority: H = High, M = Medium, L = Low
- Status: Not Run / Pass / Fail / Blocked
- Role Abbrev: SO = Store Owner, CA = Cashier, SR = Sales Rep, INV = Inventory Manager, LOG = Logistics Coordinator, DRV = Driver

---

| Test Case ID | Test Case Scenario | Test Case | Pre-Conditions | Test Steps | Test Data | Expected Results | Post-Condition | Priority | Actual Results | Status |
|--------------|--------------------|----------|----------------|-----------|-----------|------------------|----------------|----------|----------------|--------|
| DEL-001 | Create delivery order | Create DO from a sale | Completed sale exists | 1. Open Deliveries 2. Create DO from sale 3. Confirm address 4. Save | sale#1001 | DO created with status Planned; linked to sale | DO stored | H | | Not Run |
| DEL-002 | Address validation | Validate delivery address fields | None | 1. Enter invalid address 2. Save | address missing city | Validation errors shown; save blocked | Clean address data | M | | Not Run |
| DEL-003 | Schedule delivery date/time | Plan delivery slot | Sale exists | 1. Set delivery date/time window 2. Save | date=tomorrow, window=10-12 | Slot stored; conflicts flagged if overlapping | Planned slot stored | M | | Not Run |
| DEL-004 | Assign driver & vehicle | Assignment workflow | Driver & vehicle exist | 1. Assign driver 2. Assign vehicle 3. Save | driver=John, vehicle=VAN-01 | Assignments recorded; capacity checked | Trip readiness | H | | Not Run |
| DEL-005 | Capacity constraints | Prevent overloading vehicle | Vehicle capacity defined | 1. Add DOs exceeding capacity 2. Try assign | weight/volume | Error preventing assignment; suggest split trips | Capacity enforced | H | | Not Run |
| DEL-006 | Create trip with stops | Group DOs into trip | Multiple DOs exists | 1. New Trip 2. Add DO#1001, DO#1002 3. Save | 2 stops | Trip created; totals computed; route pending | Trip stored | H | | Not Run |
| DEL-007 | Route optimization | Optimize stop order | Map/routing configured | 1. Click Optimize 2. Review reordered stops | addresses | Optimized order saved; distance/time reduced | Route saved | M | | Not Run |
| DEL-008 | Start trip | Move Planned → En Route | Trip exists and assigned | 1. Start trip 2. Confirm checklist | N/A | Trip status En Route; start timestamp recorded | Trip progressing | H | | Not Run |
| DEL-009 | Proof of delivery (signature) | Capture customer signature | Trip en route | 1. Open stop 2. Deliver items 3. Capture signature | signature image | POD stored; stop status Delivered | POD linked | H | | Not Run |
| DEL-010 | POD with photos | Capture delivery photos | Trip en route | 1. Capture photos at delivery 2. Save | 2 photos | Photos stored; associated with stop | Visual evidence | M | | Not Run |
| DEL-011 | POD with OTP | Validate delivery via OTP | Customer receives OTP | 1. Request OTP 2. Customer provides 3. Validate | otp=123456 | OTP verified; delivery confirmed | OTP record stored | H | | Not Run |
| DEL-012 | Failed delivery | Mark stop as Failed | Trip en route | 1. Open stop 2. Mark Failed 3. Reason input | reason=customer not home | Stop status Failed; retry/reschedule option available | Failure recorded | H | | Not Run |
| DEL-013 | Reschedule failed stop | Create new attempt | Failed stop exists | 1. Reschedule date/time 2. Save | date=next day | New DO attempt created; linked to original | Follow-up scheduled | M | | Not Run |
| DEL-014 | Partial delivery | Deliver part of items | Stop has multiple items | 1. Deliver some items 2. Mark rest pending | item qtys | Stop status Partially Delivered; remaining scheduled | Inventory updated | M | | Not Run |
| DEL-015 | Return pickup | Pickup items for return | Return request exists | 1. Add return pickup to trip 2. Collect items 3. Record receipt | RMA#2001 | Pickup completed; return DO linked | Return processed | M | | Not Run |
| DEL-016 | Damage/loss incident | Record incident with photos | Trip en route | 1. Report damage/loss 2. Attach photos 3. Save | 3 photos | Incident logged; affects inventory/claims | Incident record created | M | | Not Run |
| DEL-017 | Live tracking | Show driver location & ETA | Mobile app/telemetry available | 1. Open tracking view 2. Observe position/ETA updates | N/A | Map shows current position; ETA recalculated | Tracking active | L | | Not Run |
| DEL-018 | Geofence arrival | Auto-arrival when near customer | Geofencing configured | 1. Drive near destination 2. Observe auto-arrival | radius=50m | Stop auto-marked Arrived; timestamp recorded | Arrival logged | L | | Not Run |
| DEL-019 | Proof tampering prevention | Disallow POD edits | Delivered stop | 1. Try editing signature/photo/OTP | N/A | Edits blocked or require admin override with audit | POD integrity | H | | Not Run |
| DEL-020 | Trip completion | Close trip after all stops | Trip has delivered/failed stops handled | 1. Close trip 2. Confirm summary | N/A | Trip status Closed; totals and times recorded | Trip closed | H | | Not Run |
| DEL-021 | Notifications | SMS/Email updates | SMTP/SMS configured | 1. Schedule trip 2. Start trip 3. Deliver stop 4. Check notifications | N/A | Relevant notifications sent to customer and staff | Notices logged | L | | Not Run |
| DEL-022 | Role-based access | Driver vs Coordinator permissions | Roles exist | 1. Login DRV 2. Try edit trip plan 3. Login LOG 4. Edit plan | credentials | DRV blocked from planning; LOG allowed | Access enforced | H | | Not Run |
| DEL-023 | Audit logs | End-to-end audit | Trips and DOs exist | 1. Create/update/assign/start/complete 2. Review audit | N/A | Audit entries capture actor/timestamp/action | Auditable actions | M | | Not Run |
| DEL-024 | Reporting | Delivery metrics report | Seeded trips | 1. Run report by date/driver/status 2. Export CSV | filters | Correct rows and aggregates; CSV downloads | Report generated | L | | Not Run |
| DEL-025 | Error handling | Handle offline/timeout errors | Simulate API or network issues | 1. Trigger errors (mock) 2. Verify UX | N/A | Clear error messages; retry/backoff guidance | UX resilience | L | | Not Run |

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
- Phase 7: Delivery & Trip Logistics (this file)
- Phase 8: Warranty & Claims
- Phase 9: Reporting & Dashboard
- Phase 10: Settings, Notifications & Security Hardening
