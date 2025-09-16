import { create } from 'zustand';
import { authApi } from '@/lib/api/auth.api';
import { getAccessToken, setAccessToken, clearAccessToken, clearAllTokens } from '@/lib/api/token';

// Key for persisting whether user opted into quick re-auth (remember me)
const REMEMBER_ME_KEY = 'vz_remember_me';
const setRememberMeFlag = (val: boolean) => {
	try { if (val) localStorage.setItem(REMEMBER_ME_KEY, '1'); else localStorage.removeItem(REMEMBER_ME_KEY); } catch {}
};
export const getRememberMeFlag = (): boolean => {
	try { return localStorage.getItem(REMEMBER_ME_KEY) === '1'; } catch { return false; }
};

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
			// Persist remember flag early so OTP step can still leverage it
			if (typeof credentials.rememberMe === 'boolean') setRememberMeFlag(credentials.rememberMe);
			return payload; // caller uses this to show OTP UI
		}
		const { user, accessToken } = payload;
		if (accessToken) setAccessToken(accessToken);
		if (typeof credentials.rememberMe === 'boolean') setRememberMeFlag(credentials.rememberMe);
		set({ user, accessToken, isAuthenticated: true, isChecking: false, otpRequired: false, pendingUsername: null });
		return payload;
	},

	verifyAdminOtp: async ({ otp, rememberMe }) => {
		const username = get().pendingUsername;
		if (!username) throw new Error('No pending admin login');
		const payload = await authApi.adminLoginVerify({ username, otp, rememberMe });
		const { user, accessToken } = payload as any;
		if (accessToken) setAccessToken(accessToken);
		if (typeof rememberMe === 'boolean') setRememberMeFlag(rememberMe);
		set({ user, accessToken, isAuthenticated: true, isChecking: false, otpRequired: false, pendingUsername: null });
	},

	logout: async () => {
		try {
			await authApi.logout();
		} finally {
			clearAllTokens();
			setRememberMeFlag(false);
			set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
		}
	},

	clearAuth: () => {
		clearAllTokens();
		setRememberMeFlag(false);
		set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
	},

	refreshToken: async () => {
		const { accessToken } = await authApi.refreshToken();
		setAccessToken(accessToken);
		set({ accessToken, isAuthenticated: Boolean(get().user) });
	},

	checkAuth: async () => {
		set({ isChecking: true });
		// New behavior: only attempt silent auth if an access token is present.
		// If only a refresh token exists we will force user to login instead of auto-refreshing silently.
		const currentAccess = getAccessToken();
		if (!currentAccess) {
			set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
			return;
		}
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
			// On failure, clear tokens and require explicit login.
			clearAllTokens();
			set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
		}
	},
}));