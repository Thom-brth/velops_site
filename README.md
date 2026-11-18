# Brignais Cycle : site vitrine + module « Vélos à vendre »

Site statique de l'atelier vélo **Brignais Cycle** (Thomas BERTHILLOT EI, Brignais 69530) et sélection quotidienne de vélos du partenaire **BikeStocks** (bikestocks.es).

- **Aucun cookie, aucun traceur, aucun formulaire** : contact par `tel:`, `sms:` et `mailto:` uniquement.
- **Contenus modifiables sans toucher au code** : tout est dans `data/*.json` et `config/bikestocks.json`.
- **Module vélos livré désactivé** (`"SHOW_BIKES": false` dans `data/site.json`).

## Sommaire

1. [Choix techniques](#choix-techniques)
2. [Installation locale](#installation-locale)
3. [Arborescence](#arborescence)
4. [Modifier les contenus](#modifier-les-contenus) (tarifs, créneaux, coordonnées, FAQ)
5. [Déploiement pas à pas](#déploiement-pas-à-pas)
6. [Module « Vélos à vendre »](#module--vélos-à-vendre-) (activer, épingler, bannir, régler la sélection)
7. [Que faire si la collecte casse](#que-faire-si-la-collecte-casse)
8. [Design](#design)
9. [À compléter avant la mise en ligne](#à-compléter-avant-la-mise-en-ligne)

## Choix techniques

| Choix | Pourquoi |
|---|---|
| **Eleventy 3 + Nunjucks** | Génère du HTML pur, sans JavaScript côté client (sauf le menu mobile, la carte au clic et les filtres vélos, quelques lignes). Lit `data/*.json` directement. Gère le Markdown (pages légales). Une seule dépendance de build. |
| **GitHub Pages** | Gratuit, HTTPS, domaine personnalisé possible. Surtout, la collecte quotidienne tourne déjà dans GitHub Actions : un seul workflow collecte, commite `bikes.json`, construit et déploie, sur une seule plateforme. Netlify ou Cloudflare Pages conviendraient aussi, mais demanderaient un 2ᵉ compte et un déclencheur entre les deux. |
| **Collecteur en Node.js** (pas Python) | Même environnement que le build : un seul `npm ci`. `fetch` et l'exécuteur de tests `node:test` sont intégrés. Seule dépendance : `cheerio`, pour appliquer les sélecteurs CSS de la config. |

Node.js ≥ 22 requis (24 en CI).

## Installation locale

```bash
npm install
npm run dev          # http://localhost:8080, rechargement automatique
npm test             # tests du collecteur et des données
npm run build        # génère _site/
npm run check        # contrôles du site généré + liste des [À COMPLÉTER]
npm run collect:dry  # collecte BikeStocks sans rien écrire (voir plus bas)
```

## Arborescence

```
data/
  site.json          coordonnées, créneaux, paiements, zone, SHOW_BIKES, textes « À propos »…
  tarifs.json        grille tarifaire par catégorie, prestations non proposées
  faq.json           questions / réponses
  bikes.json         sélection BikeStocks (GÉNÉRÉ par la collecte, ne pas éditer à la main)
config/
  bikestocks.json    tout le réglage de la collecte : catégories, exclusions, poids, sélecteurs…
src/
  _includes/         gabarits (base.njk, legal.njk, velo.njk = carte vélo)
  *.njk              pages
  mentions-legales.md, cgv.md, confidentialite.md   pages juridiques (Markdown)
  assets/            CSS, JS, favicon, image de partage Facebook (og.png)
scripts/
  collect.mjs        collecte BikeStocks -> data/bikes.json
  lib/               http (politesse, robots.txt), source-html, source-flux, selection
  check-site.mjs     contrôles après build
tests/               node:test + pages BikeStocks enregistrées (fixtures/)
.github/workflows/site.yml   tests, collecte quotidienne, build, déploiement
```

## Modifier les contenus

Tout se fait dans `data/`, puis commit et push : le site se redéploie tout seul en 1 à 2 minutes. Vérification locale possible avec `npm run dev`.

| Je veux changer… | Fichier | Clé |
|---|---|---|
| Un tarif, ajouter une prestation | `data/tarifs.json` | `categories[].prestations[]` : `{ "nom", "detail", "prix", "phare" }`. `prix` est un nombre (40, 7.5). `"phare": true` l'affiche sur l'accueil. |
| La main-d'œuvre | `data/tarifs.json` | `main_oeuvre` |
| Les créneaux | `data/site.json` | `creneaux[]`. Pense à `jsonld` (horaires lus par Google). |
| Téléphone, e-mail, assureur, SIREN… | `data/site.json` | `telephone`, `email`, `assureur`, `siren`… |
| La FAQ | `data/faq.json` | `questions[]`. `{site.cle}` est remplacé par la valeur de `site.json`. |
| Une photo « À propos » | `src/a-propos.njk` | remplacer le bloc `placeholder-img` par une balise `<img>` |
| Les textes juridiques | `src/mentions-legales.md`, `src/cgv.md`, `src/confidentialite.md` | Markdown. **À relire avant mise en ligne.** |

Les prix s'affichent toujours en net, sans « HT/TTC » (TVA non applicable, art. 293 B du CGI).

## Déploiement pas à pas

1. Crée un dépôt GitHub (il peut être privé avec un compte payant ; en gratuit, GitHub Pages exige un dépôt **public**), puis pousse ce dossier :
   ```bash
   git add -A && git commit -m "Site Brignais Cycle"
   git remote add origin https://github.com/<ton-compte>/brignais-cycle.git
   git push -u origin main
   ```
2. Sur GitHub : **Settings > Pages > Build and deployment > Source : GitHub Actions**.
3. Le workflow **Site** se lance à chaque push (onglet **Actions**). À la fin, l'URL s'affiche dans le job `deploy`.
4. **Domaine personnalisé** (recommandé, ex. `brignais-cycle.fr`) :
   - Settings > Pages > Custom domain, puis cocher **Enforce HTTPS** ;
   - chez le registrar, un enregistrement `CNAME www -> <ton-compte>.github.io` (ou les 4 IP A de GitHub Pages pour l'apex) ;
   - renseigner `url` dans `data/site.json`, **sans** slash final : `"https://www.brignais-cycle.fr"`.
   Sans domaine, l'URL est `https://<ton-compte>.github.io/brignais-cycle` : mets-la dans `url`. Le préfixe `/brignais-cycle/` des liens est géré automatiquement (`PATH_PREFIX`).
5. Déclare le site dans **Google Search Console** (sitemap : `/sitemap.xml`) et dans ta fiche **Google Business Profile**. C'est elle qui fait l'essentiel du SEO local sur Google Maps.

> Le workflow planifié (cron) est suspendu par GitHub après 60 jours sans activité sur le dépôt. Les commits quotidiens de `bikes.json` suffisent à le garder actif quand le module est activé. Sinon : onglet Actions > Site > Enable workflow.

## Module « Vélos à vendre »

### Fonctionnement

Chaque nuit, `.github/workflows/site.yml` lance `npm run collect`, sur les serveurs de GitHub, jamais dans le navigateur du visiteur :

1. **Liste** : lecture des 7 catégories de `config/bikestocks.json > categories`, page par page (lien `rel=next`, plafonné par `max_pages_par_categorie`). Pour chaque produit : id, nom, prix, prix barré, tailles **réellement en stock** (`data-quantity > 0`), lien, image.
2. **Filtres** (`raisonRejet`) : banni, sans prix, hors stock, électrique (mots-clés, motifs, specs), catégorie exclue, hors gamme de prix.
3. **Pré-sélection** des `max_fiches` meilleurs candidats (même algorithme que la sélection finale).
4. **Contrôle de chaque fiche** : le JSON-LD `schema.org/Product` fait foi pour le prix et le stock. Le fil d'Ariane, la description et le tableau de specs servent à détecter un vélo électrique **mal rangé** (lignes « motor », « bateria », capacité en Wh, moteur Bosch, Shimano EP…). On y lit aussi le matériau du cadre et le dérailleur.
5. **Sélection finale** : 12 vélos maximum, puis **validation du schéma**, puis écriture atomique de `data/bikes.json`.

**Politesse** : une requête à la fois, 2 s minimum entre deux requêtes (`delai_ms`), user-agent `BrignaisCycleBot/1.0 (+e-mail)`, `robots.txt` lu en premier et respecté (si son serveur est en erreur, la collecte s'arrête), 150 requêtes maximum (`max_requetes`). Une collecte complète fait environ 70 requêtes et dure 4 à 5 minutes (mesuré le 18/11/2026 : 69 requêtes, 4 min 35).

> Les microdonnées des pages listes de BikeStocks sont fausses (prix « 95 », faux avis « asd/rty ») : elles ne sont pas utilisées.

### Activer le module

1. Renseigner `config/bikestocks.json > user_agent` avec ton e-mail : `"BrignaisCycleBot/1.0 (+contact@exemple.fr)"`. Sans ça, la collecte refuse de démarrer.
2. Lancer une collecte : onglet Actions > **Site** > **Run workflow** (ou `npm run collect` en local, puis commit de `data/bikes.json`).
3. Dans `data/site.json` : `"SHOW_BIKES": true`, puis commit et push.

L'onglet du menu, la page `/velos-a-vendre/`, l'aperçu de 3 vélos sur l'accueil et le paragraphe « photos BikeStocks » de la politique de confidentialité apparaissent. Avec `false`, tout disparaît (la page n'est même pas générée) et la collecte nocturne ne tourne plus.

### Forcer ou retirer un vélo à la main

L'identifiant est le nombre à la fin de l'URL de la fiche : `…/velo-merida-silex-400-2026-50324.html` → `50324`.

```json
"selection": {
  "epingles": ["50324"],
  "bannis": ["49200", "51585"]
}
```

- **Épinglé** : affiché en tête, même hors gamme de prix, à condition d'être trouvé dans les catégories suivies, en stock et non électrique.
- **Banni** : jamais affiché.

Après modification : commit, puis Actions > Site > Run workflow (ou attendre la nuit suivante).

### Régler les critères de sélection

Tout est dans `config/bikestocks.json > selection` :

| Clé | Rôle | Défaut |
|---|---|---|
| `max_velos` | nombre de vélos affichés | 12 |
| `prix_min`, `prix_max` | gamme de prix ; hors gamme = exclu (sauf épinglé) | 600 / 3 500 € |
| `poids.remise_par_point` | points par % de remise (poids fort) | 2 |
| `poids.par_taille_dispo` × `max_tailles_comptees` | points par taille en stock, plafonnés | 5 × 4 max |
| `poids.marque_reconnue` + `marques_bonus` | bonus si la marque est dans la liste | 10 |
| `quotas` | minimum par famille si disponible | 3 route/gravel, 3 VTT |

**Score** = remise (%) × 2 + min(tailles en stock, 4) × 5 + 10 si marque reconnue.
Exemple : −25 %, 3 tailles, Orbea → 50 + 15 + 10 = **75 points**. Le détail est écrit dans `bikes.json` (`score_detail`) pour chaque vélo.

Une seule variante par modèle : le nom est ramené à une « clé modèle » (sans année, taille ni couleur, voir `variantes_regex`) et seule la mieux notée est gardée.

Pour tester un réglage sans rien publier : `npm run collect:dry`. Le détail des exclusions et du score de chaque vélo s'affiche.

Autres réglages de `config/bikestocks.json` :

- `categories` : URL des listes et type (`route` / `gravel` / `vtt`) ;
- `categories_exclues` : identifiants de catégories interdites (électriques…), comparés au fil d'Ariane de chaque fiche ;
- `mots_electriques`, `regex_electriques`, `specs_electriques` : détection des vélos électriques ;
- `marques` : reconnaissance de la marque dans le nom ;
- `materiaux` : libellé du cadre ;
- `selecteurs` : sélecteurs CSS ;
- `flux` : plan A.

Lien de suivi : `data/site.json > velos.utm` (par défaut `utm_source=brignaiscycle&utm_medium=referral`) est ajouté à chaque lien « Voir sur BikeStocks ».

### Plan A : un flux fourni par BikeStocks (préférable au scraping)

BikeStocks tourne sous PrestaShop. Le plus simple et le plus fiable est de lui demander l'URL de son **flux Google Shopping / Merchant** (XML). Les modules PrestaShop de flux le génèrent : c'est 1 requête par jour au lieu de 70, sans dépendre de la mise en page. Ensuite :

```json
"source": "flux",
"flux": { "url": "https://www.bikestocks.es/…/flux.xml", "types": [ … ] }
```

`flux.types` associe le rayon (`g:product_type`) à route / gravel / vtt. Les variantes sont regroupées par `g:item_group_id`, les tailles viennent de `g:size` en `in_stock`. Le filtre électrique s'applique au titre, au rayon et à la description. Testé avec `tests/fixtures/flux-google.xml` (fichier synthétique : à remplacer par un extrait du vrai flux dès qu'il existe).

**API Webservice PrestaShop** (clé en lecture seule) : non implémentée. Elle demande de croiser 3 ressources (`products` en prix HT, `specific_prices` pour les promos, `stock_availables`). Pour l'ajouter : un fichier `scripts/lib/source-webservice.mjs` qui exporte `{ lister(cfg, http, log) }` et renvoie le même format d'objets que `lireFluxGoogle`, à déclarer dans `SOURCES` de `scripts/collect.mjs`. Le `robots.txt` de BikeStocks interdit `/webservice/` aux robots : à n'utiliser qu'avec leur clé et leur accord, via `http.texte(url, { robots: false })`.

## Que faire si la collecte casse

**Ce qui se passe automatiquement** : si la collecte échoue (site en panne, structure HTML changée, 0 vélo, JSON invalide), `data/bikes.json` n'est **pas** modifié. Le job s'arrête en rouge **avant** le déploiement : le site garde la dernière sélection valide, avec sa date. GitHub t'envoie un e-mail d'échec.

1. **Lire l'erreur** : onglet Actions > dernier run « Site » > étape « Collecte BikeStocks ».
2. Selon le message :
   - `HTTP 5xx`, `timeout`, `robots.txt inaccessible` : panne passagère chez BikeStocks. Rien à faire, ça repassera la nuit suivante (ou Run workflow plus tard).
   - `interdit par robots.txt` : BikeStocks a changé son `robots.txt`. Ne pas contourner : leur demander le flux (plan A).
   - `ErreurStructure … sélecteurs « liste » à revoir` ou `pas de JSON-LD` : la mise en page a changé. Voir l'étape 3.
   - `plafond de 150 requêtes atteint` : le catalogue a grossi. Augmenter `max_requetes` (ou baisser `max_pages_par_categorie`).
   - `JSON invalide : … vélo électrique` : un électrique a passé les filtres de la liste mais a été bloqué par la validation finale. Ajouter le mot ou le motif fautif dans `mots_electriques` / `regex_electriques`.
3. **Réparer les sélecteurs** :
   1. Enregistrer une page catégorie et une fiche actuelles dans `tests/fixtures/` (voir l'en-tête des fixtures existantes).
   2. Lancer `npm test` : les tests « Parsing des pages BikeStocks enregistrées » disent ce qui ne colle plus.
   3. Corriger `config/bikestocks.json > selecteurs` (inspecteur du navigateur), relancer `npm test`, puis `npm run collect:dry`.
4. **En urgence**, pour masquer le module le temps de réparer : `"SHOW_BIKES": false`, commit, push.

## Design

**Piste 1 « Atelier » (implémentée)** : vert sapin `#1d4a3a`, fond crème `#fbfaf6`, appels à l'action orange brûlé `#b93d0b` (contraste 5,6:1 sur blanc). Polices système, donc aucun appel à Google Fonts et un affichage instantané. Cartes arrondies, barre « Appeler / SMS » fixe en bas d'écran sur mobile.

**Piste 2 « Maillot » (non implémentée)** : anthracite `#1f1f1f` et blanc, accent jaune maillot `#ffd23f` réservé aux boutons (texte noir dessus), titres en capitales serrées, photos d'atelier en noir et blanc. Plus « sport », moins chaleureux. Pour la tester, changer les variables `--vert`, `--orange`… en tête de `src/assets/style.css`.

Logo : pour l'instant un pictogramme de roue + le nom en texte (`src/_includes/base.njk`, `src/assets/favicon.svg`). Image de partage Facebook : `src/assets/og.png` (1200×630), à remplacer par une vraie photo de l'atelier si possible.

## À compléter avant la mise en ligne

`npm run build && npm run check` liste ceux qui restent dans les pages publiées. Liste complète, regroupée par page :

| Page / fichier | À compléter |
|---|---|
| **Toutes les pages** (en-tête, pied, barre d'appel) — `data/site.json` | `telephone`, `email`, `url` (nom de domaine), note des soirs « une semaine sur deux » (semaines paires/impaires ou calendrier) |
| **Accueil** | idem (téléphone, e-mail, créneaux) |
| **Prestations & tarifs** — `data/tarifs.json` | reste de la grille : changement de pneu, réglage des freins, réglage du dérailleur, changement de chaîne, câbles et gaines ; `velos.prix_montage` (montage BikeStocks) |
| **Vélos à vendre** — `data/site.json` | `velos.prix_montage` |
| **Comment ça marche** | note des créneaux de semaine |
| **À propos** — `data/site.json` | `a_propos` (3-5 lignes), `a_propos_pourquoi`, `assureur`, photo (`src/a-propos.njk`) |
| **Contact** | téléphone, e-mail, créneaux |
| **FAQ** — `data/site.json` | `pieces_client` (pièces du client acceptées ou non), `garantie_reparations`, `assureur`, `velos.prix_montage` |
| **Mentions légales** — `data/site.json` | `adresse_legale` (ou domiciliation), `siren`, `assureur`, `mediateur` (nom, adresse, site), `hebergeur.telephone` |
| **CGV atelier** | `pieces_client`, `velo_non_recupere` (politique ; cf. loi du 31 décembre 1903 sur les objets abandonnés chez les artisans), encadré officiel de garantie légale de conformité (décret n° 2022-946), `garantie_reparations`, `assureur`, médiateur |
| **Confidentialité** — `src/confidentialite.md` | durée de conservation des échanges, fournisseur de messagerie |
| **Collecte** — `config/bikestocks.json` | `user_agent` (e-mail de contact) ; à confirmer : `prix_min`/`prix_max` (600–3 500 € de l'exemple), `marques_bonus` (BH, Orbea, Scott, Cannondale de l'exemple), catégories exclues en plus des électriques (enfants, urbains, pliants de l'exemple) |
| **Ton du site** | **tutoiement** retenu partout (c'était `[À COMPLÉTER : choix]`), cohérent avec le « tu déposes, je répare » de la consigne. Les pages juridiques restent à la 3ᵉ personne (« le client »). Passer au vouvoiement = reprendre les textes des `src/*.njk` et de `data/faq.json`. |

Les trois pages juridiques **doivent être relues par l'exploitant** (idéalement par un juriste ou la CMA) avant la mise en ligne. Un commentaire le rappelle en tête de chaque fichier.
