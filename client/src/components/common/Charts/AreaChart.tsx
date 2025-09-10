import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '../Card/GlassCard';

interface DataPoint {
  name: string;
  value?: number; // optional to allow custom dataKey like 'sales', 'revenue', etc.
  [key: string]: any;
}

interface AreaChartProps {
  data: DataPoint[];
  title?: string;
  dataKey?: string;
  stroke?: string;
  fill?: string;
  height?: number;
  className?: string;
  cardVariant?: 'default' | 'elevated' | 'subtle' | 'dark' | 'darkSubtle';
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  title,
  dataKey = 'value',
  stroke = '#667eea',
  fill = 'url(#colorGradient)',
  height = 300,
  className = '',
  cardVariant = 'darkSubtle'
}) => {
  return (
    <GlassCard variant={cardVariant} className={`p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-100 mb-4 tracking-wide">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.55}/>
              <stop offset="95%" stopColor="#242424" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#454545" strokeOpacity={0.5} />
          <XAxis 
            dataKey="name" 
            stroke="#9ca3af"
            fontSize={12}
            fontWeight={500}
            tickLine={false}
            axisLine={false}
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
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={2.5}
            fill={fill}
            fillOpacity={0.9}
            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </GlassCard>
  );
};
