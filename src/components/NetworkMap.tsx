'use client';

import React, { useMemo, useState } from 'react';
import { Airport, SimulatedFlight } from '@/engine/types';
import indiaPathsRaw from '@/data/india_svg_paths.json';

const indiaPaths = indiaPathsRaw as string[];

interface NetworkMapProps {
  airports: Airport[];
  flights: SimulatedFlight[];
  selectedAirport: string | null;
  onSelectAirport: (id: string | null) => void;
  closureAirportId: string | null;
}

interface CorridorRoute {
  key: string;
  originId: string;
  destId: string;
  ox: number;
  oy: number;
  dx: number;
  dy: number;
  flights: SimulatedFlight[];
  disrupted: boolean;
  cancelled: boolean;
  maxDelay: number;
}

export function NetworkMap({
  airports,
  flights,
  selectedAirport,
  onSelectAirport,
  closureAirportId,
}: NetworkMapProps) {
  const [corridorFilter, setCorridorFilter] = useState<'all' | 'disrupted'>('all');
  const [hoveredRoute, setHoveredRoute] = useState<CorridorRoute | null>(null);

  // Geographic bounds for India airspace matched to official Survey of India boundary
  const minLng = 67.5;
  const maxLng = 98.0;
  const minLat = 6.0;
  const maxLat = 37.0;

  const project = useMemo(() => (lat: number, lng: number) => ({
    x: ((lng - minLng) / (maxLng - minLng)) * 520 + 50,
    y: ((maxLat - lat) / (maxLat - minLat)) * 500 + 35,
  }), []);

  const airportMap = useMemo(() => {
    const m = new Map<string, Airport & { x: number; y: number }>();
    airports.forEach((a) => m.set(a.id, { ...a, ...project(a.lat, a.lng) }));
    return m;
  }, [airports, project]);

  const airportStats = useMemo(() => {
    const stats = new Map<string, { totalDep: number; lateDep: number; totalArr: number; lateArr: number; tails: Set<string> }>();
    airports.forEach((a) => {
      stats.set(a.id, { totalDep: 0, lateDep: 0, totalArr: 0, lateArr: 0, tails: new Set() });
    });

    flights.forEach((f) => {
      const orig = stats.get(f.origin);
      if (orig) {
        orig.totalDep += 1;
        if (f.status === 'delayed') orig.lateDep += 1;
        orig.tails.add(f.assigned_tail_id || f.tail_id);
      }
      const dest = stats.get(f.destination);
      if (dest) {
        orig?.tails.add(f.assigned_tail_id || f.tail_id);
        dest.totalArr += 1;
        if (f.status === 'delayed') dest.lateArr += 1;
      }
    });

    return stats;
  }, [airports, flights]);

  const corridors = useMemo(() => {
    const rm = new Map<string, CorridorRoute>();
    flights.forEach((f) => {
      const o = airportMap.get(f.origin);
      const d = airportMap.get(f.destination);
      if (!o || !d) return;
      const key = `${f.origin}-${f.destination}`;
      if (!rm.has(key)) {
        rm.set(key, {
          key,
          originId: f.origin,
          destId: f.destination,
          ox: o.x,
          oy: o.y,
          dx: d.x,
          dy: d.y,
          flights: [],
          disrupted: false,
          cancelled: false,
          maxDelay: 0,
        });
      }
      const r = rm.get(key)!;
      r.flights.push(f);
      if (f.status === 'delayed') {
        r.disrupted = true;
        r.maxDelay = Math.max(r.maxDelay, f.arr_delay_mins);
      }
      if (f.status === 'cancelled') {
        r.cancelled = true;
      }
    });
    return Array.from(rm.values());
  }, [flights, airportMap]);

  const activeFocusAirport = selectedAirport || closureAirportId;
  const focusPoint = activeFocusAirport ? airportMap.get(activeFocusAirport) : null;

  const disruptedCount = corridors.filter((c) => c.disrupted || c.cancelled).length;
  const visibleCorridors = corridorFilter === 'disrupted' 
    ? corridors.filter((c) => c.disrupted || c.cancelled) 
    : corridors;

  const rule = '1px solid var(--color-rule)';
  const rule2 = '1px solid var(--color-rule-2)';

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Telemetry Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Air route radar & corridor vectors</span>
            <span className="mono" style={{ fontSize: '9px', color: 'var(--color-muted)' }}>
              ({corridors.length} active corridors)
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '2px' }}>
            Amber arcs show downstream cascade vectors. Range reticle tracks operational ground stops.
          </div>
        </div>

        {/* Corridor filter controls */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={() => setCorridorFilter('all')}
            className="focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: corridorFilter === 'all' ? 'var(--color-paper-3)' : 'transparent',
              border: corridorFilter === 'all' ? rule2 : '1px solid transparent',
              color: corridorFilter === 'all' ? 'var(--color-ink)' : 'var(--color-muted)',
              borderRadius: '3px',
              padding: '2px 8px',
              fontSize: '10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            All corridors ({corridors.length})
          </button>
          <button
            onClick={() => setCorridorFilter('disrupted')}
            className="focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: corridorFilter === 'disrupted' ? 'rgba(229,149,0,0.12)' : 'transparent',
              border: corridorFilter === 'disrupted' ? '1px solid var(--color-accent)' : '1px solid transparent',
              color: corridorFilter === 'disrupted' ? 'var(--color-accent)' : 'var(--color-muted)',
              borderRadius: '3px',
              padding: '2px 8px',
              fontSize: '10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Disrupted vectors ({disruptedCount})
          </button>
        </div>
      </div>

      {/* Primary SVG Radar Scope */}
      <div
        style={{
          background: 'var(--color-paper-2)',
          border: rule,
          borderRadius: '4px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg
          viewBox="0 0 620 590"
          style={{ width: '100%', maxHeight: '470px', display: 'block' }}
          aria-label="Air route vector and cascade telemetry map"
        >
          <defs>
            {/* Fine radar grid pattern */}
            <pattern id="radar-grid" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="var(--color-rule)" strokeWidth="0.35" strokeOpacity="0.45" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect width="100%" height="100%" fill="url(#radar-grid)" />

          {/* Official Survey of India Cartographic State Boundaries & Coastline */}
          <g>
            {indiaPaths.map((d, idx) => (
              <path
                key={idx}
                d={d}
                fill="var(--color-paper-3)"
                fillOpacity="0.45"
                stroke="var(--color-rule-2)"
                strokeWidth="0.65"
              />
            ))}
          </g>

          {/* Graticule Latitude / Longitude lines */}
          <line x1="40" y1="130" x2="580" y2="130" stroke="var(--color-rule)" strokeWidth="0.5" strokeDasharray="3 4" strokeOpacity="0.4" />
          <text x="45" y="125" fill="var(--color-muted)" fontSize="8px" fontFamily="ui-monospace, monospace">LAT 28°N</text>

          <line x1="40" y1="285" x2="580" y2="285" stroke="var(--color-rule)" strokeWidth="0.5" strokeDasharray="3 4" strokeOpacity="0.4" />
          <text x="45" y="280" fill="var(--color-muted)" fontSize="8px" fontFamily="ui-monospace, monospace">LAT 20°N</text>

          <line x1="40" y1="440" x2="580" y2="440" stroke="var(--color-rule)" strokeWidth="0.5" strokeDasharray="3 4" strokeOpacity="0.4" />
          <text x="45" y="435" fill="var(--color-muted)" fontSize="8px" fontFamily="ui-monospace, monospace">LAT 12°N</text>

          <line x1="180" y1="30" x2="180" y2="560" stroke="var(--color-rule)" strokeWidth="0.5" strokeDasharray="3 4" strokeOpacity="0.4" />
          <text x="183" y="555" fill="var(--color-muted)" fontSize="8px" fontFamily="ui-monospace, monospace">LON 76°E</text>

          <line x1="375" y1="30" x2="375" y2="560" stroke="var(--color-rule)" strokeWidth="0.5" strokeDasharray="3 4" strokeOpacity="0.4" />
          <text x="378" y="555" fill="var(--color-muted)" fontSize="8px" fontFamily="ui-monospace, monospace">LON 85°E</text>

          {/* Concentric ATC Range Rings around active focus airport */}
          {focusPoint && (
            <g opacity="0.35">
              <circle cx={focusPoint.x} cy={focusPoint.y} r="55" fill="none" stroke="var(--color-accent)" strokeWidth="0.6" strokeDasharray="2 3" />
              <circle cx={focusPoint.x} cy={focusPoint.y} r="110" fill="none" stroke="var(--color-accent)" strokeWidth="0.6" strokeDasharray="2 3" />
              <circle cx={focusPoint.x} cy={focusPoint.y} r="170" fill="none" stroke="var(--color-accent)" strokeWidth="0.6" strokeDasharray="3 4" />
              <text x={focusPoint.x + 58} y={focusPoint.y - 2} fill="var(--color-accent)" fontSize="7.5px" fontFamily="ui-monospace, monospace">250km</text>
              <text x={focusPoint.x + 113} y={focusPoint.y - 2} fill="var(--color-accent)" fontSize="7.5px" fontFamily="ui-monospace, monospace">500km</text>
              <text x={focusPoint.x + 173} y={focusPoint.y - 2} fill="var(--color-accent)" fontSize="7.5px" fontFamily="ui-monospace, monospace">750km</text>
            </g>
          )}

          {/* Route Vectors & Arcs */}
          {visibleCorridors.map((c) => {
            const mx = (c.ox + c.dx) / 2;
            const my = (c.oy + c.dy) / 2 - Math.min(42, Math.hypot(c.dx - c.ox, c.dy - c.oy) * 0.17);
            const pathD = `M ${c.ox} ${c.oy} Q ${mx} ${my} ${c.dx} ${c.dy}`;
            const isHovered = hoveredRoute?.key === c.key;

            return (
              <g
                key={c.key}
                onMouseEnter={() => setHoveredRoute(c)}
                onMouseLeave={() => setHoveredRoute(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Wider invisible hit area for mouse interactions */}
                <path d={pathD} fill="none" stroke="transparent" strokeWidth="12" />

                {/* Visible Arc Vector */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={c.disrupted ? 'var(--color-accent)' : 'var(--color-ink-2)'}
                  strokeWidth={isHovered ? 2.4 : c.disrupted ? 1.6 : 0.65}
                  strokeOpacity={isHovered ? 1 : c.disrupted ? 0.9 : 0.14}
                  strokeDasharray={c.cancelled ? '4 3' : undefined}
                />

                {/* Mid-point direction indicator dot for disrupted routes */}
                {c.disrupted && (
                  <circle
                    cx={mx}
                    cy={my}
                    r="2"
                    fill="var(--color-accent)"
                    opacity="0.8"
                  />
                )}
              </g>
            );
          })}

          {/* Airport Terminals & Hub Nodes */}
          {Array.from(airportMap.values()).map((apt) => {
            const isSelected = selectedAirport === apt.id;
            const isClosed = closureAirportId === apt.id;
            const isMegaHub = apt.tier === 'mega_hub';
            const stats = airportStats.get(apt.id);
            const hasDelays = stats && (stats.lateDep > 0 || stats.lateArr > 0);

            const r = isMegaHub ? 4.5 : 3;

            return (
              <g
                key={apt.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectAirport(isSelected ? null : apt.id)}
              >
                {/* Outer tactical crosshair reticle for Mega Hubs */}
                {isMegaHub && (
                  <g opacity={isClosed || isSelected ? '0.9' : '0.4'}>
                    <line x1={apt.x - 8} y1={apt.y} x2={apt.x - 5} y2={apt.y} stroke={isClosed ? 'var(--color-accent)' : 'var(--color-ink-2)'} strokeWidth="0.8" />
                    <line x1={apt.x + 5} y1={apt.y} x2={apt.x + 8} y2={apt.y} stroke={isClosed ? 'var(--color-accent)' : 'var(--color-ink-2)'} strokeWidth="0.8" />
                    <line x1={apt.x} y1={apt.y - 8} x2={apt.x} y2={apt.y - 5} stroke={isClosed ? 'var(--color-accent)' : 'var(--color-ink-2)'} strokeWidth="0.8" />
                    <line x1={apt.x} y1={apt.y + 5} x2={apt.x} y2={apt.y + 8} stroke={isClosed ? 'var(--color-accent)' : 'var(--color-ink-2)'} strokeWidth="0.8" />
                  </g>
                )}

                {/* Status indicator ring */}
                {(isClosed || isSelected || hasDelays) && (
                  <circle
                    cx={apt.x}
                    cy={apt.y}
                    r={r + (isClosed ? 6 : 4)}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={isClosed ? '1.4' : '0.8'}
                    strokeDasharray={isClosed ? undefined : '2 2'}
                    strokeOpacity={isClosed ? '0.9' : '0.6'}
                  />
                )}

                {/* Main terminal node */}
                <circle
                  cx={apt.x}
                  cy={apt.y}
                  r={r}
                  fill={isClosed ? 'var(--color-accent)' : isSelected ? 'var(--color-ink)' : 'var(--color-paper-3)'}
                  stroke={isClosed ? 'var(--color-paper)' : hasDelays ? 'var(--color-accent)' : 'var(--color-rule-2)'}
                  strokeWidth="1.2"
                />

                {/* Terminal IATA Code */}
                <text
                  x={apt.x + 7}
                  y={apt.y + 3}
                  fill={isClosed ? 'var(--color-accent)' : isSelected ? 'var(--color-ink)' : hasDelays ? 'var(--color-accent)' : 'var(--color-ink-2)'}
                  fontSize={isMegaHub ? '10px' : '8.5px'}
                  fontWeight={isMegaHub ? 700 : 400}
                  fontFamily="ui-monospace, monospace"
                  style={{ userSelect: 'none' }}
                >
                  {apt.id}
                </text>

                {/* Tactical flight count pill for delayed departures */}
                {stats && stats.lateDep > 0 && (
                  <text
                    x={apt.x + 7}
                    y={apt.y + 12}
                    fill="var(--color-accent)"
                    fontSize="7px"
                    fontFamily="ui-monospace, monospace"
                    opacity="0.9"
                    style={{ userSelect: 'none' }}
                  >
                    +{stats.lateDep} late
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hovered Corridor Telemetry HUD Banner */}
        {hoveredRoute && (
          <div
            className="mono"
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              padding: '6px 10px',
              background: 'var(--color-paper-3)',
              border: rule2,
              borderRadius: '3px',
              fontSize: '10px',
              color: 'var(--color-ink)',
              pointerEvents: 'none',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontWeight: 600, color: hoveredRoute.disrupted ? 'var(--color-accent)' : 'var(--color-ink)' }}>
              Corridor {hoveredRoute.originId} to {hoveredRoute.destId}
            </div>
            <div style={{ color: 'var(--color-muted)', fontSize: '9px', marginTop: '2px' }}>
              Flights: {hoveredRoute.flights.map((f) => f.flight_id).join(', ')}
              {hoveredRoute.disrupted && ` (Max delay: +${hoveredRoute.maxDelay}m)`}
            </div>
          </div>
        )}
      </div>

      {/* Selected Airport Telemetry Drawer */}
      {selectedAirport && airportMap.get(selectedAirport) && (
        <div
          className="mono"
          style={{
            border: rule2,
            padding: '10px 14px',
            fontSize: '11px',
            background: 'var(--color-paper-3)',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                {airportMap.get(selectedAirport)!.city} ({selectedAirport})
              </span>
              <span style={{ fontSize: '9px', color: 'var(--color-muted)', border: rule, padding: '1px 5px', borderRadius: '2px' }}>
                {airportMap.get(selectedAirport)!.tier.replace('_', ' ')}
              </span>
              {closureAirportId === selectedAirport && (
                <span style={{ fontSize: '9px', color: 'var(--color-accent)', border: '1px solid var(--color-accent)', padding: '1px 5px', borderRadius: '2px' }}>
                  GROUND STOP ACTIVE
                </span>
              )}
            </div>

            <div style={{ color: 'var(--color-muted)', fontSize: '10px' }}>
              {airportMap.get(selectedAirport)!.name} : Capacity {airportMap.get(selectedAirport)!.capacity_per_hour} mvts/hr
            </div>

            {/* Inbound & Outbound telemetry */}
            {airportStats.get(selectedAirport) && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '10px' }}>
                <div>
                  <span style={{ color: 'var(--color-muted)' }}>Departures: </span>
                  <span style={{ color: 'var(--color-ink)' }}>{airportStats.get(selectedAirport)!.totalDep} total</span>
                  {airportStats.get(selectedAirport)!.lateDep > 0 && (
                    <span style={{ color: 'var(--color-accent)', marginLeft: '4px' }}>
                      ({airportStats.get(selectedAirport)!.lateDep} delayed)
                    </span>
                  )}
                </div>
                <div>
                  <span style={{ color: 'var(--color-muted)' }}>Arrivals: </span>
                  <span style={{ color: 'var(--color-ink)' }}>{airportStats.get(selectedAirport)!.totalArr} total</span>
                  {airportStats.get(selectedAirport)!.lateArr > 0 && (
                    <span style={{ color: 'var(--color-accent)', marginLeft: '4px' }}>
                      ({airportStats.get(selectedAirport)!.lateArr} delayed)
                    </span>
                  )}
                </div>
                <div>
                  <span style={{ color: 'var(--color-muted)' }}>Active tails: </span>
                  <span style={{ color: 'var(--color-ink)' }}>{airportStats.get(selectedAirport)!.tails.size}</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onSelectAirport(null)}
            className="focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] active:scale-95 disabled:opacity-50"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-muted)',
              cursor: 'pointer',
              fontSize: '14px',
              lineHeight: 1,
              padding: '0 4px',
            }}
            aria-label="Close airport telemetry panel"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
