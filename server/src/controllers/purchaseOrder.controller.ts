import { Request, Response } from 'express';
import { PurchaseOrder } from '../models/PurchaseOrder.model';
import { Product } from '../models/Product.model';
import { Payment } from '../models/Payment.model';
import { UnitBarcode } from '../models/UnitBarcode.model';
import { isResendConfigured, sendViaResend } from '../services/resendProvider';
import { Request as ExpressRequest } from 'express';

// Get all purchase orders with filtering and pagination
export const getPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      supplier = '',
      paymentStatus = '',
      sortBy = 'orderDate',
      sortOrder = 'desc'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    // Build filter query
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (supplier) {
      filter.supplier = supplier;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // Get purchase orders with populated data
    const purchaseOrders = await PurchaseOrder.find(filter)
      .populate('supplier', 'name supplierCode')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'username')
      .populate('approvedBy', 'username')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await PurchaseOrder.countDocuments(filter);

  return res.json({
      success: true,
      data: purchaseOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase orders'
    });
  }
};

// Get purchase order by ID
export const getPurchaseOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('supplier', 'name supplierCode contactPerson email phone')
      .populate('items.product', 'name sku price.retail stock.current')
      .populate('createdBy', 'username')
      .populate('approvedBy', 'username');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Get related payments
    const payments = await Payment.find({
      purchaseOrder: id,
      type: 'supplier_payment'
    }).sort({ createdAt: -1 });

  return res.json({
      success: true,
      data: {
        purchaseOrder,
        payments
      }
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase order'
    });
  }
};

// Create new purchase order
interface AuthRequest extends Request { user?: { userId: string } }
export const createPurchaseOrder = async (req: AuthRequest, res: Response) => {
  try {
    const purchaseOrderData = req.body;

    // Ensure createdBy is always set from the authenticated user (model requires this field)
    if (req.user?.userId) {
      purchaseOrderData.createdBy = req.user.userId;
    }

    // Guard: ensure items array exists and is an array
    if (!Array.isArray(purchaseOrderData.items) || purchaseOrderData.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Purchase order requires at least one item' });
    }

    // Generate PO number if not provided
    if (!purchaseOrderData.poNumber) {
      const lastPO = await PurchaseOrder.findOne().sort({ poNumber: -1 });
      const lastNumber = lastPO?.poNumber || 'PO0000';
      const lastNum = parseInt(lastNumber.replace('PO', ''));
      purchaseOrderData.poNumber = `PO${String(lastNum + 1).padStart(4, '0')}`;
    }
    // Keep legacy orderNo in sync (for old unique index)
    if (!purchaseOrderData.orderNo) purchaseOrderData.orderNo = purchaseOrderData.poNumber;

    // Check if PO number already exists
    const existingPO = await PurchaseOrder.findOne({ 
      poNumber: purchaseOrderData.poNumber 
    });
    
    if (existingPO) {
      return res.status(400).json({
        success: false,
        message: 'Purchase order number already exists'
      });
    }

    // Calculate totals
    let subtotal = 0;
    purchaseOrderData.items.forEach((item: any) => {
      item.quantity = Number(item.quantity) || 0;
      item.unitCost = Number(item.unitCost ?? 0);
      // Respect provided totalCost if present else derive
      item.totalCost = Number(item.totalCost ?? (item.quantity * item.unitCost));
      subtotal += item.totalCost;
    });

    purchaseOrderData.subtotal = subtotal;
    purchaseOrderData.total = subtotal + 
      (purchaseOrderData.tax?.vat || 0) + 
      (purchaseOrderData.tax?.nbt || 0) - 
      (purchaseOrderData.discount || 0);

    // Set order date if not provided
    if (!purchaseOrderData.orderDate) {
      purchaseOrderData.orderDate = new Date();
    }

    // Initialize payment tracking fields if not provided
    if (typeof purchaseOrderData.paidAmount !== 'number') purchaseOrderData.paidAmount = 0;
    if (!purchaseOrderData.paymentStatus) purchaseOrderData.paymentStatus = 'pending';

    const purchaseOrder = new PurchaseOrder(purchaseOrderData);
    await purchaseOrder.save();

    // Populate the response
    const populatedPO = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplier', 'name supplierCode')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'username');

  return res.status(201).json({
      success: true,
      data: populatedPO,
      message: 'Purchase order created successfully'
    });
  } catch (error: any) {
    // Surface validation / required field errors so UI can display a helpful message
    console.error('Error creating purchase order:', error);
    // Duplicate key friendly handling
    if (error?.code === 11000) {
      const dupFields = Object.keys(error.keyPattern || error.keyValue || {});
      return res.status(409).json({
        success: false,
        message: `Duplicate value for: ${dupFields.join(', ')}`,
        error: 'duplicate_key'
      });
    }
    const msg = (error?.name === 'ValidationError' && error.message) || error?.message || 'Failed to create purchase order';
    return res.status(500).json({
      success: false,
      message: msg,
      error: error?.errors ? Object.keys(error.errors).reduce((acc: any, k) => { acc[k] = error.errors[k].message; return acc; }, {}) : undefined
    });
  }
};

