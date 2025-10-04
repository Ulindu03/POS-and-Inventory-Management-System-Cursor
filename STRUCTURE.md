# Project Structure

(Excluding: node_modules, dist, uploads)

- client/
  - eslint.config.js
  - index.html
  - package-lock.json
  - package.json
  - postcss.config.js
  - public/
    - analytics.png
    - asaas.jpeg
    - bar.png
    - customer.png
    - damages.png
    - dashboard.png
    - deliveries.png
    - doc.jpg
    - FS.png
    - head.jpeg
    - hij.jpeg
    - images.jpeg
    - inventory.png
    - JBL_PARTYBOX_520_Speaker-SIMPLYTEK-LK-SRI-LANKA_1.webp
    - jhnhbj.jpeg
    - L.jpeg
    - lightstrip.jpg
    - locales/
      - en/
        - translation.json
      - si/
        - translation.json
    - logo.jpg
    - POS.png
    - product.png
    - report.png
    - settings.png
    - sidebar.png
    - ss.jpeg
    - supplier.png
    - Untitled.jpeg
    - user.png
    - vite.svg
    - warranty.png
  - README.md
  - src/
    - App.css
    - App.tsx
    - assets/
      - react.svg
    - components/
      - auth/
        - ProtectedRoute.tsx
      - common/
        - BrandLogo.tsx
        - Card/
          - GlassCard.tsx
          - index.ts
          - StatsCard.tsx
        - Charts/
          - AreaChart.tsx
          - charts.config.ts
          - PieChart.tsx
          - Sparkline.tsx
        - ErrorBoundary.tsx
        - Layout/
          - Header.tsx
          - Layout.tsx
          - Sidebar.tsx
        - Loader/
          - index.ts
          - Skeleton.tsx
      - returns/
        // Return-related shared components (folder present)
      - products/
        - ProductDeleteDialog.tsx
        - ProductForm.tsx
        - ProductList.tsx
        - ProductSidebarLink.tsx
      - ui/
        - BarcodeSVG.tsx
        - FormModal.tsx
    - config/
      - i18n.ts
    - features/
      - customers/
        - CustomerForm.tsx
        - CustomerList.tsx
        - CustomerProfile.tsx
        - index.ts
        - LoyaltyRedemptionModal.tsx
      - damage/
        - QuickDamageModal.tsx
      - dashboard/
        - CategoryDistribution.tsx
        - DashboardStats.tsx
        - index.ts
        - QuickActions.tsx
        - RecentSales.tsx
        - SalesChart.tsx
        - TopProducts.tsx
      - deliveries/
        - DeliveryDetailsDrawer.tsx
        - DeliveryForm.tsx
      - inventory/
        - LowStockAlert.tsx
        - StockAdjustment.tsx
        - StockList.tsx
        - StockMovementHistory.tsx
      - pos/
        - BarcodeScanner.tsx
        - Cart.tsx
        - PaymentModal.tsx
        - ProductGrid.tsx
        - ReceiptModal.tsx
        - ReturnModal.tsx
      - products/
        - CategoryManager.tsx
        - ProductForm.tsx
        - ProductHistoryModal.tsx
        - ProductList.tsx
        - StickerPrintModal.tsx
      - suppliers/
        - index.ts
        - PerformanceModal.tsx
        - SupplierForm.tsx
        - SupplierList.tsx
        - SupplierProfile.tsx
        - SupplierStats.tsx
    - hooks/
      - useRealtime.ts
    - index.css
    - lib/
      - api/
        - auth.api.ts
        - categories.api.ts
        - client.ts
        - customers.api.ts
        - deliveries.api.ts
        - products.api.ts
        - promotions.api.ts
        - reports.api.ts
        - returns.api.ts
        - sales.api.ts
        - settings.api.ts
        - suppliers.api.ts
        - trips.api.ts
        - users.api.ts
        - warranty.api.ts
        - warrantyClaim.api.ts
      - icon-stubs/
        - chrome.js
      - realtime.ts
      - safe-lucide-react.ts
      - supabase.ts
      - utils/
        - currency.ts
        - index.ts
    - main.tsx
    - pages/
      - Analytics.tsx
      - Categories.tsx
      - Customers.tsx
      - Damages.tsx
      - Dashboard.tsx
      - Deliveries.tsx
      - Inventory.tsx
      - Login.tsx
      - POS.tsx
      - Products.tsx
      - PurchaseOrders.tsx
      - Reports.tsx
      - Sales.tsx
      - Settings.tsx
      - SimpleLogin.tsx
      - Suppliers.tsx
      - Users.tsx
      - Warranty.tsx
    - store/
      - auth.store.ts
      - cart.store.ts
    - styles/
      - globals.css
      - login.css
      - print.css
    - types/
      - lucide-deep-imports.d.ts
      - socketio-client.d.ts
    - vite-env.d.ts
  - tailwind.config.js
  - tsconfig.app.json
  - tsconfig.json
  - tsconfig.node.json
  - tsconfig.tsbuildinfo
  - vite.config.ts

