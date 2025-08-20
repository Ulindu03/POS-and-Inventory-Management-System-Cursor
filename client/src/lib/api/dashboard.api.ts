import client from './client';

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  monthlyGrowth: number;
  averageOrderValue: number;
}

export interface SalesData {
  name: string;
  sales: number;
  orders: number;
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
}

export interface CategoryData {
  name: string;
  value: number;
  color?: string;
}

export interface RecentSale {
  id: string;
  invoiceNo: string;
  customer: string;
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await client.get('/dashboard/stats');
    return data.data;
  },

  getSalesChart: async (period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<SalesData[]> => {
    const { data } = await client.get('/dashboard/sales-chart', { params: { period } });
    return data.data;
  },

  getTopProducts: async (limit: number = 5): Promise<TopProduct[]> => {
    const { data } = await client.get('/dashboard/top-products', { params: { limit } });
    return data.data;
  },

  getCategoryDistribution: async (): Promise<CategoryData[]> => {
    const { data } = await client.get('/dashboard/category-distribution');
    return data.data;
  },

  getRecentSales: async (limit: number = 10): Promise<RecentSale[]> => {
    const { data } = await client.get('/dashboard/recent-sales', { params: { limit } });
    return data.data;
  }
};
