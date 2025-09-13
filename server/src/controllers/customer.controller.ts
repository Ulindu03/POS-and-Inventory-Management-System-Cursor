import { Request, Response } from 'express';
import { Customer } from '../models/Customer.model';
import { Sale } from '../models/Sale.model';
import { Counter } from '../models/Counter.model';

// Quick lookup by phone (exact match)
export const lookupCustomerByPhone = async (req: Request, res: Response) => {
  try {
    const q = req.query.phone;
    let rawCandidate = '';
    if (typeof q === 'string') {
      rawCandidate = q;
    } else if (Array.isArray(q) && typeof q[0] === 'string') {
      rawCandidate = q[0];
    }
    const raw = rawCandidate.trim();
    if (!raw) return res.status(400).json({ success: false, message: 'Phone required' });
    const digits = raw.replace(/\D/g,'');
    console.log('Phone lookup debug:', { raw, digits });
    const variants: string[] = [];
    if (digits) {
      // Local (0XXXXXXXXX) and international (94XXXXXXXXX / +94XXXXXXXXX) variants
      if (digits.length === 10 && digits.startsWith('0')) {
        const local = digits; // 0XXXXXXXXX
        const intlNoPlus = '94' + digits.slice(1); // 94XXXXXXXXX
        const intlPlus = '+94' + digits.slice(1); // +94XXXXXXXXX
        variants.push(local, intlNoPlus, intlPlus);
      } else if (digits.length === 11 && digits.startsWith('94')) {
        const intlNoPlus = digits; // 94XXXXXXXXX
        const local = '0' + digits.slice(2); // 0XXXXXXXXX
        const intlPlus = '+' + digits; // +94XXXXXXXXX
        variants.push(local, intlNoPlus, intlPlus);
      } else if (digits.length === 9) { // Missing leading 0, assume local
        const local = '0' + digits;
        const intlNoPlus = '94' + digits;
        const intlPlus = '+94' + digits;
        variants.push(local, intlNoPlus, intlPlus, digits);
      } else {
        variants.push(digits);
      }
    }
    const unique = variants.filter((v, i) => variants.indexOf(v) === i);
    // Split variants with plus sign (only match raw phone field) vs canonical (digits only / local)
    const plusVariants = unique.filter(v => v.startsWith('+'));
    const nonPlus = unique.map(v => v.startsWith('+') ? v.slice(1) : v); // remove + for canonical comparison

    console.log('Search variants:', { unique, plusVariants, nonPlus });

    let customer = await Customer.findOne({
      $or: [
        { phone: { $in: unique } }, // any exact stored phone
        { phone: { $in: plusVariants } },
        { canonicalPhone: { $in: nonPlus } }
      ]
    }).select('name phone canonicalPhone email nic customerCode type');

    console.log('First query result:', customer ? 'FOUND' : 'NOT FOUND');

    // Fallback: partial match last 7 digits if still not found and we have a reasonable digits string
    if (!customer && digits.length >= 7) {
      const last7 = digits.slice(-7);
      console.log('Trying fallback with last 7 digits:', last7);
      customer = await Customer.findOne({ phone: { $regex: last7 + '$' } }).select('name phone canonicalPhone email nic customerCode type');
      console.log('Fallback result:', customer ? 'FOUND' : 'NOT FOUND');
    }

    if (!customer) {
      console.log('Final result: NOT FOUND');
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    console.log('Final result: FOUND -', { name: customer.name, phone: customer.phone, canonicalPhone: customer.canonicalPhone });
    return res.json({ success: true, data: customer });
  } catch (e:any) {
    return res.status(500).json({ success:false, message: e.message || 'Lookup failed' });
  }
};

// Get all customers with pagination and filters
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { customerCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const customers = await Customer.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const total = await Customer.countDocuments(filter);

    // Calculate additional stats for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const sales = await Sale.find({ customer: customer._id });
        const totalPurchases = sales.length;
        const totalSpent = sales.reduce((sum, sale) => sum + sale.total, 0);
        let lastPurchase = null as Date | null;
        if (sales.length > 0) {
          // Copy then sort to avoid mutating original array (lint friendly)
          const sorted = [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          lastPurchase = sorted[0].createdAt;
        }

        return {
          ...customer.toObject(),
          totalPurchases,
          totalSpent,
          lastPurchase
        };
      })
    );

    res.json({
      success: true,
      data: customersWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get single customer by ID
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id).select('-__v');
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get customer's purchase history
    const sales = await Sale.find({ customer: customer._id })
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .limit(20);

    const totalPurchases = sales.length;
    const totalSpent = sales.reduce((sum, sale) => sum + sale.total, 0);
    const lastPurchase = sales.length > 0 ? sales[0].createdAt : null;

    const customerWithStats = {
      ...customer.toObject(),
      totalPurchases,
      totalSpent,
      lastPurchase
    };

  return res.json({
      success: true,
      data: customerWithStats,
      purchases: sales
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new customer
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const customerData = req.body;
    if (typeof customerData.email === 'string' && customerData.email.trim() === '') {
      delete customerData.email;
    }

    // Generate robust sequential customer code using Counter collection (atomic)
    if (!customerData.customerCode) {
      // Determine a safe base from latest existing record (best-effort)
      const last = await Customer.findOne().sort({ createdAt: -1 }).select('customerCode').lean();
      const lastNum = last?.customerCode?.match(/(\d+)$/)?.[1];
      const base = lastNum ? parseInt(lastNum, 10) : 0;

      let seqDoc = await Counter.findOneAndUpdate(
        { key: 'customer_code' },
        { $inc: { seq: 1 } },
        { new: true }
      );
      if (!seqDoc) {
        try {
          await Counter.create({ key: 'customer_code', seq: base + 1 });
        } catch (e: any) {
          if (!(e && e.code === 11000)) throw e;
        }
        seqDoc = await Counter.findOne({ key: 'customer_code' }).lean() as any;
      }
      const seq = (seqDoc?.seq ?? base + 1);
      const safeSeq = seq < base + 1 ? (base + 1) : seq;
      if (seq < base + 1) {
        try { await Counter.updateOne({ key: 'customer_code', seq: { $lt: base + 1 } }, { $set: { seq: base + 1 } }); } catch {}
      }
      customerData.customerCode = `CUST-${String(safeSeq).padStart(3, '0')}`;
    }

    // Check if customer code already exists
    const existingCustomer = await Customer.findOne({ 
      customerCode: customerData.customerCode 
    });
    
    if (existingCustomer) {
  return res.status(400).json({
        success: false,
        message: 'Customer code already exists'
      });
    }

    const customer = new Customer(customerData);
    await customer.save();

  return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    console.error('Error creating customer:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update customer
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    if (updateData && Object.prototype.hasOwnProperty.call(updateData, 'email')) {
      if (typeof updateData.email === 'string' && updateData.email.trim() === '') updateData.email = undefined;
    }

    // Remove fields that shouldn't be updated
    delete updateData.customerCode;
    delete updateData.createdAt;

    const customer = await Customer.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    return res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete customer
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByIdAndDelete(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    return res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update loyalty points
export const updateLoyaltyPoints = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { points, action, reason } = req.body; // action: 'add', 'subtract', 'set'

    const customer = await Customer.findById(id);
    
    if (!customer) {
  return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    let newPoints = customer.loyaltyPoints;

    switch (action) {
      case 'add':
        newPoints += points;
        break;
      case 'subtract':
        newPoints = Math.max(0, newPoints - points);
        break;
      case 'set':
        newPoints = Math.max(0, points);
        break;
      default:
  return res.status(400).json({
          success: false,
          message: 'Invalid action. Use "add", "subtract", or "set"'
        });
    }

    customer.loyaltyPoints = newPoints;
    await customer.save();

  return res.json({
      success: true,
      message: 'Loyalty points updated successfully',
      data: {
        customerId: customer._id,
        previousPoints: customer.loyaltyPoints,
        newPoints,
        action,
        reason
      }
    });
  } catch (error) {
    console.error('Error updating loyalty points:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to update loyalty points',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Redeem loyalty points
export const redeemLoyaltyPoints = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { points, redemptionType, description } = req.body;

    const customer = await Customer.findById(id);
    
    if (!customer) {
  return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    if (customer.loyaltyPoints < points) {
  return res.status(400).json({
        success: false,
        message: 'Insufficient loyalty points'
      });
    }

    customer.loyaltyPoints -= points;
    await customer.save();

    // Here you would typically create a redemption record
    // For now, we'll just return the updated customer

  return res.json({
      success: true,
      message: 'Loyalty points redeemed successfully',
      data: {
        customerId: customer._id,
        pointsRedeemed: points,
        remainingPoints: customer.loyaltyPoints,
        redemptionType,
        description
      }
    });
  } catch (error) {
    console.error('Error redeeming loyalty points:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to redeem loyalty points',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get customer statistics
export const getCustomerStats = async (_req: Request, res: Response) => {
  try {
    const totalCustomers = await Customer.countDocuments();
    const activeCustomers = await Customer.countDocuments({ isActive: true });
    const totalLoyaltyPoints = await Customer.aggregate([
      { $group: { _id: null, total: { $sum: '$loyaltyPoints' } } }
    ]);

    const typeDistribution = await Customer.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const recentCustomers = await Customer.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name customerCode createdAt');

  return res.json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        totalLoyaltyPoints: totalLoyaltyPoints[0]?.total || 0,
        typeDistribution,
        recentCustomers
      }
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
  return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
