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
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  height = 300,
  className = ''
}) => {
  return (
    <GlassCard className={`p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || COLORS[index % COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid rgba(107, 114, 128, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
              fontWeight: '500'
            }}
            formatter={(value: any) => [`LKR ${value.toLocaleString()}`, '']}
          />
          <Legend 
            wrapperStyle={{
              fontSize: '12px',
              fontWeight: '500',
              color: '#374151'
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </GlassCard>
  );
};
