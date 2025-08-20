import { create } from 'zustand';
import { authApi } from '@/lib/api/auth.api';
import { getAccessToken, setAccessToken, clearAccessToken } from '@/lib/api/token';

interface UserInfo {
	id: string;
	username: string;
	email: string;
	firstName?: string;
	lastName?: string;
	role?: string;
	language?: 'en' | 'si';
	avatar?: string;
}

interface AuthState {
	user: UserInfo | null;
	isAuthenticated: boolean;
	accessToken: string | null;
	login: (credentials: { username: string; password: string; rememberMe?: boolean }) => Promise<void>;
	logout: () => Promise<void>;
	refreshToken: () => Promise<void>;
	checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
	user: null,
	isAuthenticated: false,
	accessToken: getAccessToken(),

	login: async (credentials) => {
		const response = await authApi.login(credentials);
		const { user, accessToken } = response.data;
		setAccessToken(accessToken);
		set({ user, accessToken, isAuthenticated: true });
	},

	logout: async () => {
		try {
			await authApi.logout();
		} finally {
			clearAccessToken();
			set({ user: null, isAuthenticated: false, accessToken: null });
		}
	},

	refreshToken: async () => {
		const response = await authApi.refreshToken();
		const { accessToken } = response.data;
		setAccessToken(accessToken);
		set({ accessToken, isAuthenticated: Boolean(get().user) });
	},

	checkAuth: async () => {
		try {
			const me = await authApi.getCurrentUser();
			set({ user: me.data.user, isAuthenticated: true });
		} catch {
			try {
				await get().refreshToken();
				const me = await authApi.getCurrentUser();
				set({ user: me.data.user, isAuthenticated: true });
			} catch {
				clearAccessToken();
				set({ user: null, isAuthenticated: false, accessToken: null });
			}
		}
	},
}));