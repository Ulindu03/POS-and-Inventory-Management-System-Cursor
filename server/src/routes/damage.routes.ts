import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { listDamages, reportTransitDamage, reportShopReturnDamage, getDamageReasons, getDamageCostReport } from '../controllers/damage.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'sales_rep'), listDamages);
router.get('/reasons', authorize('admin', 'sales_rep'), getDamageReasons);
router.get('/cost-report', authorize('admin', 'sales_rep'), getDamageCostReport);
router.post('/transit', authorize('admin', 'sales_rep'), reportTransitDamage);
router.post('/shop-return', authorize('admin', 'sales_rep'), reportShopReturnDamage);

export default router;
