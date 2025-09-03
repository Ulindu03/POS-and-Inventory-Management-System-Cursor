import client from './client';
import { uploadToSupabaseImages } from '@/lib/supabase';

export const deliveriesApi = {
  list(config?: any) {
    return client.get('/deliveries', config);
  },
  create(data: any) {
    return client.post('/deliveries', data);
  },
  get(id: string) {
    return client.get(`/deliveries/${id}`);
  },
  update(id: string, data: any) {
    return client.put(`/deliveries/${id}`, data);
  },
  updateStatus(id: string, status: 'scheduled' | 'in_transit' | 'completed' | 'cancelled' | 'returned') {
    return client.patch(`/deliveries/${id}/status`, { status });
  },
  async uploadProof(id: string, shopId: string, file: File) {
    const up = await uploadToSupabaseImages(file, { folder: `deliveries/${id}/${shopId}` });
  await client.put(`/deliveries/${id}/shops/${shopId}/media`, { proofOfDelivery: up.url });
  return { data: { data: { proofOfDelivery: up.url } } } as any;
  },
  async uploadSignature(id: string, shopId: string, file: File) {
    const up = await uploadToSupabaseImages(file, { folder: `deliveries/${id}/${shopId}` });
  await client.put(`/deliveries/${id}/shops/${shopId}/media`, { signature: up.url });
  return { data: { data: { signature: up.url } } } as any;
  },
};
