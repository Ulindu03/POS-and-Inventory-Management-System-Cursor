# Phase 6 Test Cases – Purchase Orders & Suppliers# Phase 6 Test Cases - Purchase Orders & Suppliers



This file contains Phase 6 core test cases in a simple table format. You can export this table as an image using VS Code extensions (e.g., Markdown Preview Enhanced) or by pasting into a spreadsheet and exporting.This file contains Phase 6 test cases focused on purchase orders and supplier management.



## Scope (Phase 6)## Scope (Phase 6)

Covers supplier management (CRUD, activation/deactivation, contact details, payment terms), purchase order lifecycle (draft → approved → issued → receiving → closed), partial receipts, backorders, cancellations, pricing & taxes, discounts, attachments, notifications, and role-based access.Covers supplier management, purchase orders creation, approval workflow, receiving orders, payment tracking, and supplier relationship management.



## Legend## Legend

- Priority: H = High, M = Medium, L = Low- Priority: H = High, M = Medium, L = Low

- Status: Not Run / Pass / Fail / Blocked- Status: Not Run / Pass / Fail / Blocked

- Role Abbrev: SO = Store Owner, CA = Cashier, PUR = Purchasing Clerk, INV = Inventory Manager- Role Abbrev: SO = Store Owner, CA = Cashier, SR = Sales Rep, AD = Admin



------



| Test Case ID | Test Case Scenario | Test Case | Pre-Conditions | Test Steps | Test Data | Expected Results | Post-Condition | Priority | Actual Results | Status || Test Case ID | Test Case Scenario | Test Case | Pre-Conditions | Test Steps | Test Data | Expected Results | Post-Condition | Priority | Actual Results | Status |

|--------------|--------------------|----------|----------------|-----------|-----------|------------------|----------------|----------|----------------|--------||--------------|--------------------|----------|----------------|-----------|-----------|------------------|----------------|----------|----------------|--------|

| SUP-001 | Create supplier (minimal) | Create new supplier with mandatory fields | None | 1. Open Suppliers page 2. Click Add Supplier 3. Fill mandatory fields 4. Save | name=Acme Ltd, email=po@acme.com, phone=+1-555-1000 | Supplier created; appears in list; unique ID assigned | Supplier record stored | H | | Not Run || PO-001 | Create new supplier | Add valid supplier | User has supplier creation permission | 1. Navigate to Suppliers 2. Click Add New 3. Fill form 4. Click Save | name=ABC Electronics, contact=John Doe, phone=0771234567, email=abc@example.com | Success message; supplier saved to database | Supplier available for selection | H | | Not Run |

| SUP-002 | Create supplier (full profile) | Add address, tax ID, payment terms, notes | None | 1. Add supplier 2. Fill optional fields 3. Save | address, taxId=VAT-123, terms=Net 30 | All fields stored and retrievable | Supplier profile complete | M | | Not Run || PO-002 | Create supplier with duplicate details | Attempt duplicate supplier | Supplier already exists | 1. Navigate to Suppliers 2. Click Add New 3. Enter existing supplier details 4. Click Save | name=ABC Electronics (duplicate) | Error message about duplicate supplier | No duplicate created | M | | Not Run |

| SUP-003 | Duplicate supplier name | Prevention of duplicates | Existing supplier "Acme Ltd" | 1. Add supplier with same name 2. Save | name=Acme Ltd | Validation error "Supplier already exists" | No duplicate created | M | | Not Run || PO-003 | Edit existing supplier | Update supplier info | Supplier exists in system | 1. Find supplier in list 2. Click Edit 3. Modify information 4. Save changes | Updated email=newemail@example.com | Success message; supplier updated | Updated info appears in list | H | | Not Run |

| SUP-004 | Validate email/phone formats | Input validation | None | 1. Enter invalid email/phone 2. Save | email=not-an-email, phone=abc | Validation errors shown; save blocked | Clean data enforced | M | | Not Run || PO-004 | Delete supplier with no linked POs | Remove unused supplier | Supplier exists with no POs | 1. Find supplier 2. Click Delete 3. Confirm deletion | Supplier with no PO history | Success message; supplier removed | Supplier no longer in list | M | | Not Run |

