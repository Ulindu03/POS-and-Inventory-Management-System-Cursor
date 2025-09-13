import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken, clearAccessToken, clearRefreshToken, clearAllTokens } from '@/lib/api/token';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
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

// Keep response interceptor simple; refresh handled in store
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

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
  if (newRefreshCookie) setRefreshToken(newRefreshCookie);
  if (token) return token;

  // Header/body fallback (dev);
  const storedRefresh = getRefreshToken();
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
        clearAllTokens();
        // Redirect to login or clear auth state
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