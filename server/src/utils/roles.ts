export type Role = 'store_owner' | 'admin' | 'cashier' | 'sales_rep';

export const ROLE_STORE_OWNER = 'store_owner' as const;
export const ROLE_ADMIN_LEGACY = 'admin' as const; // deprecated alias

export function toCanonicalRole(role: string | undefined | null): Role | undefined {
  if (!role) return undefined;
  const r = String(role).toLowerCase();
  if (r === 'admin' || r === 'store_owner') return ROLE_STORE_OWNER; // normalize legacy
  if (r === 'cashier') return 'cashier';
  if (r === 'sales_rep') return 'sales_rep';
  return undefined;
}

export function isStoreOwner(role: string | undefined | null): boolean {
  return toCanonicalRole(role) === ROLE_STORE_OWNER;
}

export function normalizeAllowedRoles(roles: string[] | undefined): string[] | undefined {
  if (!roles) return roles;
  // Map any 'admin' occurrences to 'store_owner' while keeping others unchanged
  return roles.map(r => (String(r).toLowerCase() === 'admin' ? ROLE_STORE_OWNER : String(r).toLowerCase()));
}

// Define which roles require OTP during login.
export function requiresOtpForLogin(role: string | undefined | null): boolean {
  const r = toCanonicalRole(role);
  return r === 'store_owner' || r === 'cashier' || r === 'sales_rep';
}
