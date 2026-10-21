// Script lancé toutes les heures par GitHub Actions : vérifie les alertes, détecte les bonnes affaires, notifie.
import { createClient } from '@supabase/supabase-js';
import { evaluate, shouldNotify, passesAirlineFilter } from './detect.mjs';
import { notifyUser, dealMessage } from './notify.mjs';
import { FEEDS, fetchFeed, matchesAlert, titlePrice } from './feeds.mjs';
import { ANYWHERE_POOL } from './airports.mjs';
import { allowance, monthKey } from './budget.mjs';

const PROVIDER = process.env.PROVIDER || 'mock'; // mock | duffel | serpapi
const CAP = Number(process.env.PRICE_CAP || 700); // AlertSeat ne propose jamais d'offre au-dessus
// Quota mensuel de recherches du fournisseur : À RÉGLER selon son offre gratuite réelle (variable SEARCH_BUDGET_MONTH).
const BUDGET = PROVIDER === 'mock' ? Infinity : Number(process.env.SEARCH_BUDGET_MONTH || 200);
const PER_ALERT = Number(process.env.MAX_SEARCHES_PER_ALERT || 2);
const PER_RUN = Number(process.env.MAX_SEARCHES_PER_RUN || 3); // petit plafond par passage : pas de rafale en début de mois
const INTERVAL_H = Number(process.env.INTERVAL_HOURS || 1);
const ORIGINS = ['CDG', 'ORY']; // départs toujours depuis Paris (Roissy ou Orly)
const runIndex =Math.floor(Date.now() / (INTERVAL_H * 3600e3));

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const search = (await import(`./providers/${PROVIDER}.mjs`)).default;

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(new Date(d).getTime() + n * 86400000);

// --- Quelles recherches faire pour une alerte ? (rotation pour couvrir toute la plage au fil des passages)
function buildSearches(alert) {
  const dests = alert.anywhere ? ANYWHERE_POOL : alert.destinations;
  const start = new Date(Math.max(Date.now(), new Date(alert.date_from).getTime()));
  const end = new Date(alert.date_to);
  const span = Math.max(0, Math.round((end - start) / 86400000));
  const stride = Math.max(1, Math.ceil((span + 1) / 30)); // au plus ~30 dates candidates
  const combos = [];
  for (let i = 0, k = 0; i <= span; i += stride, k++) {
    const date = iso(addDays(start, i));
    let returnDate = null;
    if (!alert.one_way && alert.trip_min != null) {
      const range = Math.max(1, (alert.trip_max ?? alert.trip_min) - alert.trip_min + 1);
      returnDate = iso(addDays(date, alert.trip_min + (k % range)));
    }
    for (const origin of ORIGINS) for (const destination of dests) combos.push({ origin, destination, date, returnDate });
  }
  if (!combos.length) return [];
  const n = Math.min(PER_ALERT, combos.length);
  // Curseur = nombre de recherches déjà faites ce mois-ci : chaque passage reprend là où le précédent s'est arrêté,
  // si bien que toutes les dates, destinations et aéroports sont parcourus tour à tour, sans doublons ni trous.
  const offset = used % combos.length;
  return Array.from({ length: n }, (_, i) => combos[(offset + i) % combos.length]);
}

// --- Contexte utilisateur (profil + email), mis en cache pendant le passage
const users = new Map();
async function userCtx(userId) {
  if (!users.has(userId)) {
    const [{ data: profile }, { data: u }] = await Promise.all([
      sb.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      sb.auth.admin.getUserById(userId),
    ]);
    users.set(userId, { profile, email: u?.user?.email });
  }
  return users.get(userId);
}

const historyCache = new Map();
async function history(route, cabin) {
  const key = `${route}|${cabin}`;
  if (!historyCache.has(key)) {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data } = await sb.from('price_observations').select('price, depart_date')
      .eq('route', route).eq('cabin', cabin).gte('observed_at', since).order('observed_at', { ascending: false }).limit(500);
    historyCache.set(key, data ?? []);
  }
  return historyCache.get(key);
}

// --- Compteur de recherches du mois (table api_usage) : garantit qu'on reste dans l'offre gratuite
const month = monthKey();
let used = 0;
if (BUDGET !== Infinity) {
  const { data } = await sb.from('api_usage').select('count').eq('month', month).eq('provider', PROVIDER).maybeSingle();
  used = data?.count ?? 0;
}
async function counted(s, alert) {
  if (used >= BUDGET) throw new Error('budget mensuel atteint');
  used++;
  if (BUDGET !== Infinity) await sb.from('api_usage').upsert({ month, provider: PROVIDER, count: used });
  return search({ ...s, cabin: alert.cabin, currency: alert.currency, maxStops: alert.max_stops });
}
const cheapest = (offers, alert) => offers
  .filter((o) => o.price > 0 && (o.stops == null || o.stops <= alert.max_stops))
  .filter((o) => passesAirlineFilter(o.airline, alert))
  .sort((a, b) => a.price - b.price)[0];

// Contre-vérification : on relance la même recherche, le prix doit être confirmé (à +5 % près).
// Évite les prix périmés ou mal lus : seule une offre confirmée est annoncée.
async function confirmOffer(alert, s, first, cap) {
  try {
    const again = cheapest(await counted(s, alert), alert);
    return again && again.price <= first.price * 1.05 && again.price <= cap ? again : null;
  } catch (e) {
    console.warn(`    confirmation impossible : ${e.message}`);
    return null;
  }
}

