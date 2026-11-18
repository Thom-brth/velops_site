// Filtres et tri des vélos, côté client. Sans JS : tous les vélos restent affichés dans l'ordre de la sélection.
const liste = document.getElementById("velos");
const cartes = [...liste.querySelectorAll(".velo")];
const boutons = document.querySelectorAll("[data-filtre]");
const tri = document.getElementById("tri");
const compte = document.getElementById("compte");
let filtre = "";

const ordres = {
  score: (a, b) => b.dataset.score - a.dataset.score,
  "prix-asc": (a, b) => a.dataset.prix - b.dataset.prix,
  "prix-desc": (a, b) => b.dataset.prix - a.dataset.prix,
  remise: (a, b) => b.dataset.remise - a.dataset.remise,
};

function maj() {
  cartes.sort(ordres[tri.value]).forEach((c) => {
    c.hidden = filtre !== "" && c.dataset.type !== filtre;
    liste.append(c);
  });
  const n = cartes.filter((c) => !c.hidden).length;
  compte.textContent = `${n} vélo${n > 1 ? "s" : ""} affiché${n > 1 ? "s" : ""}`;
}

boutons.forEach((b) =>
  b.addEventListener("click", () => {
    filtre = b.dataset.filtre;
    boutons.forEach((x) => x.setAttribute("aria-pressed", x === b));
    maj();
  })
);
tri.addEventListener("change", maj);
document.querySelector(".filtres").hidden = false;
