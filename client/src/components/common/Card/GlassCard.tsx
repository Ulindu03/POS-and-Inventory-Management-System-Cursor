// Glass morphism card component with different visual variants
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle' | 'dark' | 'darkSubtle';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  variant = 'default' 
}) => {
  // Base glass morphism styles with backdrop blur and transparency
  const baseClasses = `
    relative overflow-hidden rounded-2xl
    backdrop-blur-xl backdrop-saturate-150
    border shadow-xl
    hover:shadow-2xl transition-all duration-300
  `;

  // Different color schemes for light and dark themes
  const variantClasses: Record<string,string> = {
    default: 'bg-white/95 border-white/30 shadow-xl',
    elevated: 'bg-white/98 border-white/40 shadow-2xl',
    subtle: 'bg-white/90 border-white/25 shadow-lg',
    dark: 'bg-[#2f2f2f]/90 border-[#454545] shadow-xl',
    darkSubtle: 'bg-[#2a2a2a]/70 border-[#3e3e3e] shadow-lg'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {/* Gradient overlay for enhanced glass effect */}
      {variant.startsWith('dark') ? (
        <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-white/0 to-transparent" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/0 to-transparent" />
      )}
      {/* Content container with proper z-index */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
