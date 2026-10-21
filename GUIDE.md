# AlertSeat Éco+ / Business — guide complet

Départs : **toujours Paris CDG ou Orly**. Compagnies : **toutes** (Air France, Emirates, Qatar Airways…), avec filtre facultatif.

## 1. Architecture (simple et gratuite)

```
 Toi (mobile/PC) ──► Interface web (dossier web/, hébergée sur Vercel)
                          │ lit / écrit
                          ▼
                    Supabase (base de données + connexion par email)
                          ▲ lit / écrit
                          │
 GitHub Actions ──► worker/check.mjs  (toutes les heures)
   • interroge un « fournisseur de prix »   • lit les flux RSS de bons plans
   • compare à l'historique                 • envoie Telegram + email
```

| Brique | Rôle | Coût |
|---|---|---|
| Vercel | héberge la page web | 0 € |
| Supabase | base de données + comptes | 0 € (offre gratuite) |
| GitHub Actions | lance la vérification toutes les heures | 0 € |
| Telegram | notification instantanée | 0 € |
| Resend | emails | 0 € (offre gratuite) |
| Source de prix | voir §2 | 0 € en test, variable ensuite |

Pas de serveur à gérer. Le « push » mobile est prévu en étape 2 (voir §5) ; Telegram sur ton téléphone fait déjà office de notification push immédiate.

## 2. Sources de données : ce qui est légal, ce qui ne l'est pas

**Constat important (vérifié en octobre 2026)** : il n'existe plus d'API gratuite et libre qui donne les prix Éco+/Business.
- **Amadeus Self-Service** : portail fermé en juillet 2026 (les clés sont désactivées).
- **Kiwi / Tequila** : accès fermé au public, réservé à des partenaires B2B.

| Source | Statut | Remarque |
|---|---|---|
| **Flux RSS de bons plans** (Secret Flying, Dealabs…) | ✅ légal, gratuit | Prévu pour être lu par un programme. Déjà intégré. Vérifie que les URL de `worker/feeds.mjs` répondent. |
| **Duffel** (API officielle) | ✅ légal, accès à valider | Gère Éco+ et Business. Inscription libre, mode test gratuit ; le mode réel demande la validation du compte et facture à la commande, pas à la recherche. À confirmer avec leurs conditions (ratio recherches/réservations). |
| **SerpApi (Google Flights)** | ⚠️ zone grise | Service payant tiers qui lit Google Flights. ~250 recherches gratuites/mois : trop peu pour 20-50 alertes, utile pour tester. |
| **Scraper soi-même** Google Flights, Skyscanner, Kayak, sites des compagnies | ❌ interdit par leurs CGU | Blocages et risque de bannissement. Je ne l'ai pas codé. |
| **Going, Thrifty Traveler** | ⚠️ payants | Newsletters/applications privées, pas de flux public. À lire toi-même. |
| **Mode `mock`** | 🧪 démo | Prix fictifs pour tester toute la chaîne. Jamais pour réserver. |

**Recommandation** : démarrer en `mock` pour tout valider, puis demander un accès Duffel et passer `PROVIDER=duffel`. Les flux RSS marchent dès le premier jour dans tous les cas.

## 3. Logique de « bonne affaire » (`worker/detect.mjs`)

Une offre déclenche une alerte si **une** de ces conditions est vraie :
1. **Seuil** : prix ≤ ton prix maximum.
2. **Baisse** : prix ≥ 30 % (réglable) sous la **médiane** des prix relevés sur la même route et la même classe (90 derniers jours, départs à ±30 jours si assez de données). Il faut au moins **10 relevés** ; avant cela, seul le seuil fonctionne (le système « apprend » la route pendant 2-3 jours).
3. **Last minute** : départ dans ≤ 21 jours et prix ≥ 20 % sous la médiane.

Anti-spam : une même offre n'est renotifiée que si son prix baisse encore d'au moins 5 %. Une offre non revue depuis 12 h passe en « expirée ». La durée réelle de vie d'une offre s'affiche dans le tableau de bord (« a duré X h »), ce qui t'aidera à estimer la validité des suivantes.

