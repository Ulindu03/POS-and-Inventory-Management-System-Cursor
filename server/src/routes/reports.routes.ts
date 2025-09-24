import express from 'express';
import {
  getSalesReport,
  getInventoryReport,
  getCustomerReport,
  getSupplierReport,
  getProfitLossReport,
  getStockMovementReport,
  getTopProductsReport,
  getStaffPerformanceReport,
  getDeliveryPerformanceReport,
  getInventoryTurnoverReport,
} from '../controllers/reports.controller';
import { exportReport } from '../controllers/reportExport.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Reports routes - sales reports accessible to cashier and sales_rep, others admin only
router.get('/sales', authorize('admin', 'cashier', 'sales_rep'), getSalesReport);
router.get('/inventory', authorize('admin'), getInventoryReport);
router.get('/customers', authorize('admin'), getCustomerReport);
router.get('/suppliers', authorize('admin'), getSupplierReport);
router.get('/profit-loss', authorize('admin'), getProfitLossReport);
router.get('/stock-movements', authorize('admin'), getStockMovementReport);
router.get('/top-products', authorize('admin'), getTopProductsReport);
router.get('/staff-performance', authorize('admin'), getStaffPerformanceReport);
router.get('/delivery-performance', authorize('admin'), getDeliveryPerformanceReport);
router.get('/inventory-turnover', authorize('admin'), getInventoryTurnoverReport);
// Export (excel/pdf) - admin only
router.get('/export', authorize('admin'), exportReport);

export default router;
