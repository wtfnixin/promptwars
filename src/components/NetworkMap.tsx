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
  // Bounding box for India airport coordinates
  // Lng: ~72.5 (AMD) to ~92.0 (GAU), Lat: ~8.4 (TRV) to ~31.0 (IXC)
  const minLng = 71.0;
  const maxLng = 93.5;
  const minLat = 7.5;
  const maxLat = 32.0;

  const project = useMemo(() => {
    return (lat: number, lng: number) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * 540 + 40;
      const y = ((maxLat - lat) / (maxLat - minLat)) * 520 + 40;
      return { x, y };
    };
  }, []);

  const airportMap = useMemo(() => {
    const map = new Map<string, Airport & { x: number; y: number }>();
    airports.forEach((apt) => {
      const coords = project(apt.lat, apt.lng);
      map.set(apt.id, { ...apt, ...coords });
    });
    return map;
  }, [airports, project]);

  // Aggregate flight routes to avoid duplicate overlapping lines
  const routes = useMemo(() => {
    const routeMap = new Map<
      string,
      {
        origin: Airport & { x: number; y: number };
        dest: Airport & { x: number; y: number };
        totalFlights: number;
        delayedFlights: number;
        cancelledFlights: number;
      }
    >();

    flights.forEach((f) => {
      const orig = airportMap.get(f.origin);
      const dest = airportMap.get(f.destination);
      if (!orig || !dest) return;

      const key = `${f.origin}-${f.destination}`;
      const existing = routeMap.get(key);
      const isDelayed = f.status === 'delayed';
      const isCancelled = f.status === 'cancelled';

      if (existing) {
        existing.totalFlights++;
        if (isDelayed) existing.delayedFlights++;
        if (isCancelled) existing.cancelledFlights++;
      } else {
        routeMap.set(key, {
          origin: orig,
          dest: dest,
          totalFlights: 1,
          delayedFlights: isDelayed ? 1 : 0,
          cancelledFlights: isCancelled ? 1 : 0,
        });
      }
    });

    return Array.from(routeMap.values());
  }, [flights, airportMap]);

  return (
    <div className="panel-console p-4 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)] mb-3">
        <div>
          <h2 className="text-sm font-medium tracking-tight text-[var(--color-ink)] uppercase">
            National Air Route Telemetry Map
          </h2>
          <p className="text-xs text-[var(--color-muted)]">
            16 Hubs & Spoke Terminals · Live Arc Vectors
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono-measured">
          <span className="flex items-center gap-1.5 text-[var(--color-cool)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-cool)] inline-block" />
            Nominal
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-accent)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] inline-block" />
            Cascade Delay
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-bad)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-bad)] inline-block" />
            Ground Stop / Closed
          </span>
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center min-h-[380px] bg-[var(--color-paper-3)] rounded-[var(--radius-pill)] border border-[var(--color-rule)] overflow-hidden">
        <svg
          viewBox="0 0 620 600"
          className="w-full h-full max-h-[500px]"
          aria-label="Interactive India Flight Route Map"
        >
          {/* Subtle background grid */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke="var(--color-rule)"
                strokeWidth="0.5"
                strokeOpacity="0.4"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Flight Path Arcs */}
          {routes.map((route, i) => {
            const { origin, dest, delayedFlights, cancelledFlights } = route;
            const midX = (origin.x + dest.x) / 2;
            const midY = (origin.y + dest.y) / 2 - Math.min(35, Math.hypot(dest.x - origin.x, dest.y - origin.y) * 0.18);
            const pathD = `M ${origin.x} ${origin.y} Q ${midX} ${midY} ${dest.x} ${dest.y}`;

            let strokeColor = 'var(--color-cool)';
            let strokeOpacity = 0.45;
            let strokeWidth = 1.2;

            if (cancelledFlights > 0) {
              strokeColor = 'var(--color-bad)';
              strokeOpacity = 0.9;
              strokeWidth = 2.0;
            } else if (delayedFlights > 0) {
              strokeColor = 'var(--color-accent)';
              strokeOpacity = 0.85;
              strokeWidth = 1.8;
            }

            return (
              <path
                key={i}
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeOpacity={strokeOpacity}
                strokeDasharray={cancelledFlights > 0 ? '4 3' : undefined}
              />
            );
          })}

          {/* Airport Nodes */}
          {Array.from(airportMap.values()).map((apt) => {
            const isSelected = selectedAirport === apt.id;
            const isClosed = closureAirportId === apt.id;
            const isMegaHub = apt.tier === 'mega_hub';

            let nodeColor = 'var(--color-cool)';
            let nodeRadius = isMegaHub ? 5 : 3.5;

            if (isClosed) {
              nodeColor = 'var(--color-bad)';
              nodeRadius = 7;
            } else if (isSelected) {
              nodeColor = 'var(--color-accent)';
              nodeRadius = 6;
            }

            return (
              <g
                key={apt.id}
                className="cursor-pointer transition-transform"
                onClick={() => onSelectAirport(isSelected ? null : apt.id)}
              >
                {/* Glow ring if closed or selected */}
                {(isClosed || isSelected) && (
                  <circle
                    cx={apt.x}
                    cy={apt.y}
                    r={nodeRadius + 4}
                    fill="none"
                    stroke={nodeColor}
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                  />
                )}

                <circle
                  cx={apt.x}
                  cy={apt.y}
                  r={nodeRadius}
                  fill={nodeColor}
                  stroke="var(--color-paper-3)"
                  strokeWidth="1.5"
                />

                <text
                  x={apt.x + 8}
                  y={apt.y + 3}
                  fill={isClosed ? 'var(--color-bad)' : 'var(--color-ink)'}
                  fontSize={isMegaHub ? '11px' : '9.5px'}
                  fontWeight={isMegaHub ? '600' : '400'}
                  className="font-mono-measured select-none"
                >
                  {apt.id}
                </text>
              </g>
            );
          })}
        </svg>

        {selectedAirport && (
          <div className="absolute bottom-3 left-3 panel-console p-2.5 text-xs border border-[var(--color-rule-2)] bg-[var(--color-paper-2)]/95 max-w-xs shadow-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-[var(--color-ink)]">
                {airportMap.get(selectedAirport)?.city} ({selectedAirport})
              </span>
              <button
                onClick={() => onSelectAirport(null)}
                className="text-[var(--color-muted)] hover:text-[var(--color-ink)] text-xs ml-2"
              >
                ✕
              </button>
            </div>
            <div className="text-[var(--color-muted)] space-y-0.5">
              <p>Airport: {airportMap.get(selectedAirport)?.name}</p>
              <p>Tier: {airportMap.get(selectedAirport)?.tier.replace('_', ' ')}</p>
              <p>Runway Capacity: {airportMap.get(selectedAirport)?.capacity_per_hour} flt/hr</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

