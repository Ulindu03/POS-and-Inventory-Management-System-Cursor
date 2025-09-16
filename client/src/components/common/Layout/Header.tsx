import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Header = ({ onToggleSidebar, sidebarOpen }: { onToggleSidebar?: () => void; sidebarOpen?: boolean }) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [isFs, setIsFs] = useState<boolean>(Boolean(document.fullscreenElement));
  const { i18n, t } = useTranslation();

  const toggleFs = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  }, []);

  useEffect(() => {
    const onChange = () => setIsFs(Boolean(document.fullscreenElement));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <header className="h-12 md:h-14 w-full bg-black/20 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-3 md:px-4 text-[#F8F8F8]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="-ml-1 mr-1 p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          title={sidebarOpen ? 'Close menu' : 'Open menu'}
        >
          <img src="/sidebar.png" alt="menu" className="w-5 h-5 object-contain" />
        </button>
        <BrandLogo size={32} rounded="xl" />
  <div className="font-semibold hidden sm:block">{t('common.welcomeUser', { name: user?.firstName || user?.username || '' })}</div>
      </div>
      <div className="flex items-center gap-2">
        {/* POS panel indicator left of fullscreen, larger and clickable */}
        <Link
          to="/pos"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-base font-semibold hover:bg-white/20 transition"
          title="Go to POS panel"
        >
          <img src="/POS.png" alt="POS" className="w-6 h-6 object-contain" draggable={false} />
          <span className="hidden sm:inline text-white">POS</span>
        </Link>
        <button
          type="button"
          onClick={toggleFs}
          className="px-2 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 border border-white/10 inline-flex items-center gap-2"
          title={isFs ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
          aria-label={isFs ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <img
            src="/FS.png"
            alt={isFs ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="w-4 h-4 object-contain"
            draggable={false}
          />
          <span className="hidden sm:inline">{isFs ? 'Exit' : 'Fullscreen'}</span>
        </button>
        <button
          type="button"
          onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'si' : 'en')}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 flex items-center gap-2"
          title={i18n.language === 'en' ? 'සිංහල' : 'English'}
          aria-label="Change language"
        >
          <img src="/lan.png" alt="lang" className="w-5 h-5 object-contain" />
          <span className="hidden md:inline text-xs font-medium">{i18n.language === 'en' ? 'සිංහල' : 'English'}</span>
        </button>
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-lg text-sm"
          style={{ background: 'rgba(248,248,248,0.08)' }}
        >
          Logout
        </button>
      </div>
    </header>
  );
};


