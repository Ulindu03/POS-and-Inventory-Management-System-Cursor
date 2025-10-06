# Phase 5 Test Cases – Inventory & Stock Movements

This file contains Phase 5 core test cases in the same table format as Phase 1.

## Scope (Phase 5)
Covers stock receipts, stock issues, adjustments, transfers between locations, reservations/holds, cycle counts, audits, damaged stock, supplier returns (RTV), reorder levels, alerts, valuation (FIFO/AVG), units (UOM), and multi-location behavior.

## Legend
- Priority: H = High, M = Medium, L = Low
- Status: Not Run / Pass / Fail / Blocked
- Role Abbrev: SO = Store Owner, CA = Cashier, SR = Sales Rep

---

| Test Case ID | Test Case Scenario | Test Case | Pre-Conditions | Test Steps | Test Data | Expected Results | Post-Condition | Priority | Actual Results | Status |
|--------------|--------------------|-----------|----------------|------------|-----------|------------------|----------------|----------|----------------|--------|
| INV-001 | Stock receipt (PO) | Receive items from purchase order | Approved PO exists; items in shipment | 1. Open Receive Stock 2. Select PO 3. Enter quantities 4. Confirm | PO=PO-1001 | Stock increases per quantities; receipt record stored | Inventory updated; cost recorded | H | | Not Run |
| INV-002 | Stock issue (sale) | Issue items to sales channels | Open sale or manual issue | 1. Issue from POS or stock issue form 2. Confirm | SKU=SKU-1 qty=2 | Stock decreases; link to sale/issue | Inventory decremented | H | | Not Run |
| INV-003 | Adjustment increase | Correct stock by adding units | Discrepancy found | 1. Open Adjustments 2. Choose increase 3. Enter qty 4. Reason 5. Confirm | reason=count error | Stock increases; audit tracked | Adjustment record created | M | | Not Run |
| INV-004 | Adjustment decrease | Correct stock by reducing units | Discrepancy found | 1. Open Adjustments 2. Choose decrease 3. Enter qty 4. Reason 5. Confirm | reason=loss | Stock decreases; audit tracked | Adjustment record created | M | | Not Run |
| INV-005 | Transfer between locations | Move stock from A to B | Two locations active | 1. Open Transfer 2. Select from A to B 3. Enter items 4. Confirm | from=Main to=Branch qty=5 | Transit/transfer record created; stock deducted from A and added to B | Inventory updated at locations | H | | Not Run |
| INV-006 | Transfer pending transit | Transit state maintained until received | Transfer requires receive step | 1. Create transfer 2. Mark as shipped 3. Receive at destination | N/A | Stock moves to transit; added to dest upon receive | Accurate transit tracking | M | | Not Run |
| INV-007 | Reservations/holds | Hold items for a pending sale | Reservation feature enabled | 1. Create reservation 2. Allocate qty 3. Confirm | saleRef=QUOTE-101 | Available stock reduced; reserved tracked | Reservation record created | M | | Not Run |
| INV-008 | Cycle count | Count subset of items | Count schedule exists | 1. Start cycle count 2. Enter counts 3. Post differences | N/A | Differences post as adjustments | Accurate stock after posting | M | | Not Run |
| INV-009 | Full inventory audit | Count all items | Audit initiated | 1. Start audit 2. Enter counts 3. Post differences | N/A | Adjustments posted; audit report saved | Inventory reconciled | M | | Not Run |
| INV-010 | Damaged/defective to damages | Move damaged stock to damages area | Damaged items detected | 1. Mark items damaged 2. Move to damages 3. Confirm | reason=damaged | Stock removed from saleable; damages record kept | Damages balance updated | H | | Not Run |
| INV-011 | Supplier return (RTV) | Return stock to supplier | RMA/approval exists | 1. Create RTV 2. Select items 3. Confirm shipment | supplier=ABC | Stock reduced; RTV record stored | Inventory decreased; supplier return tracked | M | | Not Run |
| INV-012 | Reorder level alert | Low stock triggers alert | Reorder threshold configured | 1. Reduce stock below threshold 2. Observe alert | threshold=5 | Alert shown/notification sent | Reorder workflow triggered | M | | Not Run |
| INV-013 | Valuation FIFO | Cost layer tracking FIFO | FIFO mode enabled | 1. Receive batches at different costs 2. Issue items 3. Verify COGS | costs=[100,110] | COGS uses earliest layer cost | Correct FIFO valuation | M | | Not Run |
| INV-014 | Valuation Average | Weighted average cost updates | Average mode enabled | 1. Receive items multiple costs 2. Verify avg updates | costs=[100,110] | Avg cost recalculated; COGS uses avg | Correct average valuation | M | | Not Run |
| INV-015 | Unit of Measure conversions | Sell/receive in different UOM | UOM configured | 1. Receive in cases 2. Sell in units 3. Verify conversions | case=12 units | Stock movements reflect conversion | Accurate UOM conversions | L | | Not Run |
| INV-016 | Negative stock prevention | Block issue below zero | Policy enabled | 1. Attempt issue exceeding available 2. Observe | qty>available | Issue blocked with message | No negative stock | H | | Not Run |
| INV-017 | Backorder handling | Allow issue to backorder | Backorder policy enabled | 1. Attempt issue exceeding stock 2. Allow backorder | qty>available | Backorder created; promise date set | Backorder tracked | L | | Not Run |
| INV-018 | Multi-location visibility | Correct per-location balances | Multiple locations configured | 1. Check item stock per location | N/A | Balances reflect movements per location | Accurate location stock | M | | Not Run |
| INV-019 | Permissions | Only allowed roles can adjust/transfer | Roles configured | 1. Attempt adjustment as cashier 2. Require owner approval | role=cashier | Access controlled; approval enforced | Security intact | H | | Not Run |
| INV-020 | Audit trail & logs | All movements logged with user/time | Logging enabled | 1. Perform movements 2. Inspect logs | N/A | Complete audit trail | Compliance maintained | M | | Not Run |

---

### Execution Notes
- Ensure seeded stock, locations, and valuation mode settings.
- Validate policies for negative stock, backorders, and permissions.
- Cross-check balances and COGS in reports after movements.
