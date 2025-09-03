import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Inventory insights should not be public; restrict to admin and sales_rep
router.get('/low-stock', authenticate, authorize('admin', 'sales_rep'), InventoryController.lowStock);
router.get('/reorder-suggestions', authenticate, authorize('admin', 'sales_rep'), InventoryController.reorderSuggestions);

export default router;
