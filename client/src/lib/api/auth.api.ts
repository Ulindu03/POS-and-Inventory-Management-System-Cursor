import axios from './client';
import { setAccessToken, clearAccessToken } from '@/lib/api/token';

export const authApi = {
  login: async (credentials: { username: string; password: string; rememberMe?: boolean }) => {
    const response = await axios.post('/auth/login', credentials);
    const { accessToken } = response.data?.data || {};
    if (accessToken) setAccessToken(accessToken);
    return response.data;
  },

  register: async (userData: any) => {
    const response = await axios.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await axios.post('/auth/logout');
    clearAccessToken();
    return response.data;
  },

  refreshToken: async () => {
    const response = await axios.post('/auth/refresh-token');
    const { accessToken } = response.data?.data || {};
    if (accessToken) setAccessToken(accessToken);
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await axios.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await axios.post(`/auth/reset-password/${token}`, { password });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await axios.get('/auth/me');
    return response.data;
  },

  updateLanguage: async (language: 'en' | 'si') => {
    const response = await axios.patch('/auth/language', { language });
    return response.data;
  },
};