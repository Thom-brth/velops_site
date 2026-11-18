// Tests du collecteur BikeStocks : npm test
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lireFiche, lirePageListe, resumeSpec, ErreurStructure } from "../scripts/lib/source-html.mjs";
import { lireFluxGoogle } from "../scripts/lib/source-flux.mjs";
import { autorise, creerClient, lireRobots } from "../scripts/lib/http.mjs";
import { categorieExclue, cleModele, estElectrique, noter, prixDepuisTexte, raisonRejet, reconnaitreMarque, selectionner, valider } from "../scripts/lib/selection.mjs";
import { executer } from "../scripts/collect.mjs";

const cfg = JSON.parse(fs.readFileSync(new URL("../config/bikestocks.json", import.meta.url), "utf8"));
const fixture = (f) => fs.readFileSync(new URL(`fixtures/${f}`, import.meta.url), "utf8");
const BASE = cfg.base_url;
const silence = () => {};

// Vélo de test minimal et valide ; chaque test surcharge ce qui l'intéresse.
let n = 0;
const velo = (o = {}) => {
  n++;
  return {
    id: String(n), nom_source: `Vélo Modèle${n}`, marque: "Merida", nom: `Modèle${n} 2026`, categorie: "route",
    prix: 1500, prix_barre: 2000, tailles_disponibles: ["M"], en_stock: true,
    url_fiche: `${BASE}/fr/velo-${n}.html`, url_image: `${BASE}/${n}.jpg`, fil_ariane: [], specs: {}, ...o,
  };
};

describe("Parsing des pages BikeStocks enregistrées (si ces tests cassent, le site a changé : voir README)", () => {
  test("page liste : 20 produits complets, tailles en stock, page suivante", () => {
    const { velos, suivante } = lirePageListe(fixture("liste-gravel-p1.html"), `${BASE}/fr/gravier-2016`, cfg);
    assert.equal(velos.length, 20, "nombre de produits sur la page");
    assert.equal(suivante, `${BASE}/fr/gravier-2016?page=2`);
    for (const v of velos) assert.ok(v.id && v.url_fiche.startsWith(BASE + "/") && v.prix > 0 && v.url_image, `produit incomplet : ${JSON.stringify(v)}`);
    const m = velos.find((v) => v.id === "50538");
    assert.deepEqual(
      { marque: m.marque, nom: m.nom, prix: m.prix, prix_barre: m.prix_barre, tailles: m.tailles_disponibles, en_stock: m.en_stock, url: m.url_fiche },
      { marque: "Merida", nom: "Endurance Sculpture GR 200 2026", prix: 1104.15, prix_barre: 1299, tailles: ["M"], en_stock: true, url: `${BASE}/fr/velo-merida-endurance-sculpture-gr-200-2026-50538.html` }
    );
    assert.equal(velos.find((v) => v.id === "50663").en_stock, false, "Giant Revolt 2 : aucune taille en stock");
    assert.deepEqual(velos.find((v) => v.id === "50995").tailles_disponibles, ["M", "L"]);
  });

  test("dernière page : pas de page suivante", () => {
    const { velos, suivante } = lirePageListe(fixture("liste-gravel-p7.html"), `${BASE}/fr/gravier-2016?page=7`, cfg);
    assert.ok(velos.length > 0);
    assert.equal(suivante, null);
  });

  test("fiche : JSON-LD, prix barré, matériau, transmission, fil d'Ariane", () => {
    const f = lireFiche(fixture("fiche-merida.html"), "x", cfg);
    assert.equal(f.prix, 1104.15);
    assert.equal(f.prix_barre, 1299);
    assert.equal(f.en_stock, true);
    assert.equal(f.materiau_cadre, "Aluminium");
    assert.equal(f.groupe_transmission, "SHIMANO Grx820");
    assert.ok(f.fil_ariane.some((a) => a.url.endsWith("gravier-2016")));
  });

  test("fiche hors stock (JSON-LD OutOfStock)", () => {
    assert.equal(lireFiche(fixture("fiche-hors-stock.html"), "x", cfg).en_stock, false);
  });

  test("structure changée : erreur explicite au lieu de données fausses", () => {
    const html = fixture("liste-gravel-p1.html").replaceAll("product-price-and-shipping", "autre-classe");
    assert.throws(() => lirePageListe(html, `${BASE}/fr/x`, cfg), ErreurStructure);
    assert.throws(() => lireFiche("<html><body>rien</body></html>", "x", cfg), ErreurStructure);
  });
});

