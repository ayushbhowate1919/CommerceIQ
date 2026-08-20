import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoryRevenueItem } from '../../types/dashboard';

type CategoryBreakdownChartProps = {
  data: CategoryRevenueItem[];
  loading: boolean;
};

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export function CategoryBreakdownChart({ data, loading }: CategoryBreakdownChartProps) {
  if (loading) {
    return (
      <div className="chart-card loading-state">
        <div className="skeleton-title"></div>
        <div className="skeleton-chart"></div>
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3>Category Breakdown</h3>
          <p className="chart-subtitle">Revenue distribution by product category</p>
        </div>
      </div>

      <div className="chart-wrapper">
        {data.length === 0 ? (
          <div className="empty-chart">No category data found.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={4}
                dataKey="revenue"
                nameKey="category"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: unknown, name: unknown, item: { payload?: CategoryRevenueItem }) => {
                  const share = item?.payload?.percentageOfTotal ?? item?.payload?.percentageShare ?? 0;
                  return [
                    `${formatCurrency(Number(val ?? 0))} (${share.toFixed(1)}%)`,
                    String(name ?? 'Category'),
                  ];
                }}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
