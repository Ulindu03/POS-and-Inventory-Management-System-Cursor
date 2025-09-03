import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  updateLoyaltyPoints,
  redeemLoyaltyPoints,
  getCustomerStats
} from '../controllers/customer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Customer CRUD operations
router.get('/', authorize('admin', 'sales_rep'), getCustomers);
router.get('/stats', authorize('admin', 'sales_rep'), getCustomerStats);
router.get('/:id', authorize('admin', 'sales_rep'), getCustomerById);
router.post('/', authorize('admin', 'sales_rep'), createCustomer);
router.put('/:id', authorize('admin', 'sales_rep'), updateCustomer);
router.delete('/:id', authorize('admin'), deleteCustomer);

// Loyalty points management
router.patch('/:id/loyalty-points', authorize('admin', 'sales_rep'), updateLoyaltyPoints);
router.post('/:id/redeem-points', authorize('admin', 'sales_rep'), redeemLoyaltyPoints);

export default router;
