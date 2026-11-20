'use client';

import React from 'react';
import { SimulationMetrics } from '@/engine/types';

interface MetricCountersProps {
  metrics: SimulationMetrics;
  baselineMetrics: SimulationMetrics | null;
}

export function MetricCounters({ metrics, baselineMetrics }: MetricCountersProps) {
  const isRecovery = baselineMetrics !== null;

  const stats = [
    {
      label: 'Cumulative delay',
      value: `${metrics.total_delay_minutes}m`,
      sub: 'minutes total',
      lit: metrics.total_delay_minutes > 0,
      delta: isRecovery ? `${baselineMetrics!.total_delay_minutes - metrics.total_delay_minutes}m saved` : null,
    },
    {
      label: 'Delayed flights',
      value: `${metrics.total_delayed_flights}`,
      sub: 'of 70 rotations',
      lit: metrics.total_delayed_flights > 0,
      delta: isRecovery ? `${baselineMetrics!.total_delayed_flights - metrics.total_delayed_flights} fewer` : null,
    },
    {
      label: 'Broken connections',
      value: `${metrics.total_broken_connections}`,
      sub: 'of 21 transfers',
      lit: metrics.total_broken_connections > 0,
      delta: isRecovery ? `${baselineMetrics!.total_broken_connections - metrics.total_broken_connections} restored` : null,
    },
    {
      label: 'Stranded passengers',
      value: `${metrics.total_stranded_passengers}`,
      sub: 'missed connections',
      lit: metrics.total_stranded_passengers > 0,
      delta: isRecovery ? `${baselineMetrics!.total_stranded_passengers - metrics.total_stranded_passengers} rescued` : null,
    },
    {
      label: 'Crew overruns',
      value: `${metrics.total_crew_violations}`,
      sub: 'past 600 min cap',
      lit: metrics.total_crew_violations > 0,
      delta: isRecovery ? `${baselineMetrics!.total_crew_violations - metrics.total_crew_violations} averted` : null,
    },
    {
      label: 'On-time rate',
      value: `${metrics.on_time_percentage}%`,
      sub: 'fleet reliability',
      lit: metrics.on_time_percentage < 90,
      delta: isRecovery ? `+${metrics.on_time_percentage - baselineMetrics!.on_time_percentage}% gain` : null,
    },
  ];

  return (
    <div
      className="mono"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        borderBottom: '1px solid var(--color-rule)',
      }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          style={{
            padding: '16px 20px',
            borderRight: i < 5 ? '1px solid var(--color-rule)' : undefined,
          }}
        >
          <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginBottom: '6px' }}>
            {s.label}
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              lineHeight: 1,
              color: s.lit ? 'var(--color-accent)' : 'var(--color-ink)',
              letterSpacing: '-0.02em',
            }}
          >
            {s.value}
          </div>
          {s.delta && s.delta.startsWith('-') === false && (
            <div style={{ fontSize: '10px', color: 'var(--color-accent)', marginTop: '4px' }}>
              {s.delta}
            </div>
          )}
          {(!s.delta) && (
            <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '4px' }}>
              {s.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
