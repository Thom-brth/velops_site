// Collecte des vélos BikeStocks -> data/bikes.json
//   npm run collect          collecte et écrit data/bikes.json
//   npm run collect:dry      collecte et affiche, sans rien écrire
// Lancé chaque nuit par .github/workflows/site.yml. En cas d'échec (réseau, structure du site changée,
// 0 vélo, JSON invalide), data/bikes.json n'est PAS modifié et le script sort en code 1 (job rouge dans Actions).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { creerClient } from "./lib/http.mjs";
import { sourceHtml } from "./lib/source-html.mjs";
import { sourceFlux } from "./lib/source-flux.mjs";
import { nettoyer, noter, raisonRejet, selectionner, valider } from "./lib/selection.mjs";

const SOURCES = { html: sourceHtml, flux: sourceFlux };

export async function collecter({ cfg, http, maintenant = new Date(), log = console.log, sources = SOURCES }) {
  const source = sources[cfg.source];
  if (!source) throw new Error(`source « ${cfg.source} » inconnue (attendu : ${Object.keys(sources).join(" ou ")})`);
  const date = maintenant.toISOString();

  log(`Source « ${cfg.source} »`);
  const bruts = await source.lister(cfg, http, log);
  if (!bruts.length) throw new Error("0 produit collecté");

  const rejets = {};
  const garder = (v) => {
    const r = raisonRejet(v, cfg);
    const k = r?.split(" (")[0];
    if (k) rejets[k] = (rejets[k] ?? 0) + 1;
    return !r;
  };
  let candidats = bruts.map((v) => noter(v, cfg.selection)).filter(garder);
  log(`${bruts.length} produits lus, ${candidats.length} candidats. Écartés : ${JSON.stringify(rejets)}`);

  if (source.verifier) {
    const aVerifier = selectionner(candidats, cfg, cfg.max_fiches);
    log(`Contrôle de ${aVerifier.length} fiches produits…`);
    const verifies = [];
    const erreurs = [];
    for (const v of aVerifier) {
      try {
        const f = noter(await source.verifier(v, cfg, http), cfg.selection);
        const r = raisonRejet(f, cfg);
        if (r) log(`  écarté après fiche : ${v.id} ${v.marque ?? ""} ${v.nom} -> ${r}`);
        else verifies.push(f);
      } catch (e) {
        erreurs.push(e.message);
        log(`  fiche ignorée : ${e.message}`);
      }
    }
    if (!verifies.length && erreurs.length) throw new Error(`aucune fiche lisible (${erreurs.length} erreurs, ex. ${erreurs[0]})`);
    candidats = verifies;
  }

  const velos = selectionner(candidats, cfg).map((v) => nettoyer({ ...v, date_collecte: date }));
  return { date_maj: date, source: cfg.source, velos };
}

/** Collecte + validation + écriture atomique. Ne touche jamais au fichier existant en cas de problème. */
export async function executer({ cfg, fichier, http, maintenant, ecrire = true, log = console.log, erreur = console.error, sources }) {
  try {
    const data = await collecter({ cfg, http, maintenant, log, sources });
    const erreurs = valider(data, cfg);
    if (erreurs.length) throw new Error(`JSON invalide :\n  - ${erreurs.join("\n  - ")}`);
    if (ecrire) {
      fs.writeFileSync(fichier + ".tmp", JSON.stringify(data, null, 2) + "\n");
      fs.renameSync(fichier + ".tmp", fichier); // remplacement atomique : jamais de fichier à moitié écrit
    }
    for (const v of data.velos) log(`  ${String(v.score).padStart(3)} pts  ${v.categorie.padEnd(6)} ${v.prix} €  ${v.marque ?? ""} ${v.nom}`);
    log(`OK : ${data.velos.length} vélos${ecrire ? ` écrits dans ${fichier}` : " (--dry-run : rien d'écrit)"}`);
    return { ok: true, data };
  } catch (e) {
    erreur(`ÉCHEC de la collecte : ${e.message}\n${fichier} n'est pas modifié : la dernière sélection valide reste en ligne.`);
    return { ok: false, erreur: e };
  }
}

// Exécution en ligne de commande
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const racine = new URL("../", import.meta.url);
  const cfg = JSON.parse(fs.readFileSync(new URL("config/bikestocks.json", racine), "utf8"));
  if (/COMPL|[^\x20-\x7e]/.test(cfg.user_agent)) {
    console.error("config/bikestocks.json > user_agent : renseigner l'e-mail de contact (caractères ASCII uniquement) avant de lancer la collecte.");
    process.exit(1);
  }
  const { ok } = await executer({
    cfg,
    fichier: fileURLToPath(new URL("data/bikes.json", racine)),
    http: creerClient(cfg),
    ecrire: !process.argv.includes("--dry-run"),
  });
  process.exit(ok ? 0 : 1);
}
