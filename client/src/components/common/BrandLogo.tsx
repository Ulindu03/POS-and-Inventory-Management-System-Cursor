import React, { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api/settings.api';

interface BrandLogoProps {
  size?: number; // px
  className?: string;
  rounded?: 'lg' | 'xl' | 'full';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 40, className = '', rounded = 'lg' }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    settingsApi.get().then((res) => {
      const s = res.data.data || res.data;
      if (mounted) setLogoUrl(s?.branding?.logoUrl || null);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  let radius = 'rounded-lg';
  if (rounded === 'xl') radius = 'rounded-xl';
  if (rounded === 'full') radius = 'rounded-full';
  return (
    <div
      className={`inline-flex items-center justify-center ${radius} p-[2px] shadow-[0_0_12px_rgba(255,225,0,0.35)] ${className}`}
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#FFE100,#FFD100)' }}
    >
      <img
        src={logoUrl || '/logo.jpg'}
        alt="Logo"
        className={`w-full h-full object-contain bg-black/20 ${radius}`}
        style={{ backdropFilter: 'saturate(140%) blur(0px)' }}
      />
    </div>
  );
};


