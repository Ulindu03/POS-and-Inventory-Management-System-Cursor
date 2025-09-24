import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Inventory insights - view access for cashier and sales_rep, full access for admin
router.get('/low-stock', authenticate, authorize('admin', 'cashier', 'sales_rep'), InventoryController.lowStock);
router.get('/reorder-suggestions', authenticate, authorize('admin', 'cashier', 'sales_rep'), InventoryController.reorderSuggestions);

export default router;
