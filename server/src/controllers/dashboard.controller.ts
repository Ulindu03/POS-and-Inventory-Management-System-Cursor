import { Response } from 'express';
import { Sale } from '../models/Sale.model';
import { Product } from '../models/Product.model';
import { Customer } from '../models/Customer.model';
import { AuthRequest } from '../middleware/auth.middleware';

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const currStart = startOfMonth(now);
    const nextStart = startOfNextMonth(now);
    const prevStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    // Build base filters based on user role
    const userRole = req.user?.role;
    const isSalesRole = userRole === 'cashier' || userRole === 'sales_rep';
    
    // For sales roles, filter by user's sales only
    const baseFilter = isSalesRole ? { cashier: req.user?.userId } : {};

    const [
      totalRevenueAgg,
      totalOrders,
      totalProducts,
      totalCustomers,
      currentMonthRevenueAgg,
      prevMonthRevenueAgg
    ] = await Promise.all([
      Sale.aggregate([{ $match: baseFilter }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Sale.countDocuments(baseFilter),
      Product.countDocuments(),
      Customer.countDocuments(),
      Sale.aggregate([
        { $match: { ...baseFilter, createdAt: { $gte: currStart, $lt: nextStart } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Sale.aggregate([
        { $match: { ...baseFilter, createdAt: { $gte: prevStart, $lt: currStart } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    const totalSales = totalRevenueAgg[0]?.total || 0;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const curr = currentMonthRevenueAgg[0]?.total || 0;
    const prev = prevMonthRevenueAgg[0]?.total || 0;
    let monthlyGrowth = 0;
    if (prev > 0) {
      monthlyGrowth = ((curr - prev) / prev) * 100;
    } else if (curr > 0) {
      monthlyGrowth = 100;
    }

    return res.json({
      success: true,
      data: {
        totalSales,
        totalOrders,
        totalProducts,
        totalCustomers,
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue)
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[dashboard.stats] error', err);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard stats' });
  }
};

export const getSalesChart = async (req: AuthRequest, res: Response) => {
  try {
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'weekly';
    const now = new Date();
    let days = 7;
    if (period === 'daily') days = 1;
    if (period === 'monthly') days = 30;
    const start = new Date(now);
    start.setDate(now.getDate() - (days - 1));

    // Build base filters based on user role
    const userRole = req.user?.role;
    const isSalesRole = userRole === 'cashier' || userRole === 'sales_rep';
    const baseFilter = isSalesRole ? { cashier: req.user?.userId } : {};

    const agg = await Sale.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sales: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const byDate: Record<string, { sales: number; orders: number }> = {};
    agg.forEach((r: any) => { byDate[r._id] = { sales: r.sales, orders: r.orders }; });

    const data: Array<{ name: string; sales: number; orders: number }> = [];
    const d = new Date(start);
    while (d <= now) {
      const key = d.toISOString().slice(0, 10);
      const day = d.getDay();
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const name = period === 'monthly' ? `${d.getDate()}` : dayNames[day];
      data.push({ name, sales: byDate[key]?.sales || 0, orders: byDate[key]?.orders || 0 });
      d.setDate(d.getDate() + 1);
    }

    return res.json({ success: true, data });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[dashboard.salesChart] error', err);
    return res.status(500).json({ success: false, message: 'Failed to load sales chart' });
  }
};

export const getTopProducts = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 5;
    
    // Build base filters based on user role
    const userRole = req.user?.role;
    const isSalesRole = userRole === 'cashier' || userRole === 'sales_rep';
    const baseFilter = isSalesRole ? { cashier: req.user?.userId } : {};
    
    const agg = await Sale.aggregate([
      { $match: baseFilter },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', sales: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' } } },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { _id: 0, name: { $ifNull: ['$product.name.en', { $ifNull: ['$product.name', '$product.sku'] }] }, sales: 1, revenue: 1 } }
    ]);
    return res.json({ success: true, data: agg });
  } catch (err) {
    console.error('[dashboard.topProducts] error', err);
    return res.status(500).json({ success: false, message: 'Failed to load top products' });
  }
};

export const getCategoryDistribution = async (req: AuthRequest, res: Response) => {
  try {
    // Build base filters based on user role
    const userRole = req.user?.role;
    const isSalesRole = userRole === 'cashier' || userRole === 'sales_rep';
    const baseFilter = isSalesRole ? { cashier: req.user?.userId } : {};
    
    const agg = await Sale.aggregate([
      { $match: baseFilter },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $group: { _id: '$category._id', name: { $first: { $ifNull: ['$category.name.en', '$category.name'] } }, value: { $sum: '$items.total' } } },
      { $sort: { value: -1 } }
    ]);
    const data = agg.map((r: any) => ({ name: r.name, value: r.value }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[dashboard.categoryDist] error', err);
    return res.status(500).json({ success: false, message: 'Failed to load category distribution' });
  }
};

export const getRecentSales = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 5;
    
    // Build base filters based on user role
    const userRole = req.user?.role;
    const isSalesRole = userRole === 'cashier' || userRole === 'sales_rep';
    const baseFilter = isSalesRole ? { cashier: req.user?.userId } : {};
    
    const sales = await Sale.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('customer', 'name')
      .select('invoiceNo total status createdAt customer')
      .lean();

    const data = sales.map((s: any) => ({
      id: String(s._id),
      invoiceNo: s.invoiceNo,
      customer: (s.customer && (s.customer.name?.en || s.customer.name)) || 'Walk-in',
      total: s.total,
      status: s.status,
      createdAt: s.createdAt
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[dashboard.recentSales] error', err);
    return res.status(500).json({ success: false, message: 'Failed to load recent sales' });
  }
};


