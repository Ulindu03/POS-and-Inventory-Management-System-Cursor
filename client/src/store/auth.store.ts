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
	isChecking: boolean;
	accessToken: string | null;
	login: (credentials: { username: string; password: string; rememberMe?: boolean }) => Promise<void>;
	logout: () => Promise<void>;
	refreshToken: () => Promise<void>;
	checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
	user: null,
	isAuthenticated: false,
	isChecking: true,
	accessToken: getAccessToken(),

	login: async (credentials) => {
		const { user, accessToken } = await authApi.login(credentials);
		setAccessToken(accessToken);
		set({ user, accessToken, isAuthenticated: true, isChecking: false });
	},

	logout: async () => {
		try {
			await authApi.logout();
		} finally {
			clearAccessToken();
			set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
		}
	},

	refreshToken: async () => {
		const { accessToken } = await authApi.refreshToken();
		setAccessToken(accessToken);
		set({ accessToken, isAuthenticated: Boolean(get().user) });
	},

	checkAuth: async () => {
		set({ isChecking: true });
		try {
				const me = await authApi.getCurrentUser();
				const hasUser = Boolean(me?.user && (me.user.id || me.user._id));
				if (hasUser) {
					set({ user: me.user, isAuthenticated: true, isChecking: false });
				} else {
					clearAccessToken();
					set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
				}
		} catch {
			try {
				await get().refreshToken();
						const me = await authApi.getCurrentUser();
						const hasUser = Boolean(me?.user && (me.user.id || me.user._id));
						if (hasUser) {
							set({ user: me.user, isAuthenticated: true, isChecking: false });
						} else {
							clearAccessToken();
							set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
						}
			} catch {
				clearAccessToken();
				set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
			}
		}
	},
}));