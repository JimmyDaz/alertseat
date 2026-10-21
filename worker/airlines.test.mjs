import test from 'node:test';
import assert from 'node:assert/strict';
import { airlineName } from './airlines.mjs';
import { dealMessage } from './notify.mjs';

test('nom de compagnie, code inconnu conservé', () => {
  assert.equal(airlineName('QR'), 'Qatar Airways');
  assert.equal(airlineName('EK'), 'Emirates');
  assert.equal(airlineName('ZZ'), 'ZZ');
  assert.equal(airlineName(undefined), '');
});

test('la notification affiche le nom de la compagnie', () => {
  const msg = dealMessage({
    route: 'CDG-DXB', cabin: 'BUSINESS', price: 640, currency: 'EUR', depart_date: '2026-12-10', return_date: '2026-12-17',
    airline: 'EK', stops: 0, reasons: ['seuil'], link: 'https://example.com',
  });
  assert.ok(msg.includes('Emirates'));
  assert.ok(!msg.includes('· EK'));
});
