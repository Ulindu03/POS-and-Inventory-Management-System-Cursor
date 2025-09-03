import client from './client';

export type DamageItemInput = {
  product: string;
  quantity: number;
  unitCost: number;
  reason: string;
  description?: string;
  images?: string[];
};

export const damagesApi = {
  list: (params?: any) => client.get('/damages', { params }),
  reasons: () => client.get('/damages/reasons'),
  costReport: (params?: any) => client.get('/damages/cost-report', { params }),
  transit: (payload: { tripId?: string; deliveryId?: string; shopId?: string; items: DamageItemInput[]; notes?: string; priority?: string }) => client.post('/damages/transit', payload),
  shopReturn: (payload: { customerId: string; items: DamageItemInput[]; reason: string; disposition: 'restock' | 'scrap' | 'return_to_vendor'; notes?: string }) => client.post('/damages/shop-return', payload),
};
