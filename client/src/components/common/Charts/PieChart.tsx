import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { GlassCard } from '../Card/GlassCard';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
  className?: string;
  cardVariant?: 'default' | 'elevated' | 'subtle' | 'dark' | 'darkSubtle';
  showLegend?: boolean;
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  height = 300,
  className = '',
  cardVariant = 'darkSubtle',
  showLegend = true
}) => {
  return (
    <GlassCard variant={cardVariant} className={`p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-100 mb-4 tracking-wide">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${entry.name || index}`} 
                fill={entry.color || COLORS[index % COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(47,47,47,0.95)',
              border: '1px solid #454545',
              borderRadius: '12px',
              boxShadow: '0 8px 28px -6px rgba(0,0,0,0.6)',
              fontSize: '12px',
              fontWeight: 500,
              color: '#f8f8f8'
            }}
            formatter={(value: any) => [`LKR ${value.toLocaleString()}`, '']}
          />
          {showLegend && (
            <Legend 
              wrapperStyle={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#d1d5db'
              }}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </GlassCard>
  );
};
