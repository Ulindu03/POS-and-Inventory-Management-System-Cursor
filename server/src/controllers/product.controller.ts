import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product.model';
import { Settings } from '../models/Settings.model';
import { StickerBatch } from '../models/StickerBatch.model';
import { UnitBarcode } from '../models/UnitBarcode.model';
import { Category } from '../models/Category.model';
import { Inventory } from '../models/Inventory.model';
import { StockMovement } from '../models/StockMovement.model';
import { Sale } from '../models/Sale.model';
import { PurchaseOrder } from '../models/PurchaseOrder.model';
import { emit as emitRealtime } from '../services/realtime.service';
import fs from 'fs';
import { getPublicUrl } from '../utils/upload';

type DiscountStatus = 'disabled' | 'scheduled' | 'active' | 'expired';

interface DiscountSnapshot {
  status: DiscountStatus;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
  finalPrice: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isEnabled: boolean;
}

const evaluateDiscount = (product: any): DiscountSnapshot | null => {
  const raw = product?.discount;
  const baseRetail = Number(product?.price?.retail ?? 0);
  if (!raw || raw.isEnabled === false) {
    return raw ? {
      status: 'disabled',
      type: raw.type || 'percentage',
      value: Number(raw.value || 0),
      amount: 0,
      finalPrice: baseRetail,
      startsAt: raw.startAt ? new Date(raw.startAt) : null,
      endsAt: raw.endAt ? new Date(raw.endAt) : null,
      isEnabled: false,
    } : null;
  }
  const start = raw.startAt ? new Date(raw.startAt) : null;
  const end = raw.endAt ? new Date(raw.endAt) : null;
  const now = new Date();
  let status: DiscountStatus = 'scheduled';
  if (start && now < start) status = 'scheduled';
  else if (end && now > end) status = 'expired';
  else status = 'active';

  const type = raw.type === 'fixed' ? 'fixed' : 'percentage';
  let amount = 0;
  if (type === 'percentage') {
    amount = (baseRetail * Number(raw.value || 0)) / 100;
  } else {
    amount = Number(raw.value || 0);
  }
  amount = Math.max(0, Math.min(amount, baseRetail));
  const finalPrice = Math.max(0, baseRetail - amount);

  return {
    status: raw.isEnabled ? status : 'disabled',
    type,
    value: Number(raw.value || 0),
    amount,
    finalPrice,
    startsAt: start,
    endsAt: end,
    isEnabled: Boolean(raw.isEnabled),
  };
};

interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    email: string;
    role: string;
  };
}

