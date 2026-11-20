'use client';

import React, { useMemo } from 'react';
import { AirportClosure, SimulatedFlight } from '@/engine/types';

interface CascadeTimelineProps {
  flights: SimulatedFlight[];
  closure: AirportClosure | null;
  onSelectFlight: (flightId: string) => void;
  selectedFlightId: string | null;
}

export function CascadeTimeline({ flights, closure, onSelectFlight, selectedFlightId }: CascadeTimelineProps) {
  const TL_START = 300;  // 05:00
  const TL_END   = 1380; // 23:00
  const TL_RANGE = TL_END - TL_START;

  const pct = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const mins = h * 60 + m;
    return ((Math.max(TL_START, Math.min(TL_END, mins)) - TL_START) / TL_RANGE) * 100;
  };

  const tails = useMemo(() => {
    const m = new Map<string, SimulatedFlight[]>();
    flights.forEach((f) => {
      const k = f.assigned_tail_id || f.tail_id;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(f);
    });
    const sorted = Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
    sorted.forEach(([, l]) => l.sort((a, b) => a.leg_order - b.leg_order));
    return sorted;
  }, [flights]);

  const hours = [5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
  const rule = '1px solid var(--color-rule)';

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink)' }}>Cascade timeline</div>
          <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '2px' }}>
            Tail chains VT-DS01 to VT-DS18. Amber bars are delayed. Ghost outline is the original schedule.
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '760px' }}>
          {/* Hour ruler */}
          <div
            className="mono"
            style={{ position: 'relative', height: '20px', borderBottom: rule, fontSize: '9px', color: 'var(--color-muted)', marginLeft: '72px' }}
          >
            {hours.map((h) => (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  left: `${((h * 60 - TL_START) / TL_RANGE) * 100}%`,
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span>{String(h).padStart(2, '0')}:00</span>
                <span style={{ width: '1px', height: '4px', background: 'var(--color-rule)', marginTop: '1px' }} />
              </div>
            ))}
          </div>

          {/* Tail rows */}
          <div style={{ position: 'relative' }}>
            {/* Closure overlay */}
            {closure && (
              <div
                style={{
                  position: 'absolute',
                  top: 0, bottom: 0,
                  left: `calc(72px + ${pct(closure.start_time)}% * (100% - 72px) / 100)`,
                  width: `${(pct(closure.end_time) - pct(closure.start_time)) / 100 * (100)}%`,
                  background: 'rgba(229,149,0,0.06)',
                  borderLeft: '1px solid rgba(229,149,0,0.3)',
                  borderRight: '1px solid rgba(229,149,0,0.3)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: '8px', color: 'var(--color-accent)', background: 'var(--color-paper-2)', border: '1px solid var(--color-accent)', padding: '1px 4px', display: 'inline-block', margin: '3px 0 0 2px', borderRadius: '2px' }}
                >
                  {closure.airport_id} ({closure.start_time} to {closure.end_time})
                </span>
              </div>
            )}

            {tails.map(([tailId, tf], ti) => (
              <div
                key={tailId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: ti < tails.length - 1 ? '1px solid var(--color-rule)' : undefined,
                  minHeight: '28px',
                }}
              >
                {/* Tail label */}
                <div
                  className="mono"
                  style={{ width: '72px', flexShrink: 0, fontSize: '9px', color: 'var(--color-ink-2)', paddingRight: '8px', textAlign: 'right' }}
                >
                  {tailId}
                </div>

                {/* Flight bars */}
                <div style={{ flex: 1, position: 'relative', height: '24px' }}>
                  {tf.map((f) => {
                    const sl = pct(f.dep);
                    const sw = Math.max(1, pct(f.arr) - sl);
                    const al = pct(f.actual_dep);
                    const aw = Math.max(1, pct(f.actual_arr) - al);
                    const isDelayed   = f.status === 'delayed';
                    const isCancelled = f.status === 'cancelled';
                    const isSel = selectedFlightId === f.flight_id;

                    return (
                      <React.Fragment key={f.flight_id}>
                        {/* Ghost scheduled bar for delayed flights */}
                        {isDelayed && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '6px', height: '12px',
                              left: `${sl}%`, width: `${sw}%`,
                              border: '1px dashed var(--color-rule-2)',
                              borderRadius: '2px',
                              opacity: 0.5,
                              pointerEvents: 'none',
                            }}
                          />
                        )}
                        {/* Actual bar */}
                        <button
                          onClick={() => onSelectFlight(f.flight_id)}
                          title={`${f.flight_id}: ${f.origin} to ${f.destination} (${f.actual_dep} to ${f.actual_arr})${isDelayed ? ` (+${f.arr_delay_mins}m)` : ''}`}
                          style={{
                            position: 'absolute',
                            top: '4px', height: '16px',
                            left: `${al}%`, width: `${aw}%`,
                            background: isCancelled ? 'transparent' : isDelayed ? 'var(--color-accent)' : 'var(--color-rule-2)',
                            border: isCancelled ? '1px dashed var(--color-rule-2)' : isSel ? '1px solid var(--color-accent)' : 'none',
                            borderRadius: '2px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            padding: '0 3px',
                            display: 'flex', alignItems: 'center',
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: '7.5px',
                            color: isCancelled ? 'var(--color-muted)' : isDelayed ? 'var(--color-accent-ink)' : 'var(--color-ink-2)',
                            outline: isSel ? '1px solid var(--color-accent)' : 'none',
                            outlineOffset: '1px',
                            zIndex: isDelayed ? 2 : 1,
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.flight_id}
                          </span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
