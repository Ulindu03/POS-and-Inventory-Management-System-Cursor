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

// Reports routes
router.get('/sales', authorize('admin', 'sales_rep'), getSalesReport);
router.get('/inventory', authorize('admin', 'sales_rep'), getInventoryReport);
router.get('/customers', authorize('admin', 'sales_rep'), getCustomerReport);
router.get('/suppliers', authorize('admin', 'sales_rep'), getSupplierReport);
router.get('/profit-loss', authorize('admin', 'sales_rep'), getProfitLossReport);
router.get('/stock-movements', authorize('admin', 'sales_rep'), getStockMovementReport);
router.get('/top-products', authorize('admin', 'sales_rep'), getTopProductsReport);
router.get('/staff-performance', authorize('admin', 'sales_rep'), getStaffPerformanceReport);
router.get('/delivery-performance', authorize('admin', 'sales_rep'), getDeliveryPerformanceReport);
router.get('/inventory-turnover', authorize('admin', 'sales_rep'), getInventoryTurnoverReport);
// Export (excel/pdf)
router.get('/export', authorize('admin', 'sales_rep'), exportReport);

export default router;
