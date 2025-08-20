import client from './client';

export interface ProductListItem {
  _id: string;
  sku: string;
  barcode?: string;
  name: { en: string; si: string };
  price: { retail: number };
  images?: { url: string; isPrimary?: boolean }[];
}

export const productsApi = {
  list: async (params?: { q?: string; category?: string; page?: number; limit?: number }) => {
    const { data } = await client.get('/products', { params });
    return data as { success: true; data: { items: ProductListItem[]; total: number; page: number; limit: number } };
  },
  getByBarcode: async (code: string) => {
    const { data } = await client.get(`/products/barcode/${encodeURIComponent(code)}`);
    return data as { success: true; data: { product: ProductListItem } };
  },
};

export interface CategoryItem {
  _id: string;
  name: { en: string; si: string };
  color?: string;
  parent?: string | null;
  level: number;
}

export const categoriesApi = {
  list: async () => {
    const { data } = await client.get('/categories');
    return data as { success: true; data: { items: CategoryItem[] } };
  },
};


