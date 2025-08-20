import client from './client';

export interface Customer {
  _id: string;
  customerCode: string;
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  type: 'retail' | 'wholesale' | 'corporate';
  creditLimit: number;
  creditUsed: number;
  loyaltyPoints: number;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  taxId?: string;
  birthday?: string;
  notes?: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchase: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCustomerData {
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  type: 'retail' | 'wholesale' | 'corporate';
  creditLimit: number;
  loyaltyPoints: number;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  taxId?: string;
  birthday?: string;
  notes?: string;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  isActive?: boolean;
}

export interface CustomerPurchase {
  _id: string;
  invoiceNo: string;
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
  items: Array<{
    product: string;
    quantity: number;
    price: number;
  }>;
}

export interface LoyaltyTransaction {
  _id: string;
  customerId: string;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus';
  points: number;
  description: string;
  orderId?: string;
  createdAt: string;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  totalLoyaltyPoints: number;
  averageLoyaltyPoints: number;
  topCustomerTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  loyaltyTierDistribution: Array<{
    tier: string;
    count: number;
    percentage: number;
  }>;
}

export const customersApi = {
  // Get all customers with optional filters
  getAll: async (params?: {
    search?: string;
    type?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ data: Customer[]; total: number; page: number; totalPages: number }> => {
    const { data } = await client.get('/customers', { params });
    return data.data;
  },

  // Get customer by ID
  getById: async (id: string): Promise<Customer> => {
    const { data } = await client.get(`/customers/${id}`);
    return data.data;
  },

  // Get customer by customer code
  getByCode: async (code: string): Promise<Customer> => {
    const { data } = await client.get(`/customers/code/${code}`);
    return data.data;
  },

  // Create new customer
  create: async (customerData: CreateCustomerData): Promise<Customer> => {
    const { data } = await client.post('/customers', customerData);
    return data.data;
  },

  // Update customer
  update: async (id: string, customerData: UpdateCustomerData): Promise<Customer> => {
    const { data } = await client.put(`/customers/${id}`, customerData);
    return data.data;
  },

  // Delete customer (soft delete)
  delete: async (id: string): Promise<void> => {
    await client.delete(`/customers/${id}`);
  },

  // Get customer purchase history
  getPurchaseHistory: async (customerId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: CustomerPurchase[]; total: number; page: number; totalPages: number }> => {
    const { data } = await client.get(`/customers/${customerId}/purchases`, { params });
    return data.data;
  },

  // Get customer loyalty transactions
  getLoyaltyTransactions: async (customerId: string, params?: {
    page?: number;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: LoyaltyTransaction[]; total: number; page: number; totalPages: number }> => {
    const { data } = await client.get(`/customers/${customerId}/loyalty`, { params });
    return data.data;
  },

  // Add loyalty points to customer
  addLoyaltyPoints: async (customerId: string, data: {
    points: number;
    type: 'earned' | 'bonus';
    description: string;
    orderId?: string;
  }): Promise<{ customer: Customer; transaction: LoyaltyTransaction }> => {
    const response = await client.post(`/customers/${customerId}/loyalty/add`, data);
    return response.data.data;
  },

  // Redeem loyalty points
  redeemLoyaltyPoints: async (customerId: string, data: {
    points: number;
    description: string;
    orderId?: string;
  }): Promise<{ customer: Customer; transaction: LoyaltyTransaction }> => {
    const response = await client.post(`/customers/${customerId}/loyalty/redeem`, data);
    return response.data.data;
  },

  // Update customer credit limit
  updateCreditLimit: async (customerId: string, creditLimit: number): Promise<Customer> => {
    const { data } = await client.patch(`/customers/${customerId}/credit-limit`, { creditLimit });
    return data.data;
  },

  // Get customer statistics
  getStats: async (): Promise<CustomerStats> => {
    const { data } = await client.get('/customers/stats');
    return data.data;
  },

  // Bulk operations
  bulkUpdate: async (customerIds: string[], updates: UpdateCustomerData): Promise<Customer[]> => {
    const { data } = await client.patch('/customers/bulk-update', { customerIds, updates });
    return data.data;
  },

  // Export customers
  export: async (params?: {
    format?: 'csv' | 'excel';
    type?: string;
    isActive?: boolean;
  }): Promise<Blob> => {
    const response = await client.get('/customers/export', { 
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // Import customers
  import: async (file: File, options?: {
    updateExisting?: boolean;
    skipDuplicates?: boolean;
  }): Promise<{ 
    success: number; 
    failed: number; 
    errors: string[] 
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }
    
    const { data } = await client.post('/customers/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data.data;
  },

  // Search customers
  search: async (query: string, params?: {
    type?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<Customer[]> => {
    const { data } = await client.get('/customers/search', { 
      params: { q: query, ...params }
    });
    return data.data;
  },

  // Get customers by type
  getByType: async (type: string): Promise<Customer[]> => {
    const { data } = await client.get(`/customers/type/${type}`);
    return data.data;
  },

  // Get inactive customers
  getInactive: async (params?: {
    page?: number;
    limit?: number;
    lastActivityBefore?: string;
  }): Promise<{ data: Customer[]; total: number; page: number; totalPages: number }> => {
    const { data } = await client.get('/customers/inactive', { params });
    return data.data;
  },

  // Reactivate customer
  reactivate: async (id: string): Promise<Customer> => {
    const { data } = await client.patch(`/customers/${id}/reactivate`);
    return data.data;
  },

  // Get customer analytics
  getAnalytics: async (customerId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<{
    purchaseTrend: Array<{ date: string; amount: number; count: number }>;
    topProducts: Array<{ product: string; quantity: number; revenue: number }>;
    averageOrderValue: number;
    totalOrders: number;
    totalRevenue: number;
    loyaltyPointsEarned: number;
    loyaltyPointsRedeemed: number;
  }> => {
    const { data } = await client.get(`/customers/${customerId}/analytics`, { 
      params: { period }
    });
    return data.data;
  }
};
