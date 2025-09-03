import { apiClient } from './client';

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
  totalPurchases?: number;
  totalSpent?: number;
  lastPurchase?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface UpdateCustomerData extends Partial<CreateCustomerData> {}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalLoyaltyPoints: number;
  typeDistribution: Array<{ _id: string; count: number }>;
  recentCustomers: Array<{ name: string; customerCode: string; createdAt: string }>;
}

export interface LoyaltyPointsUpdate {
  points: number;
  action: 'add' | 'subtract' | 'set';
  reason?: string;
}

export interface LoyaltyPointsRedemption {
  points: number;
  redemptionType: string;
  description?: string;
}

export interface Purchase {
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

// Get all customers with filters and pagination
export const getCustomers = async (filters: CustomerFilters = {}) => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value.toString());
    }
  });

  const response = await apiClient.get(`/customers?${params.toString()}`);
  return response.data;
};

// Get customer statistics
export const getCustomerStats = async () => {
  const response = await apiClient.get('/customers/stats');
  return response.data;
};

// Get single customer by ID
export const getCustomerById = async (id: string) => {
  const response = await apiClient.get(`/customers/${id}`);
  return response.data;
};

// Create new customer
export const createCustomer = async (customerData: CreateCustomerData) => {
  const response = await apiClient.post('/customers', customerData);
  return response.data;
};

// Update customer
export const updateCustomer = async (id: string, customerData: UpdateCustomerData) => {
  const response = await apiClient.put(`/customers/${id}`, customerData);
  return response.data;
};

// Delete customer
export const deleteCustomer = async (id: string) => {
  const response = await apiClient.delete(`/customers/${id}`);
  return response.data;
};

// Update loyalty points
export const updateLoyaltyPoints = async (id: string, data: LoyaltyPointsUpdate) => {
  const response = await apiClient.patch(`/customers/${id}/loyalty-points`, data);
  return response.data;
};

// Redeem loyalty points
export const redeemLoyaltyPoints = async (id: string, data: LoyaltyPointsRedemption) => {
  const response = await apiClient.post(`/customers/${id}/redeem-points`, data);
  return response.data;
};
