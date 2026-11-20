'use client';

import React, { useEffect, useState } from 'react';
import { RecoveryAction, SimulationResult } from '@/engine/types';

interface AIDispatcherProps {
  result: SimulationResult;
  baselineResult: SimulationResult | null;
  recoveryOptions: RecoveryAction[];
  activeRecoveries: RecoveryAction[];
  onToggleRecovery: (action: RecoveryAction) => void;
}

export function AIDispatcher({
  result,
  baselineResult,
  recoveryOptions,
  activeRecoveries,
  onToggleRecovery,
}: AIDispatcherProps) {
  const [dispatcherBriefing, setDispatcherBriefing] = useState<{
    summary: string;
    rootCause: string;
    recommendation: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchBriefing() {
      setLoading(true);
      try {
        const res = await fetch('/api/dispatcher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            result,
            recoveryOptions,
            baselineResult,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setDispatcherBriefing(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dispatcher briefing:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchBriefing();

    return () => {
      isMounted = false;
    };
  }, [result, recoveryOptions, baselineResult]);

  return (
    <div className="panel-minimal p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              AI network dispatcher and recovery recommendations
            </h2>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Autonomous recovery optimization with deterministic before and after impact
          </p>
        </div>
        <div className="text-xs font-mono-measured text-[var(--color-muted)]">
          {activeRecoveries.length > 0 ? (
            <span className="text-[var(--color-accent)] font-medium">
              {activeRecoveries.length} recovery interventions active
            </span>
          ) : (
            <span>Standby dispatch</span>
          )}
        </div>
      </div>

      {/* Operational Briefing Box */}
      <div className="panel-subtle p-3.5 space-y-2 border border-[var(--color-rule-2)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono-measured text-[var(--color-accent)] font-semibold">
            Operational causal assessment
          </span>
          {loading && (
            <span className="text-[10px] text-[var(--color-muted)] font-mono-measured">
              Computing lineage…
            </span>
          )}
        </div>

        <p className="text-xs text-[var(--color-ink)] leading-relaxed">
          {dispatcherBriefing?.summary ||
            'Evaluating network telemetry and propagation vectors across all 16 aircraft tail chains…'}
        </p>

        {dispatcherBriefing?.rootCause && (
          <div className="pt-2 border-t border-[var(--color-rule)]/60">
            <div className="text-[11px] text-[var(--color-muted)] font-semibold mb-1">
              Cascade mechanism:
            </div>
            <p className="text-xs text-[var(--color-ink-2)] leading-normal">
              {dispatcherBriefing.rootCause}
            </p>
          </div>
        )}
      </div>

      {/* Recommended Recovery Actions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--color-ink)]">
            Algorithmic recovery interventions
          </h3>
          <span className="text-[10px] text-[var(--color-muted)] font-mono-measured">
            Evaluated via deterministic lookahead
          </span>
        </div>

        {recoveryOptions.length === 0 ? (
          <div className="panel-subtle p-3 text-center text-xs text-[var(--color-muted)]">
            No recovery actions required. Flight schedule is nominal.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recoveryOptions.map((opt) => {
              const isApplied = activeRecoveries.some((a) => a.id === opt.id);

              return (
                <div
                  key={opt.id}
                  className={`panel-minimal p-3 border rounded-[var(--radius-card)] flex flex-col justify-between transition-colors ${
                    isApplied
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : 'border-[var(--color-rule)] hover:border-[var(--color-rule-2)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-[var(--color-ink)]">
                        {opt.title}
                      </span>
                      {opt.recommended_by_ai && (
                        <span className="text-[9px] font-mono-measured font-semibold px-1.5 py-0.5 rounded bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
                          AI top pick
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed mb-3">
                      {opt.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-rule)]/60 flex items-center justify-between">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono-measured">
                      <div>
                        <div className="text-[var(--color-accent)] font-bold">
                          +{opt.score_improvement.delay_mins_saved}m
                        </div>
                        <div className="text-[9px] text-[var(--color-muted)]">Delay saved</div>
                      </div>
                      <div>
                        <div className="text-[var(--color-accent)] font-bold">
                          +{opt.score_improvement.passengers_saved}
                        </div>
                        <div className="text-[9px] text-[var(--color-muted)]">Pax saved</div>
                      </div>
                      <div>
                        <div className="text-[var(--color-accent)] font-bold">
                          +{opt.score_improvement.crew_violations_saved}
                        </div>
                        <div className="text-[9px] text-[var(--color-muted)]">Crews saved</div>
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleRecovery(opt)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius-pill)] transition-colors active:scale-95 disabled:opacity-50 cursor-pointer ${
                        isApplied
                          ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold'
                          : 'bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-[var(--color-ink)] hover:border-[var(--color-accent)]'
                      }`}
                    >
                      {isApplied ? 'Applied' : 'Apply action'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Before and After Delta Comparison Card */}
      {baselineResult && (
        <div className="panel-minimal p-3.5 border border-[var(--color-accent)] bg-[var(--color-paper-3)] rounded-[var(--radius-card)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[var(--color-accent)]">
              Before versus after recovery impact delta
            </span>
            <span className="text-[10px] font-mono-measured text-[var(--color-muted)]">
              Deterministic verification
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono-measured">
            <div className="p-2 rounded bg-[var(--color-paper-2)] border border-[var(--color-rule)]">
              <div className="text-[var(--color-muted)] text-[10px]">Total delay saved</div>
              <div className="text-base font-bold text-[var(--color-accent)]">
                {baselineResult.metrics.total_delay_minutes - result.metrics.total_delay_minutes} mins
              </div>
              <div className="text-[9px] text-[var(--color-muted)]">
                {baselineResult.metrics.total_delay_minutes}m to {result.metrics.total_delay_minutes}m
              </div>
            </div>

            <div className="p-2 rounded bg-[var(--color-paper-2)] border border-[var(--color-rule)]">
              <div className="text-[var(--color-muted)] text-[10px]">Passengers rescued</div>
              <div className="text-base font-bold text-[var(--color-accent)]">
                {baselineResult.metrics.total_stranded_passengers -
                  result.metrics.total_stranded_passengers}{' '}
                passengers
              </div>
              <div className="text-[9px] text-[var(--color-muted)]">
                {baselineResult.metrics.total_stranded_passengers} to{' '}
                {result.metrics.total_stranded_passengers} stranded
              </div>
            </div>

            <div className="p-2 rounded bg-[var(--color-paper-2)] border border-[var(--color-rule)]">
              <div className="text-[var(--color-muted)] text-[10px]">Connections preserved</div>
              <div className="text-base font-bold text-[var(--color-accent)]">
                {baselineResult.metrics.total_broken_connections -
                  result.metrics.total_broken_connections}{' '}
                routes
              </div>
              <div className="text-[9px] text-[var(--color-muted)]">
                {baselineResult.metrics.total_broken_connections} to{' '}
                {result.metrics.total_broken_connections} broken
              </div>
            </div>

            <div className="p-2 rounded bg-[var(--color-paper-2)] border border-[var(--color-rule)]">
              <div className="text-[var(--color-muted)] text-[10px]">Crew violations averted</div>
              <div className="text-base font-bold text-[var(--color-accent)]">
                {baselineResult.metrics.total_crew_violations -
                  result.metrics.total_crew_violations}{' '}
                crews
              </div>
              <div className="text-[9px] text-[var(--color-muted)]">
                {baselineResult.metrics.total_crew_violations} to{' '}
                {result.metrics.total_crew_violations} illegal
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
