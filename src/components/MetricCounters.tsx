'use client';

import React from 'react';
import { SimulationMetrics } from '@/engine/types';

interface MetricCountersProps {
  metrics: SimulationMetrics;
  baselineMetrics: SimulationMetrics | null;
}

export function MetricCounters({ metrics, baselineMetrics }: MetricCountersProps) {
  const isRecoveryActive = baselineMetrics !== null;

  const cards = [
    {
      label: 'Cumulative delay',
      value: `${metrics.total_delay_minutes}m`,
      baselineValue: baselineMetrics ? `${baselineMetrics.total_delay_minutes}m` : null,
      delta: baselineMetrics
        ? `-${baselineMetrics.total_delay_minutes - metrics.total_delay_minutes}m`
        : null,
      deltaPositive: baselineMetrics
        ? baselineMetrics.total_delay_minutes > metrics.total_delay_minutes
        : false,
      color: metrics.total_delay_minutes > 0 ? 'var(--color-accent)' : 'var(--color-ok)',
      unit: 'minutes',
    },
    {
      label: 'Delayed flights',
      value: `${metrics.total_delayed_flights}`,
      baselineValue: baselineMetrics ? `${baselineMetrics.total_delayed_flights}` : null,
      delta: baselineMetrics
        ? `-${baselineMetrics.total_delayed_flights - metrics.total_delayed_flights}`
        : null,
      deltaPositive: baselineMetrics
        ? baselineMetrics.total_delayed_flights > metrics.total_delayed_flights
        : false,
      color: metrics.total_delayed_flights > 0 ? 'var(--color-accent)' : 'var(--color-ok)',
      unit: 'of 70 total',
    },
    {
      label: 'Broken connections',
      value: `${metrics.total_broken_connections}`,
      baselineValue: baselineMetrics ? `${baselineMetrics.total_broken_connections}` : null,
      delta: baselineMetrics
        ? `-${baselineMetrics.total_broken_connections - metrics.total_broken_connections}`
        : null,
      deltaPositive: baselineMetrics
        ? baselineMetrics.total_broken_connections > metrics.total_broken_connections
        : false,
      color: metrics.total_broken_connections > 0 ? 'var(--color-bad)' : 'var(--color-ok)',
      unit: 'of 21 pairs',
    },
    {
      label: 'Stranded passengers',
      value: `${metrics.total_stranded_passengers}`,
      baselineValue: baselineMetrics ? `${baselineMetrics.total_stranded_passengers}` : null,
      delta: baselineMetrics
        ? `-${baselineMetrics.total_stranded_passengers - metrics.total_stranded_passengers}`
        : null,
      deltaPositive: baselineMetrics
        ? baselineMetrics.total_stranded_passengers > metrics.total_stranded_passengers
        : false,
      color: metrics.total_stranded_passengers > 0 ? 'var(--color-bad)' : 'var(--color-ok)',
      unit: 'passengers impacted',
    },
    {
      label: 'Crew duty overruns',
      value: `${metrics.total_crew_violations}`,
      baselineValue: baselineMetrics ? `${baselineMetrics.total_crew_violations}` : null,
      delta: baselineMetrics
        ? `-${baselineMetrics.total_crew_violations - metrics.total_crew_violations}`
        : null,
      deltaPositive: baselineMetrics
        ? baselineMetrics.total_crew_violations > metrics.total_crew_violations
        : false,
      color: metrics.total_crew_violations > 0 ? 'var(--color-bad)' : 'var(--color-ok)',
      unit: 'over 600m legal limit',
    },
    {
      label: 'Network reliability',
      value: `${metrics.on_time_percentage}%`,
      baselineValue: baselineMetrics ? `${baselineMetrics.on_time_percentage}%` : null,
      delta: baselineMetrics
        ? `+${metrics.on_time_percentage - baselineMetrics.on_time_percentage}%`
        : null,
      deltaPositive: baselineMetrics
        ? metrics.on_time_percentage > baselineMetrics.on_time_percentage
        : false,
      color:
        metrics.on_time_percentage >= 85
          ? 'var(--color-ok)'
          : metrics.on_time_percentage >= 60
          ? 'var(--color-accent)'
          : 'var(--color-bad)',
      unit: 'on-time rate',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {cards.map((card, i) => (
        <div
          key={i}
          className="panel-console p-3 flex flex-col justify-between border border-[var(--color-rule)]"
        >
          <div className="text-[11px] text-[var(--color-muted)]">
            {card.label}
          </div>

          <div className="my-1.5 flex items-baseline gap-2">
            <span
              className="text-2xl font-bold font-mono-measured tracking-tight"
              style={{ color: card.color }}
            >
              {card.value}
            </span>

            {isRecoveryActive && card.delta && (
              <span
                className="text-[11px] font-mono-measured font-semibold px-1 py-0.5 rounded"
                style={{
                  color: card.deltaPositive ? 'var(--color-ok)' : 'var(--color-muted)',
                  backgroundColor: card.deltaPositive
                    ? 'var(--color-ok-soft)'
                    : 'var(--color-paper-3)',
                }}
              >
                {card.delta}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-[var(--color-muted)] font-mono-measured">
            <span>{card.unit}</span>
            {isRecoveryActive && card.baselineValue && (
              <span className="line-through opacity-70">Pre: {card.baselineValue}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
