// Thin wrapper around the backend auth endpoints.
// Each function calls the server and returns the parsed data.
import axios from './client';
import { setAccessToken, clearAccessToken, setRefreshToken, clearRefreshToken, getRefreshToken } from '@/lib/api/token';

export const authApi = {
  // POST /auth/login with username+password.
  // On success, server may return access and refresh tokens.
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

  // POST /auth/logout to invalidate server-side tokens/cookies if any.
  logout: async () => {
    const response = await axios.post('/auth/logout');
  clearAccessToken();
  clearRefreshToken();
  return response.data;
  },

  // POST /auth/refresh-token to get a new access token (and possibly a rotated refresh token).
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

  // GET /auth/me to validate current token and fetch user profile
  getCurrentUser: async () => {
    const response = await axios.get('/auth/me');
  const payload = response.data?.data || {};
  return payload;
  },

  updateLanguage: async (language: 'en' | 'si') => {
    const response = await axios.patch('/auth/language', { language });
  return response.data;
  },
  // Admin login step 1: request that an OTP be sent/created
  adminLoginInit: async (credentials: { username: string; password: string; rememberMe?: boolean }) => {
    const res = await axios.post('/auth/admin/login/init', credentials);
    return (res.data as any);
  },
  // Admin login step 2: verify the OTP; server returns tokens and user
  adminLoginVerify: async (data: { username: string; otp: string; rememberMe?: boolean }) => {
    const res = await axios.post('/auth/admin/login/verify', data);
    const payload = (res.data as any)?.data || {};
    const { accessToken, refreshToken } = payload;
    if (accessToken) setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    return payload as { user: any; accessToken: string };
  }
};