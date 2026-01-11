import { apiClient } from './client';

export interface BarcodeRecord {
  _id: string;
  barcode: string;
  product: {
    _id: string;
    name: string;
    sku: string;
    barcode: string;
    price: {
      retail: number;
      cost: number;
    };
  };
  batch?: {
    _id: string;
    createdAt: string;
    quantity: number;
    mode: string;
  };
  status: 'generated' | 'in_stock' | 'sold' | 'returned' | 'damaged' | 'written_off';
  sale?: {
    _id: string;
    invoiceNo: string;
    createdAt: string;
    total: number;
  };
  warranty?: {
    _id: string;
    warrantyNo: string;
    status: string;
    startDate: string;
    endDate: string;
  };
  return?: {
    _id: string;
    returnNo: string;
    createdAt: string;
    status: string;
  };
  damage?: {
    _id: string;
    referenceNo: string;
    type: string;
    createdAt: string;
  };
  customer?: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
  };
  printedAt?: string;
  inStockAt?: string;
  soldAt?: string;
  returnedAt?: string;
  damagedAt?: string;
  returnReason?: string;
  damageReason?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BarcodeStats {
  total: number;
  byStatus: {
    generated?: number;
    in_stock?: number;
    sold?: number;
    returned?: number;
    damaged?: number;
    written_off?: number;
  };
}

export const barcodesApi = {
  // Get full lifecycle info for a specific barcode
  getByBarcode: async (barcode: string): Promise<BarcodeRecord> => {
    const response = await apiClient.get(`/barcodes/${barcode}`);
    return response.data.data;
  },

  // Get all barcodes for a specific product
  getByProduct: async (productId: string, params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    barcodes: BarcodeRecord[];
    total: number;
    page: number;
    pages: number;
  }> => {
    const response = await apiClient.get(`/barcodes/product/${productId}`, { params });
    return response.data.data;
  },

  // Get all barcodes for a specific customer
  getByCustomer: async (customerId: string, params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    barcodes: BarcodeRecord[];
    total: number;
    page: number;
    pages: number;
  }> => {
    const response = await apiClient.get(`/barcodes/customer/${customerId}`, { params });
    return response.data.data;
  },

  // Get barcode statistics
  getStats: async (): Promise<BarcodeStats> => {
    const response = await apiClient.get('/barcodes/stats/overview');
    return response.data.data;
  },
};
