import { AreaChart } from '@/components/common/Charts';

interface SalesChartProps {
  data: Array<{
    name: string;
    sales: number;
    orders: number;
  }>;
}

export const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  return (
    <AreaChart
      data={data}
      title="Sales Overview"
      dataKey="sales"
      height={350}
  className=""
    />
  );
};
