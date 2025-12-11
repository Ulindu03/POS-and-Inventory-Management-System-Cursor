import { Request, Response, NextFunction } from 'express';
import { Sale } from '../models/Sale.model';
import { Product } from '../models/Product.model';
import { Inventory } from '../models/Inventory.model';
import { User } from '../models/User.model';
import { DiscountService } from '../services/discount.service';
import { Settings } from '../models/Settings.model';
import { StockMovement } from '../models/StockMovement.model';
import mongoose from 'mongoose';
import { issueWarranty } from '../services/warranty.service';
import { emit as emitRealtime } from '../services/realtime.service';
import { Counter } from '../models/Counter.model';
import { Customer } from '../models/Customer.model';
import { sendEmail, buildSaleReceiptEmail } from '../services/notify.service';

const nextInvoiceNo = async (): Promise<string> => {
  // Determine starting point from last persisted sale
  const last = await Sale.findOne().sort({ createdAt: -1 }).select('invoiceNo').lean();
  const lastNum = last?.invoiceNo?.match(/(\d+)$/)?.[1];
  const base = lastNum ? parseInt(lastNum, 10) : 0;

  // Try incrementing if counter already exists
  let doc = await Counter.findOneAndUpdate(
    { key: 'invoice' },
    { $inc: { seq: 1 } },
    { new: true }
  );

  if (!doc) {
    // Initialize once with base+1; tolerate races with duplicate key protection
    try {
      await Counter.create({ key: 'invoice', seq: base + 1 });
    } catch (e: any) {
      // Someone else created concurrently; ignore duplicate key errors
      if (!(e && e.code === 11000)) {
        throw e;
      }
    }
    // Read current value (do not increment again here)
    doc = await Counter.findOne({ key: 'invoice' });
  }

  const seq = (doc?.seq ?? base + 1);
  // Ensure sequence never goes below base+1 (safety for restored DBs)
  if (seq < base + 1) {
    await Counter.updateOne({ key: 'invoice', seq: { $lt: base + 1 } }, { $set: { seq: base + 1 } });
    const fixed = await Counter.findOne({ key: 'invoice' }).lean();
    const s = fixed?.seq ?? base + 1;
    return `INV-${String(s).padStart(6, '0')}`;
  }

  return `INV-${String(seq).padStart(6, '0')}`;
};

async function applySaleStockMovement(params: {
  session: mongoose.ClientSession;
  productDoc: any;
  item: { product: string; quantity: number };
  cashierId: string;
  invoiceNo: string;
  saleId: any;
}) {
  const { session, productDoc: p, item: i, cashierId, invoiceNo, saleId } = params;
  const track = p?.trackInventory !== false && !p?.isDigital;
  if (!track) return;
  const qty = Number(i.quantity);
  const prev = p?.stock?.current ?? 0;
  const next = prev - qty;
  await Product.updateOne({ _id: i.product }, { $inc: { 'stock.current': -qty } }, { session });
  p.stock.current = next;
  // Update Inventory in parallel (if exists)
  let invAfter: { currentStock: number; minimumStock: number; reorderPoint: number } | null = null;
  try {
    let inv = await Inventory.findOne({ product: i.product }).session(session);
    if (!inv) {
      // create inventory record if missing
      inv = new Inventory({
        product: i.product,
        currentStock: Math.max(0, next),
        minimumStock: Number(p?.stock?.minimum ?? 0),
        reorderPoint: Number(p?.stock?.reorderPoint ?? 0),
        reservedStock: 0,
        availableStock: Math.max(0, next),
        updatedAt: new Date(),
      });
    } else {
      inv.currentStock = Math.max(0, (inv.currentStock ?? 0) - qty);
      // availableStock typically = current - reserved; decrease by qty but not below 0
      inv.availableStock = Math.max(0, (inv.availableStock ?? (inv.currentStock ?? 0)) - qty);
      inv.updatedAt = new Date();
    }
    await inv.save({ session });
    invAfter = { currentStock: inv.currentStock ?? 0, minimumStock: inv.minimumStock ?? 0, reorderPoint: inv.reorderPoint ?? 0 };
  } catch {}
  await StockMovement.create([
    {
      product: i.product,
      type: 'sale',
      quantity: -qty,
      previousStock: prev,
      newStock: next,
      reference: invoiceNo,
      referenceId: saleId,
      referenceType: 'Sale',
      performedBy: cashierId,
    }
  ], { session });

  // Notify clients that inventory changed
  setTimeout(() => {
    try {
      emitRealtime('inventory.updated', {
        productId: String(i.product),
        previous: prev,
        current: next,
        invoiceNo,
        at: new Date().toISOString(),
      });
    } catch {}
  }, 0);
  // Low-stock event based on Inventory thresholds if available, else fallback to product reorderPoint
  const minT = Number(invAfter?.minimumStock ?? 0);
  const rpT = Number(invAfter?.reorderPoint ?? (p?.stock?.reorderPoint ?? 0));
  const thresholds = [minT, rpT].filter((x) => x > 0);
  const maxThresh = thresholds.length ? Math.max(...thresholds) : 0;
  if (maxThresh > 0 && next <= maxThresh) {
    setTimeout(() => {
      try {
        emitRealtime('inventory.low_stock', {
          productId: String(i.product), previous: prev, current: next, threshold: maxThresh, invoiceNo, at: new Date().toISOString(),
        });
      } catch {}
    }, 0);
  }
}

