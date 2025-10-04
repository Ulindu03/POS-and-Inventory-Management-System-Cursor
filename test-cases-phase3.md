# Phase 3 Test Cases – Sales & Payments

Scope: POS cart operations, pricing & tax calculations, discounts, multi-payment handling, sales status transitions, receipt generation flags, stock interaction (basic), currency fields, and negative / edge scenarios. Returns, exchanges, and overpayments are Phase 4.

## Legend
- Priority: H / M / L
- Status: Not Run / Pass / Fail / Blocked
- Methods: cash | card | bank_transfer | digital | credit

## Assumptions
- Auth & product creation validated in earlier phases.
- Products have price.cost & price.retail defined; tax rates may be zero.
- Inventory deduction logic simple (stock.current reduced) – deep inventory edge cases later.

---

| Test Case ID | Scenario | Test Case | Pre-Conditions | Test Steps | Test Data | Expected Results | Post-Condition | Priority | Actual Results | Status |
|--------------|----------|-----------|----------------|------------|-----------|------------------|----------------|----------|----------------|--------|
| SALE-001 | New sale basic | Create sale with single product | Product P1 exists stock>=1 | 1. Add P1 qty=1 2. Submit sale | P1 qty=1 | Invoice created; subtotal=retail; total=subtotal (no tax) | Stock -1 | H | | Not Run |
| SALE-002 | Multi-line sale | Two different products | P1,P2 exist | 1. Add P1 qty=2 2. Add P2 qty=1 3. Submit | quantities | Subtotal=sum lines; total correct | Stock updated | H | | Not Run |
| SALE-003 | Quantity aggregation | Add same product twice merges | P1 exists | 1. Add P1 qty=1 2. Add P1 qty=2 3. Submit | P1 total 3 | Line aggregated or separate per spec; total = 3*retail | Stock -3 | M | | Not Run |
| SALE-004 | Min quantity validation | Reject zero qty line | P1 exists | 1. Add P1 qty=0 2. Submit | qty=0 | Validation error | No sale | H | | Not Run |
| SALE-005 | Negative quantity rejected | Prevent negative | P1 exists | 1. Add line qty=-1 | qty=-1 | Error response | No sale | H | | Not Run |
| SALE-006 | Discount per line | Apply line discount percent | P1 exists | 1. Add P1 qty=2 disc=10% 2. Submit | line disc 10 | Line total reflects discount; total aggregated | Discount captured | M | | Not Run |
| SALE-007 | Discount > price blocked | Excessive line discount | P1 exists | 1. Add P1 qty=1 discount>price | disc=200% | Validation error | Not created | M | | Not Run |
| SALE-008 | Invoice level discount | Overall sale discount | Items added | 1. Build cart 2. set sale.discount=amount | discount=50 | Total reduced by discount not <0 | Discount applied | M | | Not Run |
| SALE-009 | VAT + NBT calculation | Tax fields per line | P1 has tax | 1. Add P1 qty=1 2. Submit | vat,nbt | tax.vat + tax.nbt recorded; total=subtotal+tax-discount | Accurate tax summary | H | | Not Run |
| SALE-010 | Zero tax scenario | No tax product | P1 tax=0 | 1. Add P1 qty=1 | none | tax fields zero | Clean totals | L | | Not Run |
| SALE-011 | High precision rounding | Rounding logic check | Product with fractional price | 1. Add P special price=123.4567 qty=1 | price=123.4567 | Stored price maybe rounded to 2 decimals (123.46) per settings | Consistent rounding | L | | Not Run |
| SALE-012 | Multi-payment split | Cash + Card split | P1 added | 1. Add P1 2. Pay half cash half card | amounts split | Sum payments == total; change=0 | Payments stored | H | | Not Run |
| SALE-013 | Overpayment change | Cash greater than total | P1 added | 1. Pay cash > total | cash > total | Change computed (payment.change) | Correct change | M | | Not Run |
| SALE-014 | Partial payment credit | Credit method used | Customer with credit type | 1. Add P1 2. Pay part cash, remainder credit | split | Status maybe 'completed' or 'pending' if rules; credit recorded | Credit exposure tracked | H | | Not Run |
| SALE-015 | Missing payment method | Submit without payment | Items present | 1. Submit sale w/out payments | none | Error (unless legacy single payment field used) | Sale not saved | H | | Not Run |
| SALE-016 | Duplicate transactionId prevention | Prevent duplicate card transaction id | Existing sale with txnId X | 1. Create second payment with same txnId | txnId dup | Error 409/400 | No duplicate recorded | M | | Not Run |
| SALE-017 | Held sale creation | Put sale on hold | Setting allowHold true | 1. Add items 2. Mark status='held' | status held | Sale saved with held flag; stock maybe not decremented yet (define) | Held restorable | M | | Not Run |
| SALE-018 | Resume held sale | Convert held to completed | Held sale exists | 1. Load held sale 2. Add payment 3. Complete | hold id | Status -> completed; stock deducted now | Commit inventory | M | | Not Run |
| SALE-019 | Cancel sale | Cancel before completion | Held or pending sale | 1. Cancel sale | id | Status->cancelled; no stock deduction | Clean state | M | | Not Run |
| SALE-020 | Prevent cancel after completion | Completed sale locked | Completed sale exists | 1. Attempt cancel | id | Error; use return process instead | Integrity kept | H | | Not Run |
| SALE-021 | Sales ordering index | Recent first sort | Many sales | 1. GET /api/sales?sort=createdAt:desc | sort param | Returns newest first | Sorting correct | L | | Not Run |
| SALE-022 | Customer optional sale | Sale without customer | Setting requireCustomer=false | 1. Add items 2. Submit | customer null | Sale stored customer null | Works anonymous | L | | Not Run |
| SALE-023 | Customer required enforced | requireCustomer=true | Setting requireCustomer=true | 1. Submit w/out customer | none | Validation error | No sale | M | | Not Run |
| SALE-024 | Loyalty points not in scope | Ensure not affecting sale (placeholder) | Points system enabled? | 1. Review sale record | N/A | No unintended loyalty mutation (phase later) | Neutral | L | | Not Run |
| SALE-025 | Currency structure | Base/local currency fields stored | Currency defaults LKR | 1. Create sale total 100 | total=100 | currency.code=LKR; rateToBase=1 | Consistent fields | L | | Not Run |
| SALE-026 | Alternate currency sale | Non-base currency | Rate provided | 1. Create sale currency.code=USD rateToBase=300 | code=USD rate=300 | Base conversion logically derived (if used) | Stored correctly | M | | Not Run |
| SALE-027 | Payment enumeration validation | Method not allowed | N/A | 1. Use method=crypto | method=crypto | Validation error enum fail | Not saved | M | | Not Run |
| SALE-028 | Large quantity | Stress item quantity | Stock large | 1. Add P1 qty=1000 | qty=1000 | Sale completes if stock >=1000 | Stock -1000 | L | | Not Run |
| SALE-029 | Insufficient stock prevention | Negative stock blocked | trackInventory=true; stock current=0 | 1. Add P1 qty=1 2. Submit | qty=1 | Error (if negative stock disallowed) | No sale | H | | Not Run |
| SALE-030 | Allow negative stock setting | Negative allowed when configured | allowNegativeStock=true | 1. Add P1 qty=5 stock=0 2. Submit | qty=5 | Sale allowed; stock becomes -5 | Stock negative recorded | M | | Not Run |
| SALE-031 | Receipt printed flag | Trigger receiptPrinted true | Completed sale | 1. Call print endpoint or param | print action | receiptPrinted=true | Flag updated | L | | Not Run |
| SALE-032 | Email receipt flag | Email send attempt | SMTP configured | 1. Request email receipt | email action | emailSent=true or error logged | Field updated | L | | Not Run |
| SALE-033 | SMS receipt flag | SMS send attempt | SMS enabled in settings | 1. Request SMS receipt | sms action | smsSent=true | Flag updated | L | | Not Run |
| SALE-034 | Tax summary totals | Sum of line tax equals sale tax | Multi-line taxable | 1. Build multi-tax sale 2. Compare | lines | sale.tax == sum(line.tax) | Accurate aggregate | H | | Not Run |
| SALE-035 | Discount summary integrity | Sum(discounts) recorded | Multi-line discounts | 1. Build sale with line + invoice discount | values | total discount correct; final total >=0 | Consistent summary | M | | Not Run |
| SALE-036 | Performance list sales | Retrieve 200 records | >=200 sales seeded | 1. GET limit=200 | limit=200 | 200 returned quickly (<X sec) | Performance baseline | L | | Not Run |
| SALE-037 | Filter by status | Query status=completed | Mixed statuses exist | 1. GET /api/sales?status=completed | status=completed | Only completed returned | Filtering correct | M | | Not Run |
| SALE-038 | Payment history array | Multiple payments persisted | Multi-pay sale created | 1. Inspect sale.payments array | multi | Each payment captured; sum matches total | Accurate ledger | H | | Not Run |
| SALE-039 | Duplicate invoice number prevention | Unique constraint invoiceNo | Existing invoiceNo | 1. Create sale forcing same invoiceNo (if manual) | dup invoiceNo | Error unique | Not created | H | | Not Run |
| SALE-040 | Return placeholder isolation | returns array empty initially | New sale | 1. Create sale 2. Inspect returns array | none | returns length=0 | Clean baseline | L | | Not Run |
| SALE-041 | Overpayment/credits not added prematurely | No credit until return flow | New sale no overpayment | 1. Create sale 2. Check overpayments field | none | overpayments length=0 | Baseline intact | L | | Not Run |
| SALE-042 | Held sale expiry (if timeout) | Auto-expire holds | holdTimeout configured | 1. Create held 2. Wait > timeout 3. Query | holdTimeout | Status changed to cancelled/expired | Released stock | L | | Not Run |

---

### Export Tips
Same as earlier phases. Add Actual Results & Status while executing. Adjust performance threshold <X sec based on environment baseline measurement.

### Next Phase Preview
Phase 4 will cover Returns & Exchanges (ReturnTransaction, ExchangeSlip, CustomerOverpayment, refund methods, dispositions, stock adjustments).