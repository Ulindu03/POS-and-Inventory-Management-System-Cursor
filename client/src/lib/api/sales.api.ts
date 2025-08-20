import client from './client';

export interface CreateSaleItem {
  product: string; // product id
  quantity: number;
  price: number;
  discount?: number;
}

export interface CreateSalePayload {
  items: CreateSaleItem[];
  discount?: number;
  payment: { method: 'cash' | 'card' | 'digital'; amount: number; reference?: string };
  customer?: string | null;
}

export const salesApi = {
  create: async (payload: CreateSalePayload) => {
    const { data } = await client.post('/sales', payload);
    return data as { success: true; data: { sale: { id: string; invoiceNo: string; total: number } } };
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


