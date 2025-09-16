import { AreaChart } from '@/components/common/Charts';
import { useTranslation } from 'react-i18next';

interface SalesChartProps {
  data: Array<{
    name: string;
    sales: number;
    orders: number;
  }>;
}

export const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <AreaChart
      data={data}
      title={t('dashboard.chart_salesOverview')}
      dataKey="sales"
      height={350}
  className=""
    />
  );
};
