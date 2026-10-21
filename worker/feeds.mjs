// Flux RSS de sites de bons plans : méthode légale et gratuite (c'est fait pour être lu par des programmes).
// Vérifie que chaque URL répond bien ; ajoute/retire des flux dans FEEDS.
import { AIRPORTS } from './airports.mjs';

export const FEEDS = [
  { source: 'Secret Flying', url: 'https://www.secretflying.com/feed/' },
  { source: 'Dealabs · Voyages', url: 'https://www.dealabs.com/rss/groupe/voyages' },
];

const decode = (s) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").trim();
const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
};

export function parseRss(xml) {
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(([block]) => ({
    guid: tag(block, 'guid') || tag(block, 'link'),
    title: tag(block, 'title'),
    link: tag(block, 'link'),
    published_at: tag(block, 'pubDate') ? new Date(tag(block, 'pubDate')).toISOString() : null,
  })).filter((i) => i.guid && i.title);
}

export async function fetchFeed(feed) {
  const res = await fetch(feed.url, { headers: { 'User-Agent': 'AlertSeat/1.0' } });
  if (!res.ok) throw new Error(`${feed.source}: HTTP ${res.status}`);
  return parseRss(await res.text()).map((i) => ({ ...i, source: feed.source }));
}

// Prix annoncé dans le titre (« dès 1 390 € »), ou null s'il n'y en a pas.
export function titlePrice(title) {
  const m = title.match(/(\d{1,3}(?:[\s  .]\d{3})+|\d{2,5})\s*(?:€|eur\b)/i);
  return m ? Number(m[1].replace(/\D/g, '')) : null;
}

const CABIN_WORDS = {
  BUSINESS: ['business', 'affaires'],
  PREMIUM_ECONOMY: ['premium', 'éco+', 'eco+', 'économique premium'],
};

// Un item correspond à une alerte si la classe est citée ET (alerte « n'importe où » OU destination citée).
export function matchesAlert(title, alert) {
  const t = title.toLowerCase();
  if (!CABIN_WORDS[alert.cabin].some((w) => t.includes(w))) return false;
  if (alert.anywhere) return true;
  return alert.destinations.some((code) => t.includes(code.toLowerCase()) || (AIRPORTS[code] ?? []).some((k) => t.includes(k)));
}
