import { storage } from '@/lib/utils';

const ACCESS_TOKEN_KEY = 'vz_access_token';
const REFRESH_TOKEN_KEY = 'vz_refresh_token';

export const getAccessToken = (): string | null => {
	return storage.get(ACCESS_TOKEN_KEY);
};

export const setAccessToken = (token: string) => {
	storage.set(ACCESS_TOKEN_KEY, token);
};

export const clearAccessToken = () => {
	storage.remove(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => storage.get(REFRESH_TOKEN_KEY);
export const setRefreshToken = (token: string) => storage.set(REFRESH_TOKEN_KEY, token);
export const clearRefreshToken = () => storage.remove(REFRESH_TOKEN_KEY);


