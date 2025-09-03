import client from './client';

export const inventoryApi = {
  list: async () => {
    const { data } = await client.get('/inventory');
    return data as { success: boolean; data: any[] };
  },
  lowStock: async () => {
    const { data } = await client.get('/inventory/low-stock');
    // Server returns: { success, data: { items: [...] } }
    return data as { success: boolean; data: { items: any[] } };
  },
  reorderSuggestions: async () => {
    const { data } = await client.get('/inventory/reorder-suggestions');
    // Server returns: { success, data: { suppliers: { [supplierId]: { supplier, lines, subtotal } } } }
    // Normalize to an array of { supplier, items } where items: { product, qty, unitCost }
    const suppliers = (data?.data?.suppliers || {}) as Record<string, { supplier: any; lines: any[]; subtotal: number }>;
    const normalized = Object.values(suppliers).map((grp) => ({
      supplier: grp.supplier,
      items: (grp.lines || []).map((l: any) => ({
        product: l.product,
        quantity: l.qty,
        unitCost: l.unitCost,
      })),
      subtotal: grp.subtotal,
    }));
    return { success: true, data: { suggestions: normalized } } as const;
  },
  stats: async () => {
    const { data } = await client.get('/purchase-orders/stats');
    return data as { success: boolean; data: any };
  },
};
