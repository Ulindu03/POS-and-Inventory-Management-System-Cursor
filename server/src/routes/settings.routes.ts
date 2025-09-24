import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getSettings, updateSettings } from '../controllers/settings.controller';

const router = Router();

router.use(authenticate);

router.get('/', authorize('store_owner'), getSettings);
router.put('/', authorize('store_owner'), updateSettings);

export default router;
