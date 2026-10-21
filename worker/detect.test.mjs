import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, median, shouldNotify, passesAirlineFilter } from './detect.mjs';

const hist = (n, price) =>
  Array.from({ length: n }, () => ({ price, depart_date: '2026-12-10' }));
const alert = { max_price: null, drop_pct: 30 };

test('médiane', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test('seuil absolu déclenche même sans historique', () => {
  const r = evaluate({ price: 900, departDate: '2026-12-10' }, [], { ...alert, max_price: 1000 });
  assert.deepEqual(r.reasons, ['seuil']);
});

test('baisse ≥ 30 % vs médiane', () => {
  const r = evaluate({ price: 1400, departDate: '2026-12-10' }, hist(12, 2400), alert);
  assert.ok(r.isDeal && r.reasons.includes('baisse'));
  assert.equal(r.discountPct, 42);
});

test('pas de détection par médiane si historique trop court', () => {
  const r = evaluate({ price: 100, departDate: '2026-12-10' }, hist(3, 2400), alert);
  assert.equal(r.isDeal, false);
});

test('last minute', () => {
  const now = new Date('2026-12-01');
  const r = evaluate({ price: 1800, departDate: '2026-12-10' }, hist(12, 2400), alert, now);
  assert.ok(r.reasons.includes('last_minute'));
});

test('dédoublonnage des notifications', () => {
  assert.equal(shouldNotify(null, 1000), true);
  assert.equal(shouldNotify({ notified_price: 1000 }, 990), false);
  assert.equal(shouldNotify({ notified_price: 1000 }, 940), true);
});

test('filtre compagnies', () => {
  assert.equal(passesAirlineFilter('AF', { airlines_exclude: ['AF'], airlines_include: [] }), false);
  assert.equal(passesAirlineFilter('LH', { airlines_exclude: [], airlines_include: ['AF'] }), false);
  assert.equal(passesAirlineFilter('AF', { airlines_exclude: [], airlines_include: [] }), true);
});
