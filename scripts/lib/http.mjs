// Client HTTP « poli » : une requête à la fois, délai minimal entre deux requêtes, user-agent explicite,
// robots.txt respecté, nombre total de requêtes plafonné. Réglages : config/bikestocks.json.

const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Règles Allow/Disallow applicables à `agent` (groupe dédié s'il existe, sinon groupe « * »). RFC 9309. */
export function lireRobots(txt, agent) {
  const groupes = [];
  let courant = null;
  let enTete = false; // lignes User-agent consécutives = même groupe
  for (const ligne of txt.split(/\r?\n/)) {
    const [, cle, val] = ligne.replace(/#.*/, "").match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/) ?? [];
    if (!cle) continue;
    const k = cle.toLowerCase();
    if (k === "user-agent") {
      if (!enTete) groupes.push((courant = { agents: [], regles: [] }));
      courant.agents.push(val.toLowerCase());
      enTete = true;
    } else {
      enTete = false;
      if (courant && (k === "allow" || k === "disallow") && val) courant.regles.push({ autorise: k === "allow", chemin: val });
    }
  }
  const a = agent.toLowerCase();
  const dedies = groupes.filter((g) => g.agents.includes(a));
  return (dedies.length ? dedies : groupes.filter((g) => g.agents.includes("*"))).flatMap((g) => g.regles);
}

/** La règle la plus longue l'emporte ; à égalité, Allow gagne. `*` = joker, `$` final = fin d'URL. */
export function autorise(regles, url) {
  const chemin = url.pathname + url.search;
  let meilleure = null;
  for (const r of regles) {
    const re = new RegExp("^" + r.chemin.split("*").map(echapper).join(".*").replace(/\\\$$/, "$"));
    const plusForte = !meilleure || r.chemin.length > meilleure.chemin.length || (r.chemin.length === meilleure.chemin.length && r.autorise);
    if (re.test(chemin) && plusForte) meilleure = r;
  }
  return !meilleure || meilleure.autorise;
}

export function creerClient(cfg, { fetchImpl = fetch, attendre = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const hote = new URL(cfg.base_url).host;
  const agent = cfg.user_agent.split("/")[0];
  let file = Promise.resolve();
  let derniere = 0;
  let compte = 0;
  let regles = null;

  async function requete(url) {
    if (++compte > cfg.max_requetes) throw new Error(`plafond de ${cfg.max_requetes} requêtes atteint (max_requetes)`);
    const reste = derniere + cfg.delai_ms - Date.now();
    if (reste > 0) await attendre(reste);
    try {
      return await fetchImpl(url, {
        headers: { "user-agent": cfg.user_agent, accept: "text/html,application/xhtml+xml,application/xml;q=0.9" },
        redirect: "follow",
        signal: AbortSignal.timeout(cfg.timeout_ms),
      });
    } finally {
      derniere = Date.now(); // délai compté depuis la FIN de la requête précédente
    }
  }

  async function chargerRobots() {
    const res = await requete(new URL("/robots.txt", cfg.base_url).href);
    if (res.status >= 400 && res.status < 500) return []; // pas de robots.txt : tout est permis
    if (!res.ok) throw new Error(`robots.txt inaccessible (HTTP ${res.status}) : collecte annulée par prudence`);
    return lireRobots(await res.text(), agent);
  }

  /** Télécharge une page en texte. `robots: false` seulement pour un flux fourni par le partenaire. */
  function texte(url, { robots = true } = {}) {
    const tache = async () => {
      const u = new URL(url);
      if (robots) {
        if (u.host !== hote) throw new Error(`hors du site source : ${url}`);
        regles ??= await chargerRobots();
        if (!autorise(regles, u)) throw new Error(`interdit par robots.txt : ${url}`);
      }
      const res = await requete(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
      return res.text();
    };
    // File d'attente unique : jamais deux requêtes en parallèle, même si l'appelant en lance plusieurs.
    const p = file.then(tache);
    file = p.catch(() => {});
    return p;
  }

  return { texte, nbRequetes: () => compte };
}
