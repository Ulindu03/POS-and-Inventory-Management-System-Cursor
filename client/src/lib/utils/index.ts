// Simple wrapper for localStorage operations with consistent interface
export const storage = {
	get: (key: string) => localStorage.getItem(key),
	set: (key: string, value: string) => localStorage.setItem(key, value),
	remove: (key: string) => localStorage.removeItem(key),
};


