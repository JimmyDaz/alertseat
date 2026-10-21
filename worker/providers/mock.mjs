// Fournisseur de démonstration : prix fictifs mais réalistes, avec de temps en temps une grosse baisse.
// Sert à tester toute la chaîne (alertes, détection, Telegram, email) sans clé API. NE JAMAIS réserver sur cette base.
import { googleFlightsLink } from './link.mjs';

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export default async function search({ origin, destination, date, returnDate, cabin, currency }) {
  const base = { BUSINESS: 3200, ECONOMY: 600 }[cabin] ?? 1300;
  const routeFactor = 0.7 + (hash(origin + destination) % 100) / 160;
  const noise = 0.85 + (hash(`${date}${Math.floor(Date.now() / 3.6e6)}`) % 30) / 100;
  const dip = hash(`${destination}${date}${Math.floor(Date.now() / 1.08e7)}`) % 9 === 0 ? 0.45 : 1;
  const price = Math.round(base * routeFactor * noise * dip);
  return [
    {
      price,
      currency,
      airline: ['AF', 'LH', 'EK', 'QR', 'TK'][hash(destination + date) % 5],
      stops: hash(date) % 3 === 0 ? 1 : 0,
      link: googleFlightsLink({ origin, destination, date, returnDate, cabin }),
    },
  ];
}
