import { Request, Response } from 'express';
import { Sale } from '../models/Sale.model';
import { Product } from '../models/Product.model';
import { Customer } from '../models/Customer.model';
import { PurchaseOrder } from '../models/PurchaseOrder.model';
import { StockMovement } from '../models/StockMovement.model';
import { Delivery } from '../models/Delivery.model';
// Removed unused imports Damage and User to satisfy TS no-unused-vars during build

// Sales Reports
export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const { 
      startDate, 
      endDate, 
      period = 'daily',
      customerId,
      productId,
  // do not extract unused: categoryId 
    } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Build filter
    const filter: any = {
      createdAt: { $gte: start, $lte: end }
    };

    if (customerId) filter.customer = customerId;
    if (productId) filter['items.product'] = productId;

    // Get sales data
    const sales = await Sale.find(filter)
      .populate('customer', 'name customerCode')
      .populate('items.product', 'name sku category')
      .sort({ createdAt: -1 });

    // Calculate summary
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalCost = sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + ((item.cost || 0) * item.quantity), 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Group by period
    const groupedSales = groupSalesByPeriod(sales, (period as string) || 'monthly');

    res.json({
      success: true,
      data: {
        summary: {
          totalSales,
          totalRevenue,
          totalCost,
          totalProfit,
          profitMargin: Math.round(profitMargin * 100) / 100,
          averageOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0
        },
        periodData: groupedSales,
        sales: sales.slice(0, 100) // Limit for performance
      },
      period,
      dateRange: { startDate: start, endDate: end }
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sales report'
    });
  }
};

// Inventory Reports
export const getInventoryReport = async (req: Request, res: Response) => {
  try {
    const { 
      categoryId,
      supplierId,
      lowStock = false,
      outOfStock = false
    } = req.query;

    // Build filter
    const filter: any = {};
    if (categoryId) filter.category = categoryId;
    if (supplierId) filter.supplier = supplierId;

    // Get products
    const products = await Product.find(filter)
      .populate('category', 'name')
      .populate('supplier', 'name supplierCode')
      .sort({ 'stock.current': 1 });

    // Filter by stock status
    let filteredProducts = products;
    if (lowStock === 'true') {
      filteredProducts = products.filter(p => 
        (p.stock?.current || 0) <= ((p.stock && 'reorderPoint' in p.stock ? (p.stock as any).reorderPoint : 0) || 0) && (p.stock?.current || 0) > 0
      );
    }
    if (outOfStock === 'true') {
      filteredProducts = products.filter(p => (p.stock?.current || 0) === 0);
    }

    // Calculate inventory value
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => 
      sum + ((product.stock?.current || 0) * (product.price?.cost || 0)), 0
    );
    const totalRetailValue = products.reduce((sum, product) => 
      sum + ((product.stock?.current || 0) * (product.price?.retail || 0)), 0
    );

    // Stock status counts
  const outOfStockCount = products.filter(p => (p.stock?.current || 0) === 0).length;
    const lowStockCount = products.filter(p => 
      (p.stock?.current || 0) <= ((p.stock && 'reorderPoint' in p.stock ? (p.stock as any).reorderPoint : 0) || 0) && (p.stock?.current || 0) > 0
    ).length;

    // Category breakdown
    const categoryBreakdown = await Product.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $group: {
          _id: '$category',
          categoryName: { $first: { $arrayElemAt: ['$categoryInfo.name.en', 0] } },
          productCount: { $sum: 1 },
          totalStock: { $sum: '$stock.current' },
          totalValue: { $sum: { $multiply: ['$stock.current', '$price.cost'] } }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          totalValue,
          totalRetailValue,
          outOfStockCount,
          lowStockCount,
          averageStockValue: totalProducts > 0 ? totalValue / totalProducts : 0
        },
        categoryBreakdown,
        products: filteredProducts
      }
    });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate inventory report'
    });
  }
};

// Customer Reports
export const getCustomerReport = async (req: Request, res: Response) => {
  try {
    const { 
      startDate, 
      endDate,
      customerType,
      minPurchases = 0
    } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(0);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Build filter
    const filter: any = {};
    if (customerType) filter.type = customerType;

    // Get customers with purchase data
    const customers = await Customer.find(filter);

    // Get customer analytics
    const customerAnalytics = await Promise.all(
      customers.map(async (customer) => {
        const sales = await Sale.find({
          customer: customer._id,
          createdAt: { $gte: start, $lte: end }
        });

        const totalPurchases = sales.length;
        const totalSpent = sales.reduce((sum, sale) => sum + sale.total, 0);
  let lastPurchase: Date | null = null;
  if (sales.length > 0) {
          const sorted = [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          lastPurchase = sorted[0].createdAt as any;
  }

        return {
          customer,
          totalPurchases,
          totalSpent,
          averageOrderValue: totalPurchases > 0 ? totalSpent / totalPurchases : 0,
          lastPurchase
        };
      })
    );

    // Filter by minimum purchases
    const filteredCustomers = customerAnalytics.filter(c => 
      c.totalPurchases >= Number(minPurchases)
    );

    // Sort by total spent
    filteredCustomers.sort((a, b) => b.totalSpent - a.totalSpent);

    // Calculate summary
    const totalCustomers = filteredCustomers.length;
    const totalRevenue = filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
    const averageSpentPerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    // Top customers
    const topCustomers = filteredCustomers.slice(0, 10);

    // Customer type distribution
    const typeDistribution = await Customer.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalLoyaltyPoints: { $sum: '$loyaltyPoints' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalCustomers,
          totalRevenue,
          averageSpentPerCustomer,
          totalLoyaltyPoints: customers.reduce((sum, c) => sum + c.loyaltyPoints, 0)
        },
        topCustomers,
        typeDistribution,
        customers: filteredCustomers
      },
      dateRange: { startDate: start, endDate: end }
    });
  } catch (error) {
    console.error('Error generating customer report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate customer report'
    });
  }
};

// Supplier Performance Report
export const getSupplierReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, supplierId } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(0);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Build filter
    const filter: any = {
      orderDate: { $gte: start, $lte: end }
    };
    if (supplierId) filter.supplier = supplierId;

    // Get purchase orders
    const purchaseOrders = await PurchaseOrder.find(filter)
      .populate('supplier', 'name supplierCode contactPerson')
      .sort({ orderDate: -1 });

    // Group by supplier
    const supplierPerformance = await PurchaseOrder.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$supplier',
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          onTimeDeliveries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$actualDelivery', null] },
                    { $ne: ['$expectedDelivery', null] },
                    { $lte: ['$actualDelivery', '$expectedDelivery'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'received'] }, 1, 0] }
          }
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
        $addFields: {
          onTimeDeliveryRate: {
            $cond: [
              { $gt: ['$completedOrders', 0] },
              { $multiply: [{ $divide: ['$onTimeDeliveries', '$completedOrders'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders: purchaseOrders.length,
          totalAmount: purchaseOrders.reduce((sum, po) => sum + po.total, 0),
          uniqueSuppliers: supplierPerformance.length,
          averageOrderValue: purchaseOrders.length > 0 
            ? purchaseOrders.reduce((sum, po) => sum + po.total, 0) / purchaseOrders.length 
            : 0
        },
        supplierPerformance,
        recentOrders: purchaseOrders.slice(0, 20)
      },
      dateRange: { startDate: start, endDate: end }
    });
  } catch (error) {
    console.error('Error generating supplier report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate supplier report'
    });
  }
};

// Profit & Loss Report
export const getProfitLossReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, period = 'monthly' } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get sales data
    const sales = await Sale.find({
      createdAt: { $gte: start, $lte: end }
    });

    // Get purchase orders data
    const purchaseOrders = await PurchaseOrder.find({
      orderDate: { $gte: start, $lte: end }
    });

    // Calculate revenue
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCOGS = sales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => 
        itemSum + ((item.cost || 0) * item.quantity), 0
      ), 0
    );

    // Calculate expenses (purchase orders)
    const totalPurchases = purchaseOrders.reduce((sum, po) => sum + po.total, 0);

    // Calculate gross profit
    const grossProfit = totalRevenue - totalCOGS;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Net profit (simplified - actual would include operating expenses)
    const netProfit = grossProfit;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Group by period
    const periodData = groupDataByPeriod(sales, purchaseOrders, period as string);

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalCOGS,
          totalPurchases,
          grossProfit,
          grossProfitMargin: Math.round(grossProfitMargin * 100) / 100,
          netProfit,
          netProfitMargin: Math.round(netProfitMargin * 100) / 100
        },
        periodData
      },
      period,
      dateRange: { startDate: start, endDate: end }
    });
  } catch (error) {
    console.error('Error generating profit/loss report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate profit/loss report'
    });
  }
};

