// Interrupteur du module vélos (data/site.json > SHOW_BIKES) : à false, la page n'est pas générée
// et n'apparaît pas dans le sitemap. Calculé à chaque build, donc pris en compte sans redémarrer `npm run dev`.
export default {
  eleventyComputed: {
    permalink: (data) => (data.site.SHOW_BIKES ? "/velos-a-vendre/" : false),
    eleventyExcludeFromCollections: (data) => !data.site.SHOW_BIKES,
  },
};
