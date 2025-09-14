import React, { useMemo } from 'react';
import { ServiceRequest, Status, ProductType } from '../../types';

interface AnalyticsChartsProps {
  requests: ServiceRequest[];
}

interface ChartData {
  label: string;
  value: number;
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ requests }) => {
  const statusData = useMemo(() => {
    const counts = requests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<Status, number>);
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [requests]);

  const productData = useMemo(() => {
    const counts = requests.reduce((acc, req) => {
      acc[req.product_type] = (acc[req.product_type] || 0) + 1;
      return acc;
    }, {} as Record<ProductType, number>);
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [requests]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="Requests by Status">
        <BarChart data={statusData} />
      </ChartCard>
      <ChartCard title="Requests by Product">
        <BarChart data={productData} />
      </ChartCard>
    </div>
  );
};

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>
    <div>{children}</div>
  </div>
);

const BarChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  if (data.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data available.</p>;
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const chartHeight = 200;
  const barWidth = 80 / data.length;

  return (
    <svg width="100%" height={chartHeight} aria-labelledby="title" role="img">
        <title id="title">Bar chart</title>
        {data.map((d, i) => {
            const barHeight = (d.value / maxValue) * (chartHeight - 40);
            return (
            <g key={d.label} className="transition-all duration-300">
                <rect
                x={`${(i * 100) / data.length + (100 / data.length - barWidth) / 2}%`}
                y={chartHeight - barHeight - 20}
                width={`${barWidth}%`}
                height={barHeight}
                className="fill-current text-primary-500 hover:text-primary-400"
                />
                <text
                x={`${(i * 100) / data.length + (100 / data.length) / 2}%`}
                y={chartHeight - barHeight - 25}
                textAnchor="middle"
                className="text-xs font-bold fill-current text-gray-800 dark:text-white"
                >
                {d.value}
                </text>
                <text
                x={`${(i * 100) / data.length + (100 / data.length) / 2}%`}
                y={chartHeight - 5}
                textAnchor="middle"
                className="text-xs fill-current text-gray-500 dark:text-gray-400"
                >
                {d.label}
                </text>
            </g>
            );
        })}
    </svg>
  );
};

export default AnalyticsCharts;
