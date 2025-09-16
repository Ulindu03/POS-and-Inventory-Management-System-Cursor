// This file holds all authentication state and actions using Zustand (a small state library).
// It talks to the backend via authApi and saves/reads tokens via token helpers.
import { create } from 'zustand';
import { authApi } from '@/lib/api/auth.api';
import { getAccessToken, setAccessToken, clearAccessToken, clearAllTokens } from '@/lib/api/token';

// Key for persisting whether user opted into quick re-auth (remember me)
// We use this key to remember if the user wants a persistent login.
// true -> tokens in localStorage; false -> tokens in sessionStorage (handled in token.ts)
const REMEMBER_ME_KEY = 'vz_remember_me';
const setRememberMeFlag = (val: boolean) => {
	// Save or remove the remember flag in localStorage.
	try { if (val) localStorage.setItem(REMEMBER_ME_KEY, '1'); else localStorage.removeItem(REMEMBER_ME_KEY); } catch {}
};
export const getRememberMeFlag = (): boolean => {
	// Read the remember flag. If anything goes wrong return false.
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
		// Call backend login with username/password (and remember flag).
		const payload = await authApi.login(credentials);
		// If server indicates an OTP step is required (admin) don't set authenticated yet
		if (payload?.requiresOtp) {
			// Admin login path: backend asked for OTP verification first.
			set({
				otpRequired: true,
				pendingUsername: credentials.username,
				isAuthenticated: false,
				isChecking: false,
			});
			// Save the remember flag right away so token.ts knows where to store tokens later.
			if (typeof credentials.rememberMe === 'boolean') setRememberMeFlag(credentials.rememberMe);
			return payload; // caller uses this to show OTP UI
		}
		const { user, accessToken } = payload; // Normal login success path
		if (accessToken) setAccessToken(accessToken);
		if (typeof credentials.rememberMe === 'boolean') setRememberMeFlag(credentials.rememberMe);
		set({ user, accessToken, isAuthenticated: true, isChecking: false, otpRequired: false, pendingUsername: null });
		return payload;
	},

	verifyAdminOtp: async ({ otp, rememberMe }) => {
	const username = get().pendingUsername; // Username saved during admin login init
		if (!username) throw new Error('No pending admin login');
	const payload = await authApi.adminLoginVerify({ username, otp, rememberMe }); // Verify OTP with backend
		const { user, accessToken } = payload as any;
		if (accessToken) setAccessToken(accessToken);
		if (typeof rememberMe === 'boolean') setRememberMeFlag(rememberMe);
		set({ user, accessToken, isAuthenticated: true, isChecking: false, otpRequired: false, pendingUsername: null });
	},

	logout: async () => {
		try {
			// Inform backend to invalidate tokens/cookies if needed.
			await authApi.logout();
		} finally {
			// Always clear local storage and session storage values on logout.
			clearAllTokens();
			setRememberMeFlag(false);
			set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
		}
	},

	clearAuth: () => {
	// Local reset without calling backend (useful on auth errors)
	clearAllTokens();
		setRememberMeFlag(false);
		set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
	},

	refreshToken: async () => {
	// Ask backend for a new access token using the refresh token.
	const { accessToken } = await authApi.refreshToken();
		setAccessToken(accessToken);
		set({ accessToken, isAuthenticated: Boolean(get().user) });
	},

	checkAuth: async () => {
		set({ isChecking: true }); // Show small loading state while we check.
		// New behavior: only attempt silent auth if an access token is present.
		// If only a refresh token exists we will force user to login instead of auto-refreshing silently.
		const currentAccess = getAccessToken();
		if (!currentAccess) {
			set({ user: null, isAuthenticated: false, accessToken: null, isChecking: false });
			return;
		}
		try {
			// Validate token with a /me call to fetch the current user.
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