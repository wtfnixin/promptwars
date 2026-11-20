'use client';

import React, { useState, useEffect, useCallback } from 'react';
import networkDataRaw from '@/data/flight_network.json';
import { runSimulation } from '@/engine/simulator';
import { generateRecoveryOptions } from '@/engine/recovery';
import {
  AirportClosure,
  FlightNetworkData,
  RecoveryAction,
  SimulationResult,
} from '@/engine/types';
import { MetricCounters } from '@/components/MetricCounters';
import { NetworkMap } from '@/components/NetworkMap';
import { DisruptionControl } from '@/components/DisruptionControl';
import { CascadeTimeline } from '@/components/CascadeTimeline';
import { AIDispatcher } from '@/components/AIDispatcher';
import { FlightTable } from '@/components/FlightTable';

const networkData = networkDataRaw as unknown as FlightNetworkData;

export default function Home() {
  const [activeClosure, setActiveClosure] = useState<AirportClosure | null>({
    airport_id: 'BOM',
    start_time: '08:30',
    end_time: '10:00',
    reason: 'Monsoon squall line over Chhatrapati Shivaji Maharaj Intl (BOM)',
  });

  const [activeRecoveries, setActiveRecoveries] = useState<RecoveryAction[]>([]);
  const [selectedAirport, setSelectedAirport] = useState<string | null>('BOM');
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);

  // Compute simulation result
  const [result, setResult] = useState<SimulationResult>(() =>
    runSimulation(networkData, activeClosure, activeRecoveries)
  );

  const [baselineResult, setBaselineResult] = useState<SimulationResult | null>(() =>
    activeRecoveries.length > 0 && activeClosure
      ? runSimulation(networkData, activeClosure, [])
      : null
  );

  const [recoveryOptions, setRecoveryOptions] = useState<RecoveryAction[]>([]);

  // Recalculate simulation state
  const updateSimulation = useCallback(() => {
    const newResult = runSimulation(networkData, activeClosure, activeRecoveries);
    setResult(newResult);

    if (activeRecoveries.length > 0 && activeClosure) {
      setBaselineResult(runSimulation(networkData, activeClosure, []));
    } else {
      setBaselineResult(null);
    }

    if (activeClosure) {
      const baseline = runSimulation(networkData, activeClosure, []);
      setRecoveryOptions(generateRecoveryOptions(networkData, baseline));
    } else {
      setRecoveryOptions([]);
    }
  }, [activeClosure, activeRecoveries]);

  useEffect(() => {
    updateSimulation();
  }, [updateSimulation]);

  const handleToggleRecovery = (action: RecoveryAction) => {
    setActiveRecoveries((prev) => {
      const exists = prev.some((a) => a.id === action.id);
      if (exists) {
        return prev.filter((a) => a.id !== action.id);
      } else {
        return [...prev, action];
      }
    });
  };

  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Operations Header */}
      <header className="panel-console p-4 border border-[var(--color-rule)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[var(--color-ok)] inline-block" />
            <h1 className="text-xl font-bold tracking-tight uppercase">
              DOMINO SKY · FLIGHT DISRUPTION CASCADE & RECOVERY SIMULATOR
            </h1>
          </div>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            National Operations Center · 16 Hubs · 70 Daily Flights · 16 Aircraft Tails · 2 Spares
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono-measured">
          <div className="text-right">
            <div className="text-[10px] text-[var(--color-muted)]">SYSTEM STATUS</div>
            <div className="text-[var(--color-ink)] font-semibold">100% DETERMINISTIC ENGINE</div>
          </div>
          <div className="h-6 w-[1px] bg-[var(--color-rule)]" />
          <div className="text-right">
            <div className="text-[10px] text-[var(--color-muted)]">OPERATING REGION</div>
            <div className="text-[var(--color-accent)] font-semibold">INDIA DOMESTIC (IST)</div>
          </div>
        </div>
      </header>

      {/* KPI Metric Counters */}
      <MetricCounters metrics={result.metrics} baselineMetrics={baselineResult?.metrics || null} />

      {/* Primary Grid: Route Map & Disruption Injector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <NetworkMap
            airports={networkData.airports}
            flights={result.flights}
            selectedAirport={selectedAirport}
            onSelectAirport={setSelectedAirport}
            closureAirportId={activeClosure?.airport_id || null}
          />
        </div>

        <div className="lg:col-span-5 flex flex-col gap-5">
          <DisruptionControl
            airports={networkData.airports}
            activeClosure={activeClosure}
            onApplyClosure={(closure) => {
              setActiveClosure(closure);
              setActiveRecoveries([]); // reset recoveries when disruption changes
              if (closure) setSelectedAirport(closure.airport_id);
            }}
          />

          {/* Quick Context Summary Card */}
          <div className="panel-console p-4 border border-[var(--color-rule)] flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink)] mb-2">
                Operational Dispatch Directives
              </h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed mb-3">
                Aircraft fly multiple legs per day in fixed tail rotations. When a plane is grounded, turnaround minimums ({networkData.meta.min_turnaround_minutes}m) guarantee downstream delays. Connections break when the connecting buffer falls below threshold.
              </p>
            </div>
            <div className="pt-2.5 border-t border-[var(--color-rule)] text-[11px] font-mono-measured text-[var(--color-ink-2)] space-y-1">
              <div>• Spare Bases: BLR (VT-DS17) & DEL (VT-DS18)</div>
              <div>• Legal Crew Duty Cap: 600 minutes (10 Hours)</div>
              <div>• Active Cascade Delay: {result.metrics.total_delay_minutes} min</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Dispatcher & Recovery Section */}
      <AIDispatcher
        result={result}
        baselineResult={baselineResult}
        recoveryOptions={recoveryOptions}
        activeRecoveries={activeRecoveries}
        onToggleRecovery={handleToggleRecovery}
      />

      {/* Domino Delay Cascade Timeline (Gantt) */}
      <CascadeTimeline
        flights={result.flights}
        closure={activeClosure}
        onSelectFlight={(id) => setSelectedFlightId(id)}
        selectedFlightId={selectedFlightId}
      />

      {/* Detailed Flight Roster & Causal Trace */}
      <FlightTable
        flights={result.flights}
        selectedFlightId={selectedFlightId}
        onSelectFlight={setSelectedFlightId}
      />

      {/* Engineering Footer */}
      <footer className="panel-console p-4 border border-[var(--color-rule)] text-xs text-[var(--color-muted)] flex flex-wrap items-center justify-between gap-3 font-mono-measured">
        <div>
          Domino Sky · Hack2Skill Prompt Wars · Strict Math & Causal Lineage
        </div>
        <div className="flex items-center gap-3">
          <span>Design: Hallmark Console</span>
          <span>•</span>
          <span>Zero Hallucinations</span>
          <span>•</span>
          <span>Next.js 16 + React 19</span>
        </div>
      </footer>
    </main>
  );
}
