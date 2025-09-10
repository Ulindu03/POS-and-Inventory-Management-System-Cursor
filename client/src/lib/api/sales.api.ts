import client from './client';

export interface CreateSaleItem {
  product: string; // product id
  quantity: number;
  price: number;
  discount?: number;
}

export type PaymentMethod = 'cash' | 'card' | 'digital' | 'bank_transfer' | 'credit';
export interface PaymentInput { method: PaymentMethod; amount: number; reference?: string };
export interface CreateSalePayload {
  items: CreateSaleItem[];
  discount?: number;
  payment?: PaymentInput; // single legacy
  payments?: PaymentInput[]; // multi
  customer?: string | null;
  discountCode?: string;
  extendedWarrantySelections?: Record<string, { optionName?: string; additionalDays: number; fee: number }[]>;
}

export const salesApi = {
  create: async (payload: CreateSalePayload) => {
    const { data } = await client.post('/sales', payload);
    return data as { success: true; data: { sale: { id: string; invoiceNo: string; total: number } } };
  },
  validateDiscount: async (payload: { code: string; subtotal: number }) => {
    const { data } = await client.post('/sales/validate-discount', payload);
    return data as { success: true; data: { valid: boolean; type?: string; value?: number; amount?: number } };
  },
  refund: async (id: string, payload: { items: Array<{ product: string; quantity: number; amount: number }>; method: PaymentMethod; reference?: string }) => {
    const { data } = await client.post(`/sales/${id}/refund`, payload);
    return data as { success: true; data: { refund: { total: number }; sale: { id: string; total: number; status: string } } };
  },
  list: async (params?: { page?: number; limit?: number; q?: string }) => {
    const { data } = await client.get('/sales', { params });
    return data as { success: true; data: { items: Array<{ _id: string; invoiceNo: string; total: number; createdAt: string }>; total: number; page: number; limit: number } };
  },
  hold: async (payload: { items: CreateSaleItem[]; discount?: number; note?: string; customer?: string | null }) => {
    const { data } = await client.post('/sales/hold', payload);
    return data as { success: true; data: { ticket: { id: string; invoiceNo: string } } };
  },
  resume: async (id: string) => {
    const { data } = await client.get(`/sales/resume/${id}`);
    return data as { success: true; data: { ticket: any } };
  },
};


