import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public routes (for displaying in product lists)
router.get('/', CategoryController.list);
router.get('/stats', authenticate, CategoryController.getStats);

// Protected routes
router.get('/:id', authenticate, CategoryController.getById);

// Admin only routes
router.post('/', authenticate, authorize('admin', 'sales_rep'), CategoryController.create);
router.put('/:id', authenticate, authorize('admin', 'sales_rep'), CategoryController.update);
router.delete('/:id', authenticate, authorize('admin'), CategoryController.delete);

export default router;


