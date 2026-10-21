// Duffel : API officielle (inscription libre sur duffel.com). Gratuit en mode test ; le mode "live" demande
// la validation de ton compte et facture à la commande, pas à la recherche. Vérifie leurs conditions
// actuelles, notamment sur le ratio recherches/réservations.
import { googleFlightsLink } from './link.mjs';

export default async function search({ origin, destination, date, returnDate, cabin, currency, maxStops }) {
  const slices = [{ origin, destination, departure_date: date }];
  if (returnDate) slices.push({ origin: destination, destination: origin, departure_date: returnDate });

  const res = await fetch('https://api.duffel.com/air/offer_requests?return_offers=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DUFFEL_TOKEN}`,
      'Duffel-Version': 'v2',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      data: {
        slices,
        passengers: [{ type: 'adult' }],
        cabin_class: cabin === 'BUSINESS' ? 'business' : 'premium_economy',
        max_connections: maxStops ?? 1,
      },
    }),
  });
  if (!res.ok) throw new Error(`Duffel ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { data } = await res.json();

  return (data.offers ?? [])
    .filter((o) => o.total_currency === currency)
    .map((o) => ({
      price: Math.round(Number(o.total_amount)),
      currency: o.total_currency,
      airline: o.owner?.iata_code,
      stops: Math.max(0, (o.slices?.[0]?.segments?.length ?? 1) - 1),
      link: googleFlightsLink({ origin, destination, date, returnDate, cabin }),
    }));
}
