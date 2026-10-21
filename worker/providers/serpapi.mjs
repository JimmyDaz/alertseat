// SerpApi (moteur "google_flights") : service payant tiers qui lit Google Flights pour toi.
// Offre gratuite limitée (~250 recherches/mois) : insuffisant pour 20-50 alertes, utile pour tester.
// Zone grise : Google n'autorise pas l'extraction automatisée ; le risque est porté par le prestataire, vérifie ses CGU.
import { googleFlightsLink } from './link.mjs';

export default async function search({ origin, destination, date, returnDate, cabin, currency, maxStops }) {
  const p = new URLSearchParams({
    engine: 'google_flights',
    departure_id: origin,
    arrival_id: destination,
    outbound_date: date,
    currency,
    hl: 'fr',
    travel_class: { BUSINESS: '3', ECONOMY: '1' }[cabin] ?? '2', // 1 éco, 2 éco+, 3 business
    type: returnDate ? '1' : '2',
    stops: maxStops === 0 ? '1' : '2', // 1 = direct seulement, 2 = max 1 escale
    api_key: process.env.SERPAPI_KEY,
  });
  if (returnDate) p.set('return_date', returnDate);

  const res = await fetch(`https://serpapi.com/search.json?${p}`);
  if (!res.ok) throw new Error(`SerpApi ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();

  return [...(json.best_flights ?? []), ...(json.other_flights ?? [])]
    .filter((f) => typeof f.price === 'number')
    .map((f) => ({
      price: f.price,
      currency,
      airline: f.flights?.[0]?.flight_number?.slice(0, 2),
      stops: Math.max(0, (f.flights?.length ?? 1) - 1),
      link: json.search_metadata?.google_flights_url ?? googleFlightsLink({ origin, destination, date, returnDate, cabin }),
    }));
}
