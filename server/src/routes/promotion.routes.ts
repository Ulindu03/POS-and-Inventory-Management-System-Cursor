import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { PromotionController } from '../controllers/promotion.controller';

const router = Router();

router.get('/', authenticate, authorize('admin'), PromotionController.list);
router.post('/', authenticate, authorize('admin'), PromotionController.create);
router.put('/:id', authenticate, authorize('admin'), PromotionController.update);
router.post('/:id/toggle', authenticate, authorize('admin'), PromotionController.toggle);

export default router;
