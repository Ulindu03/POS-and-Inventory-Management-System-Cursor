import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { TripController } from '../controllers/trip.controller';

const router = Router();

router.use(authenticate);
router.get('/', authorize('admin', 'sales_rep'), TripController.list);
router.post('/', authorize('admin', 'sales_rep'), TripController.create);
router.put('/:id', authorize('admin', 'sales_rep'), TripController.update);
router.post('/:id/load', authorize('admin', 'sales_rep'), TripController.loadManifest);
router.post('/:id/stops/:stopIndex/reconcile', authorize('admin', 'sales_rep'), TripController.reconcileStop);

export default router;
