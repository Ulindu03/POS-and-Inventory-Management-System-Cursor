import { Request, Response } from 'express';
import { Customer } from '../models/Customer.model';
import { Sale } from '../models/Sale.model';

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
        const lastPurchase = sales.length > 0 
          ? sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
          : null;

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

    // Generate customer code if not provided
    if (!customerData.customerCode) {
      const lastCustomer = await Customer.findOne().sort({ customerCode: -1 });
      const lastNumber = lastCustomer 
        ? parseInt(lastCustomer.customerCode.split('-')[1]) 
        : 0;
      customerData.customerCode = `CUST-${String(lastNumber + 1).padStart(3, '0')}`;
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