- server/
  - nodemon.json
  - package-lock.json
  - package.json
  - tsconfig.json
  - src/
    - config/
      - database.ts
      - swagger.ts
    - controllers/
      - auth.controller.ts
      - category.controller.ts
      - customer.controller.ts
      - dashboard.controller.ts
      - damage.controller.ts
      - delivery.controller.ts
      - inventory.controller.ts
      - product.controller.ts
      - promotion.controller.ts
      - purchaseOrder.controller.ts
      - reportExport.controller.ts
      - reports.controller.ts
      - return.controller.ts
      - sale.controller.ts
      - settings.controller.ts
      - supplier.controller.ts
      - trip.controller.ts
      - user.controller.ts
    - docs/
      - WARRANTY_SPEC.md
    - jobs/
      - warranty-expiry.job.ts
      - warranty-report.job.ts
    - middleware/
      - auth.middleware.ts
      - cache.middleware.ts
    - models/
      - index.ts
      - ActivityLog.model.ts
      - Category.model.ts
      - Counter.model.ts
      - Customer.model.ts
      - CustomerOverpayment.model.ts
      - Damage.model.ts
      - Delivery.model.ts
      - Discount.model.ts
      - ExchangeSlip.model.ts
      - Inventory.model.ts
      - Notification.model.ts
      - Payment.model.ts
      - Product.model.ts
      - PurchaseOrder.model.ts
      - ReturnPolicy.model.ts
      - ReturnTransaction.model.ts
      - Sale.model.ts
      - Settings.model.ts
      - StickerBatch.model.ts
      - StockMovement.model.ts
      - Store.model.ts
      - Supplier.model.ts
      - Tax.model.ts
      - Trip.model.ts
      - UnitBarcode.model.ts
      - User.model.ts
      - Warranty.model.ts
      - WarrantyClaim.model.ts
    - routes/
      - auth.routes.ts
      - category.routes.ts
      - customer.routes.ts
      - dashboard.routes.ts
      - damage.routes.ts
      - delivery.routes.ts
      - inventory.routes.ts
      - product.routes.ts
      - promotion.routes.ts
      - purchaseOrder.routes.ts
      - reports.routes.ts
      - return.routes.ts
      - sale.routes.ts
      - settings.routes.ts
      - supplier.routes.ts
      - trip.routes.ts
      - user.routes.ts
      - warranty.routes.ts
      - warrantyClaim.routes.ts
    - scripts/
      - seedDemoAdmin.ts
      - backfillCanonicalPhone.ts
      - debugCustomers.ts
    - server.ts
    - services/
      - discount.service.ts
      - realtime.service.ts
      - warranty.service.ts
      - warrantyClaim.service.ts
      - (other helpers)
    - types/
      - express.d.ts
      - index.d.ts
      - swagger.d.ts
    - utils/
      - paginate.ts
      - upload.ts

- docs/
  - Backend-AtoZ-Setup.md

- docker-compose.yml
- package-lock.json
- package.json
- Prompt.md
- README.md

## Domain Model (Mermaid UML)

