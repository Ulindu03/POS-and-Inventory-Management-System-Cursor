import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '../Card/GlassCard';

interface DataPoint {
  name: string;
  value: number;
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
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  title,
  dataKey = 'value',
  stroke = '#667eea',
  fill = 'url(#colorGradient)',
  height = 300,
  className = ''
}) => {
  return (
    <GlassCard className={`p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#764ba2" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.6} />
          <XAxis 
            dataKey="name" 
            stroke="#374151"
            fontSize={12}
            fontWeight={500}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#374151"
            fontSize={12}
            fontWeight={500}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `LKR ${value.toLocaleString()}`}
          />
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
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={3}
            fill={fill}
            fillOpacity={0.7}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </GlassCard>
  );
};
