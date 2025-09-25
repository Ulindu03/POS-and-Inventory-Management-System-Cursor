// This file contains small helper functions to call the server (backend) for auth.
// We keep comments in simple English to explain what each function does.
import axios from './client';
import { setAccessToken, clearAccessToken, setRefreshToken, clearRefreshToken, getRefreshToken } from '@/lib/api/token';

export const authApi = {
  // POST /auth/login with username+password.
  // On success, server may return access and refresh tokens.
  login: async (credentials: { username: string; password: string; rememberMe?: boolean }) => {
    // Send username + password to server. Server might reply that OTP is required.
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
    // Ask server to logout, then clear tokens in browser.
    const response = await axios.post('/auth/logout');
  clearAccessToken();
  clearRefreshToken();
  return response.data;
  },

  // POST /auth/refresh-token to get a new access token (and possibly a rotated refresh token).
  refreshToken: async () => {
    // Ask server for a new access token using the refresh token.
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
    // Old flow: directly send reset link email. We now mostly use resetInit + resetVerify.
    const response = await axios.post('/auth/forgot-password', { email });
  return response.data;
  },

  // Two-step reset: send OTP to email
  resetInit: async (identifier: { email?: string; username?: string }) => {
    // Step 1 of reset: server generates and emails a 6-digit code to the user.
    const response = await axios.post('/auth/password-reset/init', identifier);
    return response.data;
  },

  // Verify reset OTP which will trigger reset link email
  resetVerify: async (data: { email?: string; username?: string; otp: string }) => {
    // Step 2 of reset: we send the OTP code to server. If correct, server emails the reset link.
    const response = await axios.post('/auth/password-reset/verify', data);
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
    // For roles that need OTP to login (store owner, cashier, sales rep).
    // We try the new route first, then fall back to older routes for backward compatibility.
    const res = await axios.post('/auth/otp-login/init', credentials)
      .catch(async () => axios.post('/auth/store-owner/login/init', credentials))
      .catch(async () => axios.post('/auth/admin/login/init', credentials));
    return (res.data as any);
  },
  // Admin login step 2: verify the OTP; server returns tokens and user
  adminLoginVerify: async (data: { username: string; otp: string; rememberMe?: boolean }) => {
    // Send the OTP back to the server to complete login.
    const res = await axios.post('/auth/otp-login/verify', data)
      .catch(async () => axios.post('/auth/store-owner/login/verify', data))
      .catch(async () => axios.post('/auth/admin/login/verify', data));
    const payload = (res.data as any)?.data || {};
    const { accessToken, refreshToken } = payload;
    if (accessToken) setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    return payload as { user: any; accessToken: string };
  }
};