describe("Filtre vélos électriques", () => {
  test("la vraie fiche électrique est détectée (nom, catégorie et specs)", () => {
    const f = lireFiche(fixture("fiche-electrique.html"), "x", cfg);
    assert.ok(estElectrique({ nom_source: f.nom_fiche, ...f }, cfg));
    assert.ok(categorieExclue(f, cfg), "fil d'Ariane Et-vélos (1655)");
    assert.ok(raisonRejet(noter({ ...velo(), ...f }, cfg.selection), cfg).startsWith("électrique"));
  });

  test("électrique mal rangé (ni le mot, ni la catégorie) : repéré par les lignes moteur/batterie de la fiche", () => {
    const html = fixture("fiche-electrique.html")
      .replace(/[ée]lectrique/gi, "")
      .replace(/Et-vélos/g, "Gravier")
      .replace(/et-velos-1655|route-1657/g, "gravier-2016");
    const f = lireFiche(html, "x", cfg);
    assert.equal(categorieExclue(f, cfg), null);
    assert.ok(estElectrique({ nom_source: "Vélo ORBEA Gain D30 2024", ...f }, cfg));
  });

  for (const [cas, o] of [
    ["mot dans le nom", { nom_source: "BICICLETA ELECTRICA MERIDA ESCULTURA 400" }],
    ["e-bike", { nom_source: "Vélo Cube Reaction Hybrid E-Bike" }],
    ["EMTB", { nom_source: "Vélo Mondraker Crafty EMTB" }],
    ["VAE", { description: "Un VAE polyvalent" }],
    ["moteur Bosch", { description: "Moteur Bosch Performance CX" }],
    ["Shimano EP801", { description: "Shimano EP801, 85 Nm" }],
    ["Shimano Steps E8000", { description: "Shimano Steps E8000" }],
    ["Fazua", { description: "Système Fazua Ride 60" }],
    ["TQ HPR50", { description: "Système TQ-HPR50 discret" }],
    ["batterie en Wh", { nom_source: "Vélo Orbea Wild M10 625Wh" }],
    ["batterie en Wh avec espace", { description: "Batterie intégrée 750 Wh" }],
    ["catégorie exclue", { fil_ariane: [{ nom: "Bicicletas", url: `${BASE}/es/bicicletas-electricas-1655` }] }],
  ]) {
    test(`exclu : ${cas}`, () => assert.match(raisonRejet(velo(o), cfg), /^(électrique|exclu)/));
  }

  for (const nom of ["Vélo ORBEA Terra Race M11e LTD 1x 2026", "Vélo SCOTT Scale 970 2026", "Vélo GIANT Révolt 2", "Vélo Trek Madone SL 7 Di2 Ultegra"]) {
    test(`pas un faux positif : ${nom}`, () => assert.equal(estElectrique(velo({ nom_source: nom }), cfg), null));
  }
  test("pas un faux positif : groupe électronique Di2 avec batterie", () =>
    assert.equal(estElectrique(velo({ description: "Shimano 105 Di2 R7170, batterie interne BT-DN300" }), cfg), null));
  test("la vraie fiche Merida (menu du site plein de « Bosch », « Et-vélos ») n'est pas un faux positif", () => {
    const f = lireFiche(fixture("fiche-merida.html"), "x", cfg);
    assert.equal(estElectrique({ nom_source: f.nom_fiche, ...f }, cfg), null);
    assert.equal(categorieExclue(f, cfg), null);
  });
});

