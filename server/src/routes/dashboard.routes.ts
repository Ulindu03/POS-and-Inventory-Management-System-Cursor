import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getDashboardStats, getSalesChart, getTopProducts, getCategoryDistribution, getRecentSales } from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);

// All authenticated roles may view the dashboard widgets
router.get('/stats', getDashboardStats);
router.get('/sales-chart', getSalesChart);
router.get('/top-products', getTopProducts);
router.get('/category-distribution', getCategoryDistribution);
router.get('/recent-sales', getRecentSales);

export default router;


