import { create } from 'zustand';
import { authApi } from '@/lib/api/auth.api';
import { getAccessToken, setAccessToken, clearAccessToken, clearAllTokens } from '@/lib/api/token';

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
	// When admin login requires OTP we don't authenticate until OTP verified
	otpRequired: boolean;
	pendingUsername: string | null;
	login: (credentials: { username: string; password: string; rememberMe?: boolean }) => Promise<any>;
	verifyAdminOtp: (data: { otp: string; rememberMe?: boolean }) => Promise<void>;
	logout: () => Promise<void>;
	refreshToken: () => Promise<void>;
	checkAuth: () => Promise<void>;
	clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
	user: null,
	isAuthenticated: false,
	isChecking: true,
	accessToken: getAccessToken(),
	otpRequired: false,
	pendingUsername: null,

	login: async (credentials) => {
		const payload = await authApi.login(credentials);
		// If server indicates an OTP step is required (admin) don't set authenticated yet
		if (payload?.requiresOtp) {
			set({
				otpRequired: true,
				pendingUsername: credentials.username,
				isAuthenticated: false,
				isChecking: false,
			});
			return payload; // caller uses this to show OTP UI
		}
		const { user, accessToken } = payload;
		if (accessToken) setAccessToken(accessToken);
		set({ user, accessToken, isAuthenticated: true, isChecking: false, otpRequired: false, pendingUsername: null });
		return payload;
	},

	verifyAdminOtp: async ({ otp, rememberMe }) => {
		const username = get().pendingUsername;
		if (!username) throw new Error('No pending admin login');
		const payload = await authApi.adminLoginVerify({ username, otp, rememberMe });
		const { user, accessToken } = payload as any;
		if (accessToken) setAccessToken(accessToken);
		set({ user, accessToken, isAuthenticated: true, isChecking: false, otpRequired: false, pendingUsername: null });
	},

	logout: async () => {
		try {
			await authApi.logout();
		} finally {
			clearAllTokens();
			set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
		}
	},

	clearAuth: () => {
		clearAllTokens();
		set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
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
				clearAllTokens();
				set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
			}
		}
	},
}));