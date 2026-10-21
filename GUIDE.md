# AlertSeat — guide complet

Alertes sur les billets d'avion en **Économique, Éco+ (Premium Economy) ou Business**, départs **toujours Paris CDG ou Orly**, **toutes compagnies** (Air France, Emirates, Qatar Airways…).

> État au 21 octobre 2026 : en service avec de vrais prix SerpApi (250 recherches gratuites par mois), notifications Telegram testées, site en ligne sur GitHub Pages.

## 1. Architecture

```
 Toi (mobile/PC) ──► Site web (dossier web/, hébergé sur GitHub Pages)
                          │ lit / écrit
                          ▼
                    Supabase (base de données + connexion par email)
                          ▲ lit / écrit
                          │
 GitHub Actions ──► worker/check.mjs  (toutes les heures, 24 h/24)
   • interroge SerpApi (prix)              • lit les flux RSS de bons plans
   • compare à l'historique                • envoie Telegram + email
```

| Brique | Rôle | Coût |
|---|---|---|
| GitHub Pages | héberge le site (dépôt public, aucun secret dedans) | 0 € |
| Supabase | base de données + comptes | 0 € (offre gratuite) |
| GitHub Actions | lance la vérification toutes les heures | 0 € |
| Telegram | notification instantanée | 0 € |
| Resend | emails (facultatif) | 0 € (offre gratuite) |
| SerpApi | prix des vols | 0 € jusqu'à 250 recherches/mois |

Le « push » mobile (PWA) n'est pas fait ; Telegram sur le téléphone en tient lieu.

## 2. Sources de données

Il n'existe plus d'API gratuite et libre pour les prix Économique/Éco+/Business : le portail Amadeus Self-Service a fermé en juillet 2026 et Kiwi/Tequila est réservé aux partenaires B2B.

| Source | Statut | Remarque |
|---|---|---|
| **SerpApi (Google Flights)** | ⚠️ zone grise, **en service** | Service tiers payant qui lit Google Flights ; Google n'autorise pas l'extraction automatisée, le risque est porté par le prestataire. 250 recherches gratuites/mois. |
| **Flux RSS de bons plans** (Secret Flying, Dealabs) | ✅ légal, gratuit | Lus à chaque passage. Vérifie que les URL de `worker/feeds.mjs` répondent. |
| **Duffel** (API officielle) | ✅ légal, accès à valider | Code prêt, compte à ouvrir : voir §6. |
| **Scraper soi-même** Google Flights, Skyscanner, Kayak, sites de compagnies | ❌ interdit par leurs CGU | Non codé. |
| **Going, Thrifty Traveler** | ⚠️ payants | Pas de flux public. |
| **Mode `mock`** | 🧪 démo | Prix fictifs, jamais pour réserver. |

## 3. Quand es-tu prévenu ? (`worker/detect.mjs`, `worker/check.mjs`)

Il n'y a **aucun plafond obligatoire**. Une offre déclenche une notification si :
1. **Baisse** : son prix est au moins **25 %** (réglable par alerte) sous la **médiane** des prix relevés sur la même route et la même classe (90 jours, départs à ±30 jours si assez de données). Il faut **au moins 10 relevés** sur la route : avant, la comparaison est impossible.
2. **Last minute** : départ dans 21 jours ou moins et prix au moins 20 % sous la médiane.
3. **Seuil** *(facultatif)* : si tu as fixé un prix maximum sur l'alerte, tout prix ≤ ce maximum déclenche, et aucune offre au-dessus n'est jamais proposée.

Garde-fous :
- **Confirmation** : avant de te prévenir, le script relance la même recherche et exige un prix confirmé (à +5 % près). Une offre non confirmée est ignorée.
- **Anti-spam** : une même offre n'est renotifiée que si son prix baisse encore d'au moins 5 %. Une offre non revue depuis 36 h passe en « expirée ».
- **Noms de compagnies** : les notifications affichent « Emirates », « Qatar Airways »… (table dans `worker/airlines.mjs`).
- Un plafond global facultatif existe : variable GitHub `PRICE_CAP` (actuellement 1 000 000, donc sans effet).

## 4. Budget de recherches

