import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';

const router = Router();

router.get('/', ProductController.list);
router.get('/barcode/:code', ProductController.getByBarcode);

export default router;


