import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { upload } from '../utils/upload';

const router = Router();

// Public routes (for POS and display)
router.get('/', ProductController.list);
// Utility endpoints (place static path before param path to avoid capture)
router.get('/barcode/generate', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), ProductController.generateBarcode);
router.get('/barcode/:code', ProductController.getByBarcode);
router.get('/stats', authenticate, ProductController.getStats);
router.post('/images', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), upload.single('image'), ProductController.uploadImage);
router.post('/bulk/import', authenticate, authorize('store_owner'), upload.single('file'), ProductController.bulkImport);
router.get('/bulk/export', authenticate, authorize('store_owner'), ProductController.bulkExport);
// Sticker batches
router.post('/stickers/batch', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), ProductController.createStickerBatch);
router.get('/stickers/batch', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), ProductController.getStickerBatch);

// Protected routes (require authentication)
router.get('/:id', authenticate, ProductController.getById);
router.get('/:id/history', authenticate, authorize('store_owner', 'cashier', 'sales_rep'), ProductController.history);

// Store owner-only product management per RBAC
router.post('/', authenticate, authorize('store_owner'), ProductController.create);
router.put('/:id', authenticate, authorize('store_owner'), ProductController.update);
router.delete('/:id', authenticate, authorize('store_owner'), ProductController.delete);
router.patch('/:id/stock', authenticate, authorize('store_owner'), ProductController.updateStock);

export default router;


