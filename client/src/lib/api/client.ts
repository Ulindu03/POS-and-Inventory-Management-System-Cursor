// This file configures a single Axios instance for all API calls.
// In simple English:
// - Before every request, we add the access token in the Authorization header.
// - If the server returns 401 once (token expired), we try to refresh tokens and retry the request.
// - We avoid sending many refresh requests at the same time by using a small queue.
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken, clearAccessToken, clearRefreshToken, clearAllTokens } from '@/lib/api/token';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'; // Backend base URL

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
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

// Ask the backend for a new access token using refresh token.
// It first tries cookie-based flow, then falls back to header/body mode.
async function tryRefreshToken(): Promise<string | null> {
  // Cookie-based attempt
  let resp = await axios.post(
    `${API_URL}/auth/refresh-token`,
    {},
    { withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest' } }
  );
  let data: any = resp.data;
  let token: string | null = (data?.data && data.data.accessToken) || data?.accessToken || null;
  const newRefreshCookie: string | null = (data?.data && data.data.refreshToken) || data?.refreshToken || null;
  if (newRefreshCookie) setRefreshToken(newRefreshCookie); // rotate stored refresh token if provided
  if (token) return token;

  // Header/body fallback (dev);
  const storedRefresh = getRefreshToken(); // read from storage (local or session)
  if (!storedRefresh) return null;
  resp = await axios.post(
    `${API_URL}/auth/refresh-token`,
    { refreshToken: storedRefresh },
    { withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest', 'x-refresh-token': storedRefresh } }
  );
  data = resp.data;
  token = (data?.data && data.data.accessToken) || data?.accessToken || null;
  const rotatedRefresh: string | null = (data?.data && data.data.refreshToken) || data?.refreshToken || null;
  if (rotatedRefresh) setRefreshToken(rotatedRefresh);
  return token;
}

// If a response comes back with 401 we try one refresh cycle, then retry the failed request.
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config || {};
    const status = error.response?.status;
    const headers = error.response?.headers as Record<string, string | undefined> | undefined;
    const tokenExpired = headers?.['x-token-expired'] === 'true' || (headers?.['www-authenticate']?.includes('invalid_token') ?? false);

  if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue until refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
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
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return client(originalRequest);
        }
      } catch (refreshErr) {
        clearAllTokens(); // clean local/session storage
        // Notify the app so it can redirect to login
        window.dispatchEvent(new CustomEvent('auth:token-expired'));
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