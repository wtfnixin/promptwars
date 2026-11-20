'use client';

import React, { useState } from 'react';
import { Airport, AirportClosure } from '@/engine/types';

interface DisruptionControlProps {
  airports: Airport[];
  activeClosure: AirportClosure | null;
  onApplyClosure: (closure: AirportClosure | null) => void;
}

const PRESETS = [
  {
    label: '90m Thunderstorm (BOM)',
    airport_id: 'BOM',
    start_time: '07:30',
    end_time: '09:00',
    reason: 'Monsoon squall line over Chhatrapati Shivaji Maharaj Intl (BOM)',
  },
  {
    label: 'Morning Fog Ground Stop (DEL)',
    airport_id: 'DEL',
    start_time: '06:00',
    end_time: '08:30',
    reason: 'Dense radiation fog at Indira Gandhi Intl (DEL)',
  },
  {
    label: 'Runway Maintenance (BLR)',
    airport_id: 'BLR',
    start_time: '11:00',
    end_time: '12:30',
    reason: 'Tactical pavement repair on runway at Kempegowda Intl (BLR)',
  },
  {
    label: 'Tropical Squall (MAA)',
    airport_id: 'MAA',
    start_time: '10:00',
    end_time: '12:00',
    reason: 'Bay of Bengal convective depression at Chennai (MAA)',
  },
];

export function DisruptionControl({
  airports,
  activeClosure,
  onApplyClosure,
}: DisruptionControlProps) {
  const [selectedAirport, setSelectedAirport] = useState('BOM');
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('09:00');

  const handleCustomApply = () => {
    onApplyClosure({
      airport_id: selectedAirport,
      start_time: startTime,
      end_time: endTime,
      reason: `Custom ground stop ordered for ${selectedAirport} (${startTime} to ${endTime})`,
    });
  };

  return (
    <div className="panel-console p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2.5">
        <div>
          <h2 className="text-sm font-medium text-[var(--color-ink)]">
            Disruption injection console
          </h2>
          <p className="text-xs text-[var(--color-muted)]">
            Ground stops, meteorological halts, and slot freezes
          </p>
        </div>
        {activeClosure && (
          <button
            onClick={() => onApplyClosure(null)}
            className="text-xs px-2.5 py-1 rounded-[var(--radius-pill)] border border-[var(--color-bad)] text-[var(--color-bad)] hover:bg-[var(--color-bad-soft)] active:brightness-90 transition-colors font-mono-measured cursor-pointer whitespace-nowrap"
          >
            Clear closures
          </button>
        )}
      </div>

      {/* Preset Scenarios */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] text-[var(--color-muted)]">
          Benchmarked scenarios
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PRESETS.map((preset) => {
            const isActive =
              activeClosure?.airport_id === preset.airport_id &&
              activeClosure?.start_time === preset.start_time &&
              activeClosure?.end_time === preset.end_time;

            return (
              <button
                key={preset.label}
                onClick={() =>
                  onApplyClosure({
                    airport_id: preset.airport_id,
                    start_time: preset.start_time,
                    end_time: preset.end_time,
                    reason: preset.reason,
                  })
                }
                className={`text-left p-2 rounded-[var(--radius-pill)] border text-xs transition-colors cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]'
                    : 'border-[var(--color-rule)] bg-[var(--color-paper-3)] text-[var(--color-muted)] hover:border-[var(--color-rule-2)] hover:text-[var(--color-ink)]'
                }`}
              >
                <div className="font-medium text-[var(--color-ink)]">{preset.label}</div>
                <div className="font-mono-measured text-[10px] text-[var(--color-muted)] mt-0.5">
                  {preset.airport_id} ({preset.start_time} to {preset.end_time})
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Disruption Builder */}
      <div className="pt-2 border-t border-[var(--color-rule)] flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[11px] text-[var(--color-muted)] mb-1">
            Target airport
          </label>
          <select
            value={selectedAirport}
            onChange={(e) => setSelectedAirport(e.target.value)}
            className="w-full bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] px-2.5 py-1.5 text-xs text-[var(--color-ink)] font-mono-measured focus:border-[var(--color-focus)]"
          >
            {airports.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.id}: {apt.city} ({apt.tier.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>

        <div className="w-28">
          <label className="block text-[11px] text-[var(--color-muted)] mb-1">
            Closure start
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] px-2.5 py-1.5 text-xs text-[var(--color-ink)] font-mono-measured focus:border-[var(--color-focus)]"
          />
        </div>

        <div className="w-28">
          <label className="block text-[11px] text-[var(--color-muted)] mb-1">
            Reopen time
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] px-2.5 py-1.5 text-xs text-[var(--color-ink)] font-mono-measured focus:border-[var(--color-focus)]"
          />
        </div>

        <button
          onClick={handleCustomApply}
          className="px-3.5 py-1.5 bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold rounded-[var(--radius-pill)] text-xs hover:brightness-110 active:brightness-95 transition-colors cursor-pointer"
        >
          Execute ground stop
        </button>
      </div>

      {activeClosure && (
        <div className="mt-1 p-2 rounded-[var(--radius-pill)] bg-[var(--color-bad-soft)] border border-[var(--color-bad)] text-xs text-[var(--color-bad)] font-mono-measured flex items-center justify-between">
          <span>
            Active ground stop: {activeClosure.airport_id} ({activeClosure.start_time} to {activeClosure.end_time})
          </span>
          <span className="text-[var(--color-muted)] text-[10px]">Deterministic cascade live</span>
        </div>
      )}
    </div>
  );
}
