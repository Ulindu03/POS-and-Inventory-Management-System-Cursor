import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '../Card/GlassCard';

interface DataPoint {
  name: string;
  value?: number; // optional to allow other numeric keys like 'revenue', 'sales'
  [key: string]: any;
}

interface BarChartProps {
  data: DataPoint[];
  title?: string;
  dataKey?: string;
  height?: number;
  className?: string;
  cardVariant?: 'default' | 'elevated' | 'subtle' | 'dark' | 'darkSubtle';
  barColorStart?: string;
  barColorEnd?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  dataKey = 'value',
  height = 300,
  className = '',
  cardVariant = 'darkSubtle',
  barColorStart = '#667eea',
  barColorEnd = '#764ba2'
}) => {
  return (
    <GlassCard variant={cardVariant} className={`p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-100 mb-4 tracking-wide">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={barColorStart} stopOpacity={0.85}/>
              <stop offset="100%" stopColor={barColorEnd} stopOpacity={0.4}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#5a5a5a" strokeOpacity={0.35} />
          <XAxis 
            dataKey="name" 
            stroke="#9ca3af"
            fontSize={12}
            fontWeight={500}
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={{ fill: '#9ca3af' }}
            tickMargin={14}
            angle={-20}
            height={56}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            fontWeight={500}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `LKR ${value.toLocaleString()}`}
          />
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
          <Bar 
            dataKey={dataKey} 
            fill="url(#barGradient)"
            radius={[8, 8, 0, 0]}
            maxBarSize={44}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </GlassCard>
  );
};
