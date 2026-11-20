import { NextResponse } from 'next/server';
import { SimulationResult, RecoveryAction } from '@/engine/types';

export async function POST(request: Request) {
  try {
    const { result, recoveryOptions } = (await request.json()) as {
      result: SimulationResult;
      recoveryOptions: RecoveryAction[];
    };

    if (!result) {
      return NextResponse.json({ error: 'Missing simulation result' }, { status: 400 });
    }

    const { metrics, closure, flights, connections, crews } = result;

    if (!closure) {
      return NextResponse.json({
        summary:
          'Network is operating at 100% nominal capacity. All 70 flights, 21 connections, and 16 crews are running on published timetables with zero rotational cascades.',
        rootCause: 'No airport closures active. Clear skies network-wide.',
        recommendation: 'Maintain standard dispatch monitoring.',
        details: [],
      });
    }

    // Identify primary impacted flights at the closure airport
    const directlyImpacted = flights.filter(
      (f) =>
        (f.origin === closure.airport_id || f.destination === closure.airport_id) &&
        f.status !== 'on_time'
    );

    // Identify secondary domino-effect flights (rotational cascade at other airports)
    const downstreamDomino = flights.filter(
      (f) =>
        f.origin !== closure.airport_id &&
        f.destination !== closure.airport_id &&
        f.status === 'delayed'
    );

    const worstFlight = [...flights]
      .sort((a, b) => b.arr_delay_mins - a.arr_delay_mins)
      .find((f) => f.status === 'delayed');

    const brokenCxs = connections.filter((c) => c.is_broken);
    const violatedCrews = crews.filter((c) => c.is_violated);

    // Formulate deterministic, grounded briefing
    const summary = `Airport closure at ${closure.airport_id} (${closure.start_time} - ${closure.end_time}) has triggered a network-wide domino cascade. Total delay is ${metrics.total_delay_minutes} minutes across ${metrics.total_delayed_flights} delayed flights. ${metrics.total_broken_connections} passenger connections are severed, stranding ${metrics.total_stranded_passengers} travelers. ${metrics.total_crew_violations} crews exceed their 600-minute legal duty limit.`;

    const rootCause = `Primary Ground Halt: ${directlyImpacted.length} flights directly delayed at ${
      closure.airport_id
    } during the closure window. Rotational Delay Cascade: Ground delays propagated through aircraft tail chains into ${
      downstreamDomino.length
    } downstream flights across remote hubs (e.g. ${
      worstFlight ? `${worstFlight.flight_id} delayed by ${worstFlight.arr_delay_mins}m` : 'nominal'
    }). Turnaround buffers were exhausted, compounding delays into evening rotations.`;

    let recommendationText = '';
    if (recoveryOptions.length > 0) {
      const top = recoveryOptions[0];
      recommendationText = `Primary Dispatch Recommendation: ${top.title}. ${top.description} Impact: Saves ${top.score_improvement.delay_mins_saved}m of delay, recovers ${top.score_improvement.passengers_saved} stranded passengers, and avoids ${top.score_improvement.crew_violations_saved} crew legal breaches.`;
    } else {
      recommendationText =
        'All standard buffers consumed. Recommend tactical passenger rebooking on partner airlines.';
    }

    // Optional: Call Gemini if GEMINI_API_KEY is configured in process.env
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `You are the Chief Airline Network Dispatcher for Domino Sky.
Here are the EXACT deterministic simulation metrics from our engine:
- Airport Closed: ${closure.airport_id} from ${closure.start_time} to ${closure.end_time}
- Total Delay: ${metrics.total_delay_minutes} minutes
- Delayed Flights: ${metrics.total_delayed_flights}
- Cancelled Flights: ${metrics.total_cancelled_flights}
- Broken Connections: ${metrics.total_broken_connections}
- Stranded Passengers: ${metrics.total_stranded_passengers}
- Crew Legal Duty Violations: ${metrics.total_crew_violations}
- Worst Delayed Flight: ${worstFlight ? `${worstFlight.flight_id} (${worstFlight.origin}->${worstFlight.destination}, +${worstFlight.arr_delay_mins}m)` : 'None'}
- Top Recovery Action: ${recoveryOptions[0]?.title || 'None'}

Write a concise, professional 3-sentence operational dispatch briefing.
STRICT RULE: Every single number, airport code, and flight ID you state MUST exactly match the numbers above. Do not hallucinate or invent any figures.`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const aiText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (aiText) {
            return NextResponse.json({
              summary: aiText,
              rootCause,
              recommendation: recommendationText,
              metrics,
            });
          }
        }
      } catch (err) {
        console.warn('Gemini API call failed, using deterministic dispatcher engine:', err);
      }
    }

    return NextResponse.json({
      summary,
      rootCause,
      recommendation: recommendationText,
      metrics,
      brokenConnections: brokenCxs.map(
        (c) => `${c.connection_id}: ${c.from_flight} -> ${c.to_flight} at ${c.airport} (${c.passengers} pax stranded)`
      ),
      crewBreaches: violatedCrews.map(
        (cr) => `${cr.crew_id} (Tail ${cr.tail_id}): ${cr.actual_duty_mins}m duty (+${cr.violation_mins}m over legal limit)`
      ),
    });
  } catch (error) {
    console.error('Dispatcher error:', error);
    return NextResponse.json({ error: 'Failed to generate dispatch analysis' }, { status: 500 });
  }
}

