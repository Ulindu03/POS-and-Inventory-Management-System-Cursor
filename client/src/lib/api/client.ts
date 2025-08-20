import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken } from '@/lib/api/token';

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
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => Promise.reject(error)
);

export default client;