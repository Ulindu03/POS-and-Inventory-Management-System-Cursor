import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  updateLoyaltyPoints,
  redeemLoyaltyPoints,
  getCustomerStats,
  lookupCustomerByPhone
} from '../controllers/customer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Customer CRUD operations
router.get('/', authorize('admin', 'sales_rep', 'cashier'), getCustomers);
router.get('/stats', authorize('admin'), getCustomerStats);
router.get('/lookup/phone', authorize('admin','sales_rep','cashier'), lookupCustomerByPhone);
router.get('/:id', authorize('admin', 'sales_rep', 'cashier'), getCustomerById);
router.post('/', authorize('admin', 'sales_rep','cashier'), createCustomer);
router.put('/:id', authorize('admin', 'sales_rep', 'cashier'), updateCustomer);
router.delete('/:id', authorize('admin'), deleteCustomer);

// Loyalty points management
router.patch('/:id/loyalty-points', authorize('admin', 'sales_rep', 'cashier'), updateLoyaltyPoints);
router.post('/:id/redeem-points', authorize('admin', 'sales_rep', 'cashier'), redeemLoyaltyPoints);

export default router;
