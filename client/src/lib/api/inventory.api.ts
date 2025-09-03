import client from './client';

export const inventoryApi = {
  list: async () => {
    const { data } = await client.get('/inventory');
    return data as { success: boolean; data: any[] };
  },
  lowStock: async () => {
    const { data } = await client.get('/inventory/low-stock');
    return data as { success: boolean; data: any[] };
  },
  reorderSuggestions: async () => {
    const { data } = await client.get('/inventory/reorder-suggestions');
    return data as { success: boolean; data: { suggestions: any[] } };
  },
  stats: async () => {
    const { data } = await client.get('/purchase-orders/stats');
    return data as { success: boolean; data: any };
  },
};
