// Configuration Eleventy : https://www.11ty.dev/docs/config/
// Ne pas lire data/*.json ici : ce fichier n'est chargé qu'au démarrage du serveur de dev.
// Les filtres reçoivent les données en argument, l'interrupteur SHOW_BIKES est dans
// src/velos-a-vendre.11tydata.js : tout se met à jour sans redémarrer.
import { HtmlBasePlugin } from "@11ty/eleventy";

const TODO = "À COMPLÉTER";

export default function (eleventyConfig) {
  // Chemin de base (GitHub Pages sans domaine perso : /nom-du-depot/) : fourni par le workflow via PATH_PREFIX.
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  // Polices auto-hébergées (aucune requête vers un tiers), copiées depuis les paquets npm @fontsource-variable.
  eleventyConfig.addPassthroughCopy({
    "node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2": "assets/fonts/archivo.woff2",
    "node_modules/@fontsource-variable/martian-mono/files/martian-mono-latin-wght-normal.woff2": "assets/fonts/martian-mono.woff2",
  });

  // Typographie française : espace fine insécable avant ; : ! ? » et après «, apostrophe typographique.
  // Seul le texte entre les balises est modifié, jamais les attributs, scripts ni styles.
  eleventyConfig.addTransform("typo-fr", function (html) {
    if (!String(this.page.outputPath).endsWith(".html")) return html; // outputPath vaut false pour une page désactivée
    return html
      .split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/)
      .map((s, i) => (i % 2 ? s : s.replace(/&#39;|'/g, "’").replace(/ ([:;!?»])/g, " $1").replace(/« /g, "« ")))
      .join("");
  });

  eleventyConfig.addFilter("annee", () => new Date().getFullYear());

  // « Tu déposes. *Je répare.* » -> le passage entre étoiles est surligné (<em>). Texte échappé avant.
  eleventyConfig.addFilter("surligne", (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*(.+?)\*/g, "<em>$1</em>")
  );

  // 40 -> « 40 € », 7.5 -> « 7,50 € », texte (placeholder) -> inchangé. Prix nets, jamais HT/TTC.
  eleventyConfig.addFilter("euros", (v) => {
    if (typeof v !== "number") return v;
    const opts = Number.isInteger(v) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    // Espace insécable normale : l'espace fine produite par Intl disparaît presque en police condensée.
    return new Intl.NumberFormat("fr-FR", opts).format(v).replace(/ /g, " ") + " €";
  });

  // « 04 78 00 00 00 » -> « +33478000000 ». Vide tant que le numéro est un placeholder.
  eleventyConfig.addFilter("telHref", (v) => (String(v).includes(TODO) ? "" : String(v).replace(/[^\d+]/g, "").replace(/^0/, "+33")));
  eleventyConfig.addFilter("isTodo", (v) => String(v).includes(TODO));

  // {{ texte | fill(site) }} : remplace {site.cle} / {site.cle.sous_cle} dans les textes de data/*.json.
  eleventyConfig.addFilter("fill", (str, site) =>
    String(str).replace(/\{site\.([\w.]+)\}/g, (m, path) => path.split(".").reduce((o, k) => o?.[k], site) ?? m)
  );

  eleventyConfig.addFilter("dateFr", (iso) =>
    iso ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(new Date(iso)) : ""
  );

  // {{ url | lienBikestocks(site.velos.utm) }} : fiche BikeStocks + paramètres de suivi.
  eleventyConfig.addFilter("lienBikestocks", (url, utm) => (utm ? url + (url.includes("?") ? "&" : "?") + utm : url));

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
