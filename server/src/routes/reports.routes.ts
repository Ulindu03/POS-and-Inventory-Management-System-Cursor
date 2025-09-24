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

// Reports routes - sales reports accessible to cashier and sales_rep, others store_owner only
router.get('/sales', authorize('store_owner', 'cashier', 'sales_rep'), getSalesReport);
router.get('/inventory', authorize('store_owner'), getInventoryReport);
router.get('/customers', authorize('store_owner'), getCustomerReport);
router.get('/suppliers', authorize('store_owner'), getSupplierReport);
router.get('/profit-loss', authorize('store_owner'), getProfitLossReport);
router.get('/stock-movements', authorize('store_owner'), getStockMovementReport);
router.get('/top-products', authorize('store_owner'), getTopProductsReport);
router.get('/staff-performance', authorize('store_owner'), getStaffPerformanceReport);
router.get('/delivery-performance', authorize('store_owner'), getDeliveryPerformanceReport);
router.get('/inventory-turnover', authorize('store_owner'), getInventoryTurnoverReport);
// Export (excel/pdf) - store_owner only
router.get('/export', authorize('store_owner'), exportReport);

export default router;
