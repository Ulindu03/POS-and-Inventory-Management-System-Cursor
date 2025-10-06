import client from './client';
import { uploadToSupabaseImages } from '@/lib/supabase';

export type DiscountStatus = 'disabled' | 'scheduled' | 'active' | 'expired' | 'none';

export interface ProductDiscountInfo {
  isEnabled: boolean;
  type: 'percentage' | 'fixed';
  value: number;
  startAt: string | null;
  endAt: string | null;
  notes: string;
  status: DiscountStatus;
  amount: number;
  finalPrice: number;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TierPricingSummary {
  tier: 'retail' | 'wholesale';
  base: number;
  final: number;
  discountAmount: number;
  status: DiscountStatus;
  hasActiveDiscount: boolean;
  configured: boolean;
  discountType?: 'percentage' | 'fixed' | null;
  discountValue?: number | null;
}

export interface ProductPricingSummary {
  retail: TierPricingSummary;
  wholesale: TierPricingSummary;
  defaultTier: 'retail' | 'wholesale';
}

export interface MarginBreakdown {
  amount: number;
  percent: number | null;
}

export interface TierMarginSummary {
  configured: boolean;
  base: MarginBreakdown;
  final: MarginBreakdown;
}

export interface ProductMarginSummary {
  cost: number;
  retail: TierMarginSummary;
  wholesale: TierMarginSummary;
}

export interface ProductListItem {
  _id: string;
  sku: string;
  barcode?: string;
  name: { en: string; si: string };
  price: { cost: number; retail: number; wholesale?: number };
  images?: { url: string; isPrimary?: boolean }[];
  stock?: { current?: number; minimum?: number; reorderPoint?: number };
  inventory?: { currentStock?: number; minimumStock?: number; reorderPoint?: number; reservedStock?: number; availableStock?: number };
  effectiveStock?: { current?: number; minimum?: number; reorderPoint?: number; reserved?: number; available?: number };
  discount?: ProductDiscountInfo | null;
  pricing?: ProductPricingSummary;
  margins?: ProductMarginSummary;
}

export const productsApi = {
  list: async (params?: { q?: string; category?: string; page?: number; limit?: number }) => {
    const { data } = await client.get('/products', { params });
    return data as { success: true; data: { items: ProductListItem[]; total: number; page: number; limit: number } };
  },
  getByBarcode: async (code: string) => {
    const { data } = await client.get(`/products/barcode/${encodeURIComponent(code)}`);
    return data as { success: true; data: { product: ProductListItem & { pricing?: ProductPricingSummary; margins?: ProductMarginSummary; discount?: ProductDiscountInfo | null } } };
  },
  create: async (payload: any) => {
    const { data } = await client.post('/products', payload);
    return data as { success: boolean; message: string; data: { product: any } };
  },
  update: async (id: string, payload: any) => {
    const { data } = await client.put(`/products/${id}`, payload);
    return data as { success: boolean; message: string; data: { product: any } };
  },
  getHistory: async (id: string, params?: { startDate?: string; endDate?: string; limit?: number }) => {
    const { data } = await client.get(`/products/${id}/history`, { params });
    return data as { success: true; data: { summary: { purchasedQty: number; purchasedCost: number; soldQty: number; revenue: number }; purchases: any[]; sales: any[] } };
  },
  getById: async (id: string) => {
    const { data } = await client.get(`/products/${id}`);
    return data as { success: true; data: { product: ProductListItem & { pricing?: ProductPricingSummary; margins?: ProductMarginSummary; discount?: ProductDiscountInfo | null } } };
  },
  delete: async (id: string) => {
    const { data } = await client.delete(`/products/${id}`);
    return data as { success: boolean; message: string; data: { product: any } };
  },
  adjustStock: async (
    id: string,
    payload: { quantity: number; type: 'add' | 'remove'; reason: string }
  ) => {
    const { data } = await client.patch(`/products/${id}/stock`, payload);
    return data as {
      success: boolean;
      message: string;
      data: { previousStock: number; newStock: number; quantity: number };
    };
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
  },
  discountSummary: async () => {
    const { data } = await client.get('/products/discounts/summary');
    return data as { success: true; data: { totalDiscountedProducts: number; activeDiscounts: number; totalDiscountValue: number; expiringSoon: number } };
  },
  upsertDiscount: async (productId: string, payload: { type: 'percentage' | 'fixed'; value: number; startAt: string; endAt: string; notes?: string; isEnabled?: boolean }) => {
    const { data } = await client.put(`/products/${productId}/discount`, payload);
    return data as { success: boolean; message: string; data: { discount: ProductDiscountInfo | null; pricing: ProductPricingSummary; margins: ProductMarginSummary } };
  },
  removeDiscount: async (productId: string) => {
    const { data } = await client.delete(`/products/${productId}/discount`);
    return data as { success: boolean; message: string; data: { discount: null; pricing: ProductPricingSummary; margins: ProductMarginSummary } };
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


