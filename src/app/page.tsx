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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [activeClosure, setActiveClosure] = useState<AirportClosure | null>({
    airport_id: 'BOM',
    start_time: '07:30',
    end_time:   '09:00',
    reason:     'Monsoon squall line over Chhatrapati Shivaji Maharaj Intl',
  });

  const [activeRecoveries, setActiveRecoveries] = useState<RecoveryAction[]>([]);
  const [selectedAirport, setSelectedAirport] = useState<string | null>('BOM');
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);

  const [result, setResult] = useState<SimulationResult>(() =>
    runSimulation(networkData, activeClosure, activeRecoveries)
  );

  const [baselineResult, setBaselineResult] = useState<SimulationResult | null>(() =>
    activeRecoveries.length > 0 && activeClosure
      ? runSimulation(networkData, activeClosure, [])
      : null
  );

  const [recoveryOptions, setRecoveryOptions] = useState<RecoveryAction[]>([]);

  useEffect(() => {
    // Check saved theme or media query
    const savedTheme = localStorage.getItem('domino-sky-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('domino-sky-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

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
      return exists ? prev.filter((a) => a.id !== action.id) : [...prev, action];
    });
  };

  return (
    <main style={{ background: 'var(--color-paper)', color: 'var(--color-ink)', minHeight: '100vh' }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header style={{ borderBottom: '1px solid var(--color-rule)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--color-ink)' }}>
            Domino Sky
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-muted)' }}>
            Flight disruption cascade simulator. Sixteen airports, seventy rotations, sixteen aircraft.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="mono focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] active:scale-95 disabled:opacity-50"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '3px',
              border: '1px solid var(--color-rule-2)',
              background: 'var(--color-paper-2)',
              color: 'var(--color-ink)',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            aria-label="Toggle dark and light color mode"
          >
            <span>{theme === 'dark' ? 'Light' : 'Dark'} mode</span>
          </button>

          <div className="mono" style={{ display: 'flex', gap: '20px', fontSize: '11px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--color-muted)', fontSize: '10px' }}>Engine</div>
              <div style={{ color: 'var(--color-ink)', fontWeight: 600 }}>100% deterministic</div>
            </div>
            <div style={{ width: '1px', background: 'var(--color-rule)' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--color-muted)', fontSize: '10px' }}>Timezone</div>
              <div style={{ color: 'var(--color-accent)', fontWeight: 600 }}>IST</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── KPI rail ─────────────────────────────────────────────────────── */}
      <MetricCounters metrics={result.metrics} baselineMetrics={baselineResult?.metrics || null} />

      {/* ── Main two-column grid ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 0, borderBottom: '1px solid var(--color-rule)' }}>
        <div style={{ borderRight: '1px solid var(--color-rule)' }}>
          <NetworkMap
            airports={networkData.airports}
            flights={result.flights}
            selectedAirport={selectedAirport}
            onSelectAirport={setSelectedAirport}
            closureAirportId={activeClosure?.airport_id || null}
          />
        </div>
        <div>
          <DisruptionControl
            airports={networkData.airports}
            activeClosure={activeClosure}
            onApplyClosure={(closure) => {
              setActiveClosure(closure);
              setActiveRecoveries([]);
              if (closure) setSelectedAirport(closure.airport_id);
            }}
          />
        </div>
      </div>

      {/* ── AI Dispatcher ────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--color-rule)' }}>
        <AIDispatcher
          result={result}
          baselineResult={baselineResult}
          recoveryOptions={recoveryOptions}
          activeRecoveries={activeRecoveries}
          onToggleRecovery={handleToggleRecovery}
        />
      </div>

      {/* ── Cascade Timeline ─────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--color-rule)' }}>
        <CascadeTimeline
          flights={result.flights}
          closure={activeClosure}
          onSelectFlight={(id) => setSelectedFlightId(id)}
          selectedFlightId={selectedFlightId}
        />
      </div>

      {/* ── Flight Roster ────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--color-rule)' }}>
        <FlightTable
          flights={result.flights}
          selectedFlightId={selectedFlightId}
          onSelectFlight={setSelectedFlightId}
        />
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="mono" style={{ borderTop: '1px solid var(--color-rule)', padding: '10px 24px', fontSize: '10px', color: 'var(--color-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>Domino Sky, Hack2Skill Prompt Wars</span>
        <span>Next.js 16, TypeScript, Tailwind CSS 4</span>
      </footer>
    </main>
  );
}
