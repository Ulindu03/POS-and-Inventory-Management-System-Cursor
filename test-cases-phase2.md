# Phase 2 Test Cases – Product & Category Management

Scope: CRUD operations, validation, hierarchy, pricing, tax, inventory flags, warranty config basics, search & filters, performance, and security for Products & Categories.

## Legend
- Priority: H / M / L
- Status: Not Run / Pass / Fail / Blocked

## Assumptions
- Authentication & roles tested in Phase 1. Here we assume an authorized Store Owner (or Admin) unless otherwise stated.
- Product SKU must be unique & uppercase.
- Category supports multi-level hierarchy with `parent` and `path`.

---

| Test Case ID | Scenario | Test Case | Pre-Conditions | Test Steps | Test Data | Expected Results | Post-Condition | Priority | Actual Results | Status |
|--------------|----------|-----------|----------------|------------|-----------|------------------|----------------|----------|----------------|--------|
| PROD-001 | Create category (root) | Add root category with EN/SI names | Auth as owner | 1. POST /api/categories 2. Provide both locales | name.en="Lighting" name.si="
" | 201 Created; category id returned; level=0 | Category persisted | H | | Not Run |
| PROD-002 | Create subcategory | Add child under existing parent | Parent category exists | 1. POST child with parent id | parent=<rootId> | level=parent.level+1; path includes ancestors | Child category linked | H | | Not Run |
| PROD-003 | Duplicate category name (same parent) | Attempt duplicate sibling | Parent & existing sibling exist | 1. POST with same multilingual name under same parent | same names | 409/400 error (if uniqueness enforced at business layer) | No duplicate created | M | | Not Run |
| PROD-004 | Category activation toggle | Deactivate a category | Category exists & active | 1. PATCH isActive=false 2. GET list | id | Category marked inactive; excluded from active filters | Status updated | M | | Not Run |
| PROD-005 | Category path integrity | Ensure path updates on move | Category with children exists | 1. Change parent of mid-level category | newParentId | All descendants get updated path/level | Hierarchy consistent | L | | Not Run |
| PROD-006 | Create product minimal fields | Basic product creation | Category exists | 1. POST /api/products with required fields | sku=LED-001, unit=pcs, price.cost=100, price.retail=150 | 201 Created; defaults applied (isActive=true) | Product saved | H | | Not Run |
| PROD-007 | SKU uniqueness | Reject duplicate SKU | One product exists | 1. POST another with same SKU | duplicate sku | 409/400 error | No new product | H | | Not Run |
| PROD-008 | Barcode uniqueness sparse | Optional barcode uniqueness | Product A has barcode | 1. POST product B using same barcode | barcode same | 400 error (unique) | Only original product has barcode | M | | Not Run |
| PROD-009 | Multilingual name required | Missing SI or EN variant | Request missing SI | 1. POST missing name.si | name.si missing | 400 validation error | Nothing created | H | | Not Run |
| PROD-010 | Pricing validation (negative) | Reject negative cost | None | 1. POST cost=-5 | cost=-5 | 400 min validation error | Not created | H | | Not Run |
| PROD-011 | Wholesale optional | Create without wholesale | None | 1. POST no wholesale price | omit price.wholesale | 201; wholesale null/undefined | Product created | L | | Not Run |
| PROD-012 | Update product pricing | Adjust retail price | Product exists | 1. PATCH retail price 2. GET product | retail=200 | Retail updated; updatedAt changed | New price persisted | H | | Not Run |
| PROD-013 | Inventory fields default | Verify stock defaults | New product | 1. POST product 2. Check response.stock | none | stock.current=0 etc. | Defaults present | M | | Not Run |
| PROD-014 | Track inventory flag off | Product not tracked | Product created | 1. PATCH trackInventory=false 2. Try sale simulation (later phase) | flag change | Flag changed; future stock deductions skipped | Product configured | M | | Not Run |
| PROD-015 | Bundle product creation | isBundle=true with items | Component products exist | 1. POST isBundle with bundleItems list | bundleItems array | Product created; each item valid quantity>=1 | Bundle persisted | M | | Not Run |
| PROD-016 | Invalid bundle circular ref | Bundle includes itself | Component product attempt | 1. POST bundleItems referencing same product id | self reference | Error validation | Not created | M | | Not Run |
| PROD-017 | Variant set creation | Add product with variants | None | 1. POST variants array | variants[ {name:"Color",options:["Red","Blue"]} ] | Variants stored; each option accessible | Product created | M | | Not Run |
| PROD-018 | Variant SKU uniqueness | Duplicate variant sku | Product with variant A | 1. PATCH add variant with existing variant sku | duplicate sku | Error unique index | Variant not added | M | | Not Run |
| PROD-019 | Image array add | Add product image | Product exists | 1. PATCH images push | url=/uploads/img1.png | Image appended; primary flag default false | Image list updated | L | | Not Run |
| PROD-020 | Primary image flag | Set one primary | Product has images | 1. PATCH one image isPrimary=true | index=0 | Only one image primary (enforce if logic implemented) | Primary enforced | L | | Not Run |
| PROD-021 | Tag search filter | Filter by tag | Products with tag exist | 1. GET /api/products?tag=smart | tag query | Returns only tagged products | Filter works | M | | Not Run |
| PROD-022 | Category filter | Filter by category id | Products across categories exist | 1. GET /api/products?category=<id> | category id | Only category products returned | Filter works | M | | Not Run |
| PROD-023 | Pagination | Page & limit parameters | >20 products exist | 1. GET /api/products?page=2&limit=10 | page=2 limit=10 | 10 items, correct skip | Stable pagination | M | | Not Run |
| PROD-024 | Sorting | Sort by retail price desc | Data exists | 1. GET sort=price.retail:desc | sort param | Results ordered high->low | Sorted output | L | | Not Run |
| PROD-025 | Text/partial search | Search partial name | Data exists | 1. GET ?q=LED | q=LED | Matching subset returned | Search works | M | | Not Run |
| PROD-026 | Warranty config enable | Enable warranty fields | Product exists | 1. PATCH warranty.enabled=true periodDays=365 | values | Values persisted; requiresSerial default false | Warranty active | M | | Not Run |
| PROD-027 | Warranty invalid days | Negative warranty days | None | 1. PATCH warranty.periodDays=-1 | -1 | 400 validation | No change | M | | Not Run |
| PROD-028 | Soft deactivate product | Set isActive=false | Product exists | 1. PATCH isActive=false 2. GET active list | id | Product removed from active listings | Product inactive | H | | Not Run |
| PROD-029 | Reactivate product | Toggle back to active | Product inactive | 1. PATCH isActive=true | id | Appears in listings again | Active again | M | | Not Run |
| PROD-030 | Supplier linkage | Link supplier id | Supplier exists | 1. PATCH supplier=<supplierId> | supplierId | Supplier ref stored | Relationship set | L | | Not Run |
| PROD-031 | Delete product in use | Attempt delete referenced product | Product in sale/stock | 1. DELETE product | id | 409/400 protected (if business rule) | Product not deleted | H | | Not Run |
| PROD-032 | Delete unused product | Delete product cleanly | Product not referenced | 1. DELETE product | id | 200 deleted | Removed | M | | Not Run |
| PROD-033 | Performance large list | Fetch 1000 products | Large dataset generated | 1. GET products?limit=1000 | limit=1000 | Response within acceptable time (<X sec) | Performance baseline | L | | Not Run |
| PROD-034 | Category deletion with children | Delete category that has children | Category tree exists | 1. DELETE parent | parent id | Error or cascade rule (define expected) | Integrity preserved | H | | Not Run |
| PROD-035 | Category assigned to products | Delete category with products | Products mapped | 1. DELETE category | category id | Error unless reassignment performed | Products still reference old category | H | | Not Run |
| PROD-036 | Tax rate category override | Category taxRate used | Product & category exist | 1. GET product pricing context | id | Computed tax includes category rate (if logic present) | Correct tax calc | L | | Not Run |
| PROD-037 | Reserved stock increment logic (future link) | Set reserved value | Product existing | 1. PATCH stock.reserved=5 | reserved=5 | Field updated; not negative | Reserved tracked | L | | Not Run |
| PROD-038 | Reorder point alert flag | Set reorderPoint < current | Product stock present | 1. PATCH reorderPoint 2. GET low-stock API | reorderPoint | Appears in low-stock list | Alert triggered | M | | Not Run |
| PROD-039 | Expiry date set | Set expiryDate | Product trackInventory | 1. PATCH expiryDate=<futureDate> | date | Field stored | Expiry tracked | L | | Not Run |
| PROD-040 | Bulk upload/import (if endpoint) | Upload CSV/JSON list | Import endpoint enabled | 1. POST file 2. Check results | file | Products created or errors report | Bulk changes applied | L | | Not Run |

---

### Export Tips
Same steps as Phase 1: copy to sheet or use Markdown screenshot tool.

### Next Phase Preview
Phase 3 will focus on Sales & Payments (cart handling, multi-method payments, receipt generation, stock deduction, edge cases such as negative stock prevention).