// Stock Movement Report
export const getStockMovementReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, productId, type } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(0);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Build filter
    const filter: any = {
      createdAt: { $gte: start, $lte: end }
    };
    if (productId) filter.product = productId;
    if (type) filter.type = type;

    // Get stock movements
    const movements = await StockMovement.find(filter)
      .populate('product', 'name sku')
      .sort({ createdAt: -1 })
      .limit(500);

    // Group by type
    const typeBreakdown = await StockMovement.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    // Calculate net changes by product
    const productChanges = await StockMovement.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$product',
          netChange: { $sum: '$quantity' },
          totalMovements: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          productName: '$product.name.en',
          sku: '$product.sku',
          netChange: 1,
          totalMovements: 1
        }
      },
      { $sort: { totalMovements: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalMovements: movements.length,
          typeBreakdown
        },
        movements,
        productChanges
      },
      dateRange: { startDate: start, endDate: end }
    });
  } catch (error) {
    console.error('Error generating stock movement report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate stock movement report'
    });
  }
};

// Best/Worst Selling Products
export const getTopProductsReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, limit = 10, sort = 'best' } = req.query as any;
    const start = startDate ? new Date(String(startDate)) : new Date(0);
    const end = endDate ? new Date(String(endDate)) : new Date();

    const pipeline: any[] = [
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          totalProfit: { $sum: { $subtract: ['$items.total', { $multiply: ['$items.cost', '$items.quantity'] }] } }
        }
      },
      {
        $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' }
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 1,
          productName: { $ifNull: ['$product.name.en', '$product.name'] },
          sku: '$product.sku',
          totalQuantity: 1,
          totalRevenue: 1,
          totalProfit: 1
        }
      },
      { $sort: { totalQuantity: sort === 'worst' ? 1 : -1 } },
      { $limit: Number(limit) }
    ];

    const data = await Sale.aggregate(pipeline);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error generating top products report:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate top products report' });
  }
};

// Staff Performance (cashiers / sales reps)
export const getStaffPerformanceReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query as any;
    const start = startDate ? new Date(String(startDate)) : new Date(0);
    const end = endDate ? new Date(String(endDate)) : new Date();

    const pipeline: any[] = [
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$cashier',
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          itemsSold: { $sum: { $sum: '$items.quantity' } }
        }
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          staffId: '$_id',
          name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          username: '$user.username',
          role: '$user.role',
          totalSales: 1,
          totalRevenue: 1,
          itemsSold: 1,
          averageOrderValue: { $cond: [{ $gt: ['$totalSales', 0] }, { $divide: ['$totalRevenue', '$totalSales'] }, 0] }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ];

    const performance = await Sale.aggregate(pipeline);
    const summary = {
      staffCount: performance.length,
      totalSales: performance.reduce((s: number, p: any) => s + p.totalSales, 0),
      totalRevenue: performance.reduce((s: number, p: any) => s + p.totalRevenue, 0),
      averageOrderValue:
        performance.reduce((s: number, p: any) => s + p.totalRevenue, 0) /
        (performance.reduce((s: number, p: any) => s + p.totalSales, 0) || 1)
    };

    return res.json({ success: true, data: { summary, performance } });
  } catch (error) {
    console.error('Error generating staff performance report:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate staff performance report' });
  }
};

