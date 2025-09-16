// Dynamic token storage:
//  - If user selected "Remember Me" (vz_remember_me === '1') tokens persist in localStorage
//  - Otherwise they are stored in sessionStorage so closing the tab/window logs the user out
// Existing remember-me flag is already written by auth.store.ts

const ACCESS_TOKEN_KEY = 'vz_access_token';
const REFRESH_TOKEN_KEY = 'vz_refresh_token';
const REMEMBER_ME_KEY = 'vz_remember_me';

function isPersistent(): boolean {
	try { return localStorage.getItem(REMEMBER_ME_KEY) === '1'; } catch { return false; }
}

function getWriteStore(persistent = isPersistent()): Storage | null {
	try { return persistent ? localStorage : sessionStorage; } catch { return null; }
}

function getReadStores(): Storage[] {
	// Read order: persistent store first if flag set, otherwise session first then fallback
	try {
		if (isPersistent()) return [localStorage, sessionStorage];
		return [sessionStorage, localStorage];
	} catch { return []; }
}

export const getAccessToken = (): string | null => {
	for (const store of getReadStores()) {
		const val = store.getItem(ACCESS_TOKEN_KEY);
		if (val) return val;
	}
	return null;
};

export const setAccessToken = (token: string) => {
	const persistent = isPersistent();
	const target = getWriteStore(persistent);
	if (target) {
		try { target.setItem(ACCESS_TOKEN_KEY, token); } catch {/* ignore */}
	}
	// Ensure other store is cleared to avoid stale tokens if user toggled remember setting between sessions
	try {
		const other = persistent ? sessionStorage : localStorage;
		other.removeItem(ACCESS_TOKEN_KEY);
	} catch {/* ignore */}
};

export const clearAccessToken = () => {
	try { localStorage.removeItem(ACCESS_TOKEN_KEY); } catch {/* ignore */}
	try { sessionStorage.removeItem(ACCESS_TOKEN_KEY); } catch {/* ignore */}
};

export const getRefreshToken = (): string | null => {
	for (const store of getReadStores()) {
		const val = store.getItem(REFRESH_TOKEN_KEY);
		if (val) return val;
	}
	return null;
};

export const setRefreshToken = (token: string) => {
	const persistent = isPersistent();
	const target = getWriteStore(persistent);
	if (target) {
		try { target.setItem(REFRESH_TOKEN_KEY, token); } catch {/* ignore */}
	}
	try {
		const other = persistent ? sessionStorage : localStorage;
		other.removeItem(REFRESH_TOKEN_KEY);
	} catch {/* ignore */}
};

export const clearRefreshToken = () => {
	try { localStorage.removeItem(REFRESH_TOKEN_KEY); } catch {/* ignore */}
	try { sessionStorage.removeItem(REFRESH_TOKEN_KEY); } catch {/* ignore */}
};

export const clearAllTokens = () => {
	clearAccessToken();
	clearRefreshToken();
};


