import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { ReturnController } from '../controllers/return.controller';

const router = Router();

router.post('/', authenticate, authorize('admin', 'sales_rep'), ReturnController.create);

export default router;
