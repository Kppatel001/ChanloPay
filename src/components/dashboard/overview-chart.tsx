'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface OverviewChartProps {
  data: { month: string; revenue: number }[];
  isLoading: boolean;
}

export function OverviewChart({ data, isLoading }: OverviewChartProps) {
  if (isLoading) {
    return <Skeleton className="h-[350px] w-full" />;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      {data.length > 0 ? (
        <BarChart data={data}>
          <XAxis
            dataKey="month"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              value > 1000
                ? `$${(value / 1000).toFixed(1)}k`
                : `$${value}`
            }
          />
          <Bar
            dataKey="revenue"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          No revenue data to display.
        </div>
      )}
    </ResponsiveContainer>
  );
}
