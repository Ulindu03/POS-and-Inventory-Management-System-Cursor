// This file manages where we store the auth tokens in the browser.
// Simple rule:
//  - If user ticked "Remember Me" we keep tokens in localStorage (they survive browser restarts).
//  - If not, we keep tokens in sessionStorage (they disappear when the tab/window is closed).
// The "remember" flag is saved by the auth store using the key below.

const ACCESS_TOKEN_KEY = 'vz_access_token';
const REFRESH_TOKEN_KEY = 'vz_refresh_token';
const REMEMBER_ME_KEY = 'vz_remember_me';

function isPersistent(): boolean {
	// Read the remember flag from localStorage. If anything fails, treat as not persistent.
	try { return localStorage.getItem(REMEMBER_ME_KEY) === '1'; } catch { return false; }
}

function getWriteStore(persistent = isPersistent()): Storage | null {
	// Choose where to write tokens: localStorage for remember, sessionStorage otherwise.
	try { return persistent ? localStorage : sessionStorage; } catch { return null; }
}

function getReadStores(): Storage[] {
	// Decide the order to read from when fetching a token.
	// If remember is on, check localStorage then sessionStorage.
	// If remember is off, check sessionStorage then localStorage (fallback for old values).
	try {
		if (isPersistent()) return [localStorage, sessionStorage];
		return [sessionStorage, localStorage];
	} catch { return []; }
}

export const getAccessToken = (): string | null => {
	// Try to read the access token from the decided stores in order.
	for (const store of getReadStores()) {
		const val = store.getItem(ACCESS_TOKEN_KEY);
		if (val) return val;
	}
	return null;
};

export const setAccessToken = (token: string) => {
	// Save the access token into the correct store.
	const persistent = isPersistent();
	const target = getWriteStore(persistent);
	if (target) {
		try { target.setItem(ACCESS_TOKEN_KEY, token); } catch {/* ignore storage errors */}
	}
	// Ensure other store is cleared to avoid stale tokens if user toggled remember setting between sessions
	try {
		const other = persistent ? sessionStorage : localStorage;
		other.removeItem(ACCESS_TOKEN_KEY);
	} catch {/* ignore storage errors */}
};

export const clearAccessToken = () => {
	// Remove the access token from both storages, just to be safe.
	try { localStorage.removeItem(ACCESS_TOKEN_KEY); } catch {/* ignore storage errors */}
	try { sessionStorage.removeItem(ACCESS_TOKEN_KEY); } catch {/* ignore storage errors */}
};

export const getRefreshToken = (): string | null => {
	// Try to read the refresh token using the same order logic.
	for (const store of getReadStores()) {
		const val = store.getItem(REFRESH_TOKEN_KEY);
		if (val) return val;
	}
	return null;
};

export const setRefreshToken = (token: string) => {
	// Save the refresh token into the correct store.
	const persistent = isPersistent();
	const target = getWriteStore(persistent);
	if (target) {
		try { target.setItem(REFRESH_TOKEN_KEY, token); } catch {/* ignore storage errors */}
	}
	try {
		const other = persistent ? sessionStorage : localStorage;
		other.removeItem(REFRESH_TOKEN_KEY);
	} catch {/* ignore storage errors */}
};

export const clearRefreshToken = () => {
	// Remove the refresh token from both storages, just to be safe.
	try { localStorage.removeItem(REFRESH_TOKEN_KEY); } catch {/* ignore storage errors */}
	try { sessionStorage.removeItem(REFRESH_TOKEN_KEY); } catch {/* ignore storage errors */}
};

export const clearAllTokens = () => {
	// Helper to clear both tokens at once.
	clearAccessToken();
	clearRefreshToken();
};


