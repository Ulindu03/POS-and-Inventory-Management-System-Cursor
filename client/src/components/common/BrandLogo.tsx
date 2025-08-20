import React from 'react';

interface BrandLogoProps {
  size?: number; // px
  className?: string;
  rounded?: 'lg' | 'xl' | 'full';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 40, className = '', rounded = 'lg' }) => {
  const radius = rounded === 'full' ? 'rounded-full' : rounded === 'xl' ? 'rounded-xl' : 'rounded-lg';
  return (
    <div
      className={`inline-flex items-center justify-center ${radius} p-[2px] shadow-[0_0_12px_rgba(255,225,0,0.35)] ${className}`}
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#FFE100,#FFD100)' }}
    >
      <img
        src="/logo.jpg"
        alt="VoltZone"
        className={`w-full h-full object-contain bg-black/20 ${radius}`}
        style={{ backdropFilter: 'saturate(140%) blur(0px)' }}
      />
    </div>
  );
};