## 4. Mise en route pas à pas (environ 45 min)

**A. GitHub** — crée un compte sur github.com, puis un dépôt **privé** `alertes-vols`, et téléverse tout ce dossier (bouton « Add file > Upload files »).

**B. Supabase**
1. supabase.com > New project (région Paris/Frankfurt). Note le mot de passe de la base.
2. Menu **SQL Editor** > New query > colle le contenu de `supabase/schema.sql` > **Run**.
3. **Authentication > URL Configuration** : plus tard, mets l'adresse Vercel dans « Site URL ».
4. **Project Settings > API** : copie *Project URL*, la clé *anon public* et la clé *service_role* (**secrète**, ne la mets jamais dans `web/`).

**C. Interface sur Vercel**
1. Édite `web/config.js` avec *Project URL* et clé *anon*.
2. vercel.com > connecte GitHub > Add New Project > ton dépôt > **Root Directory = `web`** > Deploy.
3. Reviens dans Supabase (étape B3) et colle l'adresse Vercel obtenue.
4. Ouvre l'adresse sur ton téléphone, connecte-toi par email, puis « Ajouter à l'écran d'accueil » : tu as ton appli.

**D. Telegram**
1. Dans Telegram, parle à **@BotFather** > `/newbot` > garde le *token*.
2. Écris `/start` à ton nouveau bot.
3. Ouvre dans ton navigateur `https://api.telegram.org/bot<TOKEN>/getUpdates` et repère `"chat":{"id":123456789`. Ce numéro va dans **Réglages** de l'appli.

**E. Email (facultatif)** — resend.com > crée une clé API. Sans domaine à toi, les mails ne partent que vers l'adresse de ton compte Resend : prends la même adresse que ta connexion.

**F. Secrets GitHub** — dépôt > Settings > Secrets and variables > Actions :
- *Secrets* : `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY` (et plus tard `DUFFEL_TOKEN` ou `SERPAPI_KEY`).
- *Variables* : `PROVIDER` = `mock` (puis `duffel`).

**G. Premier test** — dans l'appli, crée une alerte (ex. JFK, Business, plage de dates dans les mois à venir, séjour 7-14 j). Onglet **Actions** de GitHub > « Vérifier les alertes » > **Run workflow**. En mode `mock`, quelques offres fictives apparaissent et tu reçois la notification.

## 4 bis. Fonctionnement 24 h/24 et plafond de 700 €

- **En continu** : GitHub Actions lance la vérification **toutes les heures, jour et nuit**, sans que ton ordinateur soit allumé. Ce n'est pas du temps réel à la seconde : une offre qui disparaît en moins d'une heure peut être manquée. Pour aller plus vite, il faudra un autre planificateur (Supabase Cron ou n8n) et plus de requêtes API.
- **Plafond de 700 €** : chaque nouvelle alerte démarre avec un prix maximum de 700 € (modifiable). Le tableau de bord affiche en tête les **meilleurs tarifs sous 700 €** relevés ces 48 dernières heures, **toutes compagnies confondues** (une ligne par route et classe, la moins chère).
- **Réalisme** : sous 700 €, l'Éco+ est plausible sur beaucoup de routes (promotions, last minute). La Business long-courrier à moins de 700 € est très rare ; sur ce plafond, tu recevras surtout des tarifs Éco+ et de la Business moyen-courrier ou en erreur de prix.
- **Exclusivité** : AlertSeat ne notifie **que** des offres ≤ 700 € (variable `PRICE_CAP`, ou le prix max de l'alerte s'il est plus bas), en Éco+ ou Business, **toutes compagnies**. Les bons plans RSS dont le titre annonce un prix > 700 € sont ignorés. Les alertes « n'importe où » testent d'abord les destinations moyen-courrier (Lisbonne, Madrid, Rome, Athènes, Istanbul, Maroc…).
- **Pas de prix faux** : avant chaque notification, AlertSeat **relance la même recherche** et exige que le prix soit confirmé (à +5 % près) et toujours sous le plafond. Sinon l'offre est ignorée. Il reste une marge d'incertitude : un tarif peut être épuisé entre la recherche et ta réservation, c'est pourquoi le lien amène sur une recherche à jour.
- **Pas de dépassement de l'offre gratuite** : un compteur mensuel (`api_usage`) arrête les recherches au quota `SEARCH_BUDGET_MONTH` (200 par défaut, **à régler selon l'offre gratuite réelle de ton fournisseur**). Le quota est étalé sur le mois (15 % gardés pour les confirmations) ; les alertes les moins récemment vérifiées passent en premier.
- **Conséquence honnête** : avec ~200 recherches/mois, l'API de prix ne couvre pas 20 à 50 alertes toutes les heures (environ 6 recherches par jour). La source principale « exclusive » est donc le flux de bons plans, gratuit et illimité, vérifié chaque heure ; les recherches de prix servent à confirmer et à échantillonner les alertes. Pour surveiller toutes les alertes de près, il faudra un fournisseur payant (le garde-fou s'adapte en changeant `SEARCH_BUDGET_MONTH`).

## 4 ter. Passer à Duffel (fournisseur sans plafond de 250 recherches)

Le code est déjà prêt (`worker/providers/duffel.mjs`). Il manque seulement un compte et un token.

**Ce qui est établi** (page tarifs de Duffel, octobre 2026) : pas de frais fixes ; 3 $ par commande confirmée ; **0,005 $ par recherche** au-delà de 1 500 recherches par commande. AlertSeat ne passe aucune commande, donc chaque recherche est facturée 0,005 $ : environ **5 $ pour 1 000 recherches**, soit ~20 $ pour 4 000 recherches par mois.

**Ce qui n'est PAS établi** : les conditions d'accès « réel » (un token `duffel_test_…` ne voit que des ressources de test), si un usage de pure surveillance de prix est accepté, et quelles compagnies Duffel couvre (Emirates, Qatar Airways, Air France ?). À demander à Duffel avant de payer quoi que ce soit.

**Marche à suivre**
1. Crée un compte sur duffel.com (à ton nom, c'est toi qui le fais), puis demande l'activation du mode réel dans le tableau de bord.
2. Crée un token **live** (préfixe `duffel_live_`) en lecture/écriture.
3. GitHub → Secrets : ajoute `DUFFEL_TOKEN`.
4. GitHub → Variables : `PROVIDER` = `duffel`, et `SEARCH_BUDGET_MONTH` = le nombre maximum de recherches que tu acceptes de payer (ex. 4000 ≈ 20 $). Le garde-fou s'arrête à ce chiffre, jamais au-delà.
5. Lance un passage à la main et vérifie le journal. En cas d'erreur Duffel, repasse `PROVIDER` à `serpapi`.

Revenir en arrière est immédiat : il suffit de remettre `PROVIDER` à `serpapi`.

## 5. Plan de développement

1. **MVP (ce dossier)** : alertes, détection, Telegram + email, tableau de bord, pause/modif/suppression, flux RSS.
2. **Fiabiliser** : passer à Duffel, ajuster les seuils après 1-2 semaines d'historique, vérifier les flux RSS.
3. **Push mobile (PWA)** : notifications Web Push (iPhone : appli ajoutée à l'écran d'accueil, iOS 16.4+).
4. **Confort** : graphique de prix détaillé par route, estimation de validité (statistique sur les offres passées), alertes « n'importe où » avec cartes.
5. **Plus tard** : multi-sources avec dédoublonnage, code promo, réservation directe via l'API.

## 6. Limites à connaître
- Les liens ouvrent une recherche Google Flights pré-remplie : le prix affiché peut avoir changé à l'arrivée.
- Le mode `mock` produit des prix inventés.
- Les alertes « n'importe où » testent une sélection de 18 destinations en rotation, moyen-courrier en tête (modifiable dans `worker/airports.mjs`).
- Chaque passage reste dans le budget mensuel de recherches (voir §4 bis) : une plage de dates large est couverte progressivement.
- GitHub peut décaler un peu les lancements planifiés (quelques minutes). Pour une réactivité de moins d'une heure, il faudra passer par Supabase Cron ou n8n.
