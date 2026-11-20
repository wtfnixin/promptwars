import { NextResponse } from 'next/server';
import networkDataRaw from '@/data/flight_network.json';
import { runSimulation } from '@/engine/simulator';
import { generateRecoveryOptions } from '@/engine/recovery';
import { AirportClosure, FlightNetworkData, RecoveryAction } from '@/engine/types';

const networkData = networkDataRaw as unknown as FlightNetworkData;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const closure: AirportClosure | null = body.closure || null;
    const activeRecoveries: RecoveryAction[] = Array.isArray(body.activeRecoveries)
      ? body.activeRecoveries
      : [];

    // Run deterministic baseline/active simulation
    const result = runSimulation(networkData, closure, activeRecoveries);

    // If activeRecoveries are applied, calculate a baseline (without recoveries) for comparison
    let baselineResult = null;
    if (activeRecoveries.length > 0 && closure) {
      baselineResult = runSimulation(networkData, closure, []);
    }

    // Generate potential recovery options based on the current disruption
    const recoveryOptions = closure
      ? generateRecoveryOptions(networkData, baselineResult || result)
      : [];

    return NextResponse.json({
      success: true,
      result,
      baselineResult,
      recoveryOptions,
    });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal simulation engine error' },
      { status: 500 }
    );
  }
}