| SUP-005 | Deactivate supplier | Supplier cannot be used on new POs | Supplier exists | 1. Open supplier 2. Toggle status to Inactive 3. Try create PO selecting supplier | supplier=Acme Ltd | Inactive suppliers not selectable or warning blocks creation | Supplier marked inactive | H | | Not Run || PO-005 | Delete supplier with linked POs | Attempt delete active supplier | Supplier has PO history | 1. Find supplier with PO history 2. Click Delete 3. Confirm deletion | Supplier with active POs | Warning about linked POs; option to archive instead | Supplier remains or archived | M | | Not Run |

| SUP-006 | Reactivate supplier | Restore availability | Supplier is inactive | 1. Toggle to Active 2. Create PO | supplier=Acme Ltd | Supplier selectable and usable | Active status applied | L | | Not Run || PO-006 | Create purchase order | New PO creation | Products and supplier exist | 1. Go to Purchase Orders 2. Click Create 3. Select supplier 4. Add products 5. Set quantities 6. Save | 3 different products with quantities | PO created with draft status; PO# generated | PO appears in list | H | | Not Run |

| SUP-007 | Update supplier | Edit fields | Supplier exists | 1. Open supplier 2. Edit email, terms 3. Save | email=orders@acme.com, terms=Net 45 | Changes persisted; audit log entry created | Updated record stored | M | | Not Run || PO-007 | Edit draft purchase order | Modify draft PO | Draft PO exists | 1. Open draft PO 2. Add/remove products 3. Change quantities 4. Save changes | Add 2 products, remove 1 | Changes saved; totals recalculated | Updated PO saved | H | | Not Run |

| SUP-008 | Delete supplier with dependency | Block deletion when POs exist | Supplier linked to POs | 1. Attempt delete | supplier=Acme Ltd | Deletion blocked; message references linked POs | Integrity maintained | M | | Not Run || PO-008 | Submit PO for approval | Change PO status to pending | Draft PO exists | 1. Open draft PO 2. Review details 3. Click Submit for Approval | Complete draft PO | Status changed to "Pending Approval" | PO locked for editing | H | | Not Run |

| SUP-009 | Supplier attachments | Upload vendor documents | Supplier exists | 1. Open attachments 2. Upload PDF 3. View/Download | pdf=vendor_terms.pdf | File stored; preview enabled; secure access | Document linked to supplier | L | | Not Run || PO-009 | Approve purchase order | Store owner approves PO | Pending PO exists | 1. Login as store owner 2. View pending PO 3. Review details 4. Click Approve | Pending PO | Status changed to "Approved"; notification sent | PO ready for ordering | H | | Not Run |

| SUP-010 | Role-based access | Purchasing only can create POs | Roles exist | 1. Login as CA 2. Try create PO 3. Login as PUR 4. Create PO | credentials | CA denied (403/UI block); PUR allowed | Access control enforced | H | | Not Run || PO-010 | Reject purchase order | Reject with reason | Pending PO exists | 1. Login as store owner 2. View pending PO 3. Click Reject 4. Enter reason | Rejection reason="Pricing too high" | Status changed to "Rejected"; reason stored | PO returned to draft | M | | Not Run |

| PO-001 | Create PO (draft) | Start a draft with supplier and items | Supplier exists; products exist | 1. New PO 2. Select supplier 3. Add items & quantities 4. Save draft | supplier=Acme, items=[SKU1 x10, SKU2 x5] | PO saved in Draft state; totals calculated | Draft stored | H | | Not Run || PO-011 | Mark PO as ordered | Update PO status to ordered | Approved PO exists | 1. Open approved PO 2. Click "Mark as Ordered" 3. Enter order date 4. Save | Order date=current date | Status changed to "Ordered"; date recorded | PO shows as ordered | H | | Not Run |

| PO-002 | Price and tax calc | Correct subtotal, tax, grand total | Tax config available | 1. Add items with prices 2. Apply tax 3. Verify totals | tax=15% | Subtotal, tax, total correct; rounding rules applied | Totals stored | H | | Not Run || PO-012 | Record partial receiving | Receive part of order | Ordered PO exists | 1. Open ordered PO 2. Click "Receive Items" 3. Enter received quantities 4. Save | 2 of 3 products received | Partial receiving recorded; status "Partially Received" | Inventory updated for received items | H | | Not Run |