export class ProductController {
  // List products with filtering and pagination
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, category, limit = '24', page = '1', includeInactive = 'false' } = req.query as Record<string, string>;
      const filters: any = includeInactive === 'true' ? {} : { isActive: true };
      
      if (category) filters.category = category;
      if (q) {
        filters.$or = [
          { 'name.en': { $regex: q, $options: 'i' } },
          { 'name.si': { $regex: q, $options: 'i' } },
          { sku: { $regex: q, $options: 'i' } },
          { barcode: { $regex: q, $options: 'i' } },
        ];
      }

      const take = Math.min(parseInt(limit, 10) || 24, 100);
      const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

      const [productsRaw, total] = await Promise.all([
        Product.find(filters)
          .populate('category', 'name')
          .populate('supplier', 'name supplierCode')
          .select('sku barcode name description price stock discount category supplier images brand unit isActive createdAt updatedAt warranty')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(take)
          .lean(),
        Product.countDocuments(filters),
      ]);

      // Attach inventory snapshot so client can rely on Inventory as source of truth
      const ids = productsRaw.map((p: any) => p._id);
      const invList = await Inventory.find({ product: { $in: ids } })
        .select('product currentStock minimumStock reorderPoint reservedStock availableStock')
        .lean();
      const invMap = new Map(invList.map((i: any) => [String(i.product), i]));
      const items = productsRaw.map((p: any) => {
        const inv = invMap.get(String(p._id));
        const withInventory = (() => {
          if (!inv) return { ...p };
          const merged = { ...p } as any;
          // Add inventory snapshot
          merged.inventory = {
            currentStock: inv.currentStock ?? 0,
            minimumStock: inv.minimumStock ?? 0,
            reorderPoint: inv.reorderPoint ?? 0,
            reservedStock: inv.reservedStock ?? 0,
            availableStock: inv.availableStock ?? Math.max((inv.currentStock ?? 0) - (inv.reservedStock ?? 0), 0)
          };
          // Override stock fields to reflect inventory (combine details)
          merged.stock = merged.stock || {};
          merged.stock.current = merged.inventory.currentStock;
          merged.stock.minimum = merged.inventory.minimumStock;
          merged.stock.reorderPoint = merged.inventory.reorderPoint;
          // Provide a single effectiveStock field too
          merged.effectiveStock = {
            current: merged.inventory.currentStock,
            minimum: merged.inventory.minimumStock,
            reorderPoint: merged.inventory.reorderPoint,
            reserved: merged.inventory.reservedStock,
            available: merged.inventory.availableStock,
          };
          return merged;
        })();

        const snapshot = evaluateDiscount(withInventory);
        const baseRetail = Number(withInventory?.price?.retail ?? 0);
        if (withInventory.discount) {
          withInventory.discount = {
            isEnabled: Boolean(withInventory.discount.isEnabled),
            type: withInventory.discount.type === 'fixed' ? 'fixed' : 'percentage',
            value: Number(withInventory.discount.value || 0),
            startAt: withInventory.discount.startAt || null,
            endAt: withInventory.discount.endAt || null,
            notes: withInventory.discount.notes || '',
            status: snapshot?.status ?? (withInventory.discount.isEnabled ? 'scheduled' : 'disabled'),
            amount: snapshot?.amount ?? 0,
            finalPrice: snapshot?.finalPrice ?? baseRetail,
            createdBy: withInventory.discount.createdBy || null,
            updatedBy: withInventory.discount.updatedBy || null,
            createdAt: withInventory.discount.createdAt || null,
            updatedAt: withInventory.discount.updatedAt || null,
          };
        } else {
          withInventory.discount = snapshot ? {
            isEnabled: snapshot.isEnabled,
            type: snapshot.type,
            value: snapshot.value,
            startAt: snapshot.startsAt ?? null,
            endAt: snapshot.endsAt ?? null,
            notes: '',
            status: snapshot.status,
            amount: snapshot.amount,
            finalPrice: snapshot.finalPrice,
            createdBy: null,
            updatedBy: null,
            createdAt: null,
            updatedAt: null,
          } : null;
        }

        withInventory.pricing = {
          base: baseRetail,
          final: snapshot?.finalPrice ?? baseRetail,
          discountAmount: snapshot?.amount ?? 0,
          status: snapshot?.status ?? (withInventory.discount?.isEnabled ? withInventory.discount.status : 'none'),
          hasActiveDiscount: snapshot?.status === 'active',
        };

        return withInventory;
      });

  return res.json({ success: true, data: { items, total, page: parseInt(page, 10) || 1, limit: take } });
    } catch (err) {
      return next(err);
    }
  }

  // Generate a unique EAN-13 compatible barcode
  static async generateBarcode(_req: Request, res: Response, next: NextFunction) {
    try {
      // Generate 12-digit base then compute checksum (EAN-13)
      const generateCandidate = () => {
        const base = (Date.now().toString() + Math.floor(Math.random() * 1e6).toString())
          .replace(/\D/g, '')
          .slice(-12)
          .padStart(12, '0');

        const digits = base.split('').map((d) => parseInt(d, 10));
        // checksum: (10 - ((sum_odd + 3*sum_even) % 10)) % 10
        let sumOdd = 0; // positions 1,3,5,... (index 0-based even)
        let sumEven = 0; // positions 2,4,6,... (index 0-based odd)
        digits.forEach((d, i) => {
          if (i % 2 === 0) sumOdd += d; else sumEven += d;
        });
        const checksum = (10 - ((sumOdd + sumEven * 3) % 10)) % 10;
        return base + checksum.toString();
      };

      let tries = 0;
      let barcode = generateCandidate();
      // ensure uniqueness
      // try a few times to avoid rare collisions
      // eslint-disable-next-line no-constant-condition
      while (tries < 5) {
        const exists = await Product.exists({ barcode });
        if (!exists) break;
        barcode = generateCandidate();
        tries += 1;
      }

      return res.json({ success: true, data: { barcode } });
    } catch (err) {
      return next(err);
    }
  }

  // Create a sticker batch and return preview payload
  static async createStickerBatch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { productId, quantity, layout, mode } = req.body;
      if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'productId and positive quantity required' });
      }

      const product = await Product.findById(productId).select('name price barcode');
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      const settings = await Settings.findOne();
      const effectiveMode = mode || settings?.stickers?.barcodeMode || 'reuse_product_barcode';

      const barcodes: string[] = [];
      if (effectiveMode === 'reuse_product_barcode') {
        if (!product.barcode) {
          // generate a product barcode if missing
          const gen = await ProductController.generateBarcodeDirect();
          product.barcode = gen;
          await product.save();
        }
  for (let i = 0; i < quantity; i++) barcodes.push(product.barcode || '');
      } else {
        // unique per unit
        for (let i = 0; i < quantity; i++) {
          const gen = await ProductController.generateBarcodeDirect();
          barcodes.push(gen);
        }
      }

      const batch = await StickerBatch.create({
        product: product._id,
        quantity,
        layout: layout || {},
        mode: effectiveMode,
  barcodes,
  createdBy: (req.user as any)?.userId,
      });

      if (effectiveMode === 'unique_per_unit') {
        // Persist unit barcodes
        const docs = barcodes.map((b) => ({ barcode: b, product: product._id, batch: batch._id }));
        // Use insertMany with ordered: false to skip duplicates if any
        await UnitBarcode.insertMany(docs, { ordered: false }).catch(() => undefined);
      }

      return res.json({ success: true, data: { batchId: batch._id, product: { name: product.name, price: product.price, barcode: product.barcode }, barcodes } });
    } catch (error) {
      return next(error);
    }
  }

  // Helper to generate a unique barcode value without HTTP
  private static async generateBarcodeDirect(): Promise<string> {
    function checksum12(digits: string) {
      const sum = digits
        .split('')
        .map((d) => parseInt(d, 10))
        .reduce((acc, n, idx) => acc + (idx % 2 === 0 ? n : n * 3), 0);
      const mod = sum % 10;
      return mod === 0 ? '0' : String(10 - mod);
    }
    function generateCandidate() {
      const base = '200' + Math.floor(1_000_000_000 + Math.random() * 8_999_999_999).toString();
      return base + checksum12(base);
    }
    let barcode = generateCandidate();
    // ensure uniqueness against Product and UnitBarcode
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      const exists = (await Product.exists({ barcode })) || (await UnitBarcode.exists({ barcode }));
      if (!exists) break;
      barcode = generateCandidate();
    }
    return barcode;
  }

  // Reprint: fetch last batch or by id
  static async getStickerBatch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { batchId, productId } = req.query as any;
      let batch;
      if (batchId) {
        batch = await StickerBatch.findById(batchId).populate('product', 'name price barcode');
      } else if (productId) {
        batch = await StickerBatch.findOne({ product: productId }).sort({ createdAt: -1 }).populate('product', 'name price barcode');
      }
      if (!batch) return res.status(404).json({ success: false, message: 'Sticker batch not found' });
      return res.json({ success: true, data: batch });
    } catch (error) {
      return next(error);
    }
  }

  // Handle product image upload (via multer)
  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const file = (req as Request & { file?: { filename: string; path: string } }).file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      const url = getPublicUrl(file.filename);
      return res.json({ success: true, data: { url, filename: file.filename } });
    } catch (err) {
      return next(err);
    }
  }

  private static parseCsv(content: string) {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { header: [] as string[], rows: [] as string[][] };
    const header = lines[0].split(',').map((h) => h.trim());
    const rows = lines.slice(1).map((l) => l.split(',').map((c) => c.trim()));
    return { header, rows };
  }

  private static async resolveCategoryId(input: string) {
    if (!input) return '';
    const byId = await Category.findById(input);
    if (byId) return byId._id.toString();
    const byName = await Category.findOne({ 'name.en': input });
    return byName ? byName._id.toString() : '';
  }

  private static async processImportRow(row: string[], col: { sku: number; barcode: number; name_en: number; name_si: number; category: number; unit: number; price_cost: number; price_retail: number; stock_current: number; brand: number; }) {
    const get = (ix: number) => (ix >= 0 && ix < row.length ? row[ix] : '');
    const sku = get(col.sku);
    if (!sku) return 'failed' as const;
    const categoryId = await ProductController.resolveCategoryId(get(col.category));
    if (!categoryId) return 'failed' as const;

    const existing = await Product.findOne({ $or: [ { sku }, ...(get(col.barcode) ? [{ barcode: get(col.barcode) }] : []) ] });
    const payload: any = {
      sku,
      barcode: get(col.barcode) || undefined,
      name: { en: get(col.name_en) || sku, si: get(col.name_si) || get(col.name_en) || sku },
      description: { en: '', si: '' },
      category: categoryId,
      brand: get(col.brand) || undefined,
      unit: get(col.unit) || 'pcs',
      price: {
        cost: parseFloat(get(col.price_cost) || '0') || 0,
        retail: parseFloat(get(col.price_retail) || '0') || 0,
      },
      stock: { current: parseInt(get(col.stock_current) || '0', 10) || 0 },
      images: [],
      isActive: true,
    };

    if (existing) {
      await Product.updateOne({ _id: existing._id }, { $set: payload, updatedAt: new Date() });
      return 'updated' as const;
    }
    await Product.create(payload);
    return 'created' as const;
  }

  // Bulk import products from a simple CSV (header required). Minimal parser (no quoted commas).
  static async bulkImport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = (req as Request & { file?: { filename: string; path: string } }).file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      const content = fs.readFileSync(file.path, 'utf8');
      const { header, rows } = ProductController.parseCsv(content);
      if (rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Empty CSV file' });
      }
      const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
      const col = {
        sku: idx('sku'),
        barcode: idx('barcode'),
        name_en: idx('name_en'),
        name_si: idx('name_si'),
        category: idx('category'), // id or english name
        unit: idx('unit'),
        price_cost: idx('price_cost'),
        price_retail: idx('price_retail'),
        stock_current: idx('stock_current'),
        brand: idx('brand'),
      } as const;

      let created = 0, updated = 0, failed = 0;
      for (const raw of rows) {
        try {
          const result = await ProductController.processImportRow(raw, col);
          if (result === 'created') created += 1;
          else if (result === 'updated') updated += 1;
          else failed += 1;
        } catch { failed += 1; }
      }

      return res.json({ success: true, message: 'Import completed', data: { created, updated, failed } });
    } catch (err) {
      return next(err);
    }
  }

  // Bulk export products to CSV
  static async bulkExport(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await Product.find({}).populate('category', 'name');
      const header = [
        'sku','barcode','name_en','name_si','category','unit','price_cost','price_retail','stock_current','brand'
      ];
      const rows = [header.join(',')];
      for (const p of items) {
        const row = [
          p.sku || '',
          p.barcode || '',
          (p as any).name?.en || '',
          (p as any).name?.si || '',
          ((p as any).category?.name?.en) || '',
          p.unit || 'pcs',
          (p as any).price?.cost ?? 0,
          (p as any).price?.retail ?? 0,
          (p as any).stock?.current ?? 0,
          p.brand || ''
        ].map(String);
        rows.push(row.join(','));
      }
      const csv = rows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="products-export.csv"');
      return res.send(csv);
    } catch (err) {
      return next(err);
    }
  }
  // Get single product by ID
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id)
        .populate('category', 'name color')
        .populate('supplier', 'name supplierCode contactPerson phone email');
      
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Get inventory data
      const inventory = await Inventory.findOne({ product: id });

    const payload = product.toObject() as any;
      if (inventory) {
        payload.inventory = inventory;
      }
      const snapshot = evaluateDiscount(payload);
      const baseRetail = Number(payload?.price?.retail ?? 0);
      if (payload.discount) {
        payload.discount = {
          isEnabled: Boolean(payload.discount.isEnabled),
          type: payload.discount.type === 'fixed' ? 'fixed' : 'percentage',
          value: Number(payload.discount.value || 0),
          startAt: payload.discount.startAt || null,
          endAt: payload.discount.endAt || null,
          notes: payload.discount.notes || '',
          status: snapshot?.status ?? (payload.discount.isEnabled ? 'scheduled' : 'disabled'),
          amount: snapshot?.amount ?? 0,
          finalPrice: snapshot?.finalPrice ?? baseRetail,
          createdBy: payload.discount.createdBy || null,
          updatedBy: payload.discount.updatedBy || null,
          createdAt: payload.discount.createdAt || null,
          updatedAt: payload.discount.updatedAt || null,
        };
      } else if (snapshot) {
        payload.discount = {
          isEnabled: snapshot.isEnabled,
          type: snapshot.type,
          value: snapshot.value,
          startAt: snapshot.startsAt ?? null,
          endAt: snapshot.endsAt ?? null,
          notes: '',
          status: snapshot.status,
          amount: snapshot.amount,
          finalPrice: snapshot.finalPrice,
          createdBy: null,
          updatedBy: null,
          createdAt: null,
          updatedAt: null,
        };
      }

      payload.pricing = {
        base: baseRetail,
        final: snapshot?.finalPrice ?? baseRetail,
        discountAmount: snapshot?.amount ?? 0,
        status: snapshot?.status ?? (payload.discount?.isEnabled ? payload.discount.status : 'none'),
        hasActiveDiscount: snapshot?.status === 'active',
      };

      return res.json({ 
        success: true, 
        data: { 
          product: payload
        }
      });
    } catch (err) {
  return next(err);
    }
  }

  // Get product by barcode
  static async getByBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params as { code: string };
      const product = await Product.findOne({ barcode: code, isActive: true })
        .select('sku barcode name price stock discount images');
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const payload = product.toObject() as any;
      const snapshot = evaluateDiscount(payload);
      const baseRetail = Number(payload?.price?.retail ?? 0);

      if (payload.discount) {
        payload.discount = {
          isEnabled: Boolean(payload.discount.isEnabled),
          type: payload.discount.type === 'fixed' ? 'fixed' : 'percentage',
          value: Number(payload.discount.value || 0),
          startAt: payload.discount.startAt || null,
          endAt: payload.discount.endAt || null,
          notes: payload.discount.notes || '',
          status: snapshot?.status ?? (payload.discount.isEnabled ? 'scheduled' : 'disabled'),
          amount: snapshot?.amount ?? 0,
          finalPrice: snapshot?.finalPrice ?? baseRetail,
        };
      }

      payload.pricing = {
        base: baseRetail,
        final: snapshot?.finalPrice ?? baseRetail,
        discountAmount: snapshot?.amount ?? 0,
        status: snapshot?.status ?? (payload.discount?.isEnabled ? payload.discount.status : 'none'),
        hasActiveDiscount: snapshot?.status === 'active',
      };

      return res.json({ success: true, data: { product: payload } });
    } catch (err) {
  return next(err);
    }
  }

  static async upsertDiscount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { type, value, startAt, endAt, notes, isEnabled = true } = req.body as any;

      if (!['percentage', 'fixed'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Invalid discount type' });
      }

      const numericValue = Number(value);
      if (Number.isNaN(numericValue) || numericValue <= 0) {
        return res.status(400).json({ success: false, message: 'Discount value must be greater than 0' });
      }

      if (!startAt || !endAt) {
        return res.status(400).json({ success: false, message: 'Start and end dates are required' });
      }

      const start = new Date(startAt);
      const end = new Date(endAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date range' });
      }

      if (start >= end) {
        return res.status(400).json({ success: false, message: 'End date must be after start date' });
      }

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const now = new Date();
      const existing = (product as any).discount || {};

      (product as any).discount = {
        isEnabled: Boolean(isEnabled),
        type,
        value: numericValue,
        startAt: start,
        endAt: end,
        notes: typeof notes === 'string' ? notes.slice(0, 500) : existing.notes || '',
        createdBy: existing.createdBy || req.user?.userId || null,
        updatedBy: req.user?.userId || null,
        createdAt: existing.createdAt || now,
        updatedAt: now,
      };

      await product.save();

    const payload = product.toObject() as any;
      const snapshot = evaluateDiscount(payload);
      const baseRetail = Number(payload?.price?.retail ?? 0);
      const responseDiscount = {
        isEnabled: Boolean((payload as any).discount?.isEnabled),
        type: (payload as any).discount?.type === 'fixed' ? 'fixed' : 'percentage',
        value: Number((payload as any).discount?.value || 0),
        startAt: (payload as any).discount?.startAt || null,
        endAt: (payload as any).discount?.endAt || null,
        notes: (payload as any).discount?.notes || '',
        status: snapshot?.status ?? ((payload as any).discount?.isEnabled ? 'scheduled' : 'disabled'),
        amount: snapshot?.amount ?? 0,
        finalPrice: snapshot?.finalPrice ?? baseRetail,
        createdBy: (payload as any).discount?.createdBy || null,
        updatedBy: (payload as any).discount?.updatedBy || null,
        createdAt: (payload as any).discount?.createdAt || null,
        updatedAt: (payload as any).discount?.updatedAt || null,
      };

      return res.json({
        success: true,
        message: 'Discount updated',
        data: {
          discount: responseDiscount,
          pricing: {
            base: baseRetail,
            final: snapshot?.finalPrice ?? baseRetail,
            discountAmount: snapshot?.amount ?? 0,
            status: snapshot?.status ?? responseDiscount.status,
            hasActiveDiscount: snapshot?.status === 'active',
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  static async removeDiscount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      product.set('discount', undefined);
      await product.save();

      return res.json({ success: true, message: 'Discount removed', data: { discount: null } });
    } catch (error) {
      return next(error);
    }
  }

  static async discountSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const products = await Product.find({ 'discount.isEnabled': { $in: [true] } })
        .select('price discount');

      let activeCount = 0;
      let totalValue = 0;
      let expiringSoon = 0;

      products.forEach((doc: any) => {
        const snapshot = evaluateDiscount(doc);
        if (!snapshot) return;
        if (snapshot.status === 'active') {
          activeCount += 1;
          totalValue += snapshot.amount;
          if (snapshot.endsAt && snapshot.endsAt >= now) {
            const diff = snapshot.endsAt.getTime() - now.getTime();
            if (diff <= 7 * 24 * 60 * 60 * 1000) {
              expiringSoon += 1;
            }
          }
        }
      });

      return res.json({
        success: true,
        data: {
          totalDiscountedProducts: activeCount,
          activeDiscounts: activeCount,
          totalDiscountValue: Number(totalValue.toFixed(2)),
          expiringSoon,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  // Product purchase & sales history
  static async history(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { startDate, endDate, limit = '50' } = req.query as any;
      const start = startDate ? new Date(String(startDate)) : new Date(0);
      const end = endDate ? new Date(String(endDate)) : new Date();
      const take = Math.min(parseInt(String(limit), 10) || 50, 200);

      // Recent sales containing this product
      const sales = await Sale.find({
        'items.product': id,
        createdAt: { $gte: start, $lte: end },
      })
        .select('invoiceNo createdAt items cashier total')
        .sort({ createdAt: -1 })
        .limit(take)
        .lean();
      // Map sale lines to this product only
      let saleLines = sales.flatMap((s: any) => (s.items || [])
        .filter((it: any) => String(it.product) === String(id))
        .map((it: any) => ({
          invoiceNo: s.invoiceNo,
          date: s.createdAt,
          quantity: it.quantity,
          unitPrice: it.price,
          discount: it.discount || 0,
          lineTotal: it.total,
        }))
      );

      // Fallback via stock movements → sale lookup (in case of projection/shape differences)
      if (saleLines.length === 0) {
        try {
          const moves = await StockMovement.find({
            product: id,
            type: 'sale',
            createdAt: { $gte: start, $lte: end },
          })
            .select('referenceId reference createdAt quantity')
            .sort({ createdAt: -1 })
            .limit(take)
            .lean();
          const saleIds = Array.from(new Set((moves || []).map((m: any) => String(m.referenceId)).filter(Boolean)));
          if (saleIds.length) {
            const saleDocs = await Sale.find({ _id: { $in: saleIds } })
              .select('invoiceNo createdAt items')
              .lean();
            const byId = new Map(saleDocs.map((d: any) => [String(d._id), d]));
            saleLines = saleIds.flatMap((sid: string) => {
              const s = byId.get(sid);
              if (!s) return [] as any[];
              return (s.items || [])
                .filter((it: any) => String(it.product) === String(id))
                .map((it: any) => ({
                  invoiceNo: s.invoiceNo,
                  date: s.createdAt,
                  quantity: it.quantity,
                  unitPrice: it.price,
                  discount: it.discount || 0,
                  lineTotal: it.total,
                }));
            });
          }
        } catch {}
      }

      // Recent purchases (PO items) containing this product
      const purchases = await PurchaseOrder.find({
        'items.product': id,
        orderDate: { $gte: start, $lte: end },
      })
        .select('poNumber orderDate items supplier')
        .populate('supplier', 'name supplierCode')
        .sort({ orderDate: -1 })
        .limit(take)
        .lean();
      const purchaseLines = purchases.flatMap((p: any) => (p.items || [])
        .filter((it: any) => String(it.product) === String(id))
        .map((it: any) => ({
          poNumber: p.poNumber,
          date: p.orderDate,
          supplier: p.supplier,
          quantity: it.quantity,
          unitCost: it.unitCost,
          lineCost: it.totalCost,
        }))
      );

      // Summary totals
      const purchasedQty = purchaseLines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
      const purchasedCost = purchaseLines.reduce((s, l) => s + (Number(l.lineCost) || 0), 0);
      const soldQty = saleLines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
      const revenue = saleLines.reduce((s, l) => s + (Number(l.lineTotal) || 0), 0);

      return res.json({
        success: true,
        data: {
          summary: {
            purchasedQty,
            purchasedCost,
            soldQty,
            revenue,
          },
          purchases: purchaseLines,
          sales: saleLines,
        },
      });
    } catch (err) {
      return next(err);
    }
  }

  // Create new product
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        sku,
        barcode,
        name,
        description,
        category,
        brand,
        unit,
        price,
        stock,
        specifications,
        images,
        supplier,
        tags,
        minimumStock,
  reorderPoint,
  // optional: auto-generate barcodes for a quantity of units right after creation
  generateStickers
  , warranty
      } = req.body;

      // Normalize optional fields
      const cleanBarcode: string | undefined = typeof barcode === 'string' && barcode.trim() !== '' ? barcode.trim() : undefined;
      const cleanBrand: string | undefined = typeof brand === 'string' && brand.trim() !== '' ? brand.trim() : undefined;
      const cleanSupplier: string | undefined = (typeof supplier === 'string' && supplier.trim() !== '') ? supplier.trim() : undefined;

      // Validate category id format early to avoid cast errors
      const { default: mongoose } = await import('mongoose');
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ success: false, message: 'Invalid category id' });
      }

      // Check if SKU or barcode already exists
      const existingProduct = await Product.findOne({
        $or: [
          { sku },
          ...(cleanBarcode ? [{ barcode: cleanBarcode }] : [])
        ]
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Product with this SKU or barcode already exists'
        });
      }

      // Verify category exists
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Create product
      const product = new Product({
        sku,
        barcode: cleanBarcode,
        name,
        description,
        category,
        brand: cleanBrand,
        unit: unit || 'pcs',
        price,
        stock,
        specifications,
        images: Array.isArray(images) ? images : [],
        supplier: (cleanSupplier && mongoose.Types.ObjectId.isValid(cleanSupplier)) ? cleanSupplier : undefined,
        tags: tags || [],
        isActive: true
        ,
        warranty: warranty && typeof warranty === 'object' ? {
          enabled: Boolean(warranty.enabled),
          periodDays: typeof warranty.periodDays === 'number' ? warranty.periodDays : undefined,
            type: ['manufacturer','extended','lifetime','none'].includes(warranty.type) ? warranty.type : 'manufacturer',
          coverage: Array.isArray(warranty.coverage) ? warranty.coverage.filter((c: any)=> typeof c === 'string' && c.trim()).map((c:any)=>c.trim()) : [],
          exclusions: Array.isArray(warranty.exclusions) ? warranty.exclusions.filter((c: any)=> typeof c === 'string' && c.trim()).map((c:any)=>c.trim()) : [],
          requiresSerial: Boolean(warranty.requiresSerial)
        } : undefined
      });

      await product.save();

      // Create inventory record
      const inventory = new Inventory({
        product: product._id,
        currentStock: stock?.current || 0,
        minimumStock: minimumStock || 0,
        reorderPoint: reorderPoint || 0,
        availableStock: stock?.current || 0,
        averageCost: price?.cost || 0,
        lastPurchasePrice: price?.cost || 0,
        supplier: (cleanSupplier && mongoose.Types.ObjectId.isValid(cleanSupplier)) ? cleanSupplier : undefined
      });

      await inventory.save();

      // Create initial stock movement if stock > 0
      if (stock?.current > 0) {
        await StockMovement.create({
          product: product._id,
          type: 'adjustment',
          quantity: stock.current,
          previousStock: 0,
          newStock: stock.current,
          unitCost: price?.cost || 0,
          totalCost: (price?.cost || 0) * stock.current,
          reason: 'Initial stock',
          performedBy: req.user?.userId,
          referenceType: 'Adjustment'
        });
      }

      // Optionally generate unit barcodes and record a sticker batch immediately after creation
      let stickerBatchInfo: { batchId: string; barcodes: string[] } | undefined;
      try {
        const quantity: number | undefined = generateStickers?.quantity;
        const mode: 'reuse_product_barcode' | 'unique_per_unit' | undefined = generateStickers?.mode;
        if (typeof quantity === 'number' && quantity > 0) {
          const internal = await ProductController.createStickerBatchInternal({
            productId: product._id.toString(),
            quantity,
            mode,
            userId: req.user?.userId,
          });
          if (internal) {
            stickerBatchInfo = internal;
          }
        }
      } catch {
        // non-fatal: continue even if sticker batch creation fails
      }

      // Populate the response
      await product.populate('category', 'name color');
      if (supplier) {
        await product.populate('supplier', 'name supplierCode');
      }

  return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product, ...(stickerBatchInfo ? { stickers: stickerBatchInfo } : {}) }
      });
    } catch (err) {
  return next(err);
    }
  }

  // Update product
  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body } as any;
      const { default: mongoose } = await import('mongoose');

      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.__v;

      // If updating SKU or barcode, check for duplicates
      if (updateData.sku || updateData.barcode) {
        if (typeof updateData.barcode === 'string') {
          updateData.barcode = updateData.barcode.trim() || undefined;
        }
        const existingProduct = await Product.findOne({
          _id: { $ne: id },
          $or: [
            ...(updateData.sku ? [{ sku: updateData.sku }] : []),
            ...(updateData.barcode ? [{ barcode: updateData.barcode }] : [])
          ]
        });

        if (existingProduct) {
          return res.status(400).json({
            success: false,
            message: 'Another product with this SKU or barcode already exists'
          });
        }
      }

      // Normalize supplier/category if passed
      if (typeof updateData.supplier === 'string' && !mongoose.Types.ObjectId.isValid(updateData.supplier)) {
        updateData.supplier = undefined;
      }
      if (typeof updateData.category === 'string' && !mongoose.Types.ObjectId.isValid(updateData.category)) {
        return res.status(400).json({ success: false, message: 'Invalid category id' });
      }

      const product = await Product.findByIdAndUpdate(
        id,
        { 
          ...updateData,
          ...(updateData.warranty ? { warranty: {
            enabled: Boolean(updateData.warranty.enabled),
            periodDays: typeof updateData.warranty.periodDays === 'number' ? updateData.warranty.periodDays : undefined,
            type: ['manufacturer','extended','lifetime','none'].includes(updateData.warranty.type) ? updateData.warranty.type : 'manufacturer',
            coverage: Array.isArray(updateData.warranty.coverage) ? updateData.warranty.coverage.filter((c: any)=> typeof c === 'string' && c.trim()).map((c:any)=>c.trim()) : [],
            exclusions: Array.isArray(updateData.warranty.exclusions) ? updateData.warranty.exclusions.filter((c: any)=> typeof c === 'string' && c.trim()).map((c:any)=>c.trim()) : [],
            requiresSerial: Boolean(updateData.warranty.requiresSerial)
          }} : {}),
          updatedAt: new Date() 
        },
        { new: true, runValidators: true }
      )
        .populate('category', 'name color')
        .populate('supplier', 'name supplierCode');

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

  return res.json({
        success: true,
        message: 'Product updated successfully',
        data: { product }
      });
    } catch (err) {
  return next(err);
    }
  }

  // Delete product (soft delete)
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const product = await Product.findByIdAndUpdate(
        id,
        { isActive: false, updatedAt: new Date() },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

  return res.json({
        success: true,
        message: 'Product deleted successfully',
        data: { product }
      });
    } catch (err) {
  return next(err);
    }
  }

  // Update stock levels
  static async updateStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { quantity, type, reason } = req.body;

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const inventory = await Inventory.findOne({ product: id });
      if (!inventory) {
        return res.status(404).json({ success: false, message: 'Inventory record not found' });
      }

      const previousStock = inventory.currentStock;
      const newStock = type === 'add' ? previousStock + quantity : previousStock - quantity;

      if (newStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock'
        });
      }

      // Update inventory
      inventory.currentStock = newStock;
      inventory.availableStock = newStock - inventory.reservedStock;
      inventory.updatedAt = new Date();
      await inventory.save();

      // Update product stock
  // Ensure stock object exists before assignment
  product.stock = (product.stock ?? { current: 0, minimum: 0, reorderPoint: 0, reserved: 0 }) as any;
  (product.stock as any).current = newStock;
      product.updatedAt = new Date();
      await product.save();

      // Create stock movement record
      await StockMovement.create({
        product: id,
        type: 'adjustment',
        quantity: type === 'add' ? quantity : -quantity,
        previousStock,
        newStock,
        reason,
        performedBy: req.user?.userId,
        referenceType: 'Adjustment'
      });

      // Emit realtime events for UI sync
      try {
        emitRealtime('inventory.updated', {
          productId: String(id),
          previous: previousStock,
          current: newStock,
          reason,
          via: 'adjustment',
          at: new Date().toISOString(),
        });
        const threshold = Math.min(
          Number.isFinite(Number(inventory.reorderPoint)) && Number(inventory.reorderPoint) > 0 ? Number(inventory.reorderPoint) : Infinity,
          Number.isFinite(Number(inventory.minimumStock)) && Number(inventory.minimumStock) > 0 ? Number(inventory.minimumStock) : Infinity,
        );
        if (Number.isFinite(threshold) && newStock <= threshold) {
          emitRealtime('inventory.low_stock', {
            productId: String(id),
            current: newStock,
            threshold,
            at: new Date().toISOString(),
          });
        }
      } catch {}

  return res.json({
        success: true,
        message: 'Stock updated successfully',
        data: {
          previousStock,
          newStock,
          quantity: type === 'add' ? quantity : -quantity
        }
      });
    } catch (err) {
  return next(err);
    }
  }

  // Get product statistics
  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const [
        totalProducts,
        activeProducts,
        lowStockProducts,
        outOfStockProducts,
        totalValue
      ] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ isActive: true }),
        Inventory.countDocuments({
          $expr: { $lte: ['$currentStock', '$minimumStock'] },
          currentStock: { $gt: 0 }
        }),
        Inventory.countDocuments({ currentStock: 0 }),
        Inventory.aggregate([
          {
            $lookup: {
              from: 'products',
              localField: 'product',
              foreignField: '_id',
              as: 'productData'
            }
          },
          { $unwind: '$productData' },
          {
            $group: {
              _id: null,
              totalValue: {
                $sum: {
                  $multiply: ['$currentStock', '$productData.price.cost']
                }
              }
            }
          }
        ])
      ]);

  return res.json({
        success: true,
        data: {
          totalProducts,
          activeProducts,
          inactiveProducts: totalProducts - activeProducts,
          lowStockProducts,
          outOfStockProducts,
          totalInventoryValue: totalValue[0]?.totalValue || 0
        }
      });
    } catch (err) {
  return next(err);
    }
  }

  // (legacy duplicate implementations removed)

  // Internal helper used by create() to generate a sticker batch without HTTP roundtrip
  private static async createStickerBatchInternal(params: {
    productId: string;
    quantity: number;
    mode?: 'reuse_product_barcode' | 'unique_per_unit';
    userId?: string;
  }): Promise<{ batchId: string; barcodes: string[] } | undefined> {
    const { productId, quantity } = params;
    if (!productId || !quantity || quantity <= 0) return undefined;
    const product = await Product.findById(productId).select('name price barcode');
    if (!product) return undefined;

    const settings = await Settings.findOne();
    const effectiveMode = params.mode || settings?.stickers?.barcodeMode || 'unique_per_unit';

    const barcodes: string[] = [];
    if (effectiveMode === 'reuse_product_barcode') {
      if (!product.barcode) {
        const gen = await ProductController.generateBarcodeDirect();
        product.barcode = gen;
        await product.save();
      }
      for (let i = 0; i < quantity; i++) barcodes.push(String(product.barcode));
    } else {
      for (let i = 0; i < quantity; i++) {
        // eslint-disable-next-line no-await-in-loop
        const gen = await ProductController.generateBarcodeDirect();
        barcodes.push(gen);
      }
    }

    const batch = await StickerBatch.create({
      product: product._id,
      quantity,
      layout: {},
      mode: effectiveMode,
      barcodes,
      createdBy: params.userId,
    });

    if (effectiveMode === 'unique_per_unit') {
      const docs = barcodes.map((b) => ({ barcode: b, product: product._id, batch: batch._id }));
      await UnitBarcode.insertMany(docs, { ordered: false }).catch(() => undefined);
    }

    return { batchId: batch._id.toString(), barcodes };
  }
}