// Update purchase order
export const updatePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Recalculate totals if items are updated
    if (updateData.items) {
      let subtotal = 0;
      updateData.items.forEach((item: any) => {
        item.totalCost = item.quantity * item.unitCost;
        subtotal += item.totalCost;
      });

      updateData.subtotal = subtotal;
      updateData.total = subtotal + 
        (updateData.tax?.vat || 0) + 
        (updateData.tax?.nbt || 0) - 
        (updateData.discount || 0);
    }

    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('supplier', 'name supplierCode')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'username')
      .populate('approvedBy', 'username');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

  return res.json({
      success: true,
      data: purchaseOrder,
      message: 'Purchase order updated successfully'
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to update purchase order'
    });
  }
};

// Delete purchase order
export const deletePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findById(id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Only allow deletion of draft orders
    if (purchaseOrder.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft purchase orders can be deleted'
      });
    }

    await PurchaseOrder.findByIdAndDelete(id);

  return res.json({
      success: true,
      message: 'Purchase order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to delete purchase order'
    });
  }
};

// Update purchase order status
export const updatePurchaseOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, actualDelivery } = req.body;

    const updateData: any = { status };

    // Set actual delivery date when status is 'received'
    if (status === 'received' && !actualDelivery) {
      updateData.actualDelivery = new Date();
    } else if (actualDelivery) {
      updateData.actualDelivery = actualDelivery;
    }

    // Set approval info when status changes from draft
    if (status !== 'draft') {
      updateData.approvedBy = req.user?.userId;
      updateData.approvedAt = new Date();
    }

    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('supplier', 'name supplierCode')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'username')
      .populate('approvedBy', 'username');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

  return res.json({
      success: true,
      data: purchaseOrder,
      message: 'Purchase order status updated successfully'
    });
  } catch (error) {
    console.error('Error updating purchase order status:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to update purchase order status'
    });
  }
};

// Record payment for purchase order
export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, method, reference, notes } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Create payment record
    const payment = new Payment({
      supplier: purchaseOrder.supplier,
      purchaseOrder: id,
      type: 'supplier_payment',
      amount,
      method,
      reference,
      notes,
      createdBy: req.user?.userId
    });

    await payment.save();

    // Update purchase order payment status
    const newPaidAmount = purchaseOrder.paidAmount + amount;
    const newPaymentStatus = newPaidAmount >= purchaseOrder.total ? 'paid' : 'partial';

    await PurchaseOrder.findByIdAndUpdate(id, {
      paidAmount: newPaidAmount,
      paymentStatus: newPaymentStatus
    });

  return res.json({
      success: true,
      data: payment,
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    console.error('Error recording payment:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to record payment'
    });
  }
};

