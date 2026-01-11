# Barcode Lifecycle Tracking System

## Overview
This system provides complete lifecycle tracking for individual barcode units across your entire business operations - from generation through sales, warranties, returns, and damages.

## Features

### 1. Manual Barcode Entry
- **Location**: Cart component (top-right corner)
- **Icon**: ScanBarcode icon from safe-lucide-react
- **Purpose**: Allows cashiers to manually enter barcodes when the scanner isn't working
- **Functionality**: Opens a modal with input field that searches for products by barcode

### 2. Barcode Status Lifecycle

```
generated → in_stock → sold → returned/damaged/written_off
```

#### Status Definitions:
- **generated**: Barcode created when stickers printed
- **in_stock**: Marked when inventory received from purchase order
- **sold**: Linked to sale when item sold to customer
- **returned**: Item returned by customer
- **damaged**: Item damaged in transit or at shop
- **written_off**: Item permanently removed from inventory

### 3. Integration Points

#### A. Sticker Generation (`/api/products/sticker-batch`)
**File**: `server/src/controllers/product.controller.ts`
- Creates unique barcodes when printing stickers
- Saves to `UnitBarcode` collection with status `generated`
- Records `printedAt` timestamp
- Links to `StickerBatch` and `Product`

#### B. Inventory Receiving (`/api/purchase-orders/:id/receive`)
**File**: `server/src/controllers/purchaseOrder.controller.ts`
- Updates barcodes from `generated` → `in_stock`
- Records `inStockAt` timestamp
- Triggered when receiving purchase orders

#### C. Sales (`/api/sales`)
**File**: `server/src/controllers/sale.controller.ts`
- Updates barcodes from `in_stock` → `sold`
- Links barcode to `Sale` document
- Records `soldAt` timestamp
- Links to `customer` if provided

#### D. Warranty Issuance
**File**: `server/src/services/warranty.service.ts`
- Links barcode to `Warranty` document
- Records `warrantyStart` and `warrantyEnd` dates
- Triggered automatically when warranty created for sold item

#### E. Returns (`/api/returns`)
**File**: `server/src/services/ReturnService.ts`
- Updates barcode from `sold` → `returned`
- Links to `ReturnTransaction`
- Records `returnedAt` timestamp and `returnReason`

#### F. Damages (`/api/damages`)
**File**: `server/src/controllers/damage.controller.ts`
- Updates barcode to `damaged` status
- Links to `Damage` document
- Records `damagedAt` timestamp and `damageReason`

### 4. Barcode Query API

#### Get Barcode Info
```http
GET /api/barcodes/:barcode
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "barcode": "2001234567890",
    "status": "sold",
    "product": {
      "_id": "...",
      "name": "Product Name",
      "sku": "SKU-123"
    },
    "sale": {
      "_id": "...",
      "invoiceNo": "INV-000123",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "warranty": {
      "warrantyNo": "W123456",
      "endDate": "2025-01-15T00:00:00Z"
    },
    "customer": {
      "name": "John Doe",
      "phone": "0771234567"
    },
    "printedAt": "2024-01-10T08:00:00Z",
    "inStockAt": "2024-01-12T14:00:00Z",
    "soldAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Product Barcodes
```http
GET /api/barcodes/product/:productId?status=sold&page=1&limit=50
Authorization: Bearer {token}
```

#### Get Customer Purchase History
```http
GET /api/barcodes/customer/:customerId?status=sold
Authorization: Bearer {token}
```

#### Get Barcode Statistics
```http
GET /api/barcodes/stats/overview
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 15000,
    "byStatus": {
      "generated": 500,
      "in_stock": 3000,
      "sold": 10000,
      "returned": 800,
      "damaged": 500,
      "written_off": 200
    }
  }
}
```

## Database Schema

### UnitBarcode Model
**File**: `server/src/models/UnitBarcode.model.ts`

```typescript
{
  barcode: String,           // Unique barcode value
  product: ObjectId,         // Reference to Product
  batch: ObjectId,           // Reference to StickerBatch
  status: String,            // Enum: generated|in_stock|sold|returned|damaged|written_off
  
  // Transaction References
  sale: ObjectId,            // Reference to Sale
  warranty: ObjectId,        // Reference to Warranty
  return: ObjectId,          // Reference to ReturnTransaction
  damage: ObjectId,          // Reference to Damage
  customer: ObjectId,        // Reference to Customer
  
  // Lifecycle Timestamps
  printedAt: Date,
  inStockAt: Date,
  soldAt: Date,
  returnedAt: Date,
  damagedAt: Date,
  warrantyStart: Date,
  warrantyEnd: Date,
  
  // Reason Tracking
  returnReason: String,
  damageReason: String,
  
  // Metadata
  metadata: Object,
  
  timestamps: true
}
```

### Indexes
- `{ barcode: 1 }` - Unique index for fast lookups
- `{ product: 1, status: 1 }` - Query barcodes by product and status
- `{ sale: 1 }` - Find barcodes in a sale
- `{ customer: 1, soldAt: -1 }` - Customer purchase history
- `{ status: 1, updatedAt: -1 }` - Recent status changes

## Frontend Usage

### Manual Barcode Button
**File**: `client/src/features/pos/Cart.tsx`

```tsx
import { ScanBarcode } from '@/lib/safe-lucide-react';
import { productsApi } from '@/lib/api/products.api';

// Button in cart header
<button onClick={() => setShowManualBarcode(true)}>
  <ScanBarcode className="h-5 w-5" />
