'use client';

import React, { useState } from 'react';
import { SimulatedFlight } from '@/engine/types';

interface FlightTableProps {
  flights: SimulatedFlight[];
  selectedFlightId: string | null;
  onSelectFlight: (id: string | null) => void;
}

export function FlightTable({ flights, selectedFlightId, onSelectFlight }: FlightTableProps) {
  const [filter, setFilter] = useState<'all' | 'delayed' | 'cancelled'>('all');
  const [search, setSearch] = useState('');

  const visible = flights.filter((f) => {
    if (filter === 'delayed'   && f.status !== 'delayed')   return false;
    if (filter === 'cancelled' && f.status !== 'cancelled') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        f.flight_id.toLowerCase().includes(q) ||
        f.tail_id.toLowerCase().includes(q) ||
        f.origin.toLowerCase().includes(q) ||
        f.destination.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const rule = '1px solid var(--color-rule)';
  const nDelayed   = flights.filter((f) => f.status === 'delayed').length;
  const nCancelled = flights.filter((f) => f.status === 'cancelled').length;

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink)' }}>Flight roster</div>
          <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '2px' }}>Seventy rotations with causal delay trace. Click any row to expand.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search…"
            aria-label="Search flights by ID, tail, or airport code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
            style={{
              background: 'var(--color-paper-3)',
              border: rule,
              borderRadius: '3px',
              color: 'var(--color-ink)',
              padding: '4px 10px',
              fontSize: '11px',
              fontFamily: 'ui-monospace, monospace',
              width: '140px',
            }}
          />
          {(['all', 'delayed', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] active:scale-95 disabled:opacity-50"
              style={{
                background: filter === f ? 'var(--color-rule-2)' : 'none',
                border: filter === f ? '1px solid var(--color-rule-2)' : '1px solid transparent',
                color: filter === f && f === 'delayed' ? 'var(--color-accent)' : filter === f ? 'var(--color-ink)' : 'var(--color-muted)',
                borderRadius: '3px',
                padding: '4px 10px',
                fontSize: '10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              aria-pressed={filter === f}
            >
              {f === 'all' ? `All (${flights.length})` : f === 'delayed' ? `Delayed (${nDelayed})` : `Cancelled (${nCancelled})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', maxHeight: '340px', overflowY: 'auto', border: rule, borderRadius: '3px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ borderBottom: rule, position: 'sticky', top: 0, background: 'var(--color-paper-2)', zIndex: 2 }}>
              {['Flight', 'Tail', 'Leg', 'Route', 'Scheduled', 'Actual', 'Delay', 'Status'].map((h) => (
                <th
                  key={h}
                  style={{ padding: '7px 10px', textAlign: 'left', fontSize: '9px', color: 'var(--color-muted)', fontWeight: 400, fontFamily: 'ui-monospace, monospace' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((f) => {
              const sel  = selectedFlightId === f.flight_id;
              const late = f.status === 'delayed';
              const gone = f.status === 'cancelled';

              return (
                <React.Fragment key={f.flight_id}>
                  <tr
                    onClick={() => onSelectFlight(sel ? null : f.flight_id)}
                    tabIndex={0}
                    role="button"
                    aria-expanded={sel}
                    aria-label={`Flight ${f.flight_id} from ${f.origin} to ${f.destination}, ${f.status}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectFlight(sel ? null : f.flight_id);
                      }
                    }}
                    style={{
                      borderBottom: '1px solid var(--color-rule)',
                      background: sel ? 'var(--color-paper-3)' : undefined,
                      cursor: 'pointer',
                      borderLeft: sel ? '2px solid var(--color-accent)' : '2px solid transparent',
                    }}
                    className="focus-visible:outline-none focus-visible:bg-[var(--color-paper-3)]"
                  >
                    <td style={{ padding: '7px 10px', fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--color-ink)' }}>{f.flight_id}</td>
                    <td style={{ padding: '7px 10px', fontFamily: 'ui-monospace, monospace', color: 'var(--color-ink-2)' }}>
                      {f.assigned_tail_id}
                      {f.assigned_tail_id !== f.tail_id && (
                        <span style={{ marginLeft: '4px', fontSize: '8px', border: '1px solid var(--color-accent)', color: 'var(--color-accent)', padding: '1px 4px', borderRadius: '2px' }}>spare</span>
                      )}
                    </td>
                    <td style={{ padding: '7px 10px', fontFamily: 'ui-monospace, monospace', color: 'var(--color-muted)' }}>L{f.leg_order}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--color-ink)' }}>{f.origin} to {f.destination}</td>
                    <td style={{ padding: '7px 10px', fontFamily: 'ui-monospace, monospace', color: 'var(--color-muted)' }}>{f.dep} to {f.arr}</td>
                    <td style={{ padding: '7px 10px', fontFamily: 'ui-monospace, monospace', color: gone ? 'var(--color-muted)' : 'var(--color-ink-2)', textDecoration: gone ? 'line-through' : undefined }}>
                      {gone ? 'Cancelled' : `${f.actual_dep} to ${f.actual_arr}`}
                    </td>
                    <td style={{ padding: '7px 10px', fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: late ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                      {f.arr_delay_mins > 0 ? `+${f.arr_delay_mins}m` : '0m'}
                    </td>
                    <td style={{ padding: '7px 10px', fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: gone ? 'var(--color-muted)' : late ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                      {f.status}
                    </td>
                  </tr>

                  {sel && (
                    <tr style={{ background: 'var(--color-paper-3)' }}>
                      <td colSpan={8} style={{ padding: '12px 14px', borderBottom: rule }}>
                        <div className="mono" style={{ fontSize: '10px', lineHeight: 1.7 }}>
                          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                            Causal trace: {f.flight_id} ({f.origin} to {f.destination})
                          </span>
                          <div style={{ color: 'var(--color-ink-2)', marginTop: '4px' }}>
                            Pax: {f.pax}, Block: {f.block_minutes}m, Load: {Math.round((f.pax / 180) * 100)}%
                          </div>
                          {f.delay_causes.length > 0 ? (
                            f.delay_causes.map((c, ci) => (
                              <div key={ci} style={{ color: 'var(--color-accent)', marginTop: '2px' }}>
                                [{c.type}] {c.detail} (+{c.delay_added_mins}m)
                              </div>
                            ))
                          ) : (
                            <div style={{ color: 'var(--color-muted)', marginTop: '2px' }}>No delay. Operating on planned schedule.</div>
                          )}
                          {f.cancellation_reason && (
                            <div style={{ color: 'var(--color-accent)', fontWeight: 600, marginTop: '2px' }}>
                              Cancellation: {f.cancellation_reason}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
