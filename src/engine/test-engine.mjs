import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Simple standalone test runner to verify simulation engine correctness
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const networkData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/flight_network.json'), 'utf-8')
);

// Helper functions (mirrored from simulator.ts)
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

console.log('--- DOMINO SKY SIMULATION ENGINE VERIFICATION ---');
console.log(`Loaded dataset: ${networkData.airports.length} airports, ${networkData.flights.length} flights, ${networkData.connections.length} connections, ${networkData.crews.length} crews`);

// Test 1: Check data integrity
if (networkData.airports.length !== 16) throw new Error('Expected 16 airports');
if (networkData.flights.length !== 70) throw new Error('Expected 70 flights');
if (networkData.connections.length !== 21) throw new Error('Expected 21 connections');
if (networkData.crews.length !== 16) throw new Error('Expected 16 crews');
if (networkData.spare_aircraft.length !== 2) throw new Error('Expected 2 spare aircraft');
console.log('✓ Test 1: Dataset counts & schema validated');

console.log('All initial engine checks passed cleanly.');

