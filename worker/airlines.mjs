// Code IATA de la compagnie -> nom affiché dans les notifications. Un code inconnu s'affiche tel quel.
export const AIRLINES = {
  AF: 'Air France', KL: 'KLM', LH: 'Lufthansa', LX: 'Swiss', OS: 'Austrian', SN: 'Brussels Airlines',
  BA: 'British Airways', IB: 'Iberia', UX: 'Air Europa', TP: 'TAP Air Portugal', AZ: 'ITA Airways',
  A3: 'Aegean', TK: 'Turkish Airlines', PC: 'Pegasus', SK: 'SAS', AY: 'Finnair', LO: 'LOT Polish',
  EK: 'Emirates', QR: 'Qatar Airways', EY: 'Etihad', SV: 'Saudia', GF: 'Gulf Air', WY: 'Oman Air',
  MS: 'EgyptAir', RJ: 'Royal Jordanian', ME: 'Middle East Airlines', LY: 'El Al',
  AT: 'Royal Air Maroc', AH: 'Air Algérie', TU: 'Tunisair', KQ: 'Kenya Airways', ET: 'Ethiopian Airlines',
  SA: 'South African Airways', HC: 'Air Sénégal', KP: 'ASKY', MK: 'Air Mauritius', UU: 'Air Austral',
  TX: 'Air Caraïbes', SS: 'Corsair', BF: 'French Bee', AC: 'Air Canada', TS: 'Air Transat',
  AA: 'American Airlines', DL: 'Delta', UA: 'United', B6: 'JetBlue', WS: 'WestJet',
  LA: 'LATAM', AV: 'Avianca', AM: 'Aeroméxico', CM: 'Copa Airlines', G3: 'GOL', AR: 'Aerolíneas Argentinas',
  SQ: 'Singapore Airlines', TG: 'Thai Airways', CX: 'Cathay Pacific', JL: 'Japan Airlines', NH: 'ANA',
  KE: 'Korean Air', OZ: 'Asiana', CA: 'Air China', MU: 'China Eastern', CZ: 'China Southern',
  AI: 'Air India', UL: 'SriLankan', BG: 'Biman', VN: 'Vietnam Airlines', GA: 'Garuda Indonesia',
  QF: 'Qantas', NZ: 'Air New Zealand', TN: 'Air Tahiti Nui', SB: 'Aircalin',
  U2: 'easyJet', FR: 'Ryanair', VY: 'Vueling', W6: 'Wizz Air', TO: 'Transavia', HV: 'Transavia',
};

export const airlineName = (code) => (code ? AIRLINES[code] ?? code : '');
