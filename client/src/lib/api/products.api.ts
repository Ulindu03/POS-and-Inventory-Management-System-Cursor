import client from './client';
import { uploadToSupabaseImages } from '@/lib/supabase';

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
  create: async (payload: any) => {
    const { data } = await client.post('/products', payload);
    return data as { success: boolean; message: string; data: { product: any } };
  },
  update: async (id: string, payload: any) => {
    const { data } = await client.put(`/products/${id}`, payload);
    return data as { success: boolean; message: string; data: { product: any } };
  },
  delete: async (id: string) => {
    const { data } = await client.delete(`/products/${id}`);
    return data as { success: boolean; message: string; data: { product: any } };
  },
  generateBarcode: async () => {
    const { data } = await client.get('/products/barcode/generate');
    return data as { success: true; data: { barcode: string } };
  },
  uploadImage: async (file: File) => {
    // Upload to Supabase Storage (Images bucket)
    const res = await uploadToSupabaseImages(file, { folder: 'products' });
    // Return in a shape compatible with existing ProductForm usage
    return { success: true, data: { url: res.url, filename: res.path } } as const;
  },
  bulkImport: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await client.post('/products/bulk/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data as { success: boolean; message: string; data: { created: number } };
  },
  bulkExport: async () => {
    const res = await client.get('/products/bulk/export', { responseType: 'blob' });
    return res.data as Blob;
  },
  createStickerBatch: async (payload: { productId: string; quantity: number; layout?: any; mode?: 'reuse_product_barcode' | 'unique_per_unit' }) => {
    const { data } = await client.post('/products/stickers/batch', payload);
    return data;
  },
  getStickerBatch: async (params: { batchId?: string; productId?: string }) => {
    const { data } = await client.get('/products/stickers/batch', { params });
    return data;
  }
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
  stats: async () => {
    const { data } = await client.get('/categories/stats');
    return data as { success: true; data: any };
  },
  create: async (payload: any) => {
    const { data } = await client.post('/categories', payload);
    return data as { success: boolean; message: string; data: { category: any } };
  },
  update: async (id: string, payload: any) => {
    const { data } = await client.put(`/categories/${id}`, payload);
    return data as { success: boolean; message: string; data: { category: any } };
  },
  remove: async (id: string) => {
    const { data } = await client.delete(`/categories/${id}`);
    return data as { success: boolean; message: string };
  }
};


