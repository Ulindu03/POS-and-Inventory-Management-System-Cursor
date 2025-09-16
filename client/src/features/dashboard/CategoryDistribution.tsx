import { PieChart } from '@/components/common/Charts';
import { useTranslation } from 'react-i18next';

interface CategoryDistributionProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

export const CategoryDistribution: React.FC<CategoryDistributionProps> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <PieChart
      data={data}
      title={t('dashboard.chart_categoryDistribution')}
      height={300}
    />
  );
};
