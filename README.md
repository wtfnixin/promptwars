# Domino Sky: Flight Disruption Cascade & Recovery Simulator

Domino Sky is an interactive network operations simulator that models flight disruption propagation and algorithmic recovery across multi-leg commercial airline schedules. Built for the Hack2Skill Prompt Wars competition, it implements a 100% deterministic cascade engine alongside an AI operations dispatcher.

---

## 1. Executive Summary

In commercial aviation networks, aircraft operate in continuous sequential tail rotations. A disruption at an initial hub does not remain isolated; minimum aircraft turnaround buffers, shared flight crew pairings, and tight passenger connection windows propagate delays across remote hubs that have nominal local weather conditions.

Domino Sky simulates these cascading effects across a benchmark fleet of 16 airports, 70 scheduled flights, 16 active aircraft tails, 2 spare aircraft, 21 critical passenger transfer itineraries, and 16 flight crew pairings. When an airport closure or ground stop is initiated, the simulator calculates downstream delays deterministically, detects passenger connection failures and crew legal duty violations, and models tactical interventions including spare aircraft substitutions and surgical flight cancellations.

---

## 2. Mathematical Modeling & Deterministic Calculations

All delay, passenger, and crew calculations are computed using deterministic algorithms without stochastic simulation or generative model estimation. The mathematical specifications implemented in `src/engine/simulator.ts` and `src/engine/recovery.ts` are detailed below.

### 2.1 Rotational Delay Propagation

Let $R_T = (f_1, f_2, \dots, f_m)$ represent the ordered sequence of flight legs assigned to aircraft tail $T$.

For the initial leg $f_1$:
$$\text{ActualDeparture}(f_1) = \max(\text{ScheduledDeparture}(f_1), \text{GroundStopRelease}(f_1))$$
$$\text{ActualArrival}(f_1) = \text{ActualDeparture}(f_1) + \text{BlockTime}(f_1) + \text{ArrivalHoldTime}(f_1)$$

For each subsequent leg $f_k$ ($k > 1$):
$$\text{EarliestFeasibleDeparture}(f_k) = \text{ActualArrival}(f_{k-1}) + \text{TurnaroundBuffer}(f_k)$$
$$\text{ActualDeparture}(f_k) = \max(\text{ScheduledDeparture}(f_k), \text{EarliestFeasibleDeparture}(f_k), \text{GroundStopRelease}(f_k))$$
$$\text{ActualArrival}(f_k) = \text{ActualDeparture}(f_k) + \text{BlockTime}(f_k) + \text{ArrivalHoldTime}(f_k)$$

Where:
- $\text{TurnaroundBuffer}(f_k) = \max(30, \text{AirportTurnaroundTime}(\text{Origin}(f_k)))$ minutes.
- $\text{BlockTime}(f_k) = \text{ScheduledArrival}(f_k) - \text{ScheduledDeparture}(f_k)$.
- Arrival Delay is defined as $\text{ArrDelay}(f_k) = \max(0, \text{ActualArrival}(f_k) - \text{ScheduledArrival}(f_k))$.
- Cumulative Network Delay is given by:
$$\text{TotalNetworkDelay} = \sum_{i=1}^{N} \text{ArrDelay}(f_i)$$

### 2.2 Ground Stop and Airport Closure Constraints

Let an airport closure be defined as a tuple $C = (A_{\text{target}}, T_{\text{start}}, T_{\text{end}})$, where $A_{\text{target}}$ is the affected airport IATA code and $[T_{\text{start}}, T_{\text{end}}]$ is the closure window in minutes from midnight.

1. **Departure Restrictions:**
   If $\text{Origin}(f_k) = A_{\text{target}}$ and $\text{ScheduledDeparture}(f_k) < T_{\text{end}}$ and $\text{ScheduledDeparture}(f_k) \ge T_{\text{start}}$:
   $$\text{GroundStopRelease}(f_k) = T_{\text{end}}$$

