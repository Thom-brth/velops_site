// Règles de sélection des vélos : fonctions pures (aucun accès réseau), testées dans tests/collecte.test.mjs.
// Toutes les valeurs (mots-clés, poids, quotas, gamme de prix…) viennent de config/bikestocks.json.

const sansAccents = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
export const normaliser = (s) => sansAccents(s).toLowerCase().replace(/\s+/g, " ").trim();
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Mot ou expression entière (« vae » ne doit pas matcher « vaeX »), sur texte normalisé.
const motEntier = (mot) => new RegExp(`(^|[^a-z0-9])${echapper(normaliser(mot))}(?=$|[^a-z0-9])`);

/** « 1 104,15 € » -> 1104.15 ; « 1104.15 » -> 1104.15 ; « 1299.00 EUR » -> 1299 ; vide -> null */
export function prixDepuisTexte(t) {
  const s = String(t ?? "").replace(/[^\d,.]/g, "");
  if (!s) return null;
  const n = s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/** Corrige les traductions automatiques du site (« Bichi Olter » -> « Bianchi Oltre ») : config > corrections_noms. */
export const corrigerNom = (nom, cfg) =>
  (cfg.corrections_noms ?? []).reduce((s, [motif, remplacement]) => s.replace(new RegExp(motif, "gi"), remplacement), String(nom ?? "")).replace(/\s+/g, " ").trim();

/** « Vélo MERIDA Silex 400 2026 » -> { marque: "Merida", nom: "Silex 400 2026" } (marque = graphie de la config). */
export function reconnaitreMarque(nomSource, marques) {
  const original = String(nomSource ?? "").normalize("NFC").trim();
  const n = sansAccents(original).toLowerCase(); // même longueur que l'original : les index restent valables
  let trouve = null;
  for (const m of marques) {
    const r = motEntier(m).exec(n);
    if (r && (!trouve || r.index < trouve.debut)) trouve = { marque: m, debut: r.index + r[1].length, fin: r.index + r[0].length };
  }
  if (!trouve) return { marque: null, nom: original };
  // « Vélo SCOTT Scott Bicycle… » : la marque répétée en tête du modèle est retirée.
  const reste = original.slice(trouve.fin).trim().replace(new RegExp(`^${echapper(trouve.marque)}\\s+`, "i"), "");
  return { marque: trouve.marque, nom: reste || original };
}

/** Raison pour laquelle le vélo est jugé électrique, ou null. Examine nom, fil d'Ariane, description et specs. */
export function estElectrique(velo, cfg) {
  const texte = normaliser(
    [velo.nom_source, velo.marque, velo.nom, velo.description, ...(velo.fil_ariane ?? []).map((f) => f.nom), ...Object.values(velo.specs ?? {})].join(" ")
  );
  const mot = cfg.mots_electriques.find((m) => motEntier(m).test(texte));
  if (mot) return `mot « ${mot} »`;
  const motif = cfg.regex_electriques.find((re) => new RegExp(re, "i").test(texte));
  if (motif) return `motif ${motif}`;
  const spec = cfg.specs_electriques.find((icone) => velo.specs && icone in velo.specs);
  if (spec) return `ligne de spec « ${spec} »`;
  return null;
}

// « …/fr/et-velos-1655 » et « bicicletas-electricas-1655 » -> « 1655 ». Une fiche « …-50538.html » ne matche pas.
const idCategorie = (s) => (String(s ?? "").match(/-(\d+)(?=[/?#]|$)/) || [])[1];

/** Fil d'Ariane de la fiche passant par une catégorie exclue -> raison, sinon null. */
export function categorieExclue(velo, cfg) {
  const exclues = new Set(cfg.categories_exclues.map(idCategorie));
  const hit = (velo.fil_ariane ?? []).find((f) => exclues.has(idCategorie(f.url)));
  return hit ? `catégorie « ${hit.nom} »` : null;
}

/** Clé « même modèle » : marque + nom sans année, taille ni couleur. */
export function cleModele(velo, cfg) {
  let s = normaliser(`${velo.marque ?? ""} ${velo.nom}`);
  for (const re of cfg.variantes_regex) s = s.replace(new RegExp(re, "g"), " ");
  return s.replace(/[^a-z0-9]+/g, " ").trim();
}

/** Ajoute remise_pct, score et score_detail (transparent : chaque point est expliqué). */
export function noter(velo, sel) {
  const p = sel.poids;
  const remise = velo.prix_barre > velo.prix ? Math.round((1 - velo.prix / velo.prix_barre) * 100) : 0;
  const bonus = sel.marques_bonus.some((m) => normaliser(m) === normaliser(velo.marque));
  const detail = {
    remise: remise * p.remise_par_point,
    tailles: Math.min(velo.tailles_disponibles?.length ?? 0, p.max_tailles_comptees) * p.par_taille_dispo,
    marque: bonus ? p.marque_reconnue : 0,
  };
  return {
    ...velo,
    prix_barre: remise > 0 ? velo.prix_barre : null,
    remise_pct: remise,
    score: detail.remise + detail.tailles + detail.marque,
    score_detail: detail,
  };
}

/** Raison d'exclusion d'un candidat, ou null s'il est retenu. */
export function raisonRejet(velo, cfg) {
  const sel = cfg.selection;
  const id = String(velo.id);
  if (sel.bannis.map(String).includes(id)) return "banni";
  if (!velo.prix) return "sans prix";
  if (!velo.en_stock || !velo.tailles_disponibles?.length) return "hors stock";
  const elec = estElectrique(velo, cfg);
  if (elec) return `électrique (${elec})`;
  const cat = categorieExclue(velo, cfg);
  if (cat) return `exclu (${cat})`;
  if (!sel.epingles.map(String).includes(id) && (velo.prix < sel.prix_min || velo.prix > sel.prix_max)) return "hors gamme de prix";
  return null;
}

/**
 * Choisit au plus `max` vélos : épinglés d'abord, puis quotas par type (ex. 3 route/gravel, 3 VTT),
 * puis meilleurs scores. Une seule variante par modèle (la mieux notée).
 */
export function selectionner(velos, cfg, max = cfg.selection.max_velos) {
  const epingles = new Set(cfg.selection.epingles.map(String));
  const estEpingle = (v) => epingles.has(String(v.id));
  const ordre = (a, b) => estEpingle(b) - estEpingle(a) || b.score - a.score;

  const parModele = new Map();
  for (const v of [...velos].sort(ordre)) {
    const k = cleModele(v, cfg);
    if (!parModele.has(k)) parModele.set(k, v);
  }
  const pool = [...parModele.values()];

  const choisis = new Set();
  const prendre = (v) => choisis.size < max && !choisis.has(v) && choisis.add(v);
  pool.filter(estEpingle).forEach(prendre);
  for (const q of cfg.selection.quotas) {
    let n = [...choisis].filter((v) => q.types.includes(v.categorie)).length;
    for (const v of pool) {
      if (n >= q.min) break;
      if (q.types.includes(v.categorie) && prendre(v)) n++;
    }
  }
  pool.forEach(prendre);
  return [...choisis].sort(ordre);
}

const CHAMPS = [
  "id", "nom", "marque", "categorie", "prix", "prix_barre", "remise_pct", "tailles_disponibles", "en_stock",
  "url_fiche", "url_image", "materiau_cadre", "groupe_transmission", "date_collecte", "score", "score_detail",
];
/** Ne garde que les champs publiés dans bikes.json (pas de description, specs… internes). */
export const nettoyer = (v) => Object.fromEntries(CHAMPS.map((k) => [k, v[k] ?? null]));

/** Validation du schéma de bikes.json avant écriture. Renvoie la liste des erreurs (vide = valide). */
export function valider(data, cfg) {
  const erreurs = [];
  const types = new Set(cfg.categories.map((c) => c.type));
  if (Number.isNaN(Date.parse(data?.date_maj))) erreurs.push("date_maj invalide");
  const velos = data?.velos;
  if (!Array.isArray(velos) || velos.length === 0) erreurs.push("aucun vélo");
  else if (velos.length > cfg.selection.max_velos) erreurs.push(`${velos.length} vélos, max ${cfg.selection.max_velos}`);
  const ids = new Set();
  const modeles = new Set();
  for (const [i, v] of (Array.isArray(velos) ? velos : []).entries()) {
    const e = (m) => erreurs.push(`vélo n°${i + 1} (id ${v?.id}) : ${m}`);
    if (typeof v.id !== "string" || !v.id) e("id manquant");
    if (typeof v.nom !== "string" || !v.nom) e("nom manquant");
    if (!types.has(v.categorie)) e(`catégorie « ${v.categorie} » inconnue`);
    if (!(typeof v.prix === "number" && v.prix > 0)) e("prix invalide");
    if (v.prix_barre != null && !(v.prix_barre > v.prix)) e("prix barré incohérent");
    if (!Number.isInteger(v.remise_pct) || v.remise_pct < 0 || v.remise_pct > 100) e("remise invalide");
    if (!Array.isArray(v.tailles_disponibles) || !v.tailles_disponibles.length) e("aucune taille disponible");
    if (v.en_stock !== true) e("pas en stock");
    if (!String(v.url_fiche).startsWith(cfg.base_url + "/")) e("url_fiche hors BikeStocks");
    if (v.url_image != null && !/^https:\/\//.test(v.url_image)) e("url_image invalide");
    if (Number.isNaN(Date.parse(v.date_collecte))) e("date_collecte invalide");
    if (typeof v.score !== "number") e("score manquant");
    const elec = estElectrique(v, cfg);
    if (elec) e(`vélo électrique (${elec})`);
    if (ids.has(v.id)) e("id en double");
    ids.add(v.id);
    const k = cleModele(v, cfg);
    if (modeles.has(k)) e(`modèle en double (${k})`);
    modeles.add(k);
  }
  return erreurs;
}