</button>

// Modal with barcode input
{showManualBarcode && (
  <div className="modal">
    <input 
      type="text" 
      placeholder="Enter barcode..."
      onSubmit={handleBarcodeSubmit}
    />
  </div>
)}
```

### Barcode API Client
**File**: `client/src/lib/api/barcodes.api.ts`

```typescript
import { barcodesApi } from '@/lib/api/barcodes.api';

// Get barcode info
const barcodeInfo = await barcodesApi.getByBarcode('2001234567890');

// Get product barcodes
const { barcodes, total } = await barcodesApi.getByProduct(productId, {
  status: 'sold',
  page: 1,
  limit: 50
});

// Get customer history
const customerBarcodes = await barcodesApi.getByCustomer(customerId);

// Get statistics
const stats = await barcodesApi.getStats();
```

## Use Cases

### 1. Customer Service Inquiry
Customer calls with a barcode or invoice number:
```typescript
const barcode = await barcodesApi.getByBarcode(customerBarcode);
// See: sale info, warranty status, customer details
```

### 2. Product Recall
Need to find all units of a specific product:
```typescript
const { barcodes } = await barcodesApi.getByProduct(productId, {
  status: 'sold'
});
// Contact customers who purchased affected units
```

### 3. Warranty Validation
Customer claims warranty on item:
```typescript
const barcode = await barcodesApi.getByBarcode(scannedCode);
// Check: warranty.endDate, status, customer match
```

### 4. Inventory Audit
Track where products are in lifecycle:
```typescript
const stats = await barcodesApi.getStats();
// See: in_stock count, sold count, damaged count
```

### 5. Return Processing
Customer returns item with barcode:
```typescript
const barcode = await barcodesApi.getByBarcode(returnBarcode);
// Verify: sale reference, customer, purchase date
```

## Configuration

### Environment Variables
No additional environment variables needed. Uses existing MongoDB connection.

### Settings
Barcode generation mode configured in Settings:
- `reuse_product_barcode`: Use same barcode for all units
- `unique_per_unit`: Generate unique barcode per unit (enables tracking)

## Benefits

1. **Complete Product Traceability**: Track every unit from generation to disposal
2. **Customer Purchase History**: See all items purchased by customer with warranty status
3. **Automated Status Updates**: Barcodes automatically updated as items move through lifecycle
4. **Fraud Prevention**: Verify warranty claims against actual purchase records
5. **Inventory Accuracy**: Real-time view of stock status by barcode
6. **Analytics**: Aggregate data on return rates, damage patterns, warranty claims
7. **Manual Entry Fallback**: Cashiers can manually enter barcodes when scanner fails

## Testing

### 1. Generate Barcodes
- Create product
- Generate stickers with "unique per unit" mode
- Verify status = "generated" in database

### 2. Receive Inventory
- Create purchase order
- Receive items
- Verify barcodes updated to "in_stock"

### 3. Process Sale
- Add items to cart
- Complete sale
- Verify barcodes updated to "sold" with sale reference

### 4. Issue Warranty
- Sale with warranty-enabled product
- Verify barcode linked to warranty document

### 5. Process Return
- Return item from previous sale
- Verify barcode status = "returned" with return reference

### 6. Report Damage
- Report damaged item
- Verify barcode status = "damaged" with damage reference

### 7. Query Barcode
```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/barcodes/2001234567890
```

## Troubleshooting

### Barcodes Not Updating to in_stock
- Ensure purchase orders use "receive items" endpoint
- Check that barcodes exist with status "generated"
- Verify product ID matches between barcode and PO

### Barcodes Not Updating on Sale
- Ensure sufficient barcodes exist with status "in_stock"
- Check quantity: one barcode per quantity unit
- Review sale controller logs for barcode tracking

### Manual Barcode Not Finding Product
- Verify product has barcode field set
- Check barcode exists in Product or UnitBarcode collection
- Ensure API endpoint `/api/products/barcode/:code` works

## Future Enhancements

1. **Batch Status Updates**: Update multiple barcodes at once
2. **Barcode Lookup UI**: Dedicated page for barcode search
3. **Customer Portal**: Let customers view their purchases by barcode
4. **Mobile App**: Scan barcodes with phone camera
5. **Export Reports**: Download barcode history as CSV/Excel
6. **Notifications**: Alert when warranty expiring for customer's barcodes
7. **Quality Control**: Track manufacturing batch defects by barcode range

## Related Files

### Backend
- `server/src/models/UnitBarcode.model.ts` - Database model
- `server/src/controllers/sale.controller.ts` - Sale tracking
- `server/src/controllers/product.controller.ts` - Barcode generation
- `server/src/controllers/purchaseOrder.controller.ts` - Inventory receiving
- `server/src/controllers/damage.controller.ts` - Damage tracking
- `server/src/services/warranty.service.ts` - Warranty linking
- `server/src/services/ReturnService.ts` - Return tracking
- `server/src/routes/barcode.routes.ts` - API routes

### Frontend
- `client/src/features/pos/Cart.tsx` - Manual barcode entry
- `client/src/lib/api/barcodes.api.ts` - API client
- `client/src/lib/safe-lucide-react.ts` - Icon imports

## Support

For issues or questions:
1. Check logs in console for `[barcode.track]` messages
2. Verify MongoDB indexes exist on UnitBarcode collection
3. Test API endpoints directly with curl/Postman
4. Review this documentation for integration points
