import { storage } from '@/lib/utils';

const ACCESS_TOKEN_KEY = 'vz_access_token';

export const getAccessToken = (): string | null => {
	return storage.get(ACCESS_TOKEN_KEY);
};

export const setAccessToken = (token: string) => {
	storage.set(ACCESS_TOKEN_KEY, token);
};

export const clearAccessToken = () => {
	storage.remove(ACCESS_TOKEN_KEY);
};


