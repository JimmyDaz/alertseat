// Garde-fou de budget : AlertSeat ne dépasse jamais le quota mensuel de recherches du fournisseur de prix.
// Le budget restant est réparti à parts égales sur les heures restantes du mois, quel que soit le jour
// où l'on démarre : jamais de rafale, même si les alertes ont été créées en milieu de mois.
export const RESERVE = 0.15; // part du quota gardée pour confirmer les offres trouvées

export function monthKey(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

// Nombre de recherches d'exploration autorisées à cet instant.
// rate = recherches restantes / heures restantes ; la différence de parties entières donne un rythme régulier
// (ex. rate 0,6 => 0, 1, 1, 0, 1, 1, 0, 1, 1, 1... soit 6 recherches toutes les 10 heures).
export function allowance({ budget, used, now = new Date(), perRun }) {
  if (!Number.isFinite(budget)) return perRun;
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const hoursLeft = Math.max(1, Math.ceil((end - now.getTime()) / 3600e3));
  const spendable = Math.max(0, budget * (1 - RESERVE) - used);
  const rate = spendable / hoursLeft;
  const k = Math.floor((now.getTime() - start) / 3600e3);
  const n = Math.floor(rate * (k + 1)) - Math.floor(rate * k);
  return Math.max(0, Math.min(perRun, n, budget - used));
}
