import { PieChart } from '@/components/common/Charts';

interface CategoryDistributionProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

export const CategoryDistribution: React.FC<CategoryDistributionProps> = ({ data }) => {
  return (
    <PieChart
      data={data}
      title="Product Categories"
      height={300}
    />
  );
};
