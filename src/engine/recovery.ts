import { runSimulation } from './simulator';
import { FlightNetworkData, RecoveryAction, SimulationResult } from './types';

export function generateRecoveryOptions(
  network: FlightNetworkData,
  baselineResult: SimulationResult
): RecoveryAction[] {
  const options: RecoveryAction[] = [];
  const closure = baselineResult.closure;

  if (!closure || baselineResult.metrics.total_delayed_flights === 0) {
    return [];
  }

  const baselineMetrics = baselineResult.metrics;

  // 1. Evaluate Spare Aircraft Swaps
  // We have spare aircraft at BLR (VT-DS17) and DEL (VT-DS18)
  for (const spare of network.spare_aircraft) {
    // Find all flights that originate at the spare's base airport
    for (const flight of network.flights) {
      if (flight.origin === spare.base) {
        const simFlight = baselineResult.flights.find((f) => f.flight_id === flight.flight_id);
        if (!simFlight) continue;

        // Candidate if flight is delayed or inbound tail is delayed
        if (simFlight.dep_delay_mins > 20 || simFlight.arr_delay_mins > 20) {
          const candidateAction: RecoveryAction = {
            id: `swap-${spare.tail_id}-${flight.flight_id}`,
            type: 'SWAP_SPARE',
            title: `Deploy Spare ${spare.tail_id} at ${spare.base} on ${flight.flight_id}`,
            description: `Substitute grounded/delayed aircraft ${flight.tail_id} with available spare ${spare.tail_id} starting at ${flight.origin} (${flight.flight_id}, Leg ${flight.leg_order}). Resets rotational delay downstream.`,
            recommended_by_ai: false,
            score_improvement: {
              delay_mins_saved: 0,
              passengers_saved: 0,
              connections_saved: 0,
              crew_violations_saved: 0,
            },
            payload: {
              tail_id: flight.tail_id,
              spare_tail_id: spare.tail_id,
              spare_base: spare.base,
              flight_id: flight.flight_id,
              from_leg_order: flight.leg_order,
            },
          };

          // Evaluate deterministic outcome
          const trialResult = runSimulation(network, closure, [candidateAction]);
          const delaySaved = Math.max(
            0,
            baselineMetrics.total_delay_minutes - trialResult.metrics.total_delay_minutes
          );
          const paxSaved = Math.max(
            0,
            baselineMetrics.total_stranded_passengers - trialResult.metrics.total_stranded_passengers
          );
          const cxSaved = Math.max(
            0,
            baselineMetrics.total_broken_connections - trialResult.metrics.total_broken_connections
          );
          const crewSaved = Math.max(
            0,
            baselineMetrics.total_crew_violations - trialResult.metrics.total_crew_violations
          );

          if (delaySaved > 0 || paxSaved > 0 || crewSaved > 0) {
            candidateAction.score_improvement = {
              delay_mins_saved: delaySaved,
              passengers_saved: paxSaved,
              connections_saved: cxSaved,
              crew_violations_saved: crewSaved,
            };
            options.push(candidateAction);
          }
        }
      }
    }
  }

  // 2. Evaluate Tactical Sacrificial Cancellations
  // Identify flights whose downstream cascade creates catastrophic crew duty breaches or massive delays
  const heavilyDelayedFlights = baselineResult.flights
    .filter((f) => f.dep_delay_mins >= 45 && f.leg_order <= 3)
    .sort((a, b) => b.dep_delay_mins - a.dep_delay_mins);

  for (const flight of heavilyDelayedFlights.slice(0, 4)) {
    const cancelAction: RecoveryAction = {
      id: `cancel-${flight.flight_id}`,
      type: 'CANCEL_FLIGHT',
      title: `Tactical Cancellation of ${flight.flight_id} (${flight.origin} -> ${flight.destination})`,
      description: `Sacrifice single leg ${flight.flight_id} (${flight.pax} pax) to halt rotational delay propagation and protect downstream high-density connections and crew duty legal limits.`,
      recommended_by_ai: false,
      score_improvement: {
        delay_mins_saved: 0,
        passengers_saved: 0,
        connections_saved: 0,
        crew_violations_saved: 0,
      },
      payload: {
        flight_id: flight.flight_id,
      },
    };

    const trialResult = runSimulation(network, closure, [cancelAction]);
    const delaySaved = Math.max(
      0,
      baselineMetrics.total_delay_minutes - trialResult.metrics.total_delay_minutes
    );
    const cxSaved = Math.max(
      0,
      baselineMetrics.total_broken_connections - trialResult.metrics.total_broken_connections
    );
    const crewSaved = Math.max(
      0,
      baselineMetrics.total_crew_violations - trialResult.metrics.total_crew_violations
    );

    if (delaySaved > 90 || crewSaved > 0) {
      cancelAction.score_improvement = {
        delay_mins_saved: delaySaved,
        passengers_saved: 0, // cancelled flight strands pax on this leg
        connections_saved: cxSaved,
        crew_violations_saved: crewSaved,
      };
      options.push(cancelAction);
    }
  }

  // Rank by composite efficiency score
  options.sort((a, b) => {
    const scoreA =
      a.score_improvement.delay_mins_saved * 1.5 +
      a.score_improvement.passengers_saved * 3 +
      a.score_improvement.crew_violations_saved * 200 +
      a.score_improvement.connections_saved * 50;

    const scoreB =
      b.score_improvement.delay_mins_saved * 1.5 +
      b.score_improvement.passengers_saved * 3 +
      b.score_improvement.crew_violations_saved * 200 +
      b.score_improvement.connections_saved * 50;

    return scoreB - scoreA;
  });

  // Mark the top 2 as AI recommended
  if (options.length > 0) options[0].recommended_by_ai = true;
  if (options.length > 1) options[1].recommended_by_ai = true;

  return options;
}