| PO-003 | Discounts | Line and order-level discounts | Discount rules configured | 1. Apply 10% line discount 2. Apply $20 order discount | discounts | Totals reflect discounts; cannot be negative | Discounted total saved | M | | Not Run || PO-013 | Complete PO receiving | Mark all items received | Partially received PO | 1. Open PO 2. Click "Receive Items" 3. Enter remaining quantities 4. Save | Final product received | Status changed to "Received"; all items marked received | Inventory fully updated | H | | Not Run |

| PO-004 | Approve PO | Move Draft → Approved | Draft PO exists | 1. Open PO 2. Click Approve | PO#123 | Status becomes Approved; approver recorded | Approved state set | H | | Not Run || PO-014 | Record payment for PO | Track supplier payment | Received PO exists | 1. Open received PO 2. Click "Record Payment" 3. Enter payment details 4. Save | amount=full invoice, date=today, ref#=12345 | Payment recorded; PO status "Paid" | Payment history updated | H | | Not Run |

| PO-005 | Issue PO to supplier | Send PO (email/PDF) | Approved PO exists; SMTP configured | 1. Click Issue 2. Confirm send 3. Check email/log | supplier=Acme | Email sent with PDF; status Issued; audit logged | Supplier notified | H | | Not Run || PO-015 | Record partial payment | Track installment payment | Received PO exists | 1. Open PO 2. Click "Record Payment" 3. Enter partial amount 4. Save | amount=50% of total, date=today | Partial payment recorded; status "Partially Paid" | Payment history shows partial | M | | Not Run |

| PO-006 | Cancel PO (pre-receipt) | Cancel before any receipt | Approved or Issued PO | 1. Click Cancel 2. Provide reason | reason=pricing error | Status becomes Cancelled; no stock impact | Cancelled state | M | | Not Run || PO-016 | Cancel draft purchase order | Remove unneeded PO | Draft PO exists | 1. Open draft PO 2. Click Cancel 3. Confirm action | Draft PO | PO marked as "Cancelled" | PO removed from active list | M | | Not Run |

| PO-007 | Receive full | Post full receipt | Issued PO; items delivered | 1. Receive 2. Enter quantities equal to ordered 3. Submit | SKU1=10, SKU2=5 | Status Received/Closed; stock increased accordingly | Inventory updated | H | | Not Run || PO-017 | Filter purchase orders | Search and filter POs | Multiple POs exist | 1. Go to PO list 2. Use filter options 3. Apply filters | status=approved, date range=last month | Only matching POs displayed | Filtered view shown | M | | Not Run |

| PO-008 | Receive partial | Partial delivery creates backorder | Issued PO | 1. Receive quantities less than ordered 2. Submit | SKU1=6 of 10 | PO status Partially Received; backordered qty recorded | Backorder open | H | | Not Run || PO-018 | Generate PDF of purchase order | Export PO document | PO exists | 1. Open PO 2. Click "Export to PDF" 3. Save file | Any valid PO | PDF generated with all PO details | File downloaded | M | | Not Run |

| PO-009 | Receive remaining | Close backorder | PO partially received | 1. Receive remaining qty | SKU1=4 | PO status Closed; all items received | Inventory final | M | | Not Run || PO-019 | Email PO to supplier | Send PO via email | Approved PO with supplier email | 1. Open approved PO 2. Click "Email to Supplier" 3. Confirm | PO with valid supplier email | Email sent with PO attached | Sent status recorded | M | | Not Run |

| PO-010 | Over-receipt protection | Prevent receive > ordered | Issued PO | 1. Attempt to receive more than ordered | SKU2=6 of 5 | Validation error; cannot exceed ordered qty | Data integrity | H | | Not Run || PO-020 | Calculate supplier metrics | Track supplier performance | Multiple POs for supplier | 1. View supplier details 2. Check metrics section | Supplier with order history | Metrics displayed (on-time %, avg lead time, etc.) | Performance data visible | L | | Not Run |

| PO-011 | Price variance capture | Capture variance on receipt | Supplier prices may differ | 1. Receive with different unit price 2. Confirm variance | price change | Variance recorded; optional approval flow if significant | Variance ledger updated | M | | Not Run || PO-021 | Record quality issues | Track product quality | Received PO exists | 1. Open received PO 2. Click "Report Quality Issues" 3. Enter details 4. Save | description="10% damaged", action="credit requested" | Issue recorded; linked to PO and supplier | Quality history updated | M | | Not Run |

