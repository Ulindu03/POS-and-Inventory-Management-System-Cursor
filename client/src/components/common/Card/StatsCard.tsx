import { ReactNode } from 'react';
import { GlassCard } from './GlassCard';
import { motion } from 'framer-motion';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
  prefix?: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  change, 
  changeLabel = 'vs last month',
  icon, 
  prefix = '', 
  suffix = '',
  trend = 'neutral',
  className = ''
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-emerald-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <GlassCard className="p-6 group">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-gray-700 text-sm font-semibold mb-2">{title}</p>
            <motion.p 
              className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 
                        bg-clip-text text-transparent"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {prefix}{value}{suffix}
            </motion.p>
            
            {change !== undefined && (
              <div className="flex items-center mt-3">
                <span className={`text-sm font-semibold ${getTrendColor()}`}>
                  {getTrendIcon()} {Math.abs(change)}%
                </span>
                <span className="text-gray-600 text-xs ml-2 font-medium">{changeLabel}</span>
              </div>
            )}
          </div>
          
          <motion.div 
            className="p-4 bg-gradient-to-br from-purple-500 to-blue-600 
                      rounded-xl text-white transform group-hover:scale-110 
                      transition-transform duration-300 shadow-lg"
            whileHover={{ rotate: 5 }}
          >
            {icon}
          </motion.div>
        </div>
      </GlassCard>
    </motion.div>
  );
};
