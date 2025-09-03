import { apiClient } from './client';

// Types
export interface PurchaseOrderItem {
  _id?: string;
  product: string | { _id: string; name: { en: string; si: string }; sku: string };
  quantity: number;
  unitCost: number;
  totalCost: number;
  received?: number;
  damaged?: number;
}

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplier: string | { _id: string; name: string; supplierCode: string };
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: {
    vat: number;
    nbt: number;
  };
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled' | 'completed';
  orderDate: string;
  expectedDelivery?: string;
  actualDelivery?: string;
  paymentTerms: string;
  paymentStatus: 'pending' | 'partial' | 'paid';
  paidAmount: number;
  notes?: string;
  createdBy: string | { _id: string; username: string };
  approvedBy?: string | { _id: string; username: string };
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplier?: string;
  paymentStatus?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PurchaseOrderStats {
  totalOrders: number;
  pendingOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
  totalSpent: number;
  outstandingPayments: number;
  ordersByStatus: Array<{
    _id: string;
    count: number;
  }>;
}

export interface PurchaseOrderDetail {
  purchaseOrder: PurchaseOrder;
  payments: Array<{
    _id: string;
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
    createdAt: string;
  }>;
}

export interface PaymentData {
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
}

export interface ReceivedItem {
  itemId: string;
  quantity: number;
  damaged?: number;
}

// API Functions
export const getPurchaseOrders = async (filters: PurchaseOrderFilters = {}) => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value.toString());
    }
  });

  const response = await apiClient.get(`/purchase-orders?${params.toString()}`);
  return response.data;
};

export const getPurchaseOrderStats = async (): Promise<{ success: boolean; data: PurchaseOrderStats }> => {
  const response = await apiClient.get('/purchase-orders/stats');
  return response.data;
};

export const getPurchaseOrderById = async (id: string): Promise<{ success: boolean; data: PurchaseOrderDetail }> => {
  const response = await apiClient.get(`/purchase-orders/${id}`);
  return response.data;
};

export const createPurchaseOrder = async (purchaseOrderData: Partial<PurchaseOrder>): Promise<{ success: boolean; data: PurchaseOrder }> => {
  const response = await apiClient.post('/purchase-orders', purchaseOrderData);
  return response.data;
};

export const updatePurchaseOrder = async (id: string, purchaseOrderData: Partial<PurchaseOrder>): Promise<{ success: boolean; data: PurchaseOrder }> => {
  const response = await apiClient.put(`/purchase-orders/${id}`, purchaseOrderData);
  return response.data;
};

export const deletePurchaseOrder = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete(`/purchase-orders/${id}`);
  return response.data;
};

export const updatePurchaseOrderStatus = async (id: string, status: string, actualDelivery?: string): Promise<{ success: boolean; data: PurchaseOrder }> => {
  const response = await apiClient.patch(`/purchase-orders/${id}/status`, { status, actualDelivery });
  return response.data;
};

export const recordPayment = async (id: string, paymentData: PaymentData): Promise<{ success: boolean; data: any }> => {
  const response = await apiClient.post(`/purchase-orders/${id}/payment`, paymentData);
  return response.data;
};

export const receiveItems = async (id: string, receivedItems: ReceivedItem[]): Promise<{ success: boolean; data: PurchaseOrder }> => {
  const response = await apiClient.post(`/purchase-orders/${id}/receive`, { receivedItems });
  return response.data;
};
