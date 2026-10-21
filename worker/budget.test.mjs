import test from 'node:test';
import assert from 'node:assert/strict';
import { allowance } from './budget.mjs';
import { titlePrice } from './feeds.mjs';

const HOUR = 3600e3;

test('un mois complet, passage toutes les heures : on dépense l’essentiel sans jamais dépasser le quota', () => {
  const start = Date.UTC(2026, 10, 1);
  let used = 0;
  for (let h = 0; h < 720; h++) {
    const a = allowance({ budget: 200, used, now: new Date(start + h * HOUR + 30 * 60e3), perRun: 3 });
    assert.ok(a >= 0 && a <= 3);
    used += a;
  }
  assert.ok(used >= 100, `trop peu dépensé : ${used}`);
  assert.ok(used <= 200, `quota dépassé : ${used}`);
});

test('départ en milieu de mois : jamais plus d’une recherche par passage, pas de rafale', () => {
  const start = Date.UTC(2026, 9, 21);
  for (let h = 0; h < 24; h++) {
    const a = allowance({ budget: 200, used: 10, now: new Date(start + h * HOUR + 30 * 60e3), perRun: 3 });
    assert.ok(a >= 0 && a <= 1, `rafale : ${a}`);
  }
});

test('quota épuisé : plus aucune recherche', () => {
  assert.equal(allowance({ budget: 200, used: 200, now: new Date('2026-11-30T23:00:00Z'), perRun: 10 }), 0);
  assert.equal(allowance({ budget: 200, used: 250, now: new Date('2026-11-10T12:00:00Z'), perRun: 10 }), 0);
});

test('mode démo (budget illimité) : plafond par passage', () => {
  assert.equal(allowance({ budget: Infinity, used: 0, now: new Date('2026-11-10T12:00:00Z'), perRun: 3 }), 3);
});

test('prix lu dans un titre de bon plan', () => {
  assert.equal(titlePrice('Paris → New York en Business dès 1 390 € A/R'), 1390);
  assert.equal(titlePrice('Vol Paris → Bangkok Premium Economy à 720 €'), 720);
  assert.equal(titlePrice('Lisbonne en Business 480 EUR'), 480);
  assert.equal(titlePrice('Promo Air France sans prix'), null);
});