```mermaid
classDiagram
direction TB

class User {
  +ObjectId _id
  +string username
  +string email
  +string password
  +string firstName
  +string lastName
  +string phone
  +string avatar
  +enum role [store_owner|admin|cashier|sales_rep]
  +enum language [en|si]
  +boolean isActive
  +Date lastLogin
  +Date passwordUpdatedAt
  +string refreshToken
  +boolean twoFactorEnabled
  +string[] permissions
  +string otpCode
  +Date otpExpires
  +number otpAttempts
  +string resetPasswordToken
  +Date resetPasswordExpires
  +string resetOtpCode
  +Date resetOtpExpires
  +number resetOtpAttempts
}

class Customer {
  +ObjectId _id
  +string customerCode
  +string name
  +string email
  +string phone
  +string canonicalPhone
  +string alternatePhone
  +string address.street
  +string address.city
  +string address.province
  +string address.postalCode
  +number address.coordinates.latitude
  +number address.coordinates.longitude
  +enum type [retail|wholesale|corporate]
  +number creditLimit
  +number creditUsed
  +number loyaltyPoints
  +string taxId
  +string nic
  +Date birthday
  +Date anniversary
  +string notes
  +enum preferences.language [en|si]
  +string preferences.currency
  +boolean preferences.communication.email
  +boolean preferences.communication.sms
  +boolean preferences.communication.whatsapp
  +enum status [active|inactive|suspended]
  +boolean isActive
  +string[] tags
}

class Supplier {
  +ObjectId _id
  +string supplierCode
  +string name
  +string contactPerson
  +string email
  +string phone
  +string alternatePhone
  +string address.street
  +string address.city
  +string address.province
  +string address.postalCode
  +string taxId
  +string paymentTerms
  +number creditLimit
  +number creditUsed
  +number rating
  +number performance.onTimeDelivery
  +number performance.qualityRating
  +number performance.priceCompetitiveness
  +number leadTimeDays
  +number fillRate
  +number returnRate
  +enum status [active|inactive|suspended]
  +boolean isActive
  +string notes
  +string bankDetails.accountName
  +string bankDetails.accountNumber
  +string bankDetails.bankName
  +string bankDetails.branch
}

class Category {
  +ObjectId _id
  +string name.en
  +string name.si
  +string description.en
  +string description.si
  +ObjectId parent
  +number level
  +ObjectId[] path
  +string icon
  +string color
  +boolean isActive
  +number sortOrder
  +number taxRate
}

class Product {
  +ObjectId _id
  +string sku
  +string barcode
  +string name.en
  +string name.si
  +string description.en
  +string description.si
  +string brand
  +string unit
  +number price.cost
  +number price.retail
  +number price.wholesale
  +number tax.vat
  +number tax.nbt
  +number stock.current
  +number stock.minimum
  +number stock.reorderPoint
  +number stock.reserved
  +number stock.inTransit
  +boolean isActive
  +boolean trackInventory
  +boolean allowBackorder
  +boolean isDigital
  +boolean isBundle
  +Date expiryDate
  +string batchNumber
  +string[] tags
  +boolean warranty.enabled
  +number warranty.periodDays
  +enum warranty.type [manufacturer|extended|lifetime|none]
  +string[] warranty.coverage
  +string[] warranty.exclusions
  +string warranty.termsPdfUrl
  +boolean warranty.allowExtendedUpsell
  +{name,additionalPeriodDays,price,sku}[] warranty.extendedOptions
  +boolean warranty.requiresSerial
}

class Inventory {
  +ObjectId _id
  +number currentStock
  +number minimumStock
  +number reorderPoint
  +number reservedStock
  +number availableStock
  +number averageCost
  +number lastPurchasePrice
  +Date lastPurchaseDate
  +Date lastSaleDate
  +Date expiryDate
  +string batchNumber
  +string location
  +boolean isActive
}

class Sale {
  +ObjectId _id
  +string invoiceNo
  +number subtotal
  +number tax.vat
  +number tax.nbt
  +number discount
  +number total
  +string currency.code
  +number currency.rateToBase
  +string currency.baseCode
  +enum status [completed|pending|cancelled|refunded|partially_refunded|held]
  +string notes
  +boolean receiptPrinted
  +boolean emailSent
  +boolean smsSent
}

class SaleItem {
  <<embedded>>
  +ObjectId product
  +number quantity
  +number price
  +number cost
  +number discount
  +number tax.vat
  +number tax.nbt
  +number total
  +string variant.name
  +string variant.option
}

class ReturnTransaction {
  +ObjectId _id
  +string returnNo
  +enum returnType [full_refund|partial_refund|exchange|store_credit]
  +number totalAmount
  +enum refundMethod [cash|card|bank_transfer|digital|store_credit|exchange_slip|overpayment]
  +string refundDetails.cardType
  +string refundDetails.last4Digits
  +string refundDetails.transactionId
  +string refundDetails.accountNumber
  +string refundDetails.bankName
  +string refundDetails.digitalWallet
  +string refundDetails.reference
  +number discount
  +number tax.vat
  +number tax.nbt
  +string currency.code
  +number currency.rateToBase
  +string currency.baseCode
  +enum status [pending|approved|processed|cancelled]
  +string notes
  +boolean receiptPrinted
}

class ReturnItem {
  <<embedded>>
  +ObjectId product
  +number quantity
  +number originalPrice
  +number returnAmount
  +enum reason [defective|expired|damaged|wrong_item|unwanted|size_issue|color_issue|other]
  +enum disposition [restock|damage|write_off|return_to_supplier]
  +enum condition [new|opened|damaged|defective]
}

class ExchangeSlip {
  +ObjectId _id
  +string slipNo
  +number totalValue
  +enum status [active|redeemed|expired|cancelled]
  +Date expiryDate
  +Date redeemedAt
  +string notes
}

class Payment {
  +ObjectId _id
  +string paymentNo
  +enum type [sale|purchase|refund|credit_payment|supplier_payment]
  +enum method [cash|card|bank_transfer|digital|cheque|credit]
  +number amount
  +string currency
  +number exchangeRate
  +string reference
  +string transactionId
  +string cardDetails.type
  +string cardDetails.last4
  +number cardDetails.expiryMonth
  +number cardDetails.expiryYear
  +string bankDetails.bankName
  +string bankDetails.accountNumber
  +string bankDetails.branch
  +enum status [pending|completed|failed|cancelled|refunded]
  +Date processedAt
  +string notes
  +boolean receiptPrinted
}

class CustomerOverpayment {
  +ObjectId _id
  +number amount
  +string currency
  +number exchangeRate
  +enum source [refund|overpayment|store_credit|gift_card]
  +string sourceReference
  +number balance
  +enum status [active|fully_used|expired|cancelled]
  +Date expiryDate
  +string notes
}

class OverpaymentUsage {
  <<embedded>>
  +number usedAmount
  +number remainingBalance
  +Date usedAt
  +string notes
}

class PurchaseOrder {
  +ObjectId _id
  +string poNumber
  +number subtotal
  +number tax.vat
  +number tax.nbt
  +number discount
  +number total
  +enum status [draft|sent|confirmed|received|cancelled|completed]
  +Date orderDate
  +Date expectedDelivery
  +Date actualDelivery
  +string paymentTerms
  +enum paymentStatus [pending|partial|paid]
  +number paidAmount
  +string notes
  +Date approvedAt
}

class PurchaseOrderItem {
  <<embedded>>
  +ObjectId product
  +number quantity
  +number unitCost
  +number totalCost
  +number received
  +number damaged
}

class Delivery {
  +ObjectId _id
  +string deliveryNo
  +string lorryDetails.vehicleNo
  +string lorryDetails.driverName
  +string lorryDetails.driverPhone
  +string lorryDetails.driverLicense
  +string route
  +enum status [scheduled|in_transit|completed|cancelled|returned]
  +Date scheduledDate
  +Date departureTime
  +Date arrivalTime
  +number totalItems
  +number totalDelivered
  +number totalDamaged
  +number totalReturned
  +number deliveryCharges
  +number fuelCost
  +number otherExpenses
  +number totalExpenses
  +string notes
  +string weather.condition
  +number weather.temperature
}

class DeliveryShop {
  <<embedded>>
  +ObjectId customer
  +enum status [pending|delivered|partial|failed|returned]
  +Date deliveryTime
  +string notes
  +string signature
  +string proofOfDelivery
}

class DeliveryShopItem {
  <<embedded>>
  +ObjectId product
  +number quantity
  +number delivered
  +number damaged
  +number returned
  +string notes
}

class Damage {
  +ObjectId _id
  +string referenceNo
  +enum type [delivery|return|warehouse|shop_return]
  +string source.location
  +number totalCost
  +enum status [reported|verified|resolved|written_off|replaced]
  +enum priority [low|medium|high|critical]
  +Date reportedAt
  +Date verifiedAt
  +Date resolvedAt
  +string notes
  +enum action [replace|refund|repair|write_off|return_to_supplier]
  +boolean insuranceClaim.filed
  +string insuranceClaim.claimNumber
  +number insuranceClaim.amount
  +enum insuranceClaim.status [pending|approved|rejected|paid]
  +string weather.condition
  +number weather.temperature
}

class DamageItem {
  <<embedded>>
  +ObjectId product
  +number quantity
  +number unitCost
  +number totalCost
  +enum reason [broken|expired|defective|water_damage|crushed|torn|other]
  +string description
  +string[] images
  +string batchNumber
  +Date expiryDate
}

class InventoryStockMovement {
  +ObjectId _id
  +enum type [purchase|sale|adjustment|transfer|return|damage|expiry]
  +number quantity
  +number previousStock
  +number newStock
  +number unitCost
  +number totalCost
  +string reference
  +ObjectId referenceId
  +enum referenceType [Sale|Purchase|Delivery|Damage|Adjustment]
  +string reason
  +string location.from
  +string location.to
  +string batchNumber
  +Date expiryDate
  +Date createdAt
  +string notes
}

class Tax {
  +ObjectId _id
  +string taxCode
  +string name
  +string description
  +enum type [vat|nbt|custom|import|export]
  +number rate
  +boolean isCompound
  +boolean isActive
  +Date startDate
  +Date endDate
  +string registrationNumber
  +string taxAuthority
  +enum reportingFrequency [monthly|quarterly|annually]
  +Date lastReported
  +Date nextReportingDate
}

class Discount {
  +ObjectId _id
  +string discountCode
  +string name
  +string description
  +enum type [percentage|fixed|buy_one_get_one|buy_x_get_y]
  +number value
  +number minimumAmount
  +number maximumDiscount
  +Date startDate
  +Date endDate
  +number usageLimit
  +number usedCount
  +number perCustomerLimit
  +boolean isActive
  +boolean isFirstTimeOnly
  +boolean isStackable
}

class ExchangeSlipItem {
  <<embedded>>
  +ObjectId product
  +number quantity
  +number originalPrice
  +number exchangeValue
}

class ReturnPolicy {
  +ObjectId _id
  +string name
  +string description
  +boolean isActive
  +number returnWindow.days
  +number returnWindow.extendedDays
  +boolean refundMethods.allowCash
  +boolean refundMethods.allowCard
  +boolean refundMethods.allowBankTransfer
  +boolean refundMethods.allowDigital
  +boolean refundMethods.allowStoreCredit
  +boolean refundMethods.allowExchange
  +boolean approvalRequirements.managerApprovalRequired
  +number approvalRequirements.approvalThreshold
  +boolean approvalRequirements.receiptRequired
  +boolean approvalRequirements.allowNoReceiptReturns
  +number approvalRequirements.noReceiptSearchDays
  +boolean stockHandling.autoRestock
  +boolean stockHandling.requireConditionCheck
  +enum stockHandling.defaultDisposition [restock|damage|write_off]
  +boolean notifications.emailCustomer
  +boolean notifications.smsCustomer
  +boolean notifications.notifyManager
  +boolean applicableTo.allProducts
  +enum[] applicableTo.customerTypes [retail|wholesale|vip|staff]
  +number priority
}

class Store {
  +ObjectId _id
  +string name
  +string code
  +string logo
  +string address.street
  +string address.city
  +string address.province
  +string address.postalCode
  +string address.country
  +string contact.phone
  +string contact.email
  +string contact.website
  +string business.taxId
  +string business.registrationNumber
  +enum business.businessType [retail|wholesale|both]
  +boolean isActive
}

class Trip {
  +ObjectId _id
  +string tripNo
  +string lorry.vehicleNo
  +number lorry.capacity
  +string driver.name
  +string driver.phone
  +string driver.licenseNo
  +string routeName
  +enum status [planned|loading|in_transit|completed|cancelled]
  +Date plannedStart
  +Date plannedEnd
  +Date actualStart
  +Date actualEnd
  +number totals.loaded
  +number totals.delivered
  +number totals.returned
  +number totals.damaged
}

class TripStop {
  <<embedded>>
  +ObjectId customer
  +number sequence
  +Date scheduledTime
  +Date arrivalTime
  +Date departureTime
  +enum status [pending|arrived|delivered|partial|skipped|failed]
  +string notes
}

class TripManifestItem {
  <<embedded>>
  +ObjectId product
  +number qty
}

class TripDeliveredItem {
  <<embedded>>
  +ObjectId product
  +number qty
  +number damaged
  +number returned
}

class Warranty {
  +ObjectId _id
  +string warrantyNo
  +ObjectId saleItemId
  +string serialNumber
  +string batchNumber
  +enum type [manufacturer|extended|replacement]
  +string[] coverage
  +string[] exclusions
  +number periodDays
  +Date startDate
  +Date activationDate
  +Date endDate
  +enum status [pending_activation|active|expired|revoked|transferred]
  +number claimsCount
  +Date lastClaimDate
  +string qrCodeUrl
  +string notes
  +string warrantyType
  +number duration
  +string durationUnit
}

class WarrantyClaim {
  +ObjectId _id
  +string claimNo
  +enum issueCategory [mechanical|electrical|cosmetic|software|other]
  +string issueDescription
  +Date observedAt
  +string[] photos
  +string[] documents
  +enum status [open|inspection|validation|awaiting_customer|approved|rejected|repair_in_progress|replacement_pending|resolved|closed]
  +number sla.firstResponseMet
  +number sla.resolutionMet
  +Date sla.firstResponseDue
  +Date sla.resolutionDue
  +string resolution.type
  +string resolution.details
  +number resolution.cost
  +Date closedAt
}

class ActivityLog {
  +ObjectId _id
  +string action
  +enum module [auth|products|sales|inventory|customers|suppliers|delivery|damage|reports|settings]
  +string entity
  +ObjectId entityId
  +Mixed details
  +string ipAddress
  +string userAgent
  +enum status [success|error|warning|info]
  +enum severity [low|medium|high|critical]
  +string sessionId
}

class Notification {
  +ObjectId _id
  +string title
  +string message
  +enum type [info|success|warning|error|alert]
  +enum category [system|inventory|sales|delivery|damage|customer|supplier]
  +enum priority [low|medium|high|urgent]
  +boolean isRead
  +Date readAt
  +string actionUrl
  +string actionText
  +Mixed data
  +Date expiresAt
  +string[] sentVia
  +boolean emailSent
  +boolean smsSent
  +boolean pushSent
}

class Settings {
  +ObjectId _id
  +Object pos
  +Object tax
  +Object receipt
  +Object branding
  +Object stickers
  +Object inventory
  +Object delivery
  +Object notifications
  +Object backup
  +Object security
  +Object currency
  +Object language
  +string timezone
  +string dateFormat
  +enum timeFormat [12h|24h]
}

class Counter {
  +ObjectId _id
  +string key
  +number seq
}

class StickerBatch {
  +ObjectId _id
  +number quantity
  +string layout.labelSize
  +{widthMm,heightMm} layout.customSize
  +enum layout.sheetType [roll|a4]
  +number layout.columns
  +number layout.rows
  +number layout.marginMm
  +number layout.gapMm
  +enum mode [reuse_product_barcode|unique_per_unit]
  +string[] barcodes
  +Date printedAt
}

class UnitBarcode {
  +ObjectId _id
  +string barcode
  +Date printedAt
}

%% Relationships
Customer "1" -- "0..*" Sale : customer
User "1" -- "0..*" Sale : cashier
Sale "1" o-- "1..*" SaleItem : items
Sale "1" o-- "0..*" ReturnTransaction : returns
Sale "1" -- "0..*" Payment : sale
Sale "1" -- "0..*" ExchangeSlip : exchangeSlipsIssued
Sale "1" -- "0..*" CustomerOverpayment : overpayments
Product "1" -- "0..*" SaleItem : product

ReturnTransaction "1" o-- "1..*" ReturnItem : items
ReturnTransaction "1" -- "0..1" ExchangeSlip : exchangeSlip
ReturnTransaction "1" -- "0..1" CustomerOverpayment : overpaymentCreated
Sale "1" -- "0..*" ReturnTransaction : originalSale
Customer "1" -- "0..*" ReturnTransaction : customer
User "1" -- "0..*" ReturnTransaction : returnedBy

ExchangeSlip "1" o-- "1..*" ExchangeSlipItem : items
ExchangeSlip "1" -- "0..1" Sale : redemptionSale
Customer "1" -- "0..*" ExchangeSlip : customer
User "1" -- "0..*" ExchangeSlip : issuedBy
User "0..1" -- "0..*" ExchangeSlip : redeemedBy

Payment "0..*" -- "0..1" Sale : sale
Payment "0..*" -- "0..1" Customer : customer
Payment "0..*" -- "0..1" Supplier : supplier
User "1" -- "0..*" Payment : processedBy

Customer "1" -- "0..*" CustomerOverpayment : customer
Sale "0..1" -- "0..*" CustomerOverpayment : originalSale
CustomerOverpayment "1" o-- "0..*" OverpaymentUsage : usageHistory
User "1" -- "0..*" CustomerOverpayment : createdBy
User "1" -- "0..*" OverpaymentUsage : usedBy
Sale "1" -- "0..*" OverpaymentUsage : usedInSale

Supplier "1" -- "0..*" Product : supplier
Category "1" -- "0..*" Product : category
Category "0..1" -- "0..*" Category : parent
Product "1" -- "0..*" Inventory : product
Supplier "0..1" -- "0..*" Inventory : supplier

Supplier "1" -- "0..*" PurchaseOrder : supplier
User "1" -- "0..*" PurchaseOrder : createdBy
User "0..1" -- "0..*" PurchaseOrder : approvedBy
PurchaseOrder "1" o-- "1..*" PurchaseOrderItem : items
Product "1" -- "0..*" PurchaseOrderItem : product

User "1" -- "0..*" Delivery : salesRep
Customer "1" -- "0..*" DeliveryShop : shops.customer
Delivery "1" o-- "0..*" DeliveryShop : shops
DeliveryShop "1" o-- "0..*" DeliveryShopItem : items
Product "1" -- "0..*" DeliveryShopItem : product

Damage "1" o-- "1..*" DamageItem : items
User "1" -- "0..*" Damage : reportedBy
User "0..1" -- "0..*" Damage : verifiedBy
User "0..1" -- "0..*" Damage : resolvedBy
Trip "0..1" -- "0..*" Damage : source.trip
Delivery "0..1" -- "0..*" Damage : source.delivery
Customer "0..1" -- "0..*" Damage : source.customer
Sale "0..1" -- "0..*" Damage : source.sale

Product "1" -- "0..*" InventoryStockMovement : product
User "1" -- "0..*" InventoryStockMovement : performedBy

User "1" -- "0..*" Tax : createdBy
Product "0..*" -- "0..*" Tax : applicableProducts
Category "0..*" -- "0..*" Tax : applicableCategories

Product "0..*" -- "0..*" Discount : applicableProducts
Category "0..*" -- "0..*" Discount : applicableCategories
Customer "0..*" -- "0..*" Discount : applicableCustomers
User "1" -- "0..*" Discount : createdBy

Product "1" -- "0..*" Warranty : product
Sale "0..1" -- "0..*" Warranty : sale
Customer "1" -- "0..*" Warranty : customer
User "1" -- "0..*" Warranty : issuedBy
Warranty "0..1" -- "0..1" Warranty : replacementWarranty (via Claim.resolution)
Warranty "1" -- "0..*" WarrantyClaim : claims
Customer "1" -- "0..*" WarrantyClaim : customer
Product "1" -- "0..*" WarrantyClaim : product
User "0..1" -- "0..*" WarrantyClaim : reportedBy
User "0..1" -- "0..*" WarrantyClaim : assignedTo

User "1" -- "0..*" ActivityLog : user
User "1" -- "0..*" Notification : recipient

Product "1" -- "0..*" StickerBatch : product
User "0..1" -- "0..*" StickerBatch : createdBy
Product "1" -- "0..*" UnitBarcode : product
StickerBatch "1" -- "0..*" UnitBarcode : batch
```
