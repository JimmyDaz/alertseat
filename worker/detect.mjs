// Logique de détection d'une « bonne affaire » (fonctions pures, testables).

export const MIN_HISTORY = 10; // nb minimal de relevés avant de se fier à la médiane

export function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const DAY = 86400000;
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);

// Historique le plus pertinent : mêmes route+classe, départs à ±30 jours si assez de données.
export function pickHistory(history, departDate) {
  const near = history.filter((h) => Math.abs(daysBetween(h.depart_date, departDate)) <= 30);
  return near.length >= MIN_HISTORY ? near : history;
}

export function evaluate(offer, history, alert, now = new Date()) {
  const prices = pickHistory(history, offer.departDate).map((h) => Number(h.price));
  const med = prices.length >= MIN_HISTORY ? median(prices) : null;
  const drop = med ? 1 - offer.price / med : 0;
  const reasons = [];

  if (alert.max_price != null && offer.price <= Number(alert.max_price)) reasons.push('seuil');
  if (med && drop >= (alert.drop_pct ?? 30) / 100) reasons.push('baisse');

  // Last minute : départ proche ET prix nettement sous la normale (yield management).
  const daysToDeparture = daysBetween(now, offer.departDate);
  if (med && daysToDeparture >= 0 && daysToDeparture <= 21 && drop >= 0.2) reasons.push('last_minute');

  return {
    isDeal: reasons.length > 0,
    reasons,
    median: med,
    discountPct: med ? Math.round(drop * 100) : null,
  };
}

// Évite de renotifier la même offre : on ne renotifie que si le prix baisse encore d'au moins 5 %.
export function shouldNotify(existingDeal, price) {
  if (!existingDeal || existingDeal.notified_price == null) return true;
  return price <= Number(existingDeal.notified_price) * 0.95;
}

export function passesAirlineFilter(code, alert) {
  if (!code) return true;
  if (alert.airlines_exclude?.includes(code)) return false;
  if (alert.airlines_include?.length) return alert.airlines_include.includes(code);
  return true;
}
