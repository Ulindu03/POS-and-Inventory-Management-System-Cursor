//functions to call the backend API (server) from your frontend (React)
import axios from './client';
import { setAccessToken, clearAccessToken, setRefreshToken, clearRefreshToken, getRefreshToken } from '@/lib/api/token';

export const authApi = {
  login: async (credentials: { username: string; password: string; rememberMe?: boolean }) => {
    const response = await axios.post('/auth/login', credentials);
  const payload = response.data?.data || {};
    const { accessToken, refreshToken } = payload;
  if (payload.requiresOtp) return payload; // no tokens yet
    if (accessToken) setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
  return payload;
  },

  register: async (userData: any) => {
    const response = await axios.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await axios.post('/auth/logout');
  clearAccessToken();
  clearRefreshToken();
  return response.data;
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
  const payload = response.data?.data || {};
    const { accessToken, refreshToken } = payload;
    if (accessToken) setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
  return payload;
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
  const payload = response.data?.data || {};
  return payload;
  },

  updateLanguage: async (language: 'en' | 'si') => {
    const response = await axios.patch('/auth/language', { language });
  return response.data;
  },
  adminLoginInit: async (credentials: { username: string; password: string; rememberMe?: boolean }) => {
    const res = await axios.post('/auth/admin/login/init', credentials);
    return (res.data as any);
  },
  adminLoginVerify: async (data: { username: string; otp: string; rememberMe?: boolean }) => {
    const res = await axios.post('/auth/admin/login/verify', data);
    const payload = (res.data as any)?.data || {};
    const { accessToken, refreshToken } = payload;
    if (accessToken) setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    return payload as { user: any; accessToken: string };
  }
};