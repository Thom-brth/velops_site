// Contrôles du site généré (npm run build && npm run check), repris des critères de validation :
// adresse exacte absente des pages publiques, aucun cookie/traceur/ressource tierce chargée d'office,
// module vélos conforme (max_velos de config/bikestocks.json au plus, liens BikeStocks en nouvel onglet, mentions, date) ou totalement absent.
// Affiche aussi la liste des [À COMPLÉTER] restants, page par page. Sort en code 1 si un contrôle échoue.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = fileURLToPath(new URL("../", import.meta.url));
const json = (f) => JSON.parse(fs.readFileSync(path.join(racine, f), "utf8"));
const site = json("data/site.json");
const bikes = json("data/bikes.json");
const maxVelos = json("config/bikestocks.json").selection.max_velos;
const sortie = path.join(racine, "_site");
if (!fs.existsSync(sortie)) throw new Error("Lancer d'abord npm run build");

const fichiers = fs.readdirSync(sortie, { recursive: true }).map(String).filter((f) => /\.(html|xml|txt|js|css)$/.test(f));
// Annule la typographie française du build (espaces fines, apostrophes) pour comparer avec les textes de data/*.json.
const brut = (s) => s.replaceAll(" ", " ").replaceAll("’", "'");
const lire = (f) => brut(fs.readFileSync(path.join(sortie, f), "utf8"));
const erreurs = [];
const todos = {};
const externe = (u) => /^(https?:)?\/\//.test(u);

for (const f of fichiers) {
  const contenu = lire(f);
  const nom = f.replaceAll("\\", "/");
  if (site.adresse_legale && !nom.startsWith("mentions-legales/") && contenu.includes(site.adresse_legale)) erreurs.push(`${nom} : l'adresse exacte apparaît (réservée aux mentions légales)`);
  if (/document\.cookie|localStorage|sessionStorage|indexedDB/.test(contenu)) erreurs.push(`${nom} : stockage dans le navigateur`);
  if (!site.SHOW_BIKES && /velos-a-vendre|class="velo"/.test(contenu)) erreurs.push(`${nom} : trace du module vélos alors que SHOW_BIKES=false`);
  if (/@import|url\(["']?(https?:)?\/\//.test(nom.endsWith(".css") ? contenu : "")) erreurs.push(`${nom} : ressource CSS tierce`);
  if (!nom.endsWith(".html")) continue;
  for (const [, src] of contenu.matchAll(/<script[^>]*\ssrc="([^"]+)"/g))
    if (externe(src) && !(site.goatcounter && src.startsWith("https://gc.zgo.at/"))) erreurs.push(`${nom} : script tiers ${src}`);
  // Seules les photos BikeStocks de la page vélos sont chargées depuis un autre site (annoncé dans la politique de confidentialité).
  for (const [, src] of contenu.matchAll(/<img[^>]*\ssrc="([^"]+)"/g))
    if (externe(src) && !(nom.startsWith("velos-a-vendre/") && src.startsWith("https://www.bikestocks.es/"))) erreurs.push(`${nom} : image tierce ${src}`);
  for (const [, href] of contenu.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) if (externe(href)) erreurs.push(`${nom} : feuille de style tierce ${href}`);
  if (/<iframe/i.test(contenu)) erreurs.push(`${nom} : iframe chargée sans action du visiteur`);
  const t = new Set(contenu.replace(/<script[\s\S]*?<\/script>/g, "").match(/\[À COMPLÉTER[^\]]*\]/g));
  if (t.size) todos["/" + nom.replace(/index\.html$/, "")] = [...t];
}

const pageVelos = path.join(sortie, "velos-a-vendre", "index.html");
if (site.SHOW_BIKES) {
  if (!fs.existsSync(pageVelos)) erreurs.push("SHOW_BIKES=true mais la page vélos n'est pas générée");
  else {
    const html = brut(fs.readFileSync(pageVelos, "utf8"));
    const cartes = html.split(/<article class="velo[ "]/).slice(1);
    if (cartes.length > maxVelos) erreurs.push(`page vélos : ${cartes.length} cartes (> ${maxVelos})`);
    if (cartes.length !== bikes.velos.length) erreurs.push(`page vélos : ${cartes.length} cartes pour ${bikes.velos.length} vélos dans bikes.json`);
    cartes.forEach((c, i) => {
      const lien = c.match(/<a [^>]*href="([^"]+)"[^>]*>Voir sur BikeStocks/);
      const attendu = bikes.velos[i]?.url_fiche;
      if (!lien || !lien[0].includes('target="_blank"') || !/rel="[^"]*noopener/.test(lien[0])) erreurs.push(`carte ${i + 1} : lien sans target=_blank rel=noopener`);
      else if (![attendu, attendu + "?"].some((a) => lien[1].replaceAll("&amp;", "&").startsWith(a))) erreurs.push(`carte ${i + 1} : lien ${lien[1]} ≠ fiche ${attendu}`);
      if (!c.includes(site.velos.mention_vendeur)) erreurs.push(`carte ${i + 1} : mention « Vendu et expédié par BikeStocks » absente`);
    });
    if (!html.includes("Sélection mise à jour le")) erreurs.push("page vélos : date de mise à jour absente");
    if (!html.includes('class="mention-vendeur"')) erreurs.push("page vélos : mention vendeur absente en haut de page");
  }
} else if (fs.existsSync(pageVelos)) erreurs.push("SHOW_BIKES=false mais la page vélos existe (supprimer _site et relancer le build)");

console.log("[À COMPLÉTER] restants, par page :");
for (const [p, liste] of Object.entries(todos)) console.log(`  ${p}\n${liste.map((t) => `    - ${t}`).join("\n")}`);
if (erreurs.length) {
  console.error(`\n${erreurs.length} contrôle(s) en échec :\n${erreurs.map((e) => `  ✖ ${e}`).join("\n")}`);
  process.exit(1);
}
console.log(`\n✔ ${fichiers.length} fichiers contrôlés, module vélos ${site.SHOW_BIKES ? "activé et conforme" : "désactivé et absent"}.`);
