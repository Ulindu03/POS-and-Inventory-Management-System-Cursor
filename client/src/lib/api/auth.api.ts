import axios from './client';
import { setAccessToken, clearAccessToken, setRefreshToken, clearRefreshToken, getRefreshToken } from '@/lib/api/token';

export const authApi = {
  login: async (credentials: { username: string; password: string; rememberMe?: boolean }) => {
    const response = await axios.post('/auth/login', credentials);
    const payload = (response.data as any)?.data || {};
  const { accessToken, refreshToken } = payload;
  if (accessToken) setAccessToken(accessToken);
  if (refreshToken) setRefreshToken(refreshToken);
    return payload as { user: any; accessToken: string };
  },

  register: async (userData: any) => {
    const response = await axios.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await axios.post('/auth/logout');
  clearAccessToken();
  clearRefreshToken();
    return (response.data as any);
  },

  refreshToken: async () => {
    const stored = getRefreshToken();
    const headers: Record<string, string> = {};
    const body: any = {};
    if (stored) {
      headers['x-refresh-token'] = stored;
      body.refreshToken = stored;
    }
    const response = await axios.post('/auth/refresh-token', body, { headers });
    const payload = (response.data as any)?.data || {};
    const { accessToken, refreshToken } = payload;
    if (accessToken) setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    return payload as { accessToken: string; refreshToken?: string };
  },

  forgotPassword: async (email: string) => {
    const response = await axios.post('/auth/forgot-password', { email });
    return (response.data as any);
  },

  resetPassword: async (token: string, password: string) => {
    const response = await axios.post(`/auth/reset-password/${token}`, { password });
    return (response.data as any);
  },

  getCurrentUser: async () => {
    const response = await axios.get('/auth/me');
    const payload = (response.data as any)?.data || {};
    return payload as { user: any };
  },

  updateLanguage: async (language: 'en' | 'si') => {
    const response = await axios.patch('/auth/language', { language });
    return (response.data as any);
  },
};