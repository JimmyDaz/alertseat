import test from 'node:test';
import assert from 'node:assert/strict';
import { allowance } from './budget.mjs';
import { titlePrice } from './feeds.mjs';

test('le budget est étalé sur le mois', () => {
  const budget = 200;
  assert.equal(allowance({ budget, used: 0, now: new Date('2026-11-01T00:30:00Z'), perRun: 10 }), 1);
  assert.equal(allowance({ budget, used: 0, now: new Date('2026-11-16T00:00:00Z'), perRun: 100 }), 86);
});

test('jamais au-delà du quota', () => {
  const now = new Date('2026-11-30T23:00:00Z');
  assert.equal(allowance({ budget: 200, used: 200, now, perRun: 10 }), 0);
  assert.equal(allowance({ budget: 200, used: 165, now, perRun: 10 }), 5);
});

test('déjà dépensé en avance : on attend', () => {
  assert.equal(allowance({ budget: 200, used: 50, now: new Date('2026-11-05T00:00:00Z'), perRun: 10 }), 0);
});

test('prix lu dans un titre de bon plan', () => {
  assert.equal(titlePrice('Paris → New York en Business dès 1 390 € A/R'), 1390);
  assert.equal(titlePrice('Vol Paris → Bangkok Premium Economy à 720 €'), 720);
  assert.equal(titlePrice('Lisbonne en Business 480 EUR'), 480);
  assert.equal(titlePrice('Promo Air France sans prix'), null);
});
