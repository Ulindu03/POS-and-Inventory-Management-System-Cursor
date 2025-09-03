import { apiClient } from './client';

// Types
export interface Supplier {
  _id: string;
  supplierCode: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
  taxId?: string;
  paymentTerms: string;
  creditLimit: number;
  creditUsed: number;
  categories?: Array<{ _id: string; name: { en: string; si: string } }>;
  rating: number;
  performance: {
    onTimeDelivery: number;
    qualityRating: number;
    priceCompetitiveness: number;
  };
  status: 'active' | 'inactive' | 'suspended';
  isActive: boolean;
  notes?: string;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    branch?: string;
  };
  createdAt: string;
  updatedAt: string;
  // Additional stats from API
  totalOrders?: number;
  totalSpent?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  lastOrder?: {
    poNumber: string;
    orderDate: string;
    total: number;
  };
  productCount?: number;
}

export interface SupplierFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  topSuppliers: Array<{
    name: string;
    supplierCode: string;
    totalSpent: number;
    orderCount: number;
  }>;
  outstandingPayments: Array<{
    name: string;
    supplierCode: string;
    outstandingAmount: number;
  }>;
}

export interface SupplierPerformance {
  onTimeDelivery: number;
  qualityRating: number;
  priceCompetitiveness: number;
}

export interface SupplierDetail {
  supplier: Supplier;
  stats: {
    totalOrders: number;
    totalSpent: number;
    totalPaid: number;
    outstandingBalance: number;
    onTimeDeliveryRate: number;
  };
  recentOrders: Array<any>;
  products: Array<any>;
  recentPayments: Array<any>;
}

// API Functions
export const getSuppliers = async (filters: SupplierFilters = {}) => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value.toString());
    }
  });

  const response = await apiClient.get(`/suppliers?${params.toString()}`);
  return response.data;
};

export const getSupplierStats = async (): Promise<{ success: boolean; data: SupplierStats }> => {
  const response = await apiClient.get('/suppliers/stats');
  return response.data;
};

export const getSupplierById = async (id: string): Promise<{ success: boolean; data: SupplierDetail }> => {
  const response = await apiClient.get(`/suppliers/${id}`);
  return response.data;
};

export const createSupplier = async (supplierData: Partial<Supplier>): Promise<{ success: boolean; data: Supplier }> => {
  const response = await apiClient.post('/suppliers', supplierData);
  return response.data;
};

export const updateSupplier = async (id: string, supplierData: Partial<Supplier>): Promise<{ success: boolean; data: Supplier }> => {
  const response = await apiClient.put(`/suppliers/${id}`, supplierData);
  return response.data;
};

export const deleteSupplier = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete(`/suppliers/${id}`);
  return response.data;
};

export const updateSupplierPerformance = async (id: string, performance: SupplierPerformance): Promise<{ success: boolean; data: Supplier }> => {
  const response = await apiClient.patch(`/suppliers/${id}/performance`, performance);
  return response.data;
};
