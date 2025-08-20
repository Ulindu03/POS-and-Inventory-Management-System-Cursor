interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  variant = 'default' 
}) => {
  const baseClasses = `
    relative overflow-hidden rounded-2xl
    backdrop-blur-xl backdrop-saturate-150
    border shadow-xl
    hover:shadow-2xl transition-all duration-300
  `;

  const variantClasses = {
    default: 'bg-white/95 border-white/30 shadow-xl',
    elevated: 'bg-white/98 border-white/40 shadow-2xl',
    subtle: 'bg-white/90 border-white/25 shadow-lg'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-transparent" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
