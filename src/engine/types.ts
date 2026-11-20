export interface Airport {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  tier: 'mega_hub' | 'regional_hub' | 'spoke';
  capacity_per_hour: number;
}

export interface Flight {
  flight_id: string;
  tail_id: string;
  leg_order: number;
  origin: string;
  destination: string;
  dep: string; // HH:MM
  arr: string; // HH:MM
  block_minutes: number;
  pax: number;
  turnaround_before_min: number | null;
}

export interface Connection {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  min_connect_minutes: number;
}

export interface Crew {
  crew_id: string;
  tail_id: string;
  base: string;
  duty_start: string; // HH:MM
  max_duty_mins: number;
  flight_ids: string[];
}

export interface SpareAircraft {
  tail_id: string;
  base: string;
  available_from: string; // HH:MM
  seats: number;
}

export interface NetworkMeta {
  dataset: string;
  operating_day: string;
  min_turnaround_minutes: number;
  seats_per_aircraft: number;
  notes: string[];
}

export interface FlightNetworkData {
  meta: NetworkMeta;
  airports: Airport[];
  flights: Flight[];
  connections: Connection[];
  crews: Crew[];
  spare_aircraft: SpareAircraft[];
}

export interface AirportClosure {
  airport_id: string;
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  reason?: string;
}

export interface SimulatedFlight extends Flight {
  assigned_tail_id: string;
  actual_dep: string; // HH:MM
  actual_arr: string; // HH:MM
  dep_delay_mins: number;
  arr_delay_mins: number;
  status: 'on_time' | 'delayed' | 'cancelled';
  cancellation_reason?: string;
  delay_causes: {
    type: 'AIRPORT_CLOSURE' | 'ROTATIONAL_DELAY' | 'TURNAROUND_BUFFER';
    detail: string;
    delay_added_mins: number;
  }[];
  is_disrupted: boolean;
}

export interface SimulatedConnection extends Connection {
  actual_buffer_mins: number;
  is_broken: boolean;
  stranded_passengers: number;
  break_reason?: string;
}

export interface SimulatedCrew extends Crew {
  actual_duty_end: string; // HH:MM
  actual_duty_mins: number;
  is_violated: boolean;
  violation_mins: number;
  violating_flight_id?: string;
}

export interface SimulationMetrics {
  total_delay_minutes: number;
  total_delayed_flights: number;
  total_cancelled_flights: number;
  total_broken_connections: number;
  total_stranded_passengers: number;
  total_crew_violations: number;
  on_time_percentage: number;
  network_disruption_score: number; // 0-100 index
}

export interface RecoveryAction {
  id: string;
  type: 'SWAP_SPARE' | 'CANCEL_FLIGHT';
  title: string;
  description: string;
  recommended_by_ai: boolean;
  score_improvement: {
    delay_mins_saved: number;
    passengers_saved: number;
    connections_saved: number;
    crew_violations_saved: number;
  };
  payload: {
    tail_id?: string;
    spare_tail_id?: string;
    spare_base?: string;
    flight_id?: string;
    from_leg_order?: number;
  };
}

export interface SimulationResult {
  closure: AirportClosure | null;
  flights: SimulatedFlight[];
  connections: SimulatedConnection[];
  crews: SimulatedCrew[];
  metrics: SimulationMetrics;
  causal_graph: Record<string, string[]>; // flight_id -> array of upstream cause descriptions
}

