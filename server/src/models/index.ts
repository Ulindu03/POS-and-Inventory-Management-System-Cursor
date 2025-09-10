// Export all models
export { User } from './User.model';
export { Category } from './Category.model';
export { Product } from './Product.model';
export { Customer } from './Customer.model';
export { Sale } from './Sale.model';
export { Inventory } from './Inventory.model';
export { StockMovement } from './StockMovement.model';
export { Supplier } from './Supplier.model';
export { PurchaseOrder } from './PurchaseOrder.model';
export { Delivery } from './Delivery.model';
export { Damage } from './Damage.model';
export { Warranty } from './Warranty.model';
export { WarrantyClaim } from './WarrantyClaim.model';
export { Payment } from './Payment.model';
export { Discount } from './Discount.model';
export { Tax } from './Tax.model';
export { ActivityLog } from './ActivityLog.model';
export { Notification } from './Notification.model';
export { Store } from './Store.model';
export { Settings } from './Settings.model';

// Model names for reference
export const MODEL_NAMES = {
  USER: 'User',
  CATEGORY: 'Category',
  PRODUCT: 'Product',
  CUSTOMER: 'Customer',
  SALE: 'Sale',
  INVENTORY: 'Inventory',
  STOCK_MOVEMENT: 'StockMovement',
  SUPPLIER: 'Supplier',
  PURCHASE_ORDER: 'PurchaseOrder',
  DELIVERY: 'Delivery',
  DAMAGE: 'Damage',
  WARRANTY: 'Warranty',
  WARRANTY_CLAIM: 'WarrantyClaim',
  PAYMENT: 'Payment',
  DISCOUNT: 'Discount',
  TAX: 'Tax',
  ACTIVITY_LOG: 'ActivityLog',
  NOTIFICATION: 'Notification',
  STORE: 'Store',
  SETTINGS: 'Settings'
} as const;