| PO-012 | Receive with damage | Mark damaged/short | Issued PO | 1. Receive 2. Mark damaged items 3. Attach photos | damaged=2 | Damaged qty excluded from stock; incident recorded | Damage report | M | | Not Run || PO-022 | Bulk approve purchase orders | Mass approval workflow | Multiple pending POs | 1. Go to PO list 2. Filter for pending 3. Select multiple 4. Click "Bulk Approve" | 3+ pending POs | All selected POs approved; status updated | POs ready for ordering | L | | Not Run |

| PO-013 | Return to supplier | Create supplier return | Received items exist | 1. Initiate return 2. Select items/qty 3. Issue RMA | SKU1=2 | Inventory decreased; return document created | Return open | M | | Not Run || PO-023 | Import product list to PO | Bulk add products | Draft PO exists | 1. Open draft PO 2. Click "Import Products" 3. Select CSV file 4. Upload | CSV with product IDs and quantities | Products added to PO with quantities | PO updated with imports | L | | Not Run |

| PO-014 | Attachments on PO | Upload supplier invoice/packing list | PO exists | 1. Open PO attachments 2. Upload files 3. View | invoice.pdf | Files stored and tied to PO | Document accessible | L | | Not Run || PO-024 | Auto-create PO from low stock | Generate from inventory | Low stock threshold set | 1. Trigger low stock check 2. Review auto-generated PO 3. Modify if needed 4. Save | Products below threshold | Draft PO created with low stock items | PO ready for review | L | | Not Run |

| PO-015 | Edit draft PO | Modify items before approval | Draft exists | 1. Edit quantities/prices 2. Save | change SKU2 to x7 | Changes saved; audit trail updated | Draft updated | L | | Not Run || PO-025 | Link related documents | Attach files to PO | PO exists | 1. Open PO 2. Click "Attachments" 3. Upload file 4. Save | invoice.pdf, 500KB | File attached to PO | Attachment viewable | L | | Not Run |

| PO-016 | Prevent edit after approval | Lock approved POs except allowed fields | Approved PO exists | 1. Try edit items/qty 2. Try edit expected delivery date | various | Items/qty blocked; allowed meta fields editable | Policy enforced | M | | Not Run |

| PO-017 | Supplier lead time | Expected delivery calculation | Supplier has leadTime=7 days | 1. Create PO 2. Check expected delivery date | orderDate=today | Expected date = today + 7 days | ETA stored | L | | Not Run |---

| PO-018 | Currency handling | Multi-currency PO totals | Supplier currency = USD | 1. Create USD PO 2. Verify conversion to base currency if needed | rate=provided | Correct totals; FX rate captured at time of issue | FX details logged | L | | Not Run |

| PO-019 | Permissions on receiving | Only INV can post receipts | Roles exist | 1. Login CA 2. Try receive PO 3. Login INV 4. Receive | credentials | CA blocked; INV allowed | Access enforced | H | | Not Run |### Export Tips

| PO-020 | Notifications | Email/alert on approval/receipt | SMTP configured | 1. Approve PO 2. Receive items 3. Check notifications | N/A | Relevant emails/alerts sent; logs recorded | Notifications sent | L | | Not Run |1. Copy this table into an Excel/Google Sheet and format header with color, then export as PNG.

| PO-021 | Audit logs | Full audit trail | POs and suppliers exist | 1. Perform create/update/approve/issue/receive 2. Check audit | N/A | Create/Update/Approve/Issue/Receive entries present with actor/timestamp | Auditable actions | M | | Not Run |2. Or use a VS Code extension like *Markdown Preview Enhanced* and its screenshot export.

| PO-022 | Reporting | PO report by status/date/supplier | Seeded POs | 1. Run report filters 2. Export CSV | filters | Correct rows; totals; CSV downloads | Report generated | L | | Not Run |3. Keep Status/Actual Results columns updated during execution.
| PO-023 | API auth | Access control on PO endpoints | API available | 1. Call /api/purchase-orders without token 2. With token & role | N/A | 401 without token; role-based responses | Secure API | H | | Not Run |
| PO-024 | Error handling | Server/API errors surfaced | Simulate 500 or timeout | 1. Trigger error scenario (mock) | N/A | User-friendly error shown; retry guidance | UX resilience | L | | Not Run |

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
- Phase 6: Purchase Orders & Suppliers (this file)
- Phase 7: Delivery & Trip Logistics
- Phase 8: Warranty & Claims
- Phase 9: Reporting & Dashboard
- Phase 10: Settings, Notifications & Security Hardening