describe("Score et sélection", () => {
  test("score = remise × 2 + tailles (max 4) × 5 + bonus marque 10", () => {
    const a = noter(velo({ prix: 850, prix_barre: 1000, tailles_disponibles: ["M"], marque: "Merida" }), cfg.selection);
    assert.equal(a.remise_pct, 15);
    assert.deepEqual(a.score_detail, { remise: 30, tailles: 5, marque: 0 });
    assert.equal(a.score, 35);
    const b = noter(velo({ prix: 1000, prix_barre: null, tailles_disponibles: ["XS", "S", "M", "L", "XL"], marque: "BH" }), cfg.selection);
    assert.deepEqual(b.score_detail, { remise: 0, tailles: 20, marque: 10 });
    assert.equal(b.prix_barre, null);
  });

  test("rejets : sans prix, hors stock, hors gamme, banni ; un épinglé ignore la gamme", () => {
    assert.equal(raisonRejet(velo({ prix: null }), cfg), "sans prix");
    assert.equal(raisonRejet(velo({ en_stock: false }), cfg), "hors stock");
    assert.equal(raisonRejet(velo({ prix: cfg.selection.prix_max + 1 }), cfg), "hors gamme de prix");
    const c = { ...cfg, selection: { ...cfg.selection, epingles: ["777"], bannis: ["666"] } };
    assert.equal(raisonRejet(velo({ id: "777", prix: 9999 }), c), null);
    assert.equal(raisonRejet(velo({ id: "666" }), c), "banni");
  });

  test("12 max, quotas route/gravel et VTT, un seul exemplaire par modèle, épinglé en tête", () => {
    const route = Array.from({ length: 20 }, (_, i) => noter(velo({ prix: 1000, prix_barre: 2000 - i * 10 }), cfg.selection));
    const vtt = Array.from({ length: 5 }, () => noter(velo({ categorie: "vtt", prix: 1000, prix_barre: 1050 }), cfg.selection));
    const doublon = noter(velo({ nom: `${route[0].nom.replace(" 2026", "")} 2027 Taille XL` }), cfg.selection);
    const epingle = noter(velo({ categorie: "gravel", prix: 1000, prix_barre: null }), cfg.selection);
    const c = { ...cfg, selection: { ...cfg.selection, epingles: [epingle.id] } };
    const choix = selectionner([...route, ...vtt, doublon, epingle], c);
    assert.equal(choix.length, 12);
    assert.equal(choix[0].id, epingle.id);
    assert.equal(choix.filter((v) => v.categorie === "vtt").length, 3);
    assert.equal(new Set(choix.map((v) => cleModele(v, c))).size, choix.length);
    assert.ok(!choix.includes(doublon) || !choix.includes(route[0]));
  });

  test("validation du schéma : refuse un électrique, un doublon, une URL étrangère", () => {
    const ok = { date_maj: new Date().toISOString(), velos: [noter(velo({ date_collecte: new Date().toISOString() }), cfg.selection)] };
    assert.deepEqual(valider(ok, cfg), []);
    const mauvais = structuredClone(ok);
    mauvais.velos.push({ ...ok.velos[0] }, { ...ok.velos[0], id: "x", nom: "Gain 625Wh", url_fiche: "https://ailleurs.example/x" });
    const erreurs = valider(mauvais, cfg).join("\n");
    assert.match(erreurs, /id en double/);
    assert.match(erreurs, /électrique/);
    assert.match(erreurs, /hors BikeStocks/);
    assert.deepEqual(valider({ date_maj: "x", velos: [] }, cfg), ["date_maj invalide", "aucun vélo"]);
  });

  test("outils : prix et marque", () => {
    assert.equal(prixDepuisTexte("1 104,15 €"), 1104.15);
    assert.equal(prixDepuisTexte("1.299,00 €"), 1299);
    assert.equal(prixDepuisTexte("1299.00 EUR"), 1299);
    assert.equal(prixDepuisTexte(""), null);
    assert.deepEqual(reconnaitreMarque("Bichen Bianchi Impulse GRX 600", cfg.marques), { marque: "Bianchi", nom: "Impulse GRX 600" });
    assert.deepEqual(reconnaitreMarque("Vélo Inconnu X", cfg.marques), { marque: null, nom: "Vélo Inconnu X" });
    assert.deepEqual(reconnaitreMarque("Vélo SCOTT Scott Bicycle Scott 2025", cfg.marques), { marque: "Scott", nom: "Bicycle Scott 2025" });
    assert.equal(resumeSpec("SRAM S1000 Eagle Axes TRANSMISSION 12 VITESSE. Système de décalage"), "SRAM S1000 Eagle Axes TRANSMISSION 12 VITESSE");
    assert.equal(resumeSpec("x".repeat(30) + " " + "y".repeat(30)), "x".repeat(30) + "…");
  });
});

