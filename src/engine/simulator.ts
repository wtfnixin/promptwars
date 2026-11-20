import {
  AirportClosure,
  Flight,
  FlightNetworkData,
  RecoveryAction,
  SimulatedConnection,
  SimulatedCrew,
  SimulatedFlight,
  SimulationMetrics,
  SimulationResult,
} from './types';

export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(mins: number): string {
  const normalized = Math.max(0, mins);
  const h = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function runSimulation(
  network: FlightNetworkData,
  closure: AirportClosure | null = null,
  activeRecoveries: RecoveryAction[] = []
): SimulationResult {
  const closureStartMins = closure ? timeToMinutes(closure.start_time) : -1;
  const closureEndMins = closure ? timeToMinutes(closure.end_time) : -1;
  const closureAirport = closure ? closure.airport_id : null;

  // Track applied cancellations
  const cancelledFlightIds = new Set<string>();
  const spareSwaps = new Map<string, { spare_tail_id: string; from_leg_order: number }>();

  for (const recovery of activeRecoveries) {
    if (recovery.type === 'CANCEL_FLIGHT' && recovery.payload.flight_id) {
      cancelledFlightIds.add(recovery.payload.flight_id);
    } else if (
      recovery.type === 'SWAP_SPARE' &&
      recovery.payload.tail_id &&
      recovery.payload.spare_tail_id &&
      recovery.payload.from_leg_order !== undefined
    ) {
      spareSwaps.set(recovery.payload.tail_id, {
        spare_tail_id: recovery.payload.spare_tail_id,
        from_leg_order: recovery.payload.from_leg_order,
      });
    }
  }

  // Group flights by scheduled aircraft tail
  const tailFlightMap = new Map<string, Flight[]>();
  for (const flight of network.flights) {
    if (!tailFlightMap.has(flight.tail_id)) {
      tailFlightMap.set(flight.tail_id, []);
    }
    tailFlightMap.get(flight.tail_id)!.push(flight);
  }

  // Sort each tail's flights by leg_order
  for (const [, flights] of tailFlightMap.entries()) {
    flights.sort((a, b) => a.leg_order - b.leg_order);
  }

  const simulatedFlightsMap = new Map<string, SimulatedFlight>();
  const causalGraph: Record<string, string[]> = {};

  // Simulate flight propagation per tail chain
  for (const [originalTailId, flights] of tailFlightMap.entries()) {
    let prevActualArrMins: number | null = null;
    let prevFlight: SimulatedFlight | null = null;

    const swapInfo = spareSwaps.get(originalTailId);

    for (const flight of flights) {
      const scheduledDepMins = timeToMinutes(flight.dep);
      const scheduledArrMins = timeToMinutes(flight.arr);
      const isCancelled = cancelledFlightIds.has(flight.flight_id);

      // Determine active tail assignment
      let assignedTail = flight.tail_id;
      let isFreshSpare = false;

      if (swapInfo && flight.leg_order >= swapInfo.from_leg_order) {
        assignedTail = swapInfo.spare_tail_id;
        if (flight.leg_order === swapInfo.from_leg_order) {
          isFreshSpare = true; // Spare aircraft reset! No rotational delay from prev leg!
        }
      }

      if (isCancelled) {
        const simFlight: SimulatedFlight = {
          ...flight,
          assigned_tail_id: assignedTail,
          actual_dep: flight.dep,
          actual_arr: flight.arr,
          dep_delay_mins: 0,
          arr_delay_mins: 0,
          status: 'cancelled',
          cancellation_reason: 'Proactive tactical cancellation to halt cascade',
          delay_causes: [],
          is_disrupted: true,
        };
        simulatedFlightsMap.set(flight.flight_id, simFlight);
        causalGraph[flight.flight_id] = ['Flight cancelled proactively by recovery dispatch'];
        // Cancelled flight frees up tail if repositioned or spare used
        prevActualArrMins = null;
        prevFlight = null;
        continue;
      }

      let currentDepMins = scheduledDepMins;
      const delayCauses: SimulatedFlight['delay_causes'] = [];
      const causesText: string[] = [];

      // 1. Check rotational delay from previous leg (unless spare aircraft was swapped in)
      if (prevActualArrMins !== null && !isFreshSpare) {
        const requiredTurnaround =
          flight.turnaround_before_min ?? network.meta.min_turnaround_minutes;
        const earliestReadyMins = prevActualArrMins + requiredTurnaround;

        if (earliestReadyMins > currentDepMins) {
          const rotationalDelay = earliestReadyMins - currentDepMins;
          delayCauses.push({
            type: 'ROTATIONAL_DELAY',
            detail: `Aircraft ${assignedTail} arrived late from ${prevFlight?.flight_id} (${minutesToTime(
              prevActualArrMins
            )}) requiring ${requiredTurnaround}m turnaround`,
            delay_added_mins: rotationalDelay,
          });
          causesText.push(
            `Inbound aircraft ${assignedTail} delayed: arrived at ${minutesToTime(
              prevActualArrMins
            )} (+${prevFlight?.arr_delay_mins}m), needed ${requiredTurnaround}m turnaround`
          );
          currentDepMins = earliestReadyMins;
        }
      }

      // 2. Check origin airport closure
      if (closure && closureAirport === flight.origin) {
        if (currentDepMins >= closureStartMins && currentDepMins < closureEndMins) {
          const closureDelay = closureEndMins - currentDepMins;
          delayCauses.push({
            type: 'AIRPORT_CLOSURE',
            detail: `Origin airport ${flight.origin} closed until ${closure.end_time}`,
            delay_added_mins: closureDelay,
          });
          causesText.push(`Origin ${flight.origin} closed between ${closure.start_time} - ${closure.end_time}`);
          currentDepMins = closureEndMins;
        }
      }

      // Calculate arrival based on fixed block_minutes
      let currentArrMins = currentDepMins + flight.block_minutes;

      // 3. Check destination airport closure
      if (closure && closureAirport === flight.destination) {
        if (currentArrMins >= closureStartMins && currentArrMins < closureEndMins) {
          // Cannot land while airport is closed. Flight held at origin or airborne until reopen!
          const holdDelay = closureEndMins - currentArrMins;
          currentArrMins = closureEndMins;
          currentDepMins = currentArrMins - flight.block_minutes;

          delayCauses.push({
            type: 'AIRPORT_CLOSURE',
            detail: `Destination airport ${flight.destination} closed until ${closure.end_time}; arrival delayed`,
            delay_added_mins: holdDelay,
          });
          causesText.push(
            `Destination ${flight.destination} closed between ${closure.start_time} - ${closure.end_time}`
          );
        }
      }

      const depDelayMins = Math.max(0, currentDepMins - scheduledDepMins);
      const arrDelayMins = Math.max(0, currentArrMins - scheduledArrMins);
      const isDelayed = depDelayMins > 0 || arrDelayMins > 0;

      const simFlight: SimulatedFlight = {
        ...flight,
        assigned_tail_id: assignedTail,
        actual_dep: minutesToTime(currentDepMins),
        actual_arr: minutesToTime(currentArrMins),
        dep_delay_mins: depDelayMins,
        arr_delay_mins: arrDelayMins,
        status: isDelayed ? 'delayed' : 'on_time',
        delay_causes: delayCauses,
        is_disrupted: isDelayed,
      };

      simulatedFlightsMap.set(flight.flight_id, simFlight);
      causalGraph[flight.flight_id] = causesText.length > 0 ? causesText : ['On scheduled timetable'];

      prevActualArrMins = currentArrMins;
      prevFlight = simFlight;
    }
  }

  // 4. Simulate Connections & Broken Connections
  const simulatedConnections: SimulatedConnection[] = [];
  let totalStrandedPax = 0;
  let brokenConnectionsCount = 0;

  for (const cx of network.connections) {
    const fromFlight = simulatedFlightsMap.get(cx.from_flight);
    const toFlight = simulatedFlightsMap.get(cx.to_flight);

    if (!fromFlight || !toFlight) continue;

    let isBroken = false;
    let reason = '';
    let actualBufferMins = 0;

    if (fromFlight.status === 'cancelled') {
      isBroken = true;
      reason = `Inbound flight ${fromFlight.flight_id} cancelled`;
    } else if (toFlight.status === 'cancelled') {
      isBroken = true;
      reason = `Connecting flight ${toFlight.flight_id} cancelled`;
    } else {
      const fromArrMins = timeToMinutes(fromFlight.actual_arr);
      const toDepMins = timeToMinutes(toFlight.actual_dep);
      actualBufferMins = toDepMins - fromArrMins;

      if (actualBufferMins < cx.min_connect_minutes) {
        isBroken = true;
        reason = `Connecting buffer was ${actualBufferMins}m (min required: ${cx.min_connect_minutes}m)`;
      }
    }

    if (isBroken) {
      brokenConnectionsCount++;
      totalStrandedPax += cx.passengers;
    }

    simulatedConnections.push({
      ...cx,
      actual_buffer_mins: actualBufferMins,
      is_broken: isBroken,
      stranded_passengers: isBroken ? cx.passengers : 0,
      break_reason: isBroken ? reason : undefined,
    });
  }

  // 5. Simulate Crew Legal Duty Limits
  const simulatedCrews: SimulatedCrew[] = [];
  let crewViolationsCount = 0;

  for (const crew of network.crews) {
    const crewFlights = crew.flight_ids
      .map((fid) => simulatedFlightsMap.get(fid))
      .filter((f): f is SimulatedFlight => f !== undefined && f.status !== 'cancelled');

    if (crewFlights.length === 0) {
      simulatedCrews.push({
        ...crew,
        actual_duty_end: crew.duty_start,
        actual_duty_mins: 0,
        is_violated: false,
        violation_mins: 0,
      });
      continue;
    }

    const dutyStartMins = timeToMinutes(crew.duty_start);
    // Crew duty finishes upon actual arrival of last flight
    const lastFlight = crewFlights[crewFlights.length - 1];
    const dutyEndMins = timeToMinutes(lastFlight.actual_arr);
    const actualDutyMins = Math.max(0, dutyEndMins - dutyStartMins);

    const isViolated = actualDutyMins > crew.max_duty_mins;
    const violationMins = isViolated ? actualDutyMins - crew.max_duty_mins : 0;

    if (isViolated) {
      crewViolationsCount++;
    }

    simulatedCrews.push({
      ...crew,
      actual_duty_end: lastFlight.actual_arr,
      actual_duty_mins: actualDutyMins,
      is_violated: isViolated,
      violation_mins: violationMins,
      violating_flight_id: isViolated ? lastFlight.flight_id : undefined,
    });
  }

  // 6. Aggregate Comprehensive Metrics
  const allSimFlights = Array.from(simulatedFlightsMap.values());
  const delayedFlights = allSimFlights.filter((f) => f.status === 'delayed');
  const cancelledFlights = allSimFlights.filter((f) => f.status === 'cancelled');

  let totalDelayMins = 0;
  for (const f of delayedFlights) {
    totalDelayMins += f.arr_delay_mins;
  }

  // Any cancelled flight also strands ticketed pax on that leg
  for (const f of cancelledFlights) {
    totalStrandedPax += f.pax;
  }

  const onTimePercentage =
    allSimFlights.length > 0
      ? Math.round(
          ((allSimFlights.length - delayedFlights.length - cancelledFlights.length) /
            allSimFlights.length) *
            100
        )
      : 100;

  // Disruption score (0 = perfect network health, 100 = full network collapse)
  const disruptionScore = Math.min(
    100,
    Math.round(
      (delayedFlights.length / (allSimFlights.length || 1)) * 40 +
        (brokenConnectionsCount / (network.connections.length || 1)) * 30 +
        (crewViolationsCount / (network.crews.length || 1)) * 30
    )
  );

  const metrics: SimulationMetrics = {
    total_delay_minutes: totalDelayMins,
    total_delayed_flights: delayedFlights.length,
    total_cancelled_flights: cancelledFlights.length,
    total_broken_connections: brokenConnectionsCount,
    total_stranded_passengers: totalStrandedPax,
    total_crew_violations: crewViolationsCount,
    on_time_percentage: onTimePercentage,
    network_disruption_score: disruptionScore,
  };

  return {
    closure,
    flights: allSimFlights,
    connections: simulatedConnections,
    crews: simulatedCrews,
    metrics,
    causal_graph: causalGraph,
  };
}
