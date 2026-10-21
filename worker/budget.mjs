// Garde-fou de budget : AlertSeat ne dépasse jamais le quota mensuel de recherches du fournisseur de prix.
// Le quota est « étalé » sur le mois : on ne dépense pas tout le 1er jour.
export const RESERVE = 0.15; // part du quota gardée pour confirmer les offres trouvées

export function monthKey(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

// Nombre de recherches d'exploration autorisées à cet instant (déjà dépensées déduites).
export function allowance({ budget, used, now = new Date(), perRun }) {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const elapsed = (now.getTime() - start) / (end - start);
  const earned = Math.floor(budget * (1 - RESERVE) * elapsed) + 1;
  return Math.max(0, Math.min(perRun, earned - used, budget - used));
}
