// Contrôle des fichiers de données versionnés (ceux qui partent réellement en ligne).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { valider } from "../scripts/lib/selection.mjs";

const lire = (f) => JSON.parse(fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8"));
const cfg = lire("config/bikestocks.json");

test("data/bikes.json : schéma valide, 12 vélos max, aucun électrique, aucun modèle en double", () => {
  assert.deepEqual(valider(lire("data/bikes.json"), cfg), []);
});

test("data/site.json : SHOW_BIKES est un booléen (désactivé par défaut à la livraison)", () => {
  assert.equal(typeof lire("data/site.json").SHOW_BIKES, "boolean");
});

test("data/tarifs.json : chaque prix est un nombre ou un [À COMPLÉTER]", () => {
  for (const c of lire("data/tarifs.json").categories)
    for (const p of c.prestations) assert.ok(typeof p.prix === "number" || String(p.prix).includes("À COMPLÉTER"), `${c.nom} > ${p.nom}`);
});