describe("Robustesse : la dernière sélection valide est conservée", () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "brignais-"));
  const fichier = path.join(dossier, "bikes.json");
  const ancien = '{"ancien": true}\n';
  const lancer = (lister) => {
    fs.writeFileSync(fichier, ancien);
    return executer({ cfg, fichier, http: {}, log: silence, erreur: silence, sources: { [cfg.source]: { lister } } });
  };

  test("erreur réseau / structure : fichier inchangé, échec signalé", async () => {
    const r = await lancer(async () => { throw new Error("HTTP 503"); });
    assert.equal(r.ok, false);
    assert.equal(fs.readFileSync(fichier, "utf8"), ancien);
  });

  test("0 vélo collecté : fichier inchangé", async () => {
    assert.equal((await lancer(async () => [])).ok, false);
    assert.equal(fs.readFileSync(fichier, "utf8"), ancien);
  });

  test("que des électriques : 0 retenu, fichier inchangé", async () => {
    assert.equal((await lancer(async () => [velo({ nom_source: "Vélo électrique X" })])).ok, false);
    assert.equal(fs.readFileSync(fichier, "utf8"), ancien);
  });

  test("collecte valide : fichier remplacé, sans fichier temporaire", async () => {
    const r = await lancer(async () => [velo(), velo({ categorie: "vtt" })]);
    assert.equal(r.ok, true);
    const data = JSON.parse(fs.readFileSync(fichier, "utf8"));
    assert.equal(data.velos.length, 2);
    assert.deepEqual(valider(data, cfg), []);
    assert.ok(!fs.existsSync(fichier + ".tmp"));
  });
});

describe("Politesse HTTP", () => {
  const robots = "User-agent: *\nDisallow: /*?order=\nDisallow: /modules/\nAllow: */modules/*.css\n\nUser-agent: MechantBot\nDisallow: /\n";

  test("robots.txt : règles BikeStocks respectées", () => {
    const r = lireRobots(robots, "BrignaisCycleBot");
    const ok = (p) => autorise(r, new URL(p, BASE));
    assert.equal(ok("/fr/gravier-2016?page=2"), true);
    assert.equal(ok("/fr/gravier-2016?order=product.price.asc"), false);
    assert.equal(ok("/modules/x/flux.xml"), false);
    assert.equal(ok("/modules/x/style.css"), true);
    assert.equal(autorise(lireRobots(robots, "MechantBot"), new URL("/fr/", BASE)), false);
  });

  test("une requête à la fois, espacées, robots.txt lu d'abord, plafond respecté", async () => {
    const appels = [];
    let enCours = 0;
    let maxEnCours = 0;
    const fetchImpl = async (url) => {
      maxEnCours = Math.max(maxEnCours, ++enCours);
      appels.push({ url, t: Date.now() });
      await new Promise((r) => setTimeout(r, 5));
      enCours--;
      return new Response(url.endsWith("robots.txt") ? robots : "<html></html>");
    };
    const http = creerClient({ ...cfg, delai_ms: 40, max_requetes: 4 }, { fetchImpl });
    await Promise.all([1, 2, 3].map((i) => http.texte(`${BASE}/fr/p${i}`)));
    assert.equal(maxEnCours, 1);
    assert.ok(appels[0].url.endsWith("/robots.txt"));
    for (let i = 1; i < appels.length; i++) assert.ok(appels[i].t - appels[i - 1].t >= 39, "délai entre deux requêtes");
    await assert.rejects(http.texte(`${BASE}/fr/p4`), /plafond/);
    await assert.rejects(http.texte(`${BASE}/fr/x?order=1`), /robots/);
    await assert.rejects(http.texte("https://autre.example/"), /hors du site/);
  });
});

describe("Source « flux » (plan A, Google Merchant)", () => {
  test("variantes regroupées, tailles en stock, promo, électrique écarté, hors rayon ignoré", () => {
    const velos = lireFluxGoogle(fixture("flux-google.xml"), cfg);
    assert.deepEqual(velos.map((v) => v.id), ["900", "901", "902"]);
    const terra = velos[0];
    assert.deepEqual(
      { marque: terra.marque, nom: terra.nom, cat: terra.categorie, prix: terra.prix, barre: terra.prix_barre, tailles: terra.tailles_disponibles, url: terra.url_fiche },
      { marque: "Orbea", nom: "Terra H40 2026", cat: "gravel", prix: 1699, barre: 1999, tailles: ["M"], url: `${BASE}/fr/velo-orbea-terra-h40-2026-900.html` }
    );
    assert.equal(velos[1].categorie, "vtt");
    assert.match(raisonRejet(noter(velos[2], cfg.selection), cfg), /^électrique/);
  });
});
