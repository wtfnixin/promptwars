import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const networkData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/flight_network.json'), 'utf-8')
);

// Helpers
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const normalized = Math.max(0, mins);
  const h = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Inline reproduction of simulator core for testing
function simulate(network, closure, activeRecoveries = []) {
  const closureStartMins = closure ? timeToMinutes(closure.start_time) : -1;
  const closureEndMins = closure ? timeToMinutes(closure.end_time) : -1;
  const closureAirport = closure ? closure.airport_id : null;

  const cancelledFlightIds = new Set();
  const spareSwaps = new Map();

  for (const recovery of activeRecoveries) {
    if (recovery.type === 'CANCEL_FLIGHT' && recovery.payload.flight_id) {
      cancelledFlightIds.add(recovery.payload.flight_id);
    } else if (recovery.type === 'SWAP_SPARE') {
      spareSwaps.set(recovery.payload.tail_id, {
        spare_tail_id: recovery.payload.spare_tail_id,
        from_leg_order: recovery.payload.from_leg_order,
      });
    }
  }

  const tailFlightMap = new Map();
  for (const f of network.flights) {
    if (!tailFlightMap.has(f.tail_id)) tailFlightMap.set(f.tail_id, []);
    tailFlightMap.get(f.tail_id).push(f);
  }
  for (const [, flts] of tailFlightMap.entries()) flts.sort((a, b) => a.leg_order - b.leg_order);

  const simMap = new Map();

  for (const [origTail, flts] of tailFlightMap.entries()) {
    let prevArrMins = null;
    let prevFlt = null;
    const swap = spareSwaps.get(origTail);

    for (const f of flts) {
      let assignedTail = f.tail_id;
      let isFreshSpare = false;

      if (swap && f.leg_order >= swap.from_leg_order) {
        assignedTail = swap.spare_tail_id;
        if (f.leg_order === swap.from_leg_order) isFreshSpare = true;
      }

      if (cancelledFlightIds.has(f.flight_id)) {
        simMap.set(f.flight_id, {
          ...f,
          assigned_tail_id: assignedTail,
          actual_dep: f.dep,
          actual_arr: f.arr,
          dep_delay_mins: 0,
          arr_delay_mins: 0,
          status: 'cancelled',
        });
        prevArrMins = null;
        prevFlt = null;
        continue;
      }

      let curDep = timeToMinutes(f.dep);

      if (prevArrMins !== null && !isFreshSpare) {
        const turnaround = f.turnaround_before_min ?? network.meta.min_turnaround_minutes;
        const readyMins = prevArrMins + turnaround;
        if (readyMins > curDep) {
          curDep = readyMins;
        }
      }

      if (closure && closureAirport === f.origin) {
        if (curDep >= closureStartMins && curDep < closureEndMins) {
          curDep = closureEndMins;
        }
      }

      let curArr = curDep + f.block_minutes;

      if (closure && closureAirport === f.destination) {
        if (curArr >= closureStartMins && curArr < closureEndMins) {
          curArr = closureEndMins;
          curDep = curArr - f.block_minutes;
        }
      }

      const depDelay = Math.max(0, curDep - timeToMinutes(f.dep));
      const arrDelay = Math.max(0, curArr - timeToMinutes(f.arr));
      const isDelayed = depDelay > 0 || arrDelay > 0;

      const simF = {
        ...f,
        assigned_tail_id: assignedTail,
        actual_dep: minutesToTime(curDep),
        actual_arr: minutesToTime(curArr),
        dep_delay_mins: depDelay,
        arr_delay_mins: arrDelay,
        status: isDelayed ? 'delayed' : 'on_time',
      };

      simMap.set(f.flight_id, simF);
      prevArrMins = curArr;
      prevFlt = simF;
    }
  }

  // Connections
  let brokenCx = 0;
  let strandedPax = 0;
  for (const cx of network.connections) {
    const fromF = simMap.get(cx.from_flight);
    const toF = simMap.get(cx.to_flight);
    if (!fromF || !toF) continue;

    let broken = false;
    if (fromF.status === 'cancelled' || toF.status === 'cancelled') {
      broken = true;
    } else {
      const fromArr = timeToMinutes(fromF.actual_arr);
      const toDep = timeToMinutes(toF.actual_dep);
      if (toDep - fromArr < cx.min_connect_minutes) {
        broken = true;
      }
    }

    if (broken) {
      brokenCx++;
      strandedPax += cx.passengers;
    }
  }

  // Crews
  let crewBreaches = 0;
  for (const crew of network.crews) {
    const cFlts = crew.flight_ids
      .map((id) => simMap.get(id))
      .filter((f) => f && f.status !== 'cancelled');
    if (cFlts.length === 0) continue;
    const dutyStart = timeToMinutes(crew.duty_start);
    const lastArr = timeToMinutes(cFlts[cFlts.length - 1].actual_arr);
    const actualDuty = lastArr - dutyStart;
    if (actualDuty > crew.max_duty_mins) {
      crewBreaches++;
    }
  }

  let totalDelay = 0;
  let delayedCount = 0;
  for (const f of simMap.values()) {
    if (f.status === 'delayed') {
      totalDelay += f.arr_delay_mins;
      delayedCount++;
    }
  }

  return {
    totalDelay,
    delayedCount,
    brokenCx,
    strandedPax,
    crewBreaches,
    simMap,
  };
}

