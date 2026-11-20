'use client';

import React, { useState } from 'react';
import { SimulatedFlight } from '@/engine/types';

interface FlightTableProps {
  flights: SimulatedFlight[];
  selectedFlightId: string | null;
  onSelectFlight: (id: string | null) => void;
}

export function FlightTable({
  flights,
  selectedFlightId,
  onSelectFlight,
}: FlightTableProps) {
  const [filter, setFilter] = useState<'all' | 'delayed' | 'cancelled'>('all');
  const [search, setSearch] = useState('');

  const filteredFlights = flights.filter((f) => {
    if (filter === 'delayed' && f.status !== 'delayed') return false;
    if (filter === 'cancelled' && f.status !== 'cancelled') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        f.flight_id.toLowerCase().includes(q) ||
        f.tail_id.toLowerCase().includes(q) ||
        f.origin.toLowerCase().includes(q) ||
        f.destination.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="panel-console p-4 flex flex-col gap-3">
      {/* Table header & controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-rule)] pb-2.5">
        <div>
          <h2 className="text-sm font-medium text-[var(--color-ink)]">
            Flight roster and causal trace
          </h2>
          <p className="text-xs text-[var(--color-muted)]">
            Seventy active rotations with individual causal delay lineage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search flight, tail, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] px-2.5 py-1 text-xs text-[var(--color-ink)] font-mono-measured placeholder:text-[var(--color-muted)] w-44"
          />

          <div className="flex rounded-[var(--radius-pill)] border border-[var(--color-rule)] overflow-hidden text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 transition-colors active:scale-95 cursor-pointer ${
                filter === 'all'
                  ? 'bg-[var(--color-paper-2)] text-[var(--color-ink)] font-medium'
                  : 'bg-[var(--color-paper-3)] text-[var(--color-muted)] hover:text-white'
              }`}
            >
              All ({flights.length})
            </button>
            <button
              onClick={() => setFilter('delayed')}
              className={`px-2.5 py-1 border-l border-[var(--color-rule)] transition-colors active:scale-95 cursor-pointer ${
                filter === 'delayed'
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium'
                  : 'bg-[var(--color-paper-3)] text-[var(--color-muted)] hover:text-white'
              }`}
            >
              Delayed ({flights.filter((f) => f.status === 'delayed').length})
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-2.5 py-1 border-l border-[var(--color-rule)] transition-colors active:scale-95 cursor-pointer ${
                filter === 'cancelled'
                  ? 'bg-[var(--color-bad-soft)] text-[var(--color-bad)] font-medium'
                  : 'bg-[var(--color-paper-3)] text-[var(--color-muted)] hover:text-white'
              }`}
            >
              Cancelled ({flights.filter((f) => f.status === 'cancelled').length})
            </button>
          </div>
        </div>
      </div>

      {/* Flight rows table */}
      <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-rule)] text-[10px] text-[var(--color-muted)] font-mono-measured">
              <th className="py-1.5 px-2 font-normal">Flight</th>
              <th className="py-1.5 px-2 font-normal">Tail</th>
              <th className="py-1.5 px-2 font-normal">Leg</th>
              <th className="py-1.5 px-2 font-normal">Route</th>
              <th className="py-1.5 px-2 font-normal">Scheduled</th>
              <th className="py-1.5 px-2 font-normal">Actual</th>
              <th className="py-1.5 px-2 font-normal">Delay</th>
              <th className="py-1.5 px-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-rule)]/40 font-mono-measured">
            {filteredFlights.map((f) => {
              const isSelected = selectedFlightId === f.flight_id;
              const isDelayed = f.status === 'delayed';
              const isCancelled = f.status === 'cancelled';

              return (
                <React.Fragment key={f.flight_id}>
                  <tr
                    onClick={() => onSelectFlight(isSelected ? null : f.flight_id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[var(--color-paper-2)] border-l-2 border-l-[var(--color-accent)]'
                        : 'hover:bg-[var(--color-paper-3)]/60'
                    }`}
                  >
                    <td className="py-2 px-2 font-bold text-[var(--color-ink)]">
                      {f.flight_id}
                    </td>
                    <td className="py-2 px-2 text-[var(--color-ink-2)]">
                      {f.assigned_tail_id}
                      {f.assigned_tail_id !== f.tail_id && (
                        <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-[var(--color-ok-soft)] text-[var(--color-ok)]">
                          Spare
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-[var(--color-muted)]">L{f.leg_order}</td>
                    <td className="py-2 px-2 font-medium">
                      {f.origin} to {f.destination}
                    </td>
                    <td className="py-2 px-2 text-[var(--color-muted)]">
                      {f.dep} to {f.arr}
                    </td>
                    <td className="py-2 px-2 font-semibold">
                      {isCancelled ? (
                        <span className="text-[var(--color-bad)]">Cancelled</span>
                      ) : (
                        <span>
                          {f.actual_dep} to {f.actual_arr}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 font-bold">
                      {f.arr_delay_mins > 0 ? (
                        <span className="text-[var(--color-accent)]">+{f.arr_delay_mins}m</span>
                      ) : (
                        <span className="text-[var(--color-ok)]">0m</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          isCancelled
                            ? 'bg-[var(--color-bad-soft)] text-[var(--color-bad)]'
                            : isDelayed
                            ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                            : 'bg-[var(--color-ok-soft)] text-[var(--color-ok)]'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded Causal Trace row */}
                  {isSelected && (
                    <tr className="bg-[var(--color-paper-3)]">
                      <td colSpan={8} className="p-3 border-y border-[var(--color-rule)]">
                        <div className="space-y-1.5 text-xs">
                          <div className="font-semibold text-[var(--color-accent)] text-[11px]">
                            Causal propagation trace for {f.flight_id} ({f.origin} to {f.destination})
                          </div>
                          <div className="text-[var(--color-ink-2)] space-y-1">
                            <p>
                              Passenger load: <strong>{f.pax}</strong> travelers (Seats: 180, Load factor: {Math.round((f.pax / 180) * 100)}%)
                            </p>
                            <p>
                              Flight block time: <strong>{f.block_minutes}</strong> minutes
                            </p>
                            {f.delay_causes.length > 0 ? (
                              f.delay_causes.map((cause, ci) => (
                                <p key={ci} className="text-[var(--color-accent)]">
                                  [{cause.type}] {cause.detail} (+{cause.delay_added_mins}m)
                                </p>
                              ))
                            ) : (
                              <p className="text-[var(--color-ok)]">
                                No rotational or closure delay. Operating on planned schedule.
                              </p>
                            )}
                            {f.cancellation_reason && (
                              <p className="text-[var(--color-bad)] font-semibold">
                                Cancellation reason: {f.cancellation_reason}
                              </p>
                            )}
                          </div>
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
