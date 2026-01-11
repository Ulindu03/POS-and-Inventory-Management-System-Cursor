import { Router } from 'express';
import { UnitBarcode } from '../models/UnitBarcode.model';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// GET /api/barcodes/:barcode - Get full lifecycle info for a barcode
router.get('/:barcode', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { barcode } = req.params;
    
    const record = await UnitBarcode.findOne({ barcode })
      .populate('product', 'name sku barcode price')
      .populate('batch', 'createdAt quantity mode')
      .populate('sale', 'invoiceNo createdAt total')
      .populate('warranty', 'warrantyNo status startDate endDate')
      .populate('return', 'returnNo createdAt status')
      .populate('damage', 'referenceNo type createdAt')
      .populate('customer', 'name phone email')
      .lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Barcode not found'
      });
    }

    return res.json({
      success: true,
      data: record
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/barcodes/product/:productId - Get all barcodes for a product
router.get('/product/:productId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { status, page = 1, limit = 50 } = req.query;

    const query: any = { product: productId };
    if (status) query.status = status;

    const total = await UnitBarcode.countDocuments(query);
    const barcodes = await UnitBarcode.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('sale', 'invoiceNo createdAt')
      .populate('customer', 'name phone')
      .lean();

    return res.json({
      success: true,
      data: {
        barcodes,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/barcodes/customer/:customerId - Get all barcodes for a customer
router.get('/customer/:customerId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { status, page = 1, limit = 50 } = req.query;

    const query: any = { customer: customerId };
    if (status) query.status = status;

    const total = await UnitBarcode.countDocuments(query);
    const barcodes = await UnitBarcode.find(query)
      .sort({ soldAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('product', 'name sku barcode')
      .populate('sale', 'invoiceNo createdAt')
      .populate('warranty', 'warrantyNo status endDate')
      .lean();

    return res.json({
      success: true,
      data: {
        barcodes,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/barcodes/stats - Get barcode statistics
router.get('/stats/overview', authenticate, authorize('store_owner', 'manager', 'admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await UnitBarcode.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts = stats.reduce((acc: any, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const total = await UnitBarcode.countDocuments();

    return res.json({
      success: true,
      data: {
        total,
        byStatus: statusCounts
      }
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
