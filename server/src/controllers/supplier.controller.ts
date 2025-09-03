import { Request, Response } from 'express';
import { Supplier } from '../models/Supplier.model';
import { PurchaseOrder } from '../models/PurchaseOrder.model';
import { Product } from '../models/Product.model';
import { Payment } from '../models/Payment.model';

// Get all suppliers with filtering, pagination, and search
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      category = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    // Build filter query
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { supplierCode: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.categories = category;
    }

    // Get suppliers with populated categories
    const suppliers = await Supplier.find(filter)
      .populate('categories', 'name')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await Supplier.countDocuments(filter);

    // Calculate additional stats for each supplier
    const suppliersWithStats = await Promise.all(
      suppliers.map(async (supplier) => {
        const supplierId = supplier._id;

        // Get purchase orders for this supplier
        const purchaseOrders = await PurchaseOrder.find({ supplier: supplierId });
        
        // Get products from this supplier
        const products = await Product.find({ supplier: supplierId });
        
        // Get payments to this supplier
        const payments = await Payment.find({ 
          supplier: supplierId, 
          type: 'supplier_payment' 
        });

        // Calculate stats
        const totalOrders = purchaseOrders.length;
        const totalSpent = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const outstandingBalance = totalSpent - totalPaid;
        let lastOrder = null as null | typeof purchaseOrders[number];
        if (purchaseOrders.length > 0) {
          const sorted = [...purchaseOrders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
          lastOrder = sorted[0];
        }

        return {
          ...supplier.toObject(),
          totalOrders,
          totalSpent,
          totalPaid,
          outstandingBalance,
          lastOrder: lastOrder ? {
            poNumber: lastOrder.poNumber,
            orderDate: lastOrder.orderDate,
            total: lastOrder.total
          } : null,
          productCount: products.length
        };
      })
    );

  return res.json({
      success: true,
      data: suppliersWithStats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to fetch suppliers'
    });
  }
};

// Get supplier by ID with detailed stats
export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findById(id)
      .populate('categories', 'name');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Get detailed stats
    const purchaseOrders = await PurchaseOrder.find({ supplier: id })
      .populate('items.product', 'name sku')
      .sort({ orderDate: -1 })
      .limit(10);

    const products = await Product.find({ supplier: id })
      .select('name sku stock.current price.retail')
      .limit(10);

    const payments = await Payment.find({ 
      supplier: id, 
      type: 'supplier_payment' 
    })
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate performance metrics
    const totalOrders = purchaseOrders.length;
    const totalSpent = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const outstandingBalance = totalSpent - totalPaid;

    // Calculate on-time delivery rate
    const deliveredOrders = purchaseOrders.filter(po => 
      po.status === 'received' && po.actualDelivery
    );
    const onTimeDeliveries = deliveredOrders.filter(po => {
      if (!po.expectedDelivery || !po.actualDelivery) return false;
      return new Date(po.actualDelivery) <= new Date(po.expectedDelivery);
    });
    const onTimeDeliveryRate = deliveredOrders.length > 0 
      ? (onTimeDeliveries.length / deliveredOrders.length) * 100 
      : 0;

  return res.json({
      success: true,
      data: {
        supplier,
        stats: {
          totalOrders,
          totalSpent,
          totalPaid,
          outstandingBalance,
          onTimeDeliveryRate: Math.round(onTimeDeliveryRate)
        },
        recentOrders: purchaseOrders,
        products,
        recentPayments: payments
      }
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to fetch supplier'
    });
  }
};

// Create new supplier
export const createSupplier = async (req: Request, res: Response) => {
  try {
    const supplierData = req.body;

    // Generate supplier code if not provided
    if (!supplierData.supplierCode) {
      const lastSupplier = await Supplier.findOne().sort({ supplierCode: -1 });
      const lastCode = lastSupplier?.supplierCode || 'SUP0000';
      const lastNumber = parseInt(lastCode.replace('SUP', ''));
      supplierData.supplierCode = `SUP${String(lastNumber + 1).padStart(4, '0')}`;
    }

    // Check if supplier code already exists
    const existingSupplier = await Supplier.findOne({ 
      supplierCode: supplierData.supplierCode 
    });
    
    if (existingSupplier) {
      return res.status(400).json({
        success: false,
        message: 'Supplier code already exists'
      });
    }

    const supplier = new Supplier(supplierData);
    await supplier.save();

  return res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully'
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to create supplier'
    });
  }
};

// Update supplier
export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('categories', 'name');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

  return res.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully'
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to update supplier'
    });
  }
};

// Delete supplier
export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if supplier has associated products or purchase orders
    const hasProducts = await Product.exists({ supplier: id });
    const hasPurchaseOrders = await PurchaseOrder.exists({ supplier: id });

    if (hasProducts || hasPurchaseOrders) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete supplier with associated products or purchase orders'
      });
    }

    const supplier = await Supplier.findByIdAndDelete(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

  return res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to delete supplier'
    });
  }
};

// Get supplier statistics
export const getSupplierStats = async (_req: Request, res: Response) => {
  try {
    const totalSuppliers = await Supplier.countDocuments();
    const activeSuppliers = await Supplier.countDocuments({ status: 'active', isActive: true });
    const inactiveSuppliers = await Supplier.countDocuments({ 
      $or: [{ status: 'inactive' }, { isActive: false }] 
    });

    // Get top suppliers by total spent
    const topSuppliers = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: '$supplier',
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      {
        $unwind: '$supplier'
      },
      {
        $project: {
          name: '$supplier.name',
          supplierCode: '$supplier.supplierCode',
          totalSpent: 1,
          orderCount: 1
        }
      }
    ]);

    // Get outstanding payments
    const outstandingPayments = await PurchaseOrder.aggregate([
      {
        $match: { paymentStatus: { $in: ['pending', 'partial'] } }
      },
      {
        $group: {
          _id: '$supplier',
          outstandingAmount: { $sum: { $subtract: ['$total', '$paidAmount'] } }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      {
        $unwind: '$supplier'
      },
      {
        $project: {
          name: '$supplier.name',
          supplierCode: '$supplier.supplierCode',
          outstandingAmount: 1
        }
      },
      {
        $sort: { outstandingAmount: -1 }
      },
      {
        $limit: 5
      }
    ]);

  return res.json({
      success: true,
      data: {
        totalSuppliers,
        activeSuppliers,
        inactiveSuppliers,
        topSuppliers,
        outstandingPayments
      }
    });
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to fetch supplier statistics'
    });
  }
};

// Update supplier performance metrics
export const updateSupplierPerformance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { onTimeDelivery, qualityRating, priceCompetitiveness } = req.body;

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      {
        'performance.onTimeDelivery': onTimeDelivery,
        'performance.qualityRating': qualityRating,
        'performance.priceCompetitiveness': priceCompetitiveness
      },
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

  return res.json({
      success: true,
      data: supplier,
      message: 'Supplier performance updated successfully'
    });
  } catch (error) {
    console.error('Error updating supplier performance:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to update supplier performance'
    });
  }
};