// Delivery Performance
export const getDeliveryPerformanceReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, salesRep } = req.query as any;
    const start = startDate ? new Date(String(startDate)) : new Date(0);
    const end = endDate ? new Date(String(endDate)) : new Date();

    // Include records where either scheduledDate OR createdAt is in range.
    // This helps when scheduledDate is not set but the delivery exists in the period.
    const dateMatch: any = { $gte: start, $lte: end };
    const filter: any = { $or: [ { scheduledDate: dateMatch }, { createdAt: dateMatch } ] };
    if (salesRep) filter.salesRep = salesRep;

    const deliveries = await Delivery.find(filter)
      .populate('salesRep', 'firstName lastName username')
      .sort({ scheduledDate: -1 });

    const total = deliveries.length;
    const statusCounts = deliveries.reduce(
      (acc: any, d: any) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
      },
      {}
    );
    const completed = statusCounts['completed'] || 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const totalDamaged = deliveries.reduce((s: number, d: any) => s + (d.totalDamaged || 0), 0);

    // Group by salesRep
    const byRep = await Delivery.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$salesRep',
          totalTrips: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalDamaged: { $sum: '$totalDamaged' }
        }
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          salesRepId: '$_id',
          name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          username: '$user.username',
          totalTrips: 1,
          completed: 1,
          completionRate: { $cond: [{ $gt: ['$totalTrips', 0] }, { $multiply: [{ $divide: ['$completed', '$totalTrips'] }, 100] }, 0] },
          totalDamaged: 1
        }
      },
      { $sort: { completionRate: -1 } }
    ]);

    return res.json({ success: true, data: { summary: { total, completionRate, statusCounts, totalDamaged }, byRep, recent: deliveries.slice(0, 50) } });
  } catch (error) {
    console.error('Error generating delivery performance report:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate delivery performance report' });
  }
};

// Inventory Turnover (approximation)
export const getInventoryTurnoverReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query as any;
    const start = startDate ? new Date(String(startDate)) : new Date(0);
    const end = endDate ? new Date(String(endDate)) : new Date();

    const sales = await Sale.find({ createdAt: { $gte: start, $lte: end } });
    const totalCOGS = sales.reduce(
      (sum, sale) => sum + sale.items.reduce((s, it) => s + ((it.cost || 0) * it.quantity), 0),
      0
    );
    const products = await Product.find({});
    const currentInventoryValue = products.reduce((s, p: any) => s + ((p.stock?.current || 0) * (p.price?.cost || 0)), 0);
    const turnover = currentInventoryValue > 0 ? totalCOGS / currentInventoryValue : 0;

    return res.json({ success: true, data: { summary: { totalCOGS, currentInventoryValue, turnover } } });
  } catch (error) {
    console.error('Error generating inventory turnover report:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate inventory turnover report' });
  }
};

// Helper function to group sales by period
function groupSalesByPeriod(sales: any[], period: string) {
  const grouped: { [key: string]: any } = {};

  sales.forEach(sale => {
    const date = new Date(sale.createdAt);
    let key: string;

    switch (period) {
      case 'daily': {
        key = date.toISOString().split('T')[0];
        break;
      }
      case 'weekly': {
        const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      }
      case 'monthly': {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      }
      default: {
        key = date.toISOString().split('T')[0];
      }
    }

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        sales: 0,
        revenue: 0,
        profit: 0
      };
    }

    grouped[key].sales += 1;
    grouped[key].revenue += sale.total;
    grouped[key].profit += sale.items.reduce((sum: number, item: any) => 
      sum + (((item.price || 0) - (item.cost || 0)) * item.quantity), 0
    );
  });

  return Object.values(grouped).sort((a: any, b: any) => a.period.localeCompare(b.period));
}

// Helper function to group P&L data by period
function groupDataByPeriod(sales: any[], purchases: any[], period: string) {
  const grouped: { [key: string]: any } = {};

  // Process sales
  sales.forEach(sale => {
    const date = new Date(sale.createdAt);
    const key = getPeriodKey(date, period);

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        revenue: 0,
        cogs: 0,
        purchases: 0
      };
    }

    grouped[key].revenue += sale.total;
    grouped[key].cogs += sale.items.reduce((sum: number, item: any) => 
      sum + ((item.cost || 0) * item.quantity), 0
    );
  });

  // Process purchases
  purchases.forEach(purchase => {
    const date = new Date(purchase.orderDate);
    const key = getPeriodKey(date, period);

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        revenue: 0,
        cogs: 0,
        purchases: 0
      };
    }

    grouped[key].purchases += purchase.total;
  });

  // Calculate profit for each period
  Object.values(grouped).forEach((item: any) => {
    item.grossProfit = item.revenue - item.cogs;
    item.netProfit = item.grossProfit; // Simplified
  });

  return Object.values(grouped).sort((a: any, b: any) => a.period.localeCompare(b.period));
}

function getPeriodKey(date: Date, period: string): string {
  switch (period) {
    case 'daily': {
      return date.toISOString().split('T')[0];
    }
    case 'weekly': {
      const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
      return weekStart.toISOString().split('T')[0];
    }
    case 'monthly': {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    default: {
      return date.toISOString().split('T')[0];
    }
  }
}
