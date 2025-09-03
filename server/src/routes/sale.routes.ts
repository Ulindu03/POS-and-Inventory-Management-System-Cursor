import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Create/hold/resume sales allowed for POS roles
router.post('/', authenticate, authorize('admin', 'cashier', 'sales_rep'), SaleController.create);
router.post('/hold', authenticate, authorize('admin', 'cashier', 'sales_rep'), SaleController.hold);
router.get('/resume/:id', authenticate, authorize('admin', 'cashier', 'sales_rep'), SaleController.resume);

// Listing and viewing sales restricted to staff roles (could be refined later)
router.get('/', authenticate, authorize('admin', 'cashier', 'sales_rep'), SaleController.list);
router.get('/:id', authenticate, authorize('admin', 'cashier', 'sales_rep'), SaleController.getById);

// Discount validation available to staff
router.post('/validate-discount', authenticate, authorize('admin', 'cashier', 'sales_rep'), SaleController.validateDiscount);

// Refunds restricted to admin and sales_rep (no cashier)
router.post('/:id/refund', authenticate, authorize('admin', 'sales_rep'), SaleController.refund);

export default router;