// Get purchase order statistics
export const getPurchaseOrderStats = async (_req: Request, res: Response) => {
  try {
    const totalOrders = await PurchaseOrder.countDocuments();
    // Treat "pending" as POs still in draft (not yet sent to supplier)
    const pendingOrders = await PurchaseOrder.countDocuments({ status: 'draft' });
    const receivedOrders = await PurchaseOrder.countDocuments({ status: 'received' });
    const cancelledOrders = await PurchaseOrder.countDocuments({ status: 'cancelled' });
  // Consider orders that are received or explicitly completed as "completed" for this card
  const completedOrders = await PurchaseOrder.countDocuments({ status: { $in: ['received', 'completed'] } });

    // Calculate total spent
    const totalSpent = await PurchaseOrder.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Calculate outstanding payments
    const outstandingPayments = await PurchaseOrder.aggregate([
      {
        $match: { paymentStatus: { $in: ['pending', 'partial'] } }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ['$total', '$paidAmount'] } }
        }
      }
    ]);

    // Get orders by status for chart
    const ordersByStatus = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

  return res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        receivedOrders,
        cancelledOrders,
        completedOrders,
        totalSpent: totalSpent[0]?.total || 0,
        outstandingPayments: outstandingPayments[0]?.total || 0,
        ordersByStatus
      }
    });
  } catch (error) {
    console.error('Error fetching purchase order stats:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase order statistics'
    });
  }
};

// Receive items from purchase order
export const receiveItems = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { receivedItems } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('items.product');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Update received quantities
    receivedItems.forEach((receivedItem: any) => {
      const poItem = purchaseOrder.items.id(receivedItem.itemId);
      if (poItem) {
        poItem.received = (poItem.received || 0) + receivedItem.quantity;
        poItem.damaged = receivedItem.damaged || 0;
      }
    });

    // Check if all items are received
    const allReceived = purchaseOrder.items.every(item => 
      (item.received || 0) >= item.quantity
    );

    if (allReceived) {
      purchaseOrder.status = 'received';
      purchaseOrder.actualDelivery = new Date();
    }

    await purchaseOrder.save();

    // Update product stock levels
    for (const receivedItem of receivedItems) {
      const poItem = purchaseOrder.items.id(receivedItem.itemId);
      if (poItem && poItem.product) {
        const product = await Product.findById(poItem.product._id);
        if (product) {
          const netQuantity = receivedItem.quantity - (receivedItem.damaged || 0);
          const ensuredStock = product.stock ?? { current: 0, minimum: 0, reorderPoint: 0, reserved: 0 };
          const newCurrent = ((ensuredStock && (ensuredStock as any).current) ?? 0) + netQuantity;
          product.stock = { ...(ensuredStock as any), current: newCurrent };
          await product.save();

          // Mark barcodes as in_stock when inventory is received
          try {
            // Mongoose updateMany doesn't support limit; find IDs first, then update
            const barcodesToUpdate = await UnitBarcode.find(
              { 
                product: product._id, 
                status: 'generated',
                $or: [
                  { inStockAt: { $exists: false } },
                  { inStockAt: null }
                ]
              },
              { _id: 1 }
            ).limit(netQuantity).lean();

            const idsToUpdate = barcodesToUpdate.map((b) => b._id);

            const result = idsToUpdate.length > 0
              ? await UnitBarcode.updateMany(
                  { _id: { $in: idsToUpdate } },
                  { 
                    $set: { 
                      status: 'in_stock',
                      inStockAt: new Date()
                    } 
                  }
                )
              : { modifiedCount: 0 };

            if (process.env.NODE_ENV !== 'production' && result.modifiedCount > 0) {
              console.log('[barcode.track.receive]', {
                productId: product._id,
                quantity: netQuantity,
                barcodesUpdated: result.modifiedCount
              });
            }
          } catch (bcErr) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[barcode.track.receive] failed', bcErr);
            }
          }
        }
      }
    }

  return res.json({
      success: true,
      data: purchaseOrder,
      message: 'Items received successfully'
    });
  } catch (error) {
    console.error('Error receiving items:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to receive items'
    });
  }
};

