import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { ReturnController } from '../controllers/return.controller';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Sales lookup for returns (cashiers, sales reps, managers, admins)
router.post('/lookup', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.lookupSales);

// Validate return before processing
router.post('/validate', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.validateReturn);

// Process returns (sales reps, managers, admins, cashiers)
router.post('/', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.processReturn);

// List and view returns
router.get('/', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.list);
router.get('/:id', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.getById);

// Approve pending returns (managers and admins only)
router.post('/:id/approve', authorize('store_owner', 'manager'), ReturnController.approve);

// Exchange slip operations
router.post('/exchange-slip/redeem', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.redeemExchangeSlip);
router.post('/exchange-slip/:identifier/cancel', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.cancelExchangeSlip);
router.get('/exchange-slip/search', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.searchExchangeSlips);
router.get('/exchange-slip/:slipNo', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.getExchangeSlip);

// Customer overpayment operations
router.get('/customer/:customerId/overpayments', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.getCustomerOverpayments);
router.post('/overpayment/use', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.useOverpayment);

// Customer return history
router.get('/customer/:customerId/history', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.getCustomerHistory);

// Analytics and reporting
router.get('/analytics', authorize('store_owner', 'manager'), ReturnController.getAnalytics);

// Return policy management (admins only)
router.post('/policies', authorize('store_owner'), ReturnController.createPolicy);
router.get('/policies', authorize('store_owner', 'manager', 'sales_rep', 'cashier'), ReturnController.getPolicies);

// Legacy route for backward compatibility
router.post('/legacy', authorize('store_owner', 'sales_rep'), ReturnController.create);

export default router;
