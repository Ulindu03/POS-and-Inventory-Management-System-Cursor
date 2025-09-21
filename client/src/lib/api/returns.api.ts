import client from './client';

// Return transaction interfaces
export interface ReturnItem {
  product: string;
  quantity: number;
  returnAmount: number;
  reason: 'defective' | 'expired' | 'damaged' | 'wrong_item' | 'unwanted' | 'size_issue' | 'color_issue' | 'other';
  condition?: 'new' | 'opened' | 'damaged' | 'defective';
  disposition?: 'restock' | 'damage' | 'write_off' | 'return_to_supplier';
}

export interface ReturnRequest {
  saleId: string;
  items: ReturnItem[];
  returnType: 'full_refund' | 'partial_refund' | 'exchange' | 'store_credit';
  refundMethod: 'cash' | 'card' | 'bank_transfer' | 'digital' | 'store_credit' | 'exchange_slip' | 'overpayment';
  refundDetails?: any;
  discount?: number;
  managerOverride?: boolean;
  notes?: string;
}

export interface SaleLookupOptions {
  invoiceNo?: string;
  customerName?: string;
  customerPhone?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReturnValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  requiresApproval: boolean;
  policy: any;
}

export interface ReturnTransaction {
  _id: string;
  returnNo: string;
  originalSale: string;
  customer?: string;
  returnedBy: string;
  returnType: string;
  items: ReturnItem[];
  totalAmount: number;
  refundMethod: string;
  status: 'pending' | 'approved' | 'processed' | 'cancelled';
  createdAt: string;
  exchangeSlip?: string;
  overpaymentCreated?: string;
}

export interface ExchangeSlip {
  _id: string;
  slipNo: string;
  originalSale: string;
  customer?: string;
  totalValue: number;
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
  expiryDate: string;
  createdAt: string;
}

export interface CustomerOverpayment {
  _id: string;
  customer: string;
  amount: number;
  balance: number;
  source: string;
  status: 'active' | 'fully_used' | 'expired' | 'cancelled';
  createdAt: string;
}

export const returnsApi = {
  // Sales lookup for returns
  lookupSales: async (options: SaleLookupOptions) => {
    const { data } = await client.post('/returns/lookup', options);
    return data as { 
      success: true; 
      data: { 
        sales: any[]; 
        count: number; 
      }; 
    };
  },

  // Validate return before processing
  validateReturn: async (returnRequest: ReturnRequest) => {
    const { data } = await client.post('/returns/validate', returnRequest);
    return data as { 
      success: true; 
      data: ReturnValidation; 
    };
  },

  // Process a return
  processReturn: async (returnRequest: ReturnRequest) => {
    const { data } = await client.post('/returns', returnRequest);
    return data as { 
      success: true; 
      data: { 
        returnTransaction: ReturnTransaction;
        exchangeSlip?: ExchangeSlip;
        overpayment?: CustomerOverpayment;
      }; 
    };
  },

  // List return transactions
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    returnType?: string;
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
  }) => {
    const { data } = await client.get('/returns', { params });
    return data as {
      success: true;
      data: {
        items: ReturnTransaction[];
        total: number;
        page: number;
        limit: number;
      };
    };
  },

  // Get return transaction by ID
  getById: async (id: string) => {
    const { data } = await client.get(`/returns/${id}`);
    return data as {
      success: true;
      data: {
        returnTransaction: ReturnTransaction;
      };
    };
  },

  // Approve pending return
  approve: async (id: string, notes?: string) => {
    const { data } = await client.post(`/returns/${id}/approve`, { notes });
    return data as {
      success: true;
      data: {
        returnTransaction: ReturnTransaction;
      };
    };
  },

  // Exchange slip operations
  exchangeSlip: {
    // Redeem exchange slip
    redeem: async (slipNo: string, saleId: string) => {
      const { data } = await client.post('/returns/exchange-slip/redeem', { slipNo, saleId });
      return data as {
        success: true;
        exchangeSlip: ExchangeSlip;
      };
    },

    // Get exchange slip details
    getDetails: async (slipNo: string) => {
      const { data } = await client.get(`/returns/exchange-slip/${slipNo}`);
      return data as {
        success: true;
        data: {
          exchangeSlip: ExchangeSlip;
        };
      };
    }
  },

  // Customer overpayment operations
  overpayment: {
    // Get customer overpayments
    getCustomerOverpayments: async (customerId: string) => {
      const { data } = await client.get(`/returns/customer/${customerId}/overpayments`);
      return data as {
        success: true;
        data: {
          overpayments: CustomerOverpayment[];
          totalBalance: number;
          count: number;
        };
      };
    },

    // Use customer overpayment
    use: async (customerId: string, amount: number, saleId: string) => {
      const { data } = await client.post('/returns/overpayment/use', { 
        customerId, 
        amount, 
        saleId 
      });
      return data as {
        success: true;
        usedOverpayments: Array<{
          overpaymentId: string;
          amountUsed: number;
        }>;
      };
    }
  },

  // Customer return history
  getCustomerHistory: async (customerId: string, limit = 20) => {
    const { data } = await client.get(`/returns/customer/${customerId}/history`, {
      params: { limit }
    });
    return data as {
      success: true;
      data: {
        history: ReturnTransaction[];
        count: number;
      };
    };
  },

  // Analytics
  getAnalytics: async (dateFrom?: string, dateTo?: string) => {
    const { data } = await client.get('/returns/analytics', {
      params: { dateFrom, dateTo }
    });
    return data as {
      success: true;
      data: {
        totalReturns: number;
        totalAmount: number;
        avgReturnAmount: number;
        returnsByType: Array<{ type: string; amount: number }>;
        returnsByReason: Array<{ reasons: string[]; amount: number }>;
      };
    };
  },

  // Return policy management
  policies: {
    // Create return policy
    create: async (policy: any) => {
      const { data } = await client.post('/returns/policies', policy);
      return data as {
        success: true;
        data: {
          policy: any;
        };
      };
    },

    // Get return policies
    list: async () => {
      const { data } = await client.get('/returns/policies');
      return data as {
        success: true;
        data: {
          policies: any[];
        };
      };
    }
  }
};