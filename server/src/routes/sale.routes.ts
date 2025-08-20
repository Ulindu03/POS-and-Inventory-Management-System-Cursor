import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, SaleController.create);
router.get('/', authenticate, SaleController.list);
router.get('/:id', authenticate, SaleController.getById);
router.post('/hold', authenticate, SaleController.hold);
router.get('/resume/:id', authenticate, SaleController.resume);

export default router;