2. **Arrival Restrictions:**
   If $\text{Destination}(f_k) = A_{\text{target}}$ and the computed arrival timestamp falls within $[T_{\text{start}}, T_{\text{end}}]$:
   $$\text{ActualArrival}(f_k) = T_{\text{end}}$$
   $$\text{ArrivalHoldTime}(f_k) = T_{\text{end}} - (\text{ActualDeparture}(f_k) + \text{BlockTime}(f_k))$$

### 2.3 Passenger Connection Integrity

Let a connection itinerary be defined by inbound flight $f_{\text{in}}$, outbound flight $f_{\text{out}}$, connecting airport $H$, minimum connect time $\text{MCT}(H)$, and passenger count $P$.

$$\text{EffectiveSlack} = \text{ActualDeparture}(f_{\text{out}}) - \text{ActualArrival}(f_{\text{in}})$$

The connection status is evaluated as follows:
$$\text{Status} = \begin{cases} \text{Intact}, & \text{if } \text{EffectiveSlack} \ge \text{MCT}(H) \\ \text{Severed}, & \text{if } \text{EffectiveSlack} < \text{MCT}(H) \end{cases}$$

When $\text{Status} = \text{Severed}$:
- The connection is recorded as broken.
- Stranded passenger tally increments by $P$:
$$\text{TotalStrandedPassengers} = \sum_{c \in \text{ConnectionsBroken}} P_c$$

### 2.4 Flight Crew Statutory Duty Period

Commercial aviation regulations mandate strict Flight Duty Period (FDP) limits. For each flight crew $C_j$:
$$\text{DutyStart}(C_j) = \text{ActualDeparture}(f_{\text{first}}(C_j)) - \text{PreFlightReportTime}$$
$$\text{DutyEnd}(C_j) = \text{ActualArrival}(f_{\text{last}}(C_j)) + \text{PostFlightDebriefTime}$$
$$\text{ElapsedDutyTime}(C_j) = \text{DutyEnd}(C_j) - \text{DutyStart}(C_j)$$

Statutory violation condition:
$$\text{Violation}(C_j) = \begin{cases} 1, & \text{if } \text{ElapsedDutyTime}(C_j) > 600 \text{ minutes (10.0 hours)} \\ 0, & \text{otherwise} \end{cases}$$

Any duty period exceeding 600 minutes constitutes an illegal crew overrun, which legally grounds the aircraft unless crew replacement occurs.

### 2.5 Algorithmic Recovery Optimization

The recovery engine implements lookahead search across two operational action spaces:

1. **Spare Aircraft Substitution:**
   - Dedicated hot spares: `VT-DS17` based at Bengaluru (BLR) and `VT-DS18` based at Delhi (DEL), available from 05:00.
   - For an affected tail $T$ operating flight $f_k$ departing from a spare base $S \in \{\text{BLR}, \text{DEL}\}$:
     The substitution reassigns $f_k$ and all subsequent legs $f_{k+1}, \dots, f_m$ to the spare tail. Because the spare is located at the base on time, the initial departure constraint is reset:
     $$\text{ActualDeparture}(f_k) = \max(\text{ScheduledDeparture}(f_k), \text{GroundStopRelease}(f_k))$$
     This eliminates all preceding rotational delay accumulated from legs $f_1, \dots, f_{k-1}$.

2. **Tactical Flight Cancellation:**
   - Evaluates cancelling leg $f_k$.
   - Leg $f_k$ status transitions to `cancelled`, eliminating its delay from network metrics.
   - Tail $T$ repositions to operate leg $f_{k+1}$ at its scheduled departure time, halting downstream propagation.

Recovery candidates are evaluated using an objective loss function:
$$\text{Loss} = w_{\text{delay}} \cdot \text{TotalDelay} + w_{\text{pax}} \cdot \text{StrandedPax} + w_{\text{crew}} \cdot \text{CrewViolations}$$
$$\text{ScoreImprovement} = \text{Loss}_{\text{baseline}} - \text{Loss}_{\text{candidate}}$$

Where weights are calibrated to standard airline disruption cost indices:
- $w_{\text{delay}} = 1.0$ (direct operating and fuel holding cost per minute)
- $w_{\text{pax}} = 15.0$ (passenger rebooking, hotel accommodation, and compensation penalty)
- $w_{\text{crew}} = 50.0$ (regulatory non-compliance penalty and deadheading crew cost)

