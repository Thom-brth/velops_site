// Source « html » (plan B) : lecture des pages catégories puis contrôle des fiches produits de bikestocks.es.
// Ordre de préférence sur la fiche : JSON-LD schema.org/Product > sélecteurs CSS (config > selecteurs).
// Les microdonnées des pages listes ne sont PAS utilisées : relevées fausses (prix « 95 », faux avis).
import * as cheerio from "cheerio";
import { normaliser, prixDepuisTexte, reconnaitreMarque } from "./selection.mjs";

export class ErreurStructure extends Error {}

const sansFragment = (u) => u.split("#")[0];
const materiau = (t, cfg) => cfg.materiaux.find((m) => normaliser(t).includes(m.contient))?.libelle ?? null;
// Specs souvent traduites automatiquement et bavardes : on garde la première phrase, 50 caractères max.
export function resumeSpec(t) {
  if (!t) return null;
  const phrase = t.split(/\.\s|;/)[0].trim();
  return phrase.length <= 50 ? phrase : phrase.slice(0, 50).replace(/\s+\S*$/, "") + "…";
}

/** Page catégorie -> { velos: [...], suivante: URL de la page suivante ou null }. */
export function lirePageListe(html, urlPage, cfg) {
  const s = cfg.selecteurs.liste;
  const $ = cheerio.load(html);
  const produits = $(s.produit);
  const velos = produits
    .map((_, el) => {
      const $p = $(el);
      const lien = $p.find(s.lien).first();
      const href = lien.attr("href");
      const nomSource = lien.text().trim();
      const tailles = $p
        .find(s.taille)
        .map((_, t) => ({ nom: ($(t).attr(s.attribut_taille_nom) ?? "").trim(), stock: Number($(t).attr(s.attribut_taille_stock)) }))
        .get();
      const dispo = [...new Set(tailles.filter((t) => t.nom && t.stock > 0).map((t) => t.nom))];
      return {
        id: $p.attr(s.attribut_id) ?? null,
        nom_source: nomSource,
        ...reconnaitreMarque(nomSource, cfg.marques),
        prix: prixDepuisTexte($p.find(s.prix).first().text()),
        prix_barre: prixDepuisTexte($p.find(s.prix_barre).first().text()),
        tailles_disponibles: dispo,
        en_stock: dispo.length > 0,
        url_fiche: href ? sansFragment(new URL(href, urlPage).href) : null,
        url_image: $p.find(s.image).first().attr("src") ? new URL($p.find(s.image).first().attr("src"), urlPage).href : null,
      };
    })
    .get();
  if (produits.length && !velos.some((v) => v.id && v.url_fiche && v.prix)) {
    throw new ErreurStructure(`${urlPage} : ${produits.length} produits mais aucun avec id + lien + prix. Sélecteurs « selecteurs.liste » à revoir.`);
  }
  const suivante = $(s.page_suivante).first().attr("href");
  return { velos, suivante: suivante ? new URL(suivante, urlPage).href : null };
}

/** Fiche produit -> prix, stock, fil d'Ariane, description et specs (pour le contrôle « électrique »). */
export function lireFiche(html, url, cfg) {
  const s = cfg.selecteurs.fiche;
  const $ = cheerio.load(html);
  const produit = $(s.json_ld)
    .map((_, el) => {
      try {
        return JSON.parse($(el).text());
      } catch {
        return null;
      }
    })
    .get()
    .flat()
    .find((j) => j?.["@type"] === "Product");
  if (!produit?.offers) throw new ErreurStructure(`${url} : pas de JSON-LD schema.org/Product. Sélecteur « selecteurs.fiche.json_ld » à revoir.`);
  const offre = [].concat(produit.offers)[0];

  const icone = new RegExp(s.spec_icone_regex);
  const specs = {};
  $(s.spec_cellule).each((_, td) => {
    const m = icone.exec($(td).find("img").attr("src") ?? "");
    if (m) specs[m[1]] = $(td).text().replace(/\s+/g, " ").trim();
  });

  return {
    nom_fiche: produit.name ?? null,
    prix: prixDepuisTexte(offre.price),
    prix_barre: prixDepuisTexte($(s.prix_barre).first().text()),
    en_stock: /InStock$/i.test(offre.availability ?? ""),
    url_image: [].concat(produit.image ?? [])[0] ?? null,
    description: `${produit.description ?? ""} ${$(s.description).text()}`.replace(/\s+/g, " "),
    fil_ariane: $(s.fil_ariane)
      .map((_, a) => ({ nom: $(a).text().trim(), url: $(a).attr("href") ?? "" }))
      .get(),
    specs,
    materiau_cadre: materiau(specs[s.spec_materiau], cfg),
    groupe_transmission: resumeSpec(specs[s.spec_transmission]),
  };
}

export const sourceHtml = {
  async lister(cfg, http, log) {
    const parId = new Map();
    for (const cat of cfg.categories) {
      let url = cat.url;
      let page = 0;
      let n = 0;
      while (url && page < cfg.max_pages_par_categorie) {
        const { velos, suivante } = lirePageListe(await http.texte(url), url, cfg);
        page++;
        n += velos.length;
        for (const v of velos) if (v.id && !parId.has(v.id)) parId.set(v.id, { ...v, categorie: cat.type });
        url = suivante;
      }
      log(`  ${cat.libelle} : ${n} produits sur ${page} page(s)${url ? " (plafond max_pages_par_categorie atteint)" : ""}`);
    }
    return [...parId.values()];
  },

  /** Ouvre la fiche : le prix et le stock du JSON-LD font foi ; ajoute de quoi détecter un électrique mal rangé. */
  async verifier(velo, cfg, http) {
    const f = lireFiche(await http.texte(velo.url_fiche), velo.url_fiche, cfg);
    return {
      ...velo,
      prix: f.prix ?? velo.prix,
      prix_barre: f.prix_barre ?? velo.prix_barre,
      en_stock: velo.en_stock && f.en_stock,
      url_image: velo.url_image || f.url_image,
      description: `${f.nom_fiche ?? ""} ${f.description}`,
      fil_ariane: f.fil_ariane,
      specs: f.specs,
      materiau_cadre: f.materiau_cadre,
      groupe_transmission: f.groupe_transmission,
    };
  },
};
