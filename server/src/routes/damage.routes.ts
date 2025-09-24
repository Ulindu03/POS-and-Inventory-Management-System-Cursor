import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { listDamages, reportTransitDamage, reportShopReturnDamage, getDamageReasons, getDamageCostReport } from '../controllers/damage.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'cashier', 'sales_rep'), listDamages);
router.get('/reasons', authorize('admin', 'cashier', 'sales_rep'), getDamageReasons);
router.get('/cost-report', authorize('admin', 'cashier', 'sales_rep'), getDamageCostReport);
router.post('/transit', authorize('admin', 'cashier', 'sales_rep'), reportTransitDamage);
router.post('/shop-return', authorize('admin', 'cashier', 'sales_rep'), reportShopReturnDamage);

export default router;
