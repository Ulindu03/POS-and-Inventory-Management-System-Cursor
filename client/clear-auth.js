// Quick script to clear authentication data
// Run this in browser console to fix 401 errors after server restart

// Clear all VoltZone auth tokens
localStorage.removeItem('vz_access_token');
localStorage.removeItem('vz_refresh_token');

// Clear any other auth-related data
Object.keys(localStorage).forEach(key => {
  if (key.includes('auth') || key.includes('token') || key.includes('user')) {
    localStorage.removeItem(key);
  }
});

console.log('✅ Authentication data cleared. Please refresh the page and login again.');
