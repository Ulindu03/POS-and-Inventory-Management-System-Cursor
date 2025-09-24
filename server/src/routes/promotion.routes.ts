import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { PromotionController } from '../controllers/promotion.controller';

const router = Router();

router.get('/', authenticate, authorize('store_owner'), PromotionController.list);
router.post('/', authenticate, authorize('store_owner'), PromotionController.create);
router.put('/:id', authenticate, authorize('store_owner'), PromotionController.update);
router.post('/:id/toggle', authenticate, authorize('store_owner'), PromotionController.toggle);

export default router;
