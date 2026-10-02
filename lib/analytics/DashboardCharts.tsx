'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartTokens } from '@/app/lib/adminTheme';

export interface WeeklyLoadForecast {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  eventCount: number;
  totalHours: number;
  clientNames: string[];
}

const tooltipStyle = {
  backgroundColor: 'var(--admin-surface)',
  border: '1px solid var(--admin-hairline)',
  borderRadius: '2px',
  color: 'var(--admin-text)',
};

export function WeeklyLoadChart({ data }: { data: WeeklyLoadForecast[] }) {
  const neutralBar = chartTokens.neutral;
  const accentGreen = chartTokens.accent;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTokens.grid} />
        <XAxis
          dataKey="weekLabel"
          stroke={chartTokens.axis}
          fontSize={10}
          angle={-40}
          textAnchor="end"
          height={72}
        />
        <YAxis
          yAxisId="left"
          stroke={chartTokens.axis}
          fontSize={11}
          width={36}
          label={{ value: 'Events', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: chartTokens.axis, fontSize: 10 } }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke={chartTokens.axis}
          fontSize={11}
          width={36}
          label={{ value: 'Hours', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: chartTokens.axis, fontSize: 10 } }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) return null;

            const point = payload[0]?.payload as WeeklyLoadForecast;
            const eventCount = point?.eventCount || 0;
            const totalHours = point?.totalHours || 0;
            const clientNames = point?.clientNames || [];

            return (
              <div className="rounded-sm border border-admin-hairline bg-admin-surface p-3">
                <div className="mb-2 text-sm font-semibold text-admin-text">
                  {label}
                </div>
                <div className="mb-1 text-[13px] text-admin-text">
                  <strong>{eventCount}</strong> Event{eventCount !== 1 ? 's' : ''}
                </div>
                <div className={`text-[13px] text-admin-text ${clientNames.length > 0 ? 'mb-2' : 'mb-0'}`}>
                  <strong>{totalHours}</strong> Hours
                </div>
                {clientNames.length > 0 && (
                  <div className="mt-2 border-t border-admin-hairline pt-2 text-xs text-admin-muted">
                    <div className="mb-1 font-semibold text-admin-text">Clients:</div>
                    <div>{clientNames.join(', ')}</div>
                  </div>
                )}
              </div>
            );
          }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '12px' }}
          formatter={(value) => {
            if (value === 'eventCount') return 'Events';
            if (value === 'totalHours') return 'Hours';
            return value;
          }}
        />
        <Bar
          yAxisId="left"
          dataKey="eventCount"
          fill={neutralBar}
          radius={[1, 1, 0, 0]}
          name="eventCount"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="totalHours"
          stroke={accentGreen}
          strokeWidth={2}
          dot={{ fill: neutralBar, r: 3 }}
          name="totalHours"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function AgreementsBarChart({
  data,
}: {
  data: Array<{ month: string; count: number }>;
}) {
  const neutralBar = chartTokens.neutral;
  const accentGreen = chartTokens.accent;

  return (
    <ResponsiveContainer width="100%" height={168}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTokens.grid} />
        <XAxis
          dataKey="month"
          stroke={chartTokens.axis}
          fontSize={11}
          tickMargin={4}
        />
        <YAxis stroke={chartTokens.axis} fontSize={11} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" radius={[1, 1, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={entry.month ?? index}
              fill={index === data.length - 1 ? accentGreen : neutralBar}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
