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

  return (
    <div>
      {/* Section header */}
      <div style={{ padding: '14px 24px', borderBottom: rule, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink)' }}>AI dispatcher</div>
          <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '2px' }}>
            Recovery recommendations with deterministic before/after verification
          </div>
        </div>
        <div className="mono" style={{ fontSize: '10px', color: activeRecoveries.length > 0 ? 'var(--color-accent)' : 'var(--color-muted)' }}>
          {activeRecoveries.length > 0 ? `${activeRecoveries.length} intervention${activeRecoveries.length > 1 ? 's' : ''} active` : 'standby'}
        </div>
      </div>

      {/* Briefing + recovery actions in a horizontal split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: rule }}>
        {/* Left: briefing */}
        <div style={{ padding: '20px 24px', borderRight: rule }}>
          <div className="mono" style={{ fontSize: '10px', color: 'var(--color-accent)', marginBottom: '10px', fontWeight: 600 }}>
            {loading ? 'Computing assessment…' : 'Causal assessment'}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-ink)', lineHeight: 1.6, margin: 0 }}>
            {briefing?.summary || 'Evaluating network telemetry and propagation across all aircraft tail chains…'}
          </p>
          {briefing?.rootCause && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-rule)' }}>
              <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginBottom: '6px' }}>Cascade mechanism</div>
              <p style={{ fontSize: '11px', color: 'var(--color-ink-2)', lineHeight: 1.6, margin: 0 }}>{briefing.rootCause}</p>
            </div>
          )}
          {briefing?.recommendation && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-rule)' }}>
              <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginBottom: '6px' }}>Recommendation</div>
              <p style={{ fontSize: '11px', color: 'var(--color-ink-2)', lineHeight: 1.6, margin: 0 }}>{briefing.recommendation}</p>
            </div>
          )}
        </div>

        {/* Right: recovery actions */}
        <div style={{ padding: '20px 24px' }}>
          <div className="mono" style={{ fontSize: '10px', color: 'var(--color-muted)', marginBottom: '10px' }}>
            Recovery interventions
          </div>
          {recoveryOptions.length === 0 ? (
            <p style={{ fontSize: '11px', color: 'var(--color-muted)', margin: 0 }}>
              No disruption active. Apply a ground stop to generate recovery options.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recoveryOptions.map((opt) => {
                const applied = activeRecoveries.some((a) => a.id === opt.id);
                return (
                  <div
                    key={opt.id}
                    style={{
                      border: applied ? '1px solid var(--color-accent)' : rule,
                      background: applied ? 'rgba(229,149,0,0.07)' : 'var(--color-paper-3)',
                      borderRadius: '3px',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: applied ? 'var(--color-accent)' : 'var(--color-ink)', marginBottom: '3px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {opt.title}
                        {opt.recommended_by_ai && (
                          <span className="mono" style={{ fontSize: '9px', background: 'var(--color-accent)', color: 'var(--color-accent-ink)', padding: '1px 5px', borderRadius: '2px', fontWeight: 700 }}>
                            top pick
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '10px', color: 'var(--color-muted)', margin: 0, lineHeight: 1.5 }}>{opt.description}</p>
                      <div className="mono" style={{ marginTop: '6px', fontSize: '10px', color: 'var(--color-ink-2)' }}>
                        {opt.score_improvement.delay_mins_saved}m delay saved — {opt.score_improvement.passengers_saved} pax rescued
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleRecovery(opt)}
                      style={{
                        background: applied ? 'var(--color-accent)' : 'none',
                        border: applied ? 'none' : '1px solid var(--color-rule-2)',
                        color: applied ? 'var(--color-accent-ink)' : 'var(--color-muted)',
                        borderRadius: '3px',
                        padding: '4px 10px',
                        fontSize: '10px',
                        fontWeight: applied ? 700 : 400,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {applied ? 'Applied' : 'Apply'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Before/after delta bar — only shown when recovery is active */}
      {baselineResult && (
        <div
          className="mono"
          style={{ padding: '12px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--color-rule)' }}
        >
          {[
            {
              label: 'Delay saved',
              value: `${baselineResult.metrics.total_delay_minutes - result.metrics.total_delay_minutes}m`,
              sub: `${baselineResult.metrics.total_delay_minutes}m to ${result.metrics.total_delay_minutes}m`,
            },
            {
              label: 'Passengers rescued',
              value: `${baselineResult.metrics.total_stranded_passengers - result.metrics.total_stranded_passengers}`,
              sub: `${baselineResult.metrics.total_stranded_passengers} to ${result.metrics.total_stranded_passengers} stranded`,
            },
            {
              label: 'Connections restored',
              value: `${baselineResult.metrics.total_broken_connections - result.metrics.total_broken_connections}`,
              sub: `${baselineResult.metrics.total_broken_connections} to ${result.metrics.total_broken_connections} broken`,
            },
            {
              label: 'Crew violations averted',
              value: `${baselineResult.metrics.total_crew_violations - result.metrics.total_crew_violations}`,
              sub: `${baselineResult.metrics.total_crew_violations} to ${result.metrics.total_crew_violations} illegal`,
            },
          ].map((d, i) => (
            <div key={i} style={{ padding: '10px 16px', background: 'var(--color-paper-3)' }}>
              <div style={{ fontSize: '9px', color: 'var(--color-muted)', marginBottom: '4px' }}>{d.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '-0.02em' }}>{d.value}</div>
              <div style={{ fontSize: '9px', color: 'var(--color-muted)', marginTop: '2px' }}>{d.sub}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
