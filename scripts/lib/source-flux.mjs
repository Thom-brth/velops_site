// Source « flux » (plan A, préférable au scraping) : flux produits fourni par BikeStocks au format
// Google Merchant (RSS 2.0 / Atom avec l'espace de noms g:), l'export standard des modules PrestaShop.
// Une requête par jour au lieu d'une centaine. Les variantes (tailles) sont regroupées par g:item_group_id.
// Pour l'API Webservice PrestaShop : écrire un objet { lister(cfg, http, log) } sur le même modèle (voir README).
import * as cheerio from "cheerio";
import { normaliser, prixDepuisTexte, reconnaitreMarque } from "./selection.mjs";

export function lireFluxGoogle(xml, cfg) {
  const $ = cheerio.load(xml, { xml: true });
  const champ = ($it, k) => $it.children(`g\\:${k}`).first().text().trim() || $it.children(k).first().text().trim();
  const groupes = new Map();
  $("item, entry").each((_, el) => {
    const $it = $(el);
    const id = champ($it, "item_group_id") || champ($it, "id");
    const nomSource = champ($it, "title");
    const rayon = champ($it, "product_type");
    const type = cfg.flux.types.find((t) => normaliser(rayon).includes(normaliser(t.contient)))?.type;
    if (!id || !type) return; // rayon hors des types suivis (route / gravel / vtt)

    let v = groupes.get(id);
    if (!v) {
      const promo = prixDepuisTexte(champ($it, "sale_price"));
      const marque = champ($it, "brand");
      const reconnu = reconnaitreMarque(nomSource, marque ? [marque, ...cfg.marques] : cfg.marques);
      v = {
        id,
        nom_source: nomSource,
        ...reconnu,
        categorie: type,
        prix: promo ?? prixDepuisTexte(champ($it, "price")),
        prix_barre: promo ? prixDepuisTexte(champ($it, "price")) : null,
        tailles_disponibles: [],
        en_stock: false,
        url_fiche: (champ($it, "link") || $it.children("link").attr("href") || "").split("#")[0] || null,
        url_image: champ($it, "image_link") || null,
        description: champ($it, "description"),
        fil_ariane: rayon.split(">").map((nom) => ({ nom: nom.trim(), url: "" })),
        specs: {},
      };
      groupes.set(id, v);
    }
    if (/^in[ _]stock$/i.test(champ($it, "availability"))) {
      v.en_stock = true;
      const taille = champ($it, "size") || "voir la fiche";
      if (!v.tailles_disponibles.includes(taille)) v.tailles_disponibles.push(taille);
    }
  });
  return [...groupes.values()];
}

export const sourceFlux = {
  async lister(cfg, http, log) {
    if (!cfg.flux.url) throw new Error("source « flux » choisie mais flux.url est vide dans config/bikestocks.json");
    const velos = lireFluxGoogle(await http.texte(cfg.flux.url, { robots: false }), cfg);
    log(`  flux : ${velos.length} produits (variantes regroupées)`);
    return velos;
  },
  // Pas de verifier() : le flux contient déjà rayon, description, prix et disponibilité de chaque produit.
};
