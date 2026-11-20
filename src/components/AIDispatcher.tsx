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
  const [briefing, setBriefing] = useState<{ summary: string; rootCause: string; recommendation: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    async function fetch_() {
      setLoading(true);
      try {
        const res = await fetch('/api/dispatcher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ result, recoveryOptions, baselineResult }),
        });
        if (res.ok && alive) setBriefing(await res.json());
      } catch {
        // silent
      } finally {
        if (alive) setLoading(false);
      }
    }
    fetch_();
    return () => { alive = false; };
  }, [result, recoveryOptions, baselineResult]);

  const rule = '1px solid var(--color-rule)';
  const rule2 = '1px solid var(--color-rule-2)';

  return (
    <div>
      {/* Section Header */}
      <div style={{ padding: '16px 24px', borderBottom: rule, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
            AI Operations Control & Recovery Dispatcher
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
            Autonomous cascade lineage evaluation and deterministic recovery optimization
          </div>
        </div>
        <div className="mono" style={{ fontSize: '11px', color: activeRecoveries.length > 0 ? 'var(--color-accent)' : 'var(--color-muted)' }}>
          {activeRecoveries.length > 0 ? `${activeRecoveries.length} intervention${activeRecoveries.length > 1 ? 's' : ''} active` : 'Standby dispatch'}
        </div>
      </div>

      {/* Main Split: Left Rich Telemetry Briefing (5fr) vs Right Recovery Interventions (7fr) */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', borderBottom: rule }}>
        {/* Left: Operational Causal Assessment & Telemetry Metrics */}
        <div style={{ padding: '24px', borderRight: rule, display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--color-paper-2)' }}>
          {/* Status Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 600 }}>
              {loading ? 'Evaluating cascade telemetry…' : 'Causal Lineage Assessment'}
            </div>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--color-muted)', border: rule, padding: '2px 8px', borderRadius: '2px' }}>
              Gemini 2.5 OCC Core
            </span>
          </div>

          {/* Primary Assessment Summary */}
          <div style={{ padding: '14px', background: 'var(--color-paper-3)', border: rule, borderRadius: '4px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-ink)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
              {briefing?.summary || 'Evaluating network telemetry and propagation vectors across all 16 aircraft tail rotations…'}
            </p>
          </div>

          {/* Cascade Lineage Breakdown */}
          {briefing?.rootCause && (
            <div style={{ padding: '14px', background: 'var(--color-paper-3)', border: rule, borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: 'var(--color-accent)', marginBottom: '6px', fontWeight: 600 }} className="mono">
                Cascade mechanism
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-ink-2)', lineHeight: 1.6, margin: 0 }}>
                {briefing.rootCause}
              </p>
            </div>
          )}

          {/* Recommendation */}
          {briefing?.recommendation && (
            <div style={{ padding: '14px', background: 'var(--color-paper-3)', border: rule, borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: 'var(--color-accent)', marginBottom: '6px', fontWeight: 600 }} className="mono">
                Strategic recovery recommendation
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-ink-2)', lineHeight: 1.6, margin: 0 }}>
                {briefing.recommendation}
              </p>
            </div>
          )}

          {/* Dispatcher Rules Reference Footer */}
          <div className="mono" style={{ padding: '10px 12px', border: rule, borderRadius: '4px', fontSize: '10px', color: 'var(--color-muted)', lineHeight: 1.6 }}>
            <div>Turnaround buffer rule: 30 minutes mandatory ground hold</div>
            <div>Statutory flight crew legal ceiling: 600 minutes (10.0 hours)</div>
            <div>Hot spare aircraft stationed at: BLR (VT-DS17) and DEL (VT-DS18)</div>
          </div>
        </div>

        {/* Right: Recovery Actions Roster (Spacious scrollable grid) */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
              Algorithmic recovery options ({recoveryOptions.length} evaluated)
            </div>
            <div className="mono" style={{ fontSize: '10px', color: 'var(--color-muted)' }}>
              Ranked by composite impact score
            </div>
          </div>

          {recoveryOptions.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', border: rule, borderRadius: '4px', background: 'var(--color-paper-2)' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
                Schedule is operating nominally. Execute a ground stop in the console above to generate algorithmic interventions.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
              {recoveryOptions.map((opt) => {
                const applied = activeRecoveries.some((a) => a.id === opt.id);
                return (
                  <div
                    key={opt.id}
                    style={{
                      border: applied ? '1px solid var(--color-accent)' : rule,
                      background: applied ? 'rgba(245, 158, 11, 0.08)' : 'var(--color-paper-2)',
                      borderRadius: '4px',
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: applied ? 'var(--color-accent)' : 'var(--color-ink)', marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {opt.title}
                        {opt.recommended_by_ai && (
                          <span className="mono" style={{ fontSize: '9px', background: 'var(--color-accent)', color: 'var(--color-accent-ink)', padding: '2px 6px', borderRadius: '2px', fontWeight: 700 }}>
                            AI recommended
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--color-muted)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                        {opt.description}
                      </p>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--color-ink-2)', display: 'flex', gap: '14px' }}>
                        <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                          +{opt.score_improvement.delay_mins_saved}m delay saved
                        </span>
                        <span>
                          {opt.score_improvement.passengers_saved} pax rescued
                        </span>
                        {opt.score_improvement.crew_violations_saved > 0 && (
                          <span style={{ color: 'var(--color-accent)' }}>
                            {opt.score_improvement.crew_violations_saved} crew violation averted
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleRecovery(opt)}
                      className="focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] active:scale-95 disabled:opacity-50"
                      style={{
                        background: applied ? 'var(--color-accent)' : 'var(--color-paper-3)',
                        border: applied ? 'none' : rule2,
                        color: applied ? 'var(--color-accent-ink)' : 'var(--color-ink)',
                        borderRadius: '3px',
                        padding: '8px 16px',
                        fontSize: '11px',
                        fontWeight: applied ? 700 : 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {applied ? 'Applied' : 'Apply action'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Before and After Delta HUD: Always displayed prominent below interventions */}
      {baselineResult && (
        <div
          className="mono"
          style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--color-rule)' }}
        >
          {[
            {
              label: 'Total delay reduction',
              value: `${baselineResult.metrics.total_delay_minutes - result.metrics.total_delay_minutes}m saved`,
              sub: `${baselineResult.metrics.total_delay_minutes}m baseline down to ${result.metrics.total_delay_minutes}m`,
            },
            {
              label: 'Connecting passengers rescued',
              value: `${baselineResult.metrics.total_stranded_passengers - result.metrics.total_stranded_passengers} travelers`,
              sub: `${baselineResult.metrics.total_stranded_passengers} stranded down to ${result.metrics.total_stranded_passengers}`,
            },
            {
              label: 'Passenger itineraries preserved',
              value: `${baselineResult.metrics.total_broken_connections - result.metrics.total_broken_connections} routes`,
              sub: `${baselineResult.metrics.total_broken_connections} broken down to ${result.metrics.total_broken_connections}`,
            },
            {
              label: 'Crew legal violations averted',
              value: `${baselineResult.metrics.total_crew_violations - result.metrics.total_crew_violations} crews`,
              sub: `${baselineResult.metrics.total_crew_violations} illegal down to ${result.metrics.total_crew_violations}`,
            },
          ].map((d, i) => (
            <div key={i} style={{ padding: '14px 20px', background: 'var(--color-paper-2)' }}>
              <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginBottom: '4px' }}>{d.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '-0.02em' }}>{d.value}</div>
              <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '2px' }}>{d.sub}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