async function processSearch(alert, s) {
  const route = `${s.origin}-${s.destination}`;
  let offers;
  try {
    offers = await counted(s, alert);
  } catch (e) {
    console.warn(`  ✗ ${route} ${s.date}: ${e.message}`);
    return;
  }
  let best = cheapest(offers, alert);
  if (!best) return;

  const past = await history(route, alert.cabin);          // historique AVANT d'ajouter le relevé du jour
  let verdict = evaluate({ ...best, departDate: s.date }, past, alert);

  await sb.from('price_observations').insert({
    alert_id: alert.id, route, cabin: alert.cabin, depart_date: s.date, return_date: s.returnDate,
    price: best.price, currency: best.currency, airline: best.airline, stops: best.stops, source: PROVIDER, link: best.link,
  });
  console.log(`  ${route} ${s.date}: ${best.price} ${best.currency}${verdict.isDeal ? ` 🔥 ${verdict.reasons}` : ''}`);
  // Exclusif : on ne propose que les offres sous le plafond (700 € par défaut), toutes compagnies.
  const cap = alert.max_price != null ? Math.min(Number(alert.max_price), CAP) : CAP;
  if (best.price > cap) return;
  const confirmed = await confirmOffer(alert, s, best, cap);
  if (!confirmed) { console.log('    ✗ prix non confirmé, offre ignorée'); return; }
  best = confirmed;
  verdict = evaluate({ ...best, departDate: s.date }, past, alert);

  // Offre déjà connue ?
  let q = sb.from('deals').select('*').eq('alert_id', alert.id).eq('route', route).eq('depart_date', s.date).eq('status', 'active');
  q = s.returnDate ? q.eq('return_date', s.returnDate) : q.is('return_date', null);
  const { data: existing } = await q.maybeSingle();

  const row = {
    alert_id: alert.id, user_id: alert.user_id, route, cabin: alert.cabin, depart_date: s.date, return_date: s.returnDate,
    price: best.price, currency: best.currency, median_price: verdict.median, discount_pct: verdict.discountPct,
    reasons: [...new Set(['seuil', ...verdict.reasons])], airline: best.airline, stops: best.stops, link: best.link, source: PROVIDER,
    last_seen: new Date().toISOString(),
  };
  const notify = shouldNotify(existing, best.price);
  if (notify) {
    const sent = await notifyUser(await userCtx(alert.user_id), `✈️ ${alert.name} : ${best.price} ${best.currency}`, dealMessage(row));
    if (sent.length) Object.assign(row, { notified_price: best.price, notified_at: new Date().toISOString() });
    console.log(`    → notification: ${sent.join('+') || 'aucun canal configuré'}`);
  }
  if (existing) await sb.from('deals').update(row).eq('id', existing.id);
  else await sb.from('deals').insert(row);
}

// --- 1. Alertes : recherches de prix
const { data: alerts, error } = await sb.from('alerts').select('*').eq('active', true);
if (error) throw error;
let todo = allowance({ budget: BUDGET, used, perRun: PER_RUN });
console.log(`Fournisseur: ${PROVIDER} · ${alerts.length} alerte(s) · budget ${BUDGET === Infinity ? 'illimité (démo)' : `${used}/${BUDGET} utilisées ce mois, ${todo} recherche(s) autorisée(s) maintenant`}`);

// Les alertes les moins récemment vérifiées passent en premier ; le budget est réparti entre elles.
alerts.sort((a, b) => (a.last_checked_at ?? '').localeCompare(b.last_checked_at ?? ''));
for (const alert of alerts) {
  if (todo <= 0) break;
  console.log(`• ${alert.name}`);
  for (const s of buildSearches(alert)) {
    if (todo-- <= 0) break;
    await processSearch(alert, s);
  }
  await sb.from('alerts').update({ last_checked_at: new Date().toISOString() }).eq('id', alert.id);
}
if (todo <= 0 && alerts.length) console.log('Budget de recherches du moment utilisé : les autres alertes passeront aux prochains passages.');

// Offres plus revues depuis 36 h = probablement disparues
await sb.from('deals').update({ status: 'expired' }).eq('status', 'active')
  .lt('last_seen', new Date(Date.now() - 36 * 3600e3).toISOString());

// --- 2. Flux de bons plans
const { count } = await sb.from('feed_items').select('guid', { count: 'exact', head: true });
const firstRun = !count; // 1er passage : on mémorise sans notifier, pour ne pas inonder
let items = [];
for (const f of FEEDS) {
  try { items.push(...(await fetchFeed(f))); } catch (e) { console.warn('Flux ignoré:', e.message); }
}
if (items.length) {
  const { data: known } = await sb.from('feed_items').select('guid').in('guid', items.map((i) => i.guid));
  const knownSet = new Set((known ?? []).map((k) => k.guid));
  let sentCount = 0;
  for (const item of items.filter((i) => !knownSet.has(i.guid))) {
    const matched = alerts.filter((a) => matchesAlert(item.title, a));
    await sb.from('feed_items').insert({ ...item, matched_alert_ids: matched.map((a) => a.id) });
    if (firstRun) continue;
    const p = titlePrice(item.title);
    if (p != null && p > CAP) continue; // exclusif : bon plan annoncé au-dessus du plafond, on ne notifie pas
    for (const a of matched) {
      if (sentCount++ >= 10) break;
      const html = `📰 <b>Bon plan (${item.source})</b>\n${item.title}\n🔔 Correspond à ton alerte « ${a.name} »\n<a href="${item.link}">👉 Voir l'annonce</a>`;
      await notifyUser(await userCtx(a.user_id), `Bon plan : ${item.title}`, html);
    }
  }
  console.log(`Flux: ${items.length} éléments lus${firstRun ? ' (initialisation, aucune notification)' : ''}`);
}
console.log('Terminé.');
