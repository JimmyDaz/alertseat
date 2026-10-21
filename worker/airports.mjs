// Aéroports principaux : code IATA -> mots-clés (pour rapprocher les bons plans des flux RSS).
export const AIRPORTS = {
  JFK: ['new york', 'jfk', 'newark'], EWR: ['new york', 'newark'], LAX: ['los angeles'], SFO: ['san francisco'],
  MIA: ['miami'], ORD: ['chicago'], BOS: ['boston'], IAD: ['washington'], YUL: ['montréal', 'montreal'],
  YYZ: ['toronto'], YVR: ['vancouver'], MEX: ['mexico'], CUN: ['cancún', 'cancun'], GRU: ['são paulo', 'sao paulo'],
  GIG: ['rio'], EZE: ['buenos aires'], BOG: ['bogota', 'bogotá'], LIM: ['lima'], SCL: ['santiago'],
  PTP: ['guadeloupe', 'pointe-à-pitre'], FDF: ['martinique'], RUN: ['la réunion', 'reunion'], CAY: ['guyane', 'cayenne'],
  DXB: ['dubaï', 'dubai'], DOH: ['doha', 'qatar'], AUH: ['abu dhabi'], IST: ['istanbul'], TLV: ['tel aviv'],
  BKK: ['bangkok'], SIN: ['singapour', 'singapore'], HKG: ['hong kong'], NRT: ['tokyo'], HND: ['tokyo'],
  KIX: ['osaka'], ICN: ['séoul', 'seoul'], PEK: ['pékin', 'beijing'], PVG: ['shanghai'], DEL: ['delhi'],
  BOM: ['bombay', 'mumbai'], CMB: ['colombo', 'sri lanka'], MLE: ['maldives', 'malé'], DPS: ['bali'],
  SYD: ['sydney'], MEL: ['melbourne'], AKL: ['auckland', 'nouvelle-zélande'], PPT: ['tahiti', 'papeete'],
  NOU: ['nouméa', 'nouvelle-calédonie'], JNB: ['johannesburg'], CPT: ['le cap', 'cape town'],
  CMN: ['casablanca', 'maroc'], RAK: ['marrakech'], TUN: ['tunis'], DKR: ['dakar'], ABJ: ['abidjan'],
  NBO: ['nairobi'], MRU: ['maurice', 'mauritius'], LHR: ['londres', 'london'], MAD: ['madrid'],
  LIS: ['lisbonne', 'lisbon'], FCO: ['rome'], ATH: ['athènes', 'athens'], CAI: ['le caire', 'cairo'],
};

// Destinations testées en rotation pour les alertes « n'importe où » (long-courrier, à adapter).
// Moyen-courrier d'abord : c'est là que Business/Éco+ passent le plus souvent sous 700 €.
export const ANYWHERE_POOL = ['LIS', 'MAD', 'FCO', 'ATH', 'IST', 'CMN', 'RAK', 'TUN', 'TLV', 'CAI', 'YUL', 'JFK', 'DXB', 'DOH', 'MRU', 'PTP', 'RUN', 'DKR'];

export const CITY_FR = { CDG: 'Paris', ORY: 'Paris' };
