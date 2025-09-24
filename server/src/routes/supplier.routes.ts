import express from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierStats,
  updateSupplierPerformance
} from '../controllers/supplier.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Supplier CRUD operations
router.get('/', authorize('store_owner', 'sales_rep'), getSuppliers);
router.get('/stats', authorize('store_owner', 'sales_rep'), getSupplierStats);
router.get('/:id', authorize('store_owner', 'sales_rep'), getSupplierById);
router.post('/', authorize('store_owner', 'sales_rep'), createSupplier);
router.put('/:id', authorize('store_owner', 'sales_rep'), updateSupplier);
router.delete('/:id', authorize('store_owner'), deleteSupplier);

// Supplier performance management
router.patch('/:id/performance', authorize('store_owner', 'sales_rep'), updateSupplierPerformance);

export default router;
