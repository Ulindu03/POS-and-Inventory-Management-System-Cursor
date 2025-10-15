// This file configures a single Axios instance for all API calls.
// In simple English:
// - Before every request, we add the access token in the Authorization header.
// - If the server returns 401 once (token expired), we try to refresh tokens and retry the request.
// - We avoid sending many refresh requests at the same time by using a small queue.
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken, clearAccessToken, clearRefreshToken, clearAllTokens } from '@/lib/api/token';

// Use relative path to go through Vite proxy in development
// In production, VITE_API_URL should be set to the actual backend URL
const API_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Allow cookies (if backend uses them)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
// Before each request, attach the access token if we have one.
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response handling with refresh support
// We keep track if a refresh is already happening, and queue other requests
// so we only hit the refresh endpoint once.
let isRefreshing = false;
// Queue callbacks to resume requests once refresh completes
let refreshQueue: Array<(token: string | null) => void> = [];

const processQueue = (token: string | null) => {
  refreshQueue.forEach((cb) => {
    try { cb(token); } catch { /* noop */ }
  });
  refreshQueue = [];
};

// Ask the backend for a new access token using refresh token.
// It first tries cookie-based flow, then falls back to header/body mode.
async function tryRefreshToken(): Promise<string | null> {
  // 1) Try cookie-based refresh (works in production same-site)
  try {
    const resp = await axios.post(
      `${API_URL}/auth/refresh-token`,
      {},
      { withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest' } }
    );
    const data: any = resp.data;
    const token: string | null = (data?.data && data.data.accessToken) || data?.accessToken || null;
    const newRefreshCookie: string | null = (data?.data && data.data.refreshToken) || data?.refreshToken || null;
    if (newRefreshCookie) setRefreshToken(newRefreshCookie); // rotate stored refresh token if provided
    if (token) return token;
  } catch {
    // ignore and fall through to header/body fallback
  }

  // 2) Fallback for dev: send refresh token via header/body
  const storedRefresh = getRefreshToken(); // read from storage (local or session)
  if (!storedRefresh) return null;
  try {
    const resp = await axios.post(
      `${API_URL}/auth/refresh-token`,
      { refreshToken: storedRefresh },
      { withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest', 'x-refresh-token': storedRefresh } }
    );
    const data = resp.data as any;
    const token: string | null = (data?.data && data.data.accessToken) || (data as any)?.accessToken || null;
    const rotatedRefresh: string | null = (data?.data && data.data.refreshToken) || (data as any)?.refreshToken || null;
    if (rotatedRefresh) setRefreshToken(rotatedRefresh);
    return token;
  } catch {
    return null;
  }
}

// If a response comes back with 401 we try one refresh cycle, then retry the failed request.
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
      const originalRequest: Record<string, any> = (error.config as Record<string, any>) || {};
    const status = error.response?.status;
    const headers = error.response?.headers as Record<string, string | undefined> | undefined;
      // tokenExpired intentionally unused here; kept for potential telemetry.

  // Never try to refresh if the failing call is the refresh endpoint itself
  const url: string = (originalRequest.url as string) || '';
  const isRefreshCall = /\/auth\/refresh-token(\b|\?|$)/.test(url);

  if (status === 401 && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue until refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((token: string | null) => {
            if (token && originalRequest.headers) {
              // Axios v1 may use AxiosHeaders; prefer set() when available
              const hdrs: any = originalRequest.headers;
              if (typeof hdrs.set === 'function') hdrs.set('Authorization', `Bearer ${token}`);
              else hdrs.Authorization = `Bearer ${token}`;
            }
            resolve(client(originalRequest));
          });
        });
      }

      isRefreshing = true;
  try {
        const newToken = await tryRefreshToken();
        if (newToken) {
          setAccessToken(newToken);
          processQueue(newToken);
          if (originalRequest.headers) {
            const hdrs: any = originalRequest.headers;
            if (typeof hdrs.set === 'function') hdrs.set('Authorization', `Bearer ${newToken}`);
            else hdrs.Authorization = `Bearer ${newToken}`;
          }
          return client(originalRequest);
        }
      } catch (refreshErr) {
        clearAllTokens(); // clean local/session storage
        // Notify the app so it can redirect to login
        window.dispatchEvent(new CustomEvent('auth:token-expired'));
        // Unblock any queued requests (they will likely fail and bubble up)
        processQueue(null);
        return Promise.reject(refreshErr instanceof Error ? refreshErr : new Error('Token refresh failed'));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
export { client as apiClient };