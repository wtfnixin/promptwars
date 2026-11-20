'use client';

import React, { useState } from 'react';
import { Airport, AirportClosure } from '@/engine/types';

interface DisruptionControlProps {
  airports: Airport[];
  activeClosure: AirportClosure | null;
  onApplyClosure: (closure: AirportClosure | null) => void;
}

const PRESETS = [
  { label: '90m Thunderstorm', airport_id: 'BOM', start_time: '07:30', end_time: '09:00', reason: 'Monsoon squall line over Chhatrapati Shivaji Maharaj Intl' },
  { label: 'Morning fog stop',  airport_id: 'DEL', start_time: '06:00', end_time: '08:30', reason: 'Dense radiation fog at Indira Gandhi Intl' },
  { label: 'Runway maintenance', airport_id: 'BLR', start_time: '11:00', end_time: '12:30', reason: 'Tactical pavement repair at Kempegowda Intl' },
  { label: 'Tropical squall',   airport_id: 'MAA', start_time: '10:00', end_time: '12:00', reason: 'Bay of Bengal convective depression at Chennai' },
];

export function DisruptionControl({ airports, activeClosure, onApplyClosure }: DisruptionControlProps) {
  const [selApt, setSelApt] = useState('BOM');
  const [t0, setT0] = useState('07:30');
  const [t1, setT1] = useState('09:00');

  const rule = '1px solid var(--color-rule)';
  const rule2 = '1px solid var(--color-rule-2)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Panel header */}
      <div style={{ padding: '14px 20px', borderBottom: rule, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink)' }}>Disruption console</div>
          <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '2px' }}>Close any airport and watch the cascade</div>
        </div>
        {activeClosure && (
          <button
            onClick={() => onApplyClosure(null)}
            style={{
              background: 'none',
              border: rule2,
              color: 'var(--color-muted)',
              borderRadius: '3px',
              padding: '3px 10px',
              fontSize: '10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Active closure banner */}
      {activeClosure && (
        <div
          className="mono"
          style={{
            margin: '12px 20px 0',
            padding: '8px 12px',
            border: '1px solid var(--color-accent)',
            background: 'rgba(229,149,0,0.08)',
            borderRadius: '3px',
            fontSize: '10px',
            color: 'var(--color-ink)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
            {activeClosure.airport_id} closed {activeClosure.start_time} to {activeClosure.end_time}
          </span>
          <span style={{ color: 'var(--color-muted)' }}>cascade live</span>
        </div>
      )}

      {/* Presets */}
      <div style={{ padding: '12px 20px', borderBottom: rule }}>
        <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginBottom: '8px' }}>Scenarios</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {PRESETS.map((p) => {
            const active = activeClosure?.airport_id === p.airport_id &&
              activeClosure?.start_time === p.start_time &&
              activeClosure?.end_time === p.end_time;
            return (
              <button
                key={p.label}
                onClick={() => onApplyClosure({ airport_id: p.airport_id, start_time: p.start_time, end_time: p.end_time, reason: p.reason })}
                style={{
                  textAlign: 'left',
                  background: active ? 'rgba(229,149,0,0.10)' : 'var(--color-paper-3)',
                  border: active ? '1px solid var(--color-accent)' : rule,
                  borderRadius: '3px',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 500, color: active ? 'var(--color-accent)' : 'var(--color-ink)' }}>{p.label}</div>
                <div className="mono" style={{ fontSize: '9px', color: 'var(--color-muted)', marginTop: '2px' }}>{p.airport_id} {p.start_time}–{p.end_time}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom builder */}
      <div style={{ padding: '12px 20px', flex: 1 }}>
        <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginBottom: '8px' }}>Custom closure</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-muted)', marginBottom: '4px' }}>Airport</label>
            <select
              value={selApt}
              onChange={(e) => setSelApt(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--color-paper-3)',
                border: rule,
                borderRadius: '3px',
                color: 'var(--color-ink)',
                padding: '5px 8px',
                fontSize: '11px',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {airports.map((a) => (
                <option key={a.id} value={a.id}>{a.id}: {a.city}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-muted)', marginBottom: '4px' }}>Closes</label>
              <input type="time" value={t0} onChange={(e) => setT0(e.target.value)}
                style={{ width: '100%', background: 'var(--color-paper-3)', border: rule, borderRadius: '3px', color: 'var(--color-ink)', padding: '5px 8px', fontSize: '11px', fontFamily: 'ui-monospace, monospace', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-muted)', marginBottom: '4px' }}>Reopens</label>
              <input type="time" value={t1} onChange={(e) => setT1(e.target.value)}
                style={{ width: '100%', background: 'var(--color-paper-3)', border: rule, borderRadius: '3px', color: 'var(--color-ink)', padding: '5px 8px', fontSize: '11px', fontFamily: 'ui-monospace, monospace', boxSizing: 'border-box' }} />
            </div>
          </div>
          <button
            onClick={() => onApplyClosure({ airport_id: selApt, start_time: t0, end_time: t1, reason: `Custom ground stop: ${selApt} ${t0} to ${t1}` })}
            style={{
              width: '100%',
              background: 'var(--color-accent)',
              color: 'var(--color-accent-ink)',
              border: 'none',
              borderRadius: '3px',
              padding: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.02em',
            }}
          >
            Execute ground stop
          </button>
        </div>
      </div>

      {/* Dispatch rules footer */}
      <div className="mono" style={{ padding: '12px 20px', borderTop: rule, fontSize: '10px', color: 'var(--color-muted)', lineHeight: 1.6 }}>
        <div>Spare bases: BLR (VT-DS17) and DEL (VT-DS18)</div>
        <div>Crew duty ceiling: 600 min — Turnaround minimum: 30 min</div>
      </div>
    </div>
  );
}
