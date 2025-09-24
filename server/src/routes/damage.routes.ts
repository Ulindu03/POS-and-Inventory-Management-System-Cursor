import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { listDamages, reportTransitDamage, reportShopReturnDamage, getDamageReasons, getDamageCostReport } from '../controllers/damage.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize('store_owner', 'cashier', 'sales_rep'), listDamages);
router.get('/reasons', authorize('store_owner', 'cashier', 'sales_rep'), getDamageReasons);
router.get('/cost-report', authorize('store_owner', 'cashier', 'sales_rep'), getDamageCostReport);
router.post('/transit', authorize('store_owner', 'cashier', 'sales_rep'), reportTransitDamage);
router.post('/shop-return', authorize('store_owner', 'cashier', 'sales_rep'), reportShopReturnDamage);

export default router;