Candidates yielding $\text{ScoreImprovement} > 0$ are ranked and surfaced to the dispatcher.

---

## 3. System Architecture

The application is architected as a Next.js 16 (App Router) full-stack system:

```
src/
├── app/
│   ├── api/
│   │   ├── dispatcher/     # POST endpoint for AI narrative synthesis
│   │   └── simulate/       # POST endpoint for headless deterministic simulation
│   ├── globals.css         # Strict two-color token definitions
│   ├── layout.tsx          # Application shell
│   └── page.tsx            # Main operations console assembling all panels
├── components/
│   ├── AIDispatcher.tsx    # Causal analysis narrative and recovery selector
│   ├── CascadeTimeline.tsx # Tail rotation Gantt schedule with ghost baselines
│   ├── DisruptionControl.tsx# Ground stop injection and scenario selector
│   ├── FlightTable.tsx     # Flight roster with expandable causal trace lineage
│   ├── MetricCounters.tsx  # Hairline-divided operational telemetry KPI rail
│   └── NetworkMap.tsx      # SVG radar scope with range reticles and corridor vectors
├── data/
│   └── flight_network.json # 16 airports, 70 flights, 16 tails, 21 connections, 16 crews
└── engine/
    ├── recovery.ts         # Algorithmic recovery lookahead optimizer
    ├── simulator.ts        # Pure functional deterministic cascade engine
    ├── test-suite.mjs      # Unit and scenario verification test runner
    └── types.ts            # Domain model type definitions
```

---

## 4. Benchmark Dataset Specifications

The simulator runs on a validated operational schedule dataset:
- **Airports (16):** Mega Hubs (DEL, BOM), Major Hubs (BLR, CCU, HYD, MAA), Regional Spokes (AMD, BBI, COK, GAU, GOI, JAI, IXC, LKO, PNQ, TRV).
- **Flights (70):** Daily scheduled block operations between 06:00 and 23:30 IST.
- **Aircraft (16 Active + 2 Spares):** Tails `VT-DS01` through `VT-DS16` flying 4 to 5 legs each. Spares `VT-DS17` (BLR) and `VT-DS18` (DEL).
- **Crew Pairings (16):** Assigned to distinct tail rotations with a 600-minute maximum duty cap.
- **Passenger Connections (21):** Scheduled transfer pairings at major hubs with minimum connecting times between 30 and 45 minutes.

---

## 5. Verification Test Suite

A standalone deterministic test suite verifies engine calculations against expected benchmarks:

```bash
npm test
```

### Test Assertions Verified:
1. **Baseline Operations:** Zero delays, zero broken connections, zero crew violations under nominal conditions.
2. **Mumbai 90-minute Ground Stop (07:30 to 09:00):**
   - Cumulative Delay: 1,655 minutes across 25 affected rotations.
   - Broken Connections: 3 connections severed (85 stranded passengers).
   - Crew Violations: 1 crew exceeds the 600-minute limit.
3. **Spare Insertion Verification:**
   - Swapping spare `VT-DS17` at Bengaluru into leg 2 of rotation `VT-DS05` reduces total network delay by 135 minutes.
4. **Tactical Cancellation Verification:**
   - Tactical cancellation of flight `DS0401` halts downstream cascade and saves 375 cumulative delay minutes.

---

## 6. Installation & Local Development

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher

### Setup Commands
```bash
# Clone the repository
git clone <repository-url>
cd domino-sky

# Install dependencies
npm install

# Run verification tests
npm test

# Build production bundle
npm run build

# Start local production server
npx next start -p 3005
```

Navigate to `http://localhost:3005` in your browser.

---

## 7. Design System Guidelines

Domino Sky adheres to the Hallmark Console design specification:
- **Palette:** Strict two-color palette composed of deep carbon (`#0c0d0e`) and single operational amber (`#e59500`).
- **Typography:** Tabular numerals and monospaced telemetry fonts for all computational readouts.
- **Surface Construction:** Single continuous surface with 1px hairline dividers (`#252729`), avoiding nested card elements.
- **Linter Compliance:** Validated against `sloplint` with zero rule infractions.
