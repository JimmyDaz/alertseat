// Lien de recherche Google Flights pré-rempli (le prix peut avoir bougé : on le revérifie à l'arrivée).
export function googleFlightsLink({ origin, destination, date, returnDate, cabin }) {
  const cls = { BUSINESS: 'business class', ECONOMY: 'economy class' }[cabin] ?? 'premium economy';
  const back = returnDate ? ` returning ${returnDate}` : ' one way';
  const q = `Flights from ${origin} to ${destination} on ${date}${back} ${cls}`;
  return `https://www.google.com/travel/flights?hl=fr&curr=EUR&q=${encodeURIComponent(q)}`;
}
