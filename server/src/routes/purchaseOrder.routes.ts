import express from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  updatePurchaseOrderStatus,
  recordPayment,
  getPurchaseOrderStats,
  receiveItems
} from '../controllers/purchaseOrder.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Purchase Order CRUD operations
router.get('/', getPurchaseOrders);
router.get('/stats', getPurchaseOrderStats);
router.get('/:id', getPurchaseOrderById);
router.post('/', createPurchaseOrder);
router.put('/:id', updatePurchaseOrder);
router.delete('/:id', deletePurchaseOrder);

// Purchase Order status and payment management
router.patch('/:id/status', updatePurchaseOrderStatus);
router.post('/:id/payment', recordPayment);
router.post('/:id/receive', receiveItems);

export default router;
