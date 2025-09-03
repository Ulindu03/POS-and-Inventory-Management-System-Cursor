import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getSettings, updateSettings } from '../controllers/settings.controller';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'cashier', 'sales_rep'), getSettings);
router.put('/', authorize('admin'), updateSettings);

export default router;
