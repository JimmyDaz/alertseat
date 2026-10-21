// Envoi des notifications : Telegram (gratuit) et email (Resend, gratuit jusqu'à ~100 mails/jour).
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const eur = (n, cur = 'EUR') => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
const fr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '');

const REASON = { seuil: 'sous ton prix maximum', baisse: 'forte baisse vs prix habituel', last_minute: 'last minute' };

export function dealMessage(d) {
  const cabin = d.cabin === 'BUSINESS' ? 'Business' : 'Éco+';
  const lines = [
    `✈️ <b>${esc(cabin)} · ${esc(d.route.replace('-', ' → '))}</b>`,
    `💶 <b>${eur(d.price, d.currency)}</b>` +
      (d.median_price ? ` (habituel ≈ ${eur(d.median_price, d.currency)}, −${d.discount_pct} %)` : ''),
    `📅 ${fr(d.depart_date)}${d.return_date ? ` → ${fr(d.return_date)}` : ' (aller simple)'}` +
      `${d.airline ? ` · ${esc(d.airline)}` : ''}${d.stops === 0 ? ' · direct' : d.stops ? ` · ${d.stops} escale(s)` : ''}`,
    `🔔 ${d.reasons.map((r) => REASON[r]).join(' + ')}`,
    '⏱ Ces tarifs partent souvent en quelques heures : vérifie vite.',
  ];
  if (d.link) lines.push(`<a href="${esc(d.link)}">👉 Voir / réserver</a>`);
  return lines.join('\n');
}

export async function sendTelegram(chatId, html) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!res.ok) console.warn('Telegram:', res.status, await res.text());
  return res.ok;
}

export async function sendEmail(to, subject, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'AlertSeat <onboarding@resend.dev>',
      to,
      subject,
      html: html.replace(/\n/g, '<br>'),
    }),
  });
  if (!res.ok) console.warn('Resend:', res.status, await res.text());
  return res.ok;
}

export async function notifyUser({ profile, email }, subject, html) {
  const sent = [];
  if (profile?.notify_telegram !== false && (await sendTelegram(profile?.telegram_chat_id, html))) sent.push('telegram');
  if (profile?.notify_email !== false && (await sendEmail(email, subject, html))) sent.push('email');
  return sent;
}
