import { useAuthStore } from '@/store/auth.store';
import { BrandLogo } from '@/components/common/BrandLogo';

export const Header = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="h-14 w-full bg-black/20 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 text-[#F8F8F8]">
      <div className="flex items-center gap-2">
        <BrandLogo size={36} rounded="xl" />
        <div className="font-semibold hidden sm:block">Welcome, {user?.firstName || user?.username}</div>
      </div>
      <button
        onClick={logout}
        className="px-3 py-1.5 rounded-lg text-sm"
        style={{ background: 'rgba(248,248,248,0.08)' }}
      >
        Logout
      </button>
    </header>
  );
};


