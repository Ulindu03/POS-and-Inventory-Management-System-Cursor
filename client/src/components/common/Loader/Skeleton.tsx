import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  height = 'h-4', 
  width = 'w-full' 
}) => {
  return (
    <motion.div
      className={`${width} ${height} bg-gray-200 rounded animate-pulse ${className}`}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <Skeleton height="h-4" width="w-24" />
        <Skeleton height="h-12" width="w-12" className="rounded-xl" />
      </div>
      <Skeleton height="h-8" width="w-32" className="mb-3" />
      <div className="flex items-center gap-2">
        <Skeleton height="h-4" width="w-20" />
        <Skeleton height="h-4" width="w-16" />
      </div>
    </div>
  );
};

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl">
      <Skeleton height="h-6" width="w-32" className="mb-4" />
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <Skeleton height="h-8" width="w-24" />
      </div>
    </div>
  );
};
