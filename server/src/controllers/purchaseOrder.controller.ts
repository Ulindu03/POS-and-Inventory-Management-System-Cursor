import { Request, Response } from 'express';
import { PurchaseOrder } from '../models/PurchaseOrder.model';
import { Product } from '../models/Product.model';
import { Payment } from '../models/Payment.model';

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

    // Generate PO number if not provided
    if (!purchaseOrderData.poNumber) {
      const lastPO = await PurchaseOrder.findOne().sort({ poNumber: -1 });
      const lastNumber = lastPO?.poNumber || 'PO0000';
      const lastNum = parseInt(lastNumber.replace('PO', ''));
      purchaseOrderData.poNumber = `PO${String(lastNum + 1).padStart(4, '0')}`;
    }

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
      item.totalCost = item.quantity * item.unitCost;
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
  } catch (error) {
    console.error('Error creating purchase order:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to create purchase order'
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
    const pendingOrders = await PurchaseOrder.countDocuments({ status: 'sent' });
    const receivedOrders = await PurchaseOrder.countDocuments({ status: 'received' });
    const cancelledOrders = await PurchaseOrder.countDocuments({ status: 'cancelled' });

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