// Send purchase order email to supplier
export const sendPurchaseOrderEmail = async (req: ExpressRequest, res: Response) => {
  try {
    const { id } = req.params;
    const po = await PurchaseOrder.findById(id)
      .populate('supplier', 'name email')
      .populate('items.product', 'name sku price.cost');
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }
    const supplier: any = po.supplier;
    if (!supplier?.email) {
      return res.status(400).json({ success: false, message: 'Supplier has no email on file' });
    }
    // Build professional HTML summary (Option 1) basic columns
    const lines = po.items.map((it: any, idx: number) => {
        return `
        <tr style=\"background:${idx % 2 ? '#ffffff' : '#f9fafb'};\">
          <td style=\"padding:10px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:13px;color:#111827;\">${it.product?.sku || ''}</td>
          <td style=\"padding:10px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:13px;color:#111827;\">${(it.product?.name?.en || it.product?.name || '')}</td>
          <td style=\"padding:10px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:13px;color:#111827;text-align:center;\">${it.quantity}</td>
        </tr>`;
    }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\" /><title>Purchase Order ${po.poNumber}</title></head>
    <body style=\"margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;\">
      <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f3f4f6;padding:32px 0;\">
        <tr><td align=\"center\">
          <table role=\"presentation\" width=\"640\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:640px;max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.08);\">
            <tr>
              <td style=\"background:linear-gradient(135deg,#1e3a8a,#4f46e5,#9333ea);padding:28px 36px;color:#fff;\">
                <h1 style=\"margin:0;font-size:20px;line-height:1.3;font-weight:600;\">Purchase Order <span style=\"opacity:.9;\">${po.poNumber}</span></h1>
                <p style=\"margin:6px 0 0;font-size:12px;letter-spacing:.5px;opacity:.85;\">Issued ${new Date(po.orderDate || Date.now()).toLocaleDateString()}</p>
              </td>
            </tr>
            <tr><td style=\"padding:28px 36px 8px 36px;\">
              <p style=\"margin:0 0 14px;font-size:14px;color:#374151;\">Dear <strong>${supplier.name || 'Supplier'}</strong>,</p>
              <p style=\"margin:0 0 18px;font-size:14px;color:#4b5563;line-height:1.55;\">This email confirms our purchase order <strong>${po.poNumber}</strong> dated ${new Date(po.orderDate || Date.now()).toLocaleDateString()}. Please review the order details below.</p>
              <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse;margin:0 0 12px 0;\">
                <thead>
                  <tr style=\"background:#eef2ff;\">
                    <th align=\"left\" style=\"padding:10px 12px;font-size:12px;font-weight:600;font-family:Arial,sans-serif;color:#374151;text-transform:uppercase;letter-spacing:.5px;\">SKU</th>
                    <th align=\"left\" style=\"padding:10px 12px;font-size:12px;font-weight:600;font-family:Arial,sans-serif;color:#374151;text-transform:uppercase;letter-spacing:.5px;\">Product</th>
                    <th align=\"center\" style=\"padding:10px 12px;font-size:12px;font-weight:600;font-family:Arial,sans-serif;color:#374151;text-transform:uppercase;letter-spacing:.5px;\">Qty</th>
                  </tr>
                </thead>
                <tbody>${lines || `<tr><td colspan=\"5\" style=\"padding:16px 12px;text-align:center;font-size:13px;color:#6b7280;\">No items.</td></tr>`}</tbody>
              </table>
              <p style=\"margin:0 0 12px;font-size:13px;color:#374151;\">Please reply to confirm receipt of this order and provide an estimated delivery date.</p>
              <p style=\"margin:0 0 24px;font-size:12px;color:#6b7280;\">If any detail appears incorrect, contact us immediately.</p>
              <p style=\"margin:0 0 4px;font-size:13px;color:#111827;font-weight:600;\">The VoltZone POS Team</p>
            </td></tr>
            <tr>
              <td style=\"background:#f9fafb;padding:14px 24px;text-align:center;font-size:11px;color:#9ca3af;\">This is an automated message. &copy; ${(new Date()).getFullYear()} VoltZone POS</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body></html>`;

    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const poSubject = `Purchase Order ${po.poNumber}`;

    // Send via Resend (HTTP-based, works on Render free tier)
    if (!isResendConfigured()) {
      return res.status(500).json({ success: false, message: 'No email provider configured (set RESEND_API_KEY)' });
    }

    try {
      const r = await sendViaResend({ from, to: supplier.email, subject: poSubject, html });
      if (r?.ok) {
        po.set({ emailSent: true, emailSentAt: new Date() });
        await po.save();
        return res.json({ success: true, message: 'Email sent via Resend', data: { emailSent: true } });
      }
      return res.status(500).json({ success: false, message: 'Email sending failed', error: r?.error });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: 'Failed to send email', error: e?.message });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unexpected error' });
  }
};
