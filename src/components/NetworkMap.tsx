'use client';

import React, { useMemo } from 'react';
import { Airport, SimulatedFlight } from '@/engine/types';

interface NetworkMapProps {
  airports: Airport[];
  flights: SimulatedFlight[];
  selectedAirport: string | null;
  onSelectAirport: (id: string | null) => void;
  closureAirportId: string | null;
}

export function NetworkMap({
  airports,
  flights,
  selectedAirport,
  onSelectAirport,
  closureAirportId,
}: NetworkMapProps) {
  const minLng = 71.0, maxLng = 93.5, minLat = 7.5, maxLat = 32.0;

  const project = useMemo(() => (lat: number, lng: number) => ({
    x: ((lng - minLng) / (maxLng - minLng)) * 540 + 40,
    y: ((maxLat - lat) / (maxLat - minLat)) * 520 + 40,
  }), []);

  const airportMap = useMemo(() => {
    const m = new Map<string, Airport & { x: number; y: number }>();
    airports.forEach((a) => m.set(a.id, { ...a, ...project(a.lat, a.lng) }));
    return m;
  }, [airports, project]);

  const routes = useMemo(() => {
    const rm = new Map<string, { ox: number; oy: number; dx: number; dy: number; disrupted: boolean; cancelled: boolean }>();
    flights.forEach((f) => {
      const o = airportMap.get(f.origin), d = airportMap.get(f.destination);
      if (!o || !d) return;
      const key = `${f.origin}-${f.destination}`;
      if (!rm.has(key)) {
        rm.set(key, { ox: o.x, oy: o.y, dx: d.x, dy: d.y, disrupted: false, cancelled: false });
      }
      const r = rm.get(key)!;
      if (f.status === 'delayed') r.disrupted = true;
      if (f.status === 'cancelled') r.cancelled = true;
    });
    return Array.from(rm.values());
  }, [flights, airportMap]);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Section label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink)' }}>Route network</div>
          <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '2px' }}>
            Amber arcs show cascading disruption. Dim arcs are nominal.
          </div>
        </div>
        {closureAirportId && (
          <div
            className="mono"
            style={{ fontSize: '10px', color: 'var(--color-accent)', border: '1px solid var(--color-accent)', padding: '2px 8px', borderRadius: '2px' }}
          >
            Ground stop: {closureAirportId}
          </div>
        )}
      </div>

      {/* SVG map */}
      <div
        style={{
          background: 'var(--color-paper-2)',
          border: '1px solid var(--color-rule)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <svg viewBox="0 0 620 600" style={{ width: '100%', maxHeight: '460px', display: 'block' }}>
          {/* Subtle grid */}
          <defs>
            <pattern id="g" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M30 0L0 0 0 30" fill="none" stroke="var(--color-rule)" strokeWidth="0.4" strokeOpacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />

          {/* Route arcs — only 2 colors: amber (disrupted) or rule-dim (nominal) */}
          {routes.map((r, i) => {
            const mx = (r.ox + r.dx) / 2;
            const my = (r.oy + r.dy) / 2 - Math.min(40, Math.hypot(r.dx - r.ox, r.dy - r.oy) * 0.18);
            return (
              <path
                key={i}
                d={`M${r.ox} ${r.oy} Q${mx} ${my} ${r.dx} ${r.dy}`}
                fill="none"
                stroke={r.disrupted ? 'var(--color-accent)' : 'var(--color-ink-2)'}
                strokeWidth={r.disrupted ? 1.6 : 0.6}
                strokeOpacity={r.disrupted ? 0.85 : 0.12}
                strokeDasharray={r.cancelled ? '4 3' : undefined}
              />
            );
          })}

          {/* Airport nodes */}
          {Array.from(airportMap.values()).map((apt) => {
            const sel = selectedAirport === apt.id;
            const closed = closureAirportId === apt.id;
            const big = apt.tier === 'mega_hub';
            const r = big ? 4.5 : 3;
            return (
              <g key={apt.id} style={{ cursor: 'pointer' }} onClick={() => onSelectAirport(sel ? null : apt.id)}>
                {(sel || closed) && (
                  <circle cx={apt.x} cy={apt.y} r={r + 5} fill="none" stroke="var(--color-accent)" strokeWidth="1" strokeOpacity="0.5" />
                )}
                <circle
                  cx={apt.x} cy={apt.y} r={r}
                  fill={closed ? 'var(--color-accent)' : sel ? 'var(--color-ink)' : 'var(--color-ink-2)'}
                  stroke="var(--color-paper-2)" strokeWidth="1"
                />
                <text
                  x={apt.x + 7} y={apt.y + 3}
                  fill={closed ? 'var(--color-accent)' : 'var(--color-ink-2)'}
                  fontSize={big ? '10px' : '9px'}
                  fontWeight={big ? 600 : 400}
                  fontFamily="ui-monospace, monospace"
                  style={{ userSelect: 'none' }}
                >
                  {apt.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Airport tooltip */}
      {selectedAirport && airportMap.get(selectedAirport) && (
        <div
          className="mono"
          style={{
            border: '1px solid var(--color-rule-2)',
            padding: '10px 14px',
            fontSize: '11px',
            background: 'var(--color-paper-3)',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: '3px' }}>
              {airportMap.get(selectedAirport)!.city} ({selectedAirport})
            </div>
            <div style={{ color: 'var(--color-muted)', fontSize: '10px' }}>
              {airportMap.get(selectedAirport)!.name}
            </div>
            <div style={{ color: 'var(--color-muted)', fontSize: '10px', marginTop: '2px' }}>
              {airportMap.get(selectedAirport)!.tier.replace('_', ' ')} — {airportMap.get(selectedAirport)!.capacity_per_hour} movements/hr
            </div>
          </div>
          <button
            onClick={() => onSelectAirport(null)}
            style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 4px' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
