# Phase 4 Test Cases – Returns & Exchanges

This file contains Phase 4 core test cases in a simple table format. Use the same execution and export approach as Phase 1.

## Scope (Phase 4)
Covers return and exchange workflows at the POS, including full/partial returns, exchange for different items, damaged/defective handling, serial-tracked items, refund methods, restocking, inventory adjustments, permissions, and notifications.

## Legend
- Priority: H = High, M = Medium, L = Low
- Status: Not Run / Pass / Fail / Blocked
- Role Abbrev: SO = Store Owner, CA = Cashier, SR = Sales Rep

---

| Test Case ID | Test Case Scenario | Test Case | Pre-Conditions | Test Steps | Test Data | Expected Results | Post-Condition | Priority | Actual Results | Status |
|--------------|--------------------|-----------|----------------|------------|-----------|------------------|----------------|----------|----------------|--------|
| RET-001 | Full return with receipt | Return all items from a sale | Completed sale exists within return window | 1. Open POS Returns 2. Scan/enter receipt number 3. Select all items 4. Choose refund method (cash/card) 5. Confirm return | receipt=SALE-1001 | Refund processed for full sale amount; inventory restocked for all items | Stock increased; return record created | H | | Not Run |
| RET-002 | Partial return | Return subset of items from a sale | Completed sale exists | 1. Open POS Returns 2. Enter receipt 3. Select only some items 4. Confirm return | receipt=SALE-1002 items=[SKU-1] | Refund for selected items only; inventory adjusted accordingly | Stock increased only for returned items | H | | Not Run |
| RET-003 | Exchange same price | Exchange item for another of equal price | Completed sale exists; target item in stock | 1. Open Returns 2. Enter receipt 3. Select item to exchange 4. Choose replacement item 5. Confirm exchange | fromSKU=SKU-1 toSKU=SKU-2 | No refund/charge difference; inventory decrements replacement and increments returned item | Inventory balanced; exchange record saved | M | | Not Run |
| RET-004 | Exchange higher price (upsell) | Customer pays difference | Completed sale; difference payment method available | 1. Enter receipt 2. Select item 3. Choose higher-priced replacement 4. Collect payment for difference 5. Confirm | fromSKU=SKU-3 toSKU=SKU-4 | Additional payment recorded; inventory adjusted | New payment attached to exchange | M | | Not Run |
| RET-005 | Exchange lower price (downsell) | Refund difference to customer | Completed sale; refund method available | 1. Enter receipt 2. Select item 3. Choose lower-priced replacement 4. Issue refund for difference 5. Confirm | fromSKU=SKU-5 toSKU=SKU-6 | Refund for price difference recorded; inventory adjusted | Refund record attached to exchange | M | | Not Run |
| RET-006 | Return without receipt (policy) | Return via customer lookup within allowed policy | Customer record linked to sale; ID verification | 1. Search customer 2. Select recent sale 3. Return items per policy 4. Confirm | customerId=123 | Return allowed per policy; may require manager approval; refund issued | Inventory adjusted; audit trail recorded | H | | Not Run |
| RET-007 | Damaged/defective item | Return flagged as damaged; no restock | Return reason = damaged/defective | 1. Enter receipt 2. Select item 3. Mark reason damaged 4. Confirm | reason=damaged | Refund issued; item not restocked; item moved to damages | Damages record created; stock not increased | H | | Not Run |
| RET-008 | Serial-tracked item | Validate serial match before return | Original sale records serial | 1. Enter receipt 2. Scan serial 3. Verify match 4. Confirm return | serial=SN-0001 | Return only if serial matches original sale; refund processed | Stock increased for that serial; audit trail | H | | Not Run |
| RET-009 | Return outside window | Enforce policy cutoff | Sale date older than allowed window | 1. Enter receipt 2. Attempt return 3. Observe error | receipt=OLD-2001 | Return denied; message shows policy | No inventory change | M | | Not Run |
| RET-010 | Payment method constraints | Card refunds processed via gateway; cash refund logged | Sale paid by card/cash | 1. Enter receipt 2. Choose refund method 3. Process refund | card or cash | Card refund uses gateway; cash refund recorded by cashier | Refund record saved with method | M | | Not Run |
| RET-011 | Tax and discount recalculation | Correctly recalc totals on partial return | Sale had discount and tax | 1. Return one item from discounted sale 2. Verify refund amount includes correct tax/discount | item from discounted sale | Accurate refund including proportional tax/discount | Sale and return financials accurate | H | | Not Run |
| RET-012 | Inventory reservations | Exchange respects stock availability | Replacement item must be in stock | 1. Attempt exchange to out-of-stock item 2. Observe behavior | toSKU=OUT-1 | Exchange blocked or backordered per policy | No negative stock; clear message | M | | Not Run |
| RET-013 | Manager approval flow | Approval required for no-receipt/late returns | Approval policy enabled | 1. Attempt restricted return 2. Prompt manager approval 3. Approve via PIN | managerPIN=1234 | Return proceeds only after approval | Approval audit stored | M | | Not Run |
| RET-014 | Multiple item exchange | Exchange multiple items in one transaction | Completed sale with multiple items | 1. Enter receipt 2. Select multiple items 3. Choose replacements 4. Confirm | items=[SKU-A, SKU-B] | All exchanges applied with proper price diffs | Inventory adjusted for each pair | L | | Not Run |
| RET-015 | Mixed return+exchange | Combine returns and exchanges | Completed sale | 1. Enter receipt 2. Return one item 3. Exchange another 4. Confirm | mix of items | Refund and exchange processed together | Inventory updated accordingly | L | | Not Run |
| RET-016 | Cash drawer tracking | Cash refunds affect drawer | Cash management enabled | 1. Process cash refund 2. Check drawer balance | N/A | Drawer outflow recorded; balance updated | Cash log updated | L | | Not Run |
| RET-017 | Notifications & receipts | Customer receives return/exchange receipt | Email printing enabled | 1. Complete return/exchange 2. Send receipt | email=customer@host.com | Receipt shows items, totals, reasons, method | Receipt stored/sent | L | | Not Run |
| RET-018 | Audit & security | Only authorized roles can process returns | Roles configured | 1. Try return as cashier 2. If restricted, require owner approval | role=cashier | Access controlled; approval enforced | Security intact | H | | Not Run |
| RET-019 | Reconcile original sale | Return ties back to original sale record | Sale history accessible | 1. Open sale details 2. Verify linked return/exchange entries | receipt=SALE-1001 | Return/exchange entries appear under sale | Clear linkage for accounting | M | | Not Run |
| RET-020 | Edge: rounding differences | Handle fractional cents rounding | Items with fractional tax | 1. Process partial return with fractional totals 2. Verify rounding | price/tax with fractions | Consistent rounding policy applied | Financial accuracy | L | | Not Run |

---

### Execution Notes
- Ensure test environment has seeded sales and stock.
- Validate serial tracking and approval policies per configuration.
- Verify inventory and financial updates in both UI and DB if accessible.
