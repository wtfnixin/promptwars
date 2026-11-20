'use client';

import React, { useMemo } from 'react';
import { AirportClosure, SimulatedFlight } from '@/engine/types';

interface CascadeTimelineProps {
  flights: SimulatedFlight[];
  closure: AirportClosure | null;
  onSelectFlight: (flightId: string) => void;
  selectedFlightId: string | null;
}

export function CascadeTimeline({
  flights,
  closure,
  onSelectFlight,
  selectedFlightId,
}: CascadeTimelineProps) {
  const timelineStartMins = 300; // 05:00
  const timelineEndMins = 1380;  // 23:00
  const totalMins = timelineEndMins - timelineStartMins;

  const timeToPercent = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const mins = h * 60 + m;
    const clamped = Math.max(timelineStartMins, Math.min(timelineEndMins, mins));
    return ((clamped - timelineStartMins) / totalMins) * 100;
  };

  const tails = useMemo(() => {
    const map = new Map<string, SimulatedFlight[]>();
    flights.forEach((f) => {
      const tail = f.assigned_tail_id || f.tail_id;
      if (!map.has(tail)) map.set(tail, []);
      map.get(tail)!.push(f);
    });

    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    sorted.forEach(([, list]) => list.sort((a, b) => a.leg_order - b.leg_order));
    return sorted;
  }, [flights]);

  const hours = [5, 7, 9, 11, 13, 15, 17, 19, 21, 23];

  return (
    <div className="panel-console p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2.5">
        <div>
          <h2 className="text-sm font-medium text-[var(--color-ink)]">
            Domino delay cascade timeline (Gantt)
          </h2>
          <p className="text-xs text-[var(--color-muted)]">
            Aircraft tail chains from VT-DS01 to VT-DS18 showing downstream propagation
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono-measured">
          <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
            <span className="w-2.5 h-1.5 border border-[var(--color-rule-2)] bg-transparent inline-block" />
            Scheduled
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-cool)]">
            <span className="w-2.5 h-1.5 bg-[var(--color-cool)] inline-block" />
            On-time
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-accent)]">
            <span className="w-2.5 h-1.5 bg-[var(--color-accent)] inline-block" />
            Cascading delay
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-bad)]">
            <span className="w-2.5 h-1.5 bg-[var(--color-bad)] inline-block" />
            Cancelled leg
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Header Hour Ruler */}
          <div className="relative h-6 border-b border-[var(--color-rule)] text-[10px] text-[var(--color-muted)] font-mono-measured">
            {hours.map((h) => {
              const leftPercent = ((h * 60 - timelineStartMins) / totalMins) * 100;
              return (
                <div
                  key={h}
                  className="absolute transform -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${leftPercent}%` }}
                >
                  <span>{h.toString().padStart(2, '0')}:00</span>
                  <span className="w-[1px] h-1.5 bg-[var(--color-rule)] mt-0.5" />
                </div>
              );
            })}
          </div>

          {/* Tail Rows */}
          <div className="relative divide-y divide-[var(--color-rule)]/50 pt-1">
            {closure && (
              <div
                className="absolute top-0 bottom-0 bg-[var(--color-bad)]/10 border-x border-[var(--color-bad)]/40 pointer-events-none z-10"
                style={{
                  left: `${timeToPercent(closure.start_time)}%`,
                  width: `${Math.max(
                    2,
                    timeToPercent(closure.end_time) - timeToPercent(closure.start_time)
                  )}%`,
                }}
              >
                <span className="sticky top-0 text-[9px] font-mono-measured text-[var(--color-bad)] bg-[var(--color-paper-3)] px-1 py-0.5 border border-[var(--color-bad)] rounded block w-fit ml-0.5 mt-0.5">
                  Stop: {closure.airport_id} ({closure.start_time} to {closure.end_time})
                </span>
              </div>
            )}

            {tails.map(([tailId, tailFlights]) => (
              <div key={tailId} className="flex items-center py-1.5 hover:bg-[var(--color-paper-3)]/40 transition-colors">
                <div className="w-20 shrink-0 text-xs font-mono-measured font-semibold text-[var(--color-ink-2)] flex items-center justify-between pr-2">
                  <span>{tailId}</span>
                  <span className="text-[10px] text-[var(--color-muted)] font-normal">
                    L{tailFlights.length}
                  </span>
                </div>

                <div className="relative flex-1 h-6">
                  {tailFlights.map((f) => {
                    const schedLeft = timeToPercent(f.dep);
                    const schedWidth = Math.max(1.5, timeToPercent(f.arr) - schedLeft);

                    const actLeft = timeToPercent(f.actual_dep);
                    const actWidth = Math.max(1.5, timeToPercent(f.actual_arr) - actLeft);

                    const isSelected = selectedFlightId === f.flight_id;
                    const isCancelled = f.status === 'cancelled';
                    const isDelayed = f.status === 'delayed';

                    let barColor = 'bg-[var(--color-cool)]';
                    let textColor = 'text-[var(--color-paper-3)]';

                    if (isCancelled) {
                      barColor = 'bg-[var(--color-bad)]';
                      textColor = 'text-white';
                    } else if (isDelayed) {
                      barColor = 'bg-[var(--color-accent)]';
                      textColor = 'text-[var(--color-accent-ink)]';
                    }

                    return (
                      <React.Fragment key={f.flight_id}>
                        {isDelayed && (
                          <div
                            className="absolute top-1 h-4 border border-[var(--color-rule-2)] rounded-[3px] opacity-40 pointer-events-none"
                            style={{ left: `${schedLeft}%`, width: `${schedWidth}%` }}
                          />
                        )}

                        <button
                          onClick={() => onSelectFlight(f.flight_id)}
                          className={`absolute top-0.5 h-5 rounded-[3px] ${barColor} px-1.5 text-[9.5px] font-mono-measured font-medium flex items-center justify-between overflow-hidden shadow-sm transition-colors active:scale-95 cursor-pointer ${
                            isSelected ? 'ring-2 ring-[var(--color-focus)] z-20 brightness-110' : 'hover:brightness-105 z-10'
                          }`}
                          style={{
                            left: `${actLeft}%`,
                            width: `${actWidth}%`,
                          }}
                          title={`${f.flight_id}: ${f.origin} to ${f.destination} (${f.actual_dep} to ${f.actual_arr}) ${
                            isDelayed ? `+${f.arr_delay_mins}m delay` : ''
                          }`}
                        >
                          <span className={`truncate ${textColor}`}>{f.flight_id}</span>
                          <span className={`text-[8.5px] opacity-85 ml-1 ${textColor}`}>
                            {f.origin} to {f.destination}
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
