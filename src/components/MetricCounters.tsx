'use client';

import React from 'react';
import { SimulationMetrics } from '@/engine/types';

interface MetricCountersProps {
  metrics: SimulationMetrics;
  baselineMetrics: SimulationMetrics | null;
}

export function MetricCounters({ metrics, baselineMetrics }: MetricCountersProps) {
  const isRecoveryActive = baselineMetrics !== null;

  const stats = [
    {
      label: 'Cumulative delay',
      value: `${metrics.total_delay_minutes}m`,
      hasDisruption: metrics.total_delay_minutes > 0,
      delta: baselineMetrics
        ? `-${baselineMetrics.total_delay_minutes - metrics.total_delay_minutes}m`
        : null,
      context: baselineMetrics ? `from ${baselineMetrics.total_delay_minutes}m` : 'all rotations',
    },
    {
      label: 'Delayed flights',
      value: `${metrics.total_delayed_flights}`,
      hasDisruption: metrics.total_delayed_flights > 0,
      delta: baselineMetrics
        ? `-${baselineMetrics.total_delayed_flights - metrics.total_delayed_flights}`
        : null,
      context: 'of 70 scheduled',
    },
    {
      label: 'Broken connections',
      value: `${metrics.total_broken_connections}`,
      hasDisruption: metrics.total_broken_connections > 0,
      delta: baselineMetrics
        ? `-${baselineMetrics.total_broken_connections - metrics.total_broken_connections}`
        : null,
      context: 'of 21 transfers',
    },
    {
      label: 'Stranded passengers',
      value: `${metrics.total_stranded_passengers}`,
      hasDisruption: metrics.total_stranded_passengers > 0,
      delta: baselineMetrics
        ? `-${baselineMetrics.total_stranded_passengers - metrics.total_stranded_passengers}`
        : null,
      context: 'missed connections',
    },
    {
      label: 'Crew legal overruns',
      value: `${metrics.total_crew_violations}`,
      hasDisruption: metrics.total_crew_violations > 0,
      delta: baselineMetrics
        ? `-${baselineMetrics.total_crew_violations - metrics.total_crew_violations}`
        : null,
      context: 'past 600m cap',
    },
    {
      label: 'On-time rate',
      value: `${metrics.on_time_percentage}%`,
      hasDisruption: metrics.on_time_percentage < 90,
      delta: baselineMetrics
        ? `+${metrics.on_time_percentage - baselineMetrics.on_time_percentage}%`
        : null,
      context: 'fleet reliability',
    },
  ];

  return (
    <div className="panel-minimal divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-rule)] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat, i) => (
        <div key={i} className="p-3.5 flex flex-col justify-between">
          <div className="text-[11px] text-[var(--color-muted)]">
            {stat.label}
          </div>

          <div className="my-2 flex items-baseline gap-2">
            <span
              className="text-2xl font-bold font-mono-measured tracking-tight"
              style={{
                color: stat.hasDisruption ? 'var(--color-accent)' : 'var(--color-ink)',
              }}
            >
              {stat.value}
            </span>

            {isRecoveryActive && stat.delta && (
              <span className="text-[11px] font-mono-measured text-[var(--color-ink)] border border-[var(--color-rule)] px-1 py-0.5 rounded">
                {stat.delta}
              </span>
            )}
          </div>

          <div className="text-[10px] text-[var(--color-muted)] font-mono-measured">
            {stat.context}
          </div>
        </div>
      ))}
    </div>
  );
}
