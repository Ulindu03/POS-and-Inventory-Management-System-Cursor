import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { listDeliveries, createDelivery, getDelivery, updateDelivery, updateDeliveryStatus, uploadStopProof, uploadStopSignature, setStopMedia } from '../controllers/delivery.controller';
import { cache } from '../middleware/cache.middleware';
import { upload } from '../utils/upload';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'sales_rep'), cache(20), listDeliveries);
router.post('/', authorize('admin', 'sales_rep'), createDelivery);
router.get('/:id', authorize('admin', 'sales_rep'), getDelivery);
router.put('/:id', authorize('admin', 'sales_rep'), updateDelivery);
router.patch('/:id/status', authorize('admin', 'sales_rep'), updateDeliveryStatus);
router.post('/:id/shops/:shopId/proof', authorize('admin', 'sales_rep'), upload.single('file'), uploadStopProof);
router.post('/:id/shops/:shopId/signature', authorize('admin', 'sales_rep'), upload.single('file'), uploadStopSignature);
router.put('/:id/shops/:shopId/media', authorize('admin', 'sales_rep'), setStopMedia);

export default router;
