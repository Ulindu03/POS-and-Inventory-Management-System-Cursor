import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { upload } from '../utils/upload';

const router = Router();

// Public routes (for POS and display)
router.get('/', ProductController.list);
// Utility endpoints (place static path before param path to avoid capture)
router.get('/barcode/generate', authenticate, authorize('admin', 'cashier', 'sales_rep'), ProductController.generateBarcode);
router.get('/barcode/:code', ProductController.getByBarcode);
router.get('/stats', authenticate, ProductController.getStats);
router.post('/images', authenticate, authorize('admin', 'cashier', 'sales_rep'), upload.single('image'), ProductController.uploadImage);
router.post('/bulk/import', authenticate, authorize('admin'), upload.single('file'), ProductController.bulkImport);
router.get('/bulk/export', authenticate, authorize('admin'), ProductController.bulkExport);
// Sticker batches
router.post('/stickers/batch', authenticate, authorize('admin', 'cashier', 'sales_rep'), ProductController.createStickerBatch);
router.get('/stickers/batch', authenticate, authorize('admin', 'cashier', 'sales_rep'), ProductController.getStickerBatch);

// Protected routes (require authentication)
router.get('/:id', authenticate, ProductController.getById);
router.get('/:id/history', authenticate, authorize('admin', 'cashier', 'sales_rep'), ProductController.history);

// Admin-only product management per RBAC
router.post('/', authenticate, authorize('admin'), ProductController.create);
router.put('/:id', authenticate, authorize('admin'), ProductController.update);
router.delete('/:id', authenticate, authorize('admin'), ProductController.delete);
router.patch('/:id/stock', authenticate, authorize('admin'), ProductController.updateStock);

export default router;


