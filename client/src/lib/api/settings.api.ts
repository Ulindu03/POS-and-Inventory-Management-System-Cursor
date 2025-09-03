import client from './client';

export const settingsApi = {
  get() {
    return client.get('/settings');
  },
  update(payload: any) {
    return client.put('/settings', payload);
  },
};