console.log('====================================================');
console.log('   DOMINO SKY DETERMINISTIC SUITE: RUNNING TESTS    ');
console.log('====================================================\n');

// TEST SUITE 1: Baseline Nominal State
{
  const base = simulate(networkData, null);
  assert.strictEqual(base.totalDelay, 0, 'Baseline total delay must be 0');
  assert.strictEqual(base.delayedCount, 0, 'Baseline delayed flights must be 0');
  assert.strictEqual(base.brokenCx, 0, 'Baseline broken connections must be 0');
  assert.strictEqual(base.strandedPax, 0, 'Baseline stranded pax must be 0');
  assert.strictEqual(base.crewBreaches, 0, 'Baseline crew breaches must be 0');
  console.log('✓ PASS: Baseline network operating at 100% schedule fidelity (0 delays, 0 breaches)');
}

// TEST SUITE 2: Prompt Scenario (90-min Thunderstorm at Mumbai BOM 07:30 - 09:00)
{
  const closure = {
    airport_id: 'BOM',
    start_time: '07:30',
    end_time: '09:00',
  };
  const res = simulate(networkData, closure);

  assert(res.totalDelay > 0, 'Thunderstorm must cause total delay > 0');
  assert(res.delayedCount >= 5, 'Thunderstorm must cause multiple delayed flights');
  assert(res.brokenCx > 0, 'Thunderstorm must cause broken passenger connections');
  assert(res.strandedPax > 0, 'Broken connections must strand passengers');
  assert(res.crewBreaches > 0, 'Cascade delays must push crews over 600m legal limit');

  console.log(`✓ PASS: 90m Thunderstorm at BOM (07:30 - 09:00) correctly cascades:`);
  console.log(`       - Cumulative Delay: ${res.totalDelay} mins across ${res.delayedCount} flights`);
  console.log(`       - Broken Connections: ${res.brokenCx} (${res.strandedPax} passengers stranded)`);
  console.log(`       - Crew Duty Violations: ${res.crewBreaches} crews pushed illegal`);
}

// TEST SUITE 3: Recovery Action - Spare Aircraft Substitution
{
  const closure = {
    airport_id: 'BOM',
    start_time: '07:30',
    end_time: '09:00',
  };
  const unmitigated = simulate(networkData, closure);

  // Deploy spare aircraft VT-DS17 at BLR on leg 2 of VT-DS05 (DS0502 BLR->COK)
  const recovery = [
    {
      type: 'SWAP_SPARE',
      payload: {
        tail_id: 'VT-DS05',
        spare_tail_id: 'VT-DS17',
        from_leg_order: 2,
      },
    },
  ];

  const mitigated = simulate(networkData, closure, recovery);
  assert(
    mitigated.totalDelay < unmitigated.totalDelay,
    'Spare aircraft substitution must reduce cumulative network delay'
  );
  console.log(`✓ PASS: Spare Aircraft VT-DS17 substitution at BLR verified:`);
  console.log(`       - Delay reduced from ${unmitigated.totalDelay}m to ${mitigated.totalDelay}m (saved ${unmitigated.totalDelay - mitigated.totalDelay}m)`);
}

// TEST SUITE 4: Tactical Sacrificial Flight Cancellation
{
  const closure = {
    airport_id: 'BOM',
    start_time: '07:30',
    end_time: '09:00',
  };
  const unmitigated = simulate(networkData, closure);

  // Cancel flight DS0401 (BOM -> GOI) to break rotational cascade for VT-DS04
  const recovery = [
    {
      type: 'CANCEL_FLIGHT',
      payload: {
        flight_id: 'DS0401',
      },
    },
  ];

  const mitigated = simulate(networkData, closure, recovery);
  assert(
    mitigated.totalDelay < unmitigated.totalDelay,
    'Tactical cancellation must halt downstream cascade'
  );
  console.log(`✓ PASS: Tactical cancellation of DS0401 halts downstream cascade:`);
  console.log(`       - Delay reduced by ${unmitigated.totalDelay - mitigated.totalDelay}m`);
}

console.log('\n====================================================');
console.log('   ALL 4 TEST SUITES PASSED DETERMINISTICALLY!      ');
console.log('====================================================');
