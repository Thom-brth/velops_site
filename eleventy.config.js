// Configuration Eleventy : https://www.11ty.dev/docs/config/
import fs from "node:fs";
import { HtmlBasePlugin } from "@11ty/eleventy";

const site = JSON.parse(fs.readFileSync("data/site.json", "utf8"));
const TODO = "À COMPLÉTER";

export default function (eleventyConfig) {
  // Chemin de base (GitHub Pages sans domaine perso : /nom-du-depot/) : fourni par le workflow via PATH_PREFIX.
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Interrupteur du module vélos : page non générée si SHOW_BIKES=false.
  if (!site.SHOW_BIKES) eleventyConfig.ignores.add("src/velos-a-vendre.njk");

  // 40 -> « 40 € », 7.5 -> « 7,50 € », texte (placeholder) -> inchangé. Prix nets, jamais HT/TTC.
  eleventyConfig.addFilter("euros", (v) => {
    if (typeof v !== "number") return v;
    const opts = Number.isInteger(v) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return new Intl.NumberFormat("fr-FR", opts).format(v) + " €";
  });

  // « 04 78 00 00 00 » -> « +33478000000 ». Vide tant que le numéro est un placeholder.
  eleventyConfig.addFilter("telHref", (v) => (String(v).includes(TODO) ? "" : String(v).replace(/[^\d+]/g, "").replace(/^0/, "+33")));
  eleventyConfig.addFilter("isTodo", (v) => String(v).includes(TODO));

  // Remplace {site.cle} / {site.cle.sous_cle} dans les textes de data/*.json.
  eleventyConfig.addFilter("fill", (str) =>
    String(str).replace(/\{site\.([\w.]+)\}/g, (m, path) => path.split(".").reduce((o, k) => o?.[k], site) ?? m)
  );

  eleventyConfig.addFilter("dateFr", (iso) =>
    iso ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(new Date(iso)) : ""
  );

  // Lien vers la fiche BikeStocks + paramètres de suivi (data/site.json > velos.utm).
  eleventyConfig.addFilter("lienBikestocks", (url) => {
    const utm = site.velos.utm;
    return utm ? url + (url.includes("?") ? "&" : "?") + utm : url;
  });

  eleventyConfig.addFilter("typeVelo", (t) => ({ route: "Route", gravel: "Gravel", vtt: "VTT" })[t] || t);

  // Données structurées LocalBusiness : ville et zone desservie seulement, jamais l'adresse exacte.
  eleventyConfig.addFilter("jsonLd", (s, tarifs) => {
    const ok = (v) => (v && !String(v).includes(TODO) ? v : undefined);
    const prix = tarifs.categories.flatMap((c) => c.prestations.map((p) => p.prix)).filter((p) => typeof p === "number");
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BicycleStore",
      name: s.nom,
      description: s.description + " Sur rendez-vous uniquement.",
      url: ok(s.url),
      image: ok(s.url) && s.url + "/assets/og.png",
      telephone: ok(s.telephone),
      email: ok(s.email),
      address: { "@type": "PostalAddress", addressLocality: s.ville, postalCode: s.code_postal, addressCountry: "FR" },
      areaServed: s.zone.map((name) => ({ "@type": "City", name })),
      paymentAccepted: s.paiements.join(", "),
      currenciesAccepted: "EUR",
      priceRange: `${Math.min(...prix)} € – ${Math.max(...prix)} €`,
      openingHoursSpecification: s.creneaux.flatMap((c) => c.jsonld || []).map((h) => ({
        "@type": "OpeningHoursSpecification", dayOfWeek: h.jours, opens: h.ouverture, closes: h.fermeture,
      })),
    }).replace(/</g, "\\u003c");
  });
}

export const config = {
  dir: { input: "src", output: "_site", includes: "_includes", data: "../data" },
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk",
  pathPrefix: process.env.PATH_PREFIX || "/",
};
