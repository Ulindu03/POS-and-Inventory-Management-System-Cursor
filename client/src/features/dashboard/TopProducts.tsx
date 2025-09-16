import { BarChart } from '@/components/common/Charts';
import { useTranslation } from 'react-i18next';

interface TopProductsProps {
  data: Array<{
    name: string;
    sales: number;
    revenue: number;
  }>;
}

export const TopProducts: React.FC<TopProductsProps> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <BarChart
      data={data}
      title={t('dashboard.chart_topProducts')}
      dataKey="revenue"
      height={300}
    />
  );
};