- Le compteur mensuel (`api_usage`) arrête les recherches au quota `SEARCH_BUDGET_MONTH` (200, sous les 250 gratuits).
- Le budget restant est **réparti à parts égales sur les heures restantes du mois** : jamais de rafale, même si les alertes sont créées en milieu de mois. Sur un mois complet : 170 recherches d'exploration (85 %) et 15 % gardés pour les confirmations.
- Chaque passage reprend là où le précédent s'est arrêté : toutes les dates, destinations et aéroports sont parcourus tour à tour.
- **Conséquence honnête** : environ 6 recherches par jour. Garde **deux ou trois alertes** avec une plage de départ d'un à deux mois. Les alertes « n'importe où » testent d'abord les destinations moyen-courrier (`worker/airports.mjs`).
- Pour surveiller davantage, il faudra un fournisseur payant : change `SEARCH_BUDGET_MONTH` et `PROVIDER`.

## 5. Installation, ce qui a été fait

1. **GitHub** : dépôt `alertseat` (public), avec les dossiers `web`, `worker`, `supabase`, `.github` et ce guide.
2. **Supabase** : projet créé, `supabase/schema.sql` exécuté, clé « anon » mise dans `web/config.js`. **Authentication → URL Configuration** : Site URL = adresse du site.
3. **Site** : GitHub Pages, source « GitHub Actions » (workflow `.github/workflows/pages.yml`).
4. **Planification** : `.github/workflows/check.yml`, toutes les heures.
5. **Telegram** : bot via @BotFather, identifiant de chat obtenu avec @userinfobot et saisi dans **Réglages** d'AlertSeat.
6. **Secrets GitHub** (Settings → Secrets and variables → Actions) : `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TELEGRAM_BOT_TOKEN`, `SERPAPI_KEY` (et `RESEND_API_KEY` pour les emails, facultatif).
7. **Variables GitHub** : `PROVIDER` = `serpapi`, `SEARCH_BUDGET_MONTH` = `200`, `PRICE_CAP` = `1000000`.

Pour créer une alerte : site AlertSeat → **Alertes** → **+ Nouvelle alerte**.

## 6. Passer à Duffel (sans plafond de 250 recherches)

Le code est prêt (`worker/providers/duffel.mjs`).

**Établi** (page tarifs de Duffel, octobre 2026) : pas de frais fixes ; 3 $ par commande confirmée ; **0,005 $ par recherche** au-delà de 1 500 recherches par commande. AlertSeat ne passe aucune commande, donc chaque recherche coûterait 0,005 $ : environ 5 $ pour 1 000 recherches.

**Non établi** : les conditions d'accès « réel » (un token `duffel_test_…` ne voit que des ressources de test), l'acceptation d'un usage de pure surveillance de prix, et la couverture d'Emirates, Qatar Airways, Air France. À demander à Duffel avant de payer.

**Marche à suivre**
1. Crée un compte sur duffel.com (à ton nom) et demande l'activation du mode réel.
2. Crée un token **live** (`duffel_live_…`).
3. GitHub → Secrets : `DUFFEL_TOKEN`.
4. GitHub → Variables : `PROVIDER` = `duffel`, `SEARCH_BUDGET_MONTH` = le maximum de recherches que tu acceptes de payer (ex. 4000 ≈ 20 $).
5. Lance un passage à la main et lis le journal. Retour arrière : remets `PROVIDER` à `serpapi`.

## 7. Limites à connaître
- Les liens ouvrent une recherche Google Flights pré-remplie : le prix peut avoir changé à l'arrivée.
- Un tarif confirmé peut quand même être épuisé avant ta réservation.
- GitHub peut décaler un peu les lancements planifiés. Pour une réactivité de moins d'une heure, il faudrait Supabase Cron ou n8n.
- **Avant la fin de 2026** : Supabase supprime les clés `anon` et `service_role`. Il faudra passer aux clés `sb_publishable_…` / `sb_secret_…`, ce qui demande une version plus récente de la bibliothèque `@supabase/supabase-js` dans `worker/package.json`.
- **Clé SerpApi** : si elle a été exposée (capture d'écran, message), régénère-la et mets à jour le secret `SERPAPI_KEY`.