export class SaleController {
  static async create(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
  const { items, payment, payments, discount = 0, customer, discountCode, currency, extendedWarrantySelections } = req.body as any;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items' });
      }

    const productIds = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } }).select('price.cost price.retail stock.current stock.reorderPoint trackInventory allowBackorder isDigital warranty');
    // Load inventory snapshots to validate using available/current stock if present
    const inventories = await Inventory.find({ product: { $in: productIds } }).select('product currentStock availableStock');
      const productMap = new Map(products.map((p) => [p._id.toString(), p]));
      const costMap = new Map(products.map((p) => [p._id.toString(), (p as any).price?.cost || 0]));
    const invMap = new Map(inventories.map((iv: any) => [iv.product.toString(), iv]));

      // Validate stock availability before proceeding (if tracking inventory and backorder not allowed)
      for (const it of items) {
        const p = productMap.get(String(it.product));
        if (!p) return res.status(400).json({ success: false, message: 'Invalid product in items' });
        const track = (p as any).trackInventory !== false && !(p as any).isDigital;
        const allow = Boolean((p as any).allowBackorder);
        if (track && !allow) {
          const inv = invMap.get(String(it.product)) as any | undefined;
          const current = (inv?.availableStock ?? inv?.currentStock ?? (p as any).stock?.current ?? 0);
          if (current < Number(it.quantity)) {
            return res.status(409).json({ success: false, message: `Insufficient stock for product ${(p as any)._id}`, data: { productId: (p as any)._id, available: current } });
          }
        }
      }

      const settingsDoc = await Settings.findOne();
      const posSettings: any = settingsDoc?.pos || {};
      if (posSettings.requireCustomer && !customer) {
        return res.status(400).json({ success: false, message: 'Customer selection is required for POS sales' });
      }

      const allowDiscounts = posSettings.allowDiscounts !== false;
      const autoDeductStock = posSettings.autoDeductStock !== false;

      let subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      // Apply extended warranty upsell charges (simple add-on to subtotal)
      // extendedWarrantySelections: { [productId]: { optionName?:string; additionalDays:number; fee:number }[] }
      const upsellSelections = extendedWarrantySelections && typeof extendedWarrantySelections === 'object' ? extendedWarrantySelections : {};
      const upsellLines: Array<{ product: string; fee: number; additionalDays: number }> = [];
      for (const key of Object.keys(upsellSelections)) {
        const arr = Array.isArray(upsellSelections[key]) ? upsellSelections[key] : [];
        for (const sel of arr) {
          const fee = Number(sel.fee) || 0;
          if (fee > 0) {
            subtotal += fee;
            upsellLines.push({ product: key, fee, additionalDays: Number(sel.additionalDays)||0 });
          }
        }
      }
      let discountAmount = Number(discount) || 0;
      // Enforce role-based discount permission: only store owner can apply manual discount
      if ((discountAmount || 0) > 0 && !(['store_owner','admin'].includes(String(req.user?.role).toLowerCase()))) {
        return res.status(403).json({ success: false, message: 'Forbidden: discount not allowed for your role' });
      }
      const hasLineDiscount = items.some((i: any) => Number(i.discount) > 0);
      if (!allowDiscounts && (((discountAmount || 0) > 0) || discountCode || hasLineDiscount)) {
        return res.status(403).json({ success: false, message: 'POS discounts are disabled in settings' });
      }
      if (discountCode) {
        try {
          const result = await DiscountService.validateCode({ code: String(discountCode), subtotal, customerId: customer || undefined });
          if (result.valid && typeof result.amount === 'number') discountAmount = result.amount;
        } catch {}
      }
      const vat = 0; // simplified
      const nbt = 0; // simplified
      const total = Math.max(0, subtotal + vat + nbt - discountAmount);

      const invoiceNo = await nextInvoiceNo();
      const cashierId = req.user?.userId || (await User.findOne().select('_id'))?._id; // fallback

      type InPayment = { method: string; amount: number; reference?: string; change?: number; cardType?: string; transactionId?: string };
      const incomingPayments: InPayment[] = [];
      if (Array.isArray(payments)) {
        for (const p of payments as InPayment[]) incomingPayments.push(p);
      } else if (payment) {
        incomingPayments.push(payment as InPayment);
      }
      const baseCode = settingsDoc?.currency?.primary || 'LKR';
      const code = currency?.code || baseCode;
      const rate = currency?.rateToBase ?? (settingsDoc?.currency?.fxRates?.get?.(code) || 1);
      // Try a transaction to keep sale + stock updates consistent; fallback to non-transaction if not supported
      let doc: any;
      let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      doc = await Sale.create([
        {
        invoiceNo,
        customer: customer || null,
        cashier: cashierId,
        items: items.map((i: any) => ({
          product: i.product,
          quantity: i.quantity,
          price: i.price,
          cost: costMap.get(i.product) || 0,
          discount: i.discount || 0,
          tax: { vat: 0, nbt: 0 },
          total: i.price * i.quantity - (i.discount || 0),
        })),
  subtotal,
  tax: { vat, nbt },
  currency: { code, rateToBase: rate, baseCode },
  discount,
        total,
  payment: payment || undefined,
  payments: incomingPayments,
        status: 'completed',
        }
      ], { session });
      doc = Array.isArray(doc) ? doc[0] : doc;

      // Adjust inventory and create stock movements when automatic deduction is enabled
      if (autoDeductStock) {
        for (const i of items) {
          const p = productMap.get(String(i.product)) as any;
          // session is guaranteed non-null inside withTransaction scope
          if (session) {
            await applySaleStockMovement({ session, productDoc: p, item: i, cashierId: String(cashierId), invoiceNo, saleId: doc._id });
          }
        }
      }
    });
  } catch (txErr: any) {
    // Fallback when MongoDB doesn't support transactions (e.g., standalone server)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[sales.create] Transaction not used, falling back. Reason:', txErr?.message || txErr);
    }
    doc = await Sale.create({
      invoiceNo,
      customer: customer || null,
      cashier: cashierId,
      items: items.map((i: any) => ({
        product: i.product,
        quantity: i.quantity,
        price: i.price,
        cost: costMap.get(i.product) || 0,
        discount: i.discount || 0,
        tax: { vat: 0, nbt: 0 },
        total: i.price * i.quantity - (i.discount || 0),
      })),
  subtotal,
      tax: { vat, nbt },
      currency: { code, rateToBase: rate, baseCode },
      discount,
      total,
      payment: payment || undefined,
      payments: incomingPayments,
      status: 'completed',
    });
    // Adjust inventory and create stock movements (without session)
    if (autoDeductStock) {
      for (const i of items) {
        const p = productMap.get(String(i.product)) as any;
        const track = p?.trackInventory !== false && !p?.isDigital;
        if (!track) continue;
        const qty = Number(i.quantity);
        const prev = p?.stock?.current ?? 0;
        const next = prev - qty;
        await Product.updateOne({ _id: i.product }, { $inc: { 'stock.current': -qty } });
        // Update Inventory (non-transaction path)
        try {
          let inv = await Inventory.findOne({ product: i.product });
          if (!inv) {
            inv = new Inventory({
              product: i.product,
              currentStock: Math.max(0, next),
              minimumStock: Number(p?.stock?.minimum ?? 0),
              reorderPoint: Number(p?.stock?.reorderPoint ?? 0),
              reservedStock: 0,
              availableStock: Math.max(0, next),
              updatedAt: new Date(),
            });
          } else {
            const curPrev = inv.currentStock ?? 0;
            inv.currentStock = Math.max(0, curPrev - qty);
            inv.availableStock = Math.max(0, (inv.availableStock ?? curPrev) - qty);
            inv.updatedAt = new Date();
          }
          await inv.save();
          // recompute thresholds and emit low-stock if needed
          const minT = Number(inv.minimumStock ?? 0);
          const rpT = Number(inv.reorderPoint ?? (p?.stock?.reorderPoint ?? 0));
          const thresholds = [minT, rpT].filter((x) => x > 0);
          const maxThresh = thresholds.length ? Math.max(...thresholds) : 0;
          if (maxThresh > 0 && (inv.currentStock ?? 0) <= maxThresh) {
            setTimeout(() => {
              try {
                emitRealtime('inventory.low_stock', {
                  productId: String(i.product), previous: prev, current: inv.currentStock ?? next, threshold: maxThresh, invoiceNo, at: new Date().toISOString(),
                });
              } catch {}
            }, 0);
          }
        } catch {}
        p.stock.current = next;
        await StockMovement.create({
          product: i.product,
          type: 'sale',
          quantity: -qty,
          previousStock: prev,
          newStock: next,
          reference: invoiceNo,
          referenceId: doc._id,
          referenceType: 'Sale',
          performedBy: cashierId,
        });
        setTimeout(() => {
          try {
            emitRealtime('inventory.updated', {
              productId: String(i.product), previous: prev, current: next, invoiceNo, at: new Date().toISOString(),
            });
          } catch {}
        }, 0);
        // inventory.low_stock handled above after inventory save
      }
    }
  } finally {
    if (session) {
      try { await session.endSession(); } catch {}
    }
  }

  // Notify clients that a sale was created (for live analytics)
  try {
    emitRealtime('sales:created', {
      id: String(doc?._id),
      invoiceNo: doc?.invoiceNo,
      total: doc?.total,
      cashierId: String(cashierId),
      createdAt: (doc?.createdAt || new Date()).toISOString(),
    });
  } catch {}

  // Post-creation: automatically issue warranties for eligible items (if customer provided)
  if (customer && doc?._id) {
    try {
      const saleItems = (doc as any).items || [];
      for (const it of saleItems) {
        const p = productMap.get(String(it.product)) as any;
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('[warranty.auto] evaluate', {
            saleId: String(doc._id),
            invoiceNo: doc.invoiceNo,
            productId: String(it.product),
            qty: it.quantity,
            warrantyEnabled: p?.warranty?.enabled,
            basePeriodDays: p?.warranty?.periodDays,
          });
        }
        if (!p?.warranty?.enabled || !p?.warranty?.periodDays) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log('[warranty.auto] skip', {
              reason: 'not_enabled_or_no_period',
              productId: String(it.product),
              enabled: p?.warranty?.enabled,
              periodDays: p?.warranty?.periodDays,
            });
          }
          continue;
        }
        const qty = Number(it.quantity) || 0;
        for (let q = 0; q < qty; q += 1) {
          try {
            // Determine if any upsell extra days apply (sum of additionalDays for this product)
            const extraDays = (Array.isArray(upsellSelections?.[String(it.product)]) ? upsellSelections[String(it.product)] : [])
              .reduce((s: number, sel: any) => s + (Number(sel.additionalDays) || 0), 0);
            await issueWarranty({
              productId: String(it.product),
              saleId: String(doc._id),
              saleItemId: String(it._id),
              customerId: String(customer),
              issuedBy: String(cashierId),
              periodDays: (Number(p.warranty.periodDays) || 0) + extraDays,
              coverage: p.warranty.coverage || [],
              exclusions: p.warranty.exclusions || [],
              type: p.warranty.type || 'manufacturer',
              requiresActivation: Boolean(p.warranty.requiresSerial),
            });
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.log('[warranty.issue] success', {
                productId: String(it.product),
                saleId: String(doc._id),
                invoiceNo: doc.invoiceNo,
                periodDays: (Number(p.warranty.periodDays) || 0) + extraDays,
                extraDays,
              });
            }
          } catch (wErr) {
            // Non-blocking: collect or log silently
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.warn('[warranty.issue] failed for product', it.product, wErr);
            }
          }
        }
      }
    } catch (wAllErr) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[warranty.auto] issuance loop failed', wAllErr);
      }
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[sales.create] success', { id: String(doc._id), invoiceNo: doc.invoiceNo, total: doc.total });
  }
  // Non-blocking e-receipt email
  if (doc?.customer) {
    setTimeout(async () => {
      try {
        const cust = await Customer.findById(doc.customer).select('name email');
        const email = (cust as any)?.email;
        if (email) {
          try {
            // Enrich items with product names and warranty details for email
            const saleWithDetails = await Sale.findById(doc._id)
              .populate('items.product', 'name warranty')
              .lean();
            const enriched = saleWithDetails || doc;
            const { subject, text, html } = buildSaleReceiptEmail(enriched, cust);
            await sendEmail(subject, email, text, html);
          } catch (e: any) {
            console.error('[email][sale_receipt][error]', doc.invoiceNo, e?.message || e);
          }
        } else {
          console.log('[email][sale_receipt][skipped][no_email]', doc.invoiceNo);
        }
      } catch (e) {
        console.error('[email][sale_receipt][error_fetch_customer]', doc.invoiceNo, e);
      }
    }, 0);
  }
  return res.status(201).json({ success: true, data: { sale: { id: doc._id, invoiceNo: doc.invoiceNo, total: doc.total } } });
    } catch (err) {
  return next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const sale = await Sale.findById(id).populate('items.product', 'sku name price');
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
  return res.json({ success: true, data: { sale } });
    } catch (err) {
  return next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', q } = req.query as Record<string, string>;
      const take = Math.min(parseInt(limit, 10) || 20, 100);
      const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
      const filters: any = {};
      if (q) {
        filters.$or = [
          { invoiceNo: { $regex: q, $options: 'i' } },
        ];
      }
      const [items, total] = await Promise.all([
        Sale.find(filters)
          .select('invoiceNo total createdAt cashier')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(take),
        Sale.countDocuments(filters),
      ]);
  return res.json({ success: true, data: { items, total, page: parseInt(page, 10) || 1, limit: take } });
    } catch (err) {
  return next(err);
    }
  }

  static async hold(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { items, discount = 0, customer, note, discountCode } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items' });
      }
      const invoiceNo = await nextInvoiceNo();
      const cashierId = req.user?.userId || (await User.findOne().select('_id'))?._id;
      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      let discountAmount = Number(discount) || 0;
      if (discountCode) {
        try {
          const result = await DiscountService.validateCode({ code: String(discountCode), subtotal, customerId: customer || undefined });
          if (result.valid && typeof result.amount === 'number') discountAmount = result.amount;
        } catch {}
      }
  const total = Math.max(0, subtotal - discountAmount);
  const s2 = await Settings.findOne();
  const baseCode2 = s2?.currency?.primary || 'LKR';
  const body = req.body;
  const code2 = body?.currency?.code || baseCode2;
  const rate2 = body?.currency?.rateToBase ?? (s2?.currency?.fxRates?.get?.(code2) || 1);
  const doc = await Sale.create({
        invoiceNo,
        customer: customer || null,
        cashier: cashierId,
        items: items.map((i: any) => ({ product: i.product, quantity: i.quantity, price: i.price, cost: 0, discount: i.discount || 0, tax: { vat: 0, nbt: 0 }, total: i.price * i.quantity })),
        subtotal,
  tax: { vat: 0, nbt: 0 },
  currency: { code: code2, rateToBase: rate2, baseCode: baseCode2 },
        discount: discountAmount,
        total,
        payment: { method: 'cash', amount: 0 },
        status: 'held',
        notes: note,
      });
      return res.status(201).json({ success: true, data: { ticket: { id: doc._id, invoiceNo: doc.invoiceNo } } });
    } catch (err) {
      return next(err);
    }
  }

  static async resume(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const sale = await Sale.findById(id);
  if (!sale || sale.status !== 'held') return res.status(404).json({ success: false, message: 'Ticket not found' });
  return res.json({ success: true, data: { ticket: sale } });
    } catch (err) {
  return next(err);
    }
  }

  // Validate a discount/promo code
  static async validateDiscount(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, subtotal } = req.body as { code: string; subtotal: number };
      if (!code) return res.status(400).json({ success: false, message: 'Code required' });
      const result = await DiscountService.validateCode({ code, subtotal });
      return res.json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  // Process a return/refund for a sale
  static async refund(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      // Role check: store_owner, manager, sales_rep allowed, cashier denied
      const role = req.user?.role;
      if (!['store_owner', 'admin', 'manager', 'sales_rep'].includes(String(role).toLowerCase())) {
        return res.status(403).json({ success: false, message: 'Forbidden: returns not allowed for your role' });
      }
      
      const { 
        items, 
        method = 'cash', 
        reference,
        returnType = 'partial_refund',
        discount = 0,
        notes 
      } = req.body as { 
        items: Array<{ 
          product: string; 
          quantity: number; 
          amount: number;
          reason?: string;
          condition?: string;
          disposition?: string;
        }>; 
  method?: 'cash' | 'card' | 'bank_transfer' | 'digital' | 'credit' | 'store_credit' | 'exchange_slip' | 'overpayment'; 
        reference?: string;
        returnType?: 'full_refund' | 'partial_refund' | 'exchange' | 'store_credit';
        discount?: number;
        notes?: string;
      };
      
      const sale = await Sale.findById(id);
      if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'No return items' });

      const userId = req.user?.userId;

      // Try to use the new comprehensive return system if available
      try {
        const { ReturnService } = await import('../services/ReturnService');
        
        const returnRequest = {
          saleId: id,
          items: items.map(item => ({
            product: item.product,
            quantity: item.quantity,
            returnAmount: item.amount,
            reason: (item.reason as any) || 'other',
            condition: (item.condition as any) || 'new',
            disposition: (item.disposition as any) || 'restock'
          })),
          returnType,
          // Map legacy 'credit' payment method to store credit refund method if encountered
          refundMethod: (method === 'credit' ? 'store_credit' : method) as any,
          refundDetails: reference ? { reference } : {},
          discount,
          notes
        };
        
        const result = await ReturnService.processReturn(returnRequest, userId);
        
        return res.json({
          success: true,
          data: {
            refund: { total: result.data.returnTransaction.totalAmount },
            sale: { 
              id: sale._id, 
              total: (sale as any).total - result.data.returnTransaction.totalAmount, 
              status: result.data.returnTransaction.totalAmount >= (sale as any).total ? 'refunded' : 'partially_refunded'
            },
            returnTransaction: result.data.returnTransaction,
            exchangeSlip: result.data.exchangeSlip,
            overpayment: result.data.overpayment
          }
        });
      } catch (serviceError) {
        // Fallback to legacy method if new system fails
        console.warn('Return service failed, falling back to legacy method:', serviceError);
      }

      // Legacy fallback implementation
      const returnTotal = items.reduce((s, i) => s + Math.max(0, i.amount), 0) - discount;

      // Append return record using new schema structure (legacy path)
      const normalizedMethod = method === 'credit' ? 'store_credit' : method;
      const returnRecord = {
        items: items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          amount: item.amount,
          reason: (item.reason as any) || 'other',
          disposition: (item.disposition as any) || 'restock'
        })),
        total: returnTotal,
        method: normalizedMethod,
        reference: reference || `LEGACY-${Date.now()}`,
        processedBy: userId,
        createdAt: new Date()
      };

      (sale as any).returns = [...((sale as any).returns || []), returnRecord];
      
      // Update return summary
      if (!(sale as any).returnSummary) {
        (sale as any).returnSummary = { totalReturned: 0, returnedItems: 0 };
      }
      (sale as any).returnSummary.totalReturned = ((sale as any).returnSummary.totalReturned || 0) + returnTotal;
      (sale as any).returnSummary.returnedItems = ((sale as any).returnSummary.returnedItems || 0) + 
        items.reduce((sum, item) => sum + item.quantity, 0);
      (sale as any).returnSummary.lastReturnDate = new Date();
      
      // Adjust sale total downward
      (sale as any).total = Math.max(0, (sale as any).total - returnTotal);
      
      // Update status based on remaining total
      if ((sale as any).total === 0) {
        (sale as any).status = 'refunded';
      } else if ((sale as any).returnSummary.totalReturned > 0) {
        (sale as any).status = 'partially_refunded';
      }

      await sale.save();

      // Restock returned quantities and log movements
      const cashierId = req.user?.userId || (await User.findOne().select('_id'))?._id;
      for (const it of items) {
        const disposition = (it.disposition as any) || 'restock';
        
        // Only restock if disposition is 'restock'
        if (disposition === 'restock') {
          const prod = await Product.findById(it.product).select('trackInventory isDigital stock.current');
          const track = (prod as any)?.trackInventory !== false && !(prod as any)?.isDigital;
          if (!track) continue;
          
          const qty = Number(it.quantity);
          const prev = (prod as any)?.stock?.current ?? 0;
          const next = prev + qty;
          await Product.updateOne({ _id: it.product }, { $inc: { 'stock.current': qty } });
          
          // Update Inventory as well
          try {
            let inv = await Inventory.findOne({ product: it.product });
            if (!inv) {
              inv = new Inventory({
                product: it.product,
                currentStock: Math.max(0, prev + qty),
                minimumStock: Number((prod as any)?.stock?.minimum ?? 0),
                reorderPoint: Number((prod as any)?.stock?.reorderPoint ?? 0),
                reservedStock: 0,
                availableStock: Math.max(0, prev + qty),
                updatedAt: new Date(),
              });
            } else {
              const curPrev = inv.currentStock ?? 0;
              inv.currentStock = Math.max(0, curPrev + qty);
              inv.availableStock = Math.max(0, (inv.availableStock ?? curPrev) + qty);
              inv.updatedAt = new Date();
            }
            await inv.save();
          } catch {}
          
          await StockMovement.create({
            product: it.product,
            type: 'return',
            quantity: qty,
            previousStock: prev,
            newStock: next,
            reference: String(reference || sale.invoiceNo),
            referenceId: sale._id,
            referenceType: 'Sale',
            performedBy: cashierId,
            reason: `customer_return_${disposition}`,
          });
          
          setTimeout(() => {
            try {
              emitRealtime('inventory.updated', { productId: String(it.product), previous: prev, current: next, refundOf: sale._id, at: new Date().toISOString() });
            } catch {}
          }, 0);
        }
      }
      
      return res.json({ 
        success: true, 
        data: { 
          refund: { total: returnTotal }, 
          sale: { 
            id: sale._id, 
            total: (sale as any).total, 
            status: (sale as any).status 
          } 
        } 
      });
    } catch (err) {
      return next(err);
    }
  }
}


