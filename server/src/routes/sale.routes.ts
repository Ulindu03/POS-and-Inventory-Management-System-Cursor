import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Create/hold/resume sales allowed for POS roles
router.post('/', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), SaleController.create);
router.post('/hold', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), SaleController.hold);
router.get('/resume/:id', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), SaleController.resume);

// Listing and viewing sales restricted to staff roles (could be refined later)
router.get('/', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), SaleController.list);
router.get('/:id', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), SaleController.getById);
// Debug: latest sale for verification (development only)
if ((process.env.NODE_ENV || 'development') !== 'production') {
  router.get('/debug/latest', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), async (_req, res, next) => {
    try {
      const { Sale } = await import('../models/Sale.model');
      const s = await Sale.findOne().sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: { sale: s } });
    } catch (err) {
      return next(err);
    }
  });
}

// Discount validation available to staff
router.post('/validate-discount', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), SaleController.validateDiscount);

// Refunds: admin always; cashier/sales_rep only if permission checked in controller
router.post('/:id/refund', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), SaleController.refund);

export default router;


