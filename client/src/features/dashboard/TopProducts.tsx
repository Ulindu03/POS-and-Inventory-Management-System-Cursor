import { BarChart } from '@/components/common/Charts';

interface TopProductsProps {
  data: Array<{
    name: string;
    sales: number;
    revenue: number;
  }>;
}

export const TopProducts: React.FC<TopProductsProps> = ({ data }) => {
  return (
    <BarChart
      data={data}
      title="Top Selling Products"
      dataKey="revenue"
      height={300}
    />
  );
};
