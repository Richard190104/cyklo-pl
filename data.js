/* =====================================================================
   CYKLO TOUR 2026 — LOADER DÁT
   =====================================================================
   Zdroj pravdy sú dáta v súbore data.json (servírované všetkým).
   Web aj admin ich načítajú cez fetch(). Admin ich publikuje späť
   do data.json na GitHube (cez GitHub API).

   DEFAULT_DATA nižšie je len ZÁLOŽNÝ obsah pre prípad, že sa data.json
   nepodarí načítať (napr. pri otvorení cez file:// bez servera).
   ===================================================================== */

const DEFAULT_DATA = {
  meta: { title: 'CYKLO TOUR 2026', subtitle: 'Rodinná viacetapová klasika v štýle Tour de France', location: 'Huta Różaniecka', region: 'Roztocze', dateRange: '22. – 26. júl 2026' },
  points: { stage: [25, 20, 16, 14, 12, 10, 8, 6, 4, 2], rest: 1 },
  premieTypes: [
    { id: 'sprint', name: 'Špurtérska prémia', color: '#1a9e57', points: [5, 3, 2, 1] },
    { id: 'water',  name: 'Vodná prémia',      color: '#1f78d1', points: [5, 3, 2, 1] },
  ],
  teams: [
    { id: 'slnecnicebike', name: 'SlnečniceBike',     color: '#f2b705', riders: ['Michaela Pavolková', 'Richard Pukáč'] },
    { id: 'cinrum',        name: 'CinRum',            color: '#e0245e', riders: ['Michal Pukáč', 'Adriána Pukáčová'] },
    { id: 'perniky',       name: 'Prešovskí perníci', color: '#b5651d', riders: ['Patrik Poperník', 'Michaela Poperníková', 'Hanka Poperníková'] },
    { id: 'baterkare',     name: 'Baterkáre',         color: '#2e86de', riders: ['Jaroslav Leferovič', 'Iveta Leferovičová'] },
  ],
  stages: [
    { n: 1, date: '22. 7. 2026', title: 'Huta Różaniecka → Narol', type: 'Kopcovitá etapa', dist: '42 km', status: 'done',
      finish: ['Hanka Poperníková', 'Patrik Poperník', 'Michaela Poperníková', 'Richard Pukáč', 'Michaela Pavolková'],
      rest: ['Michal Pukáč', 'Adriána Pukáčová', 'Jaroslav Leferovič', 'Iveta Leferovičová'],
      premies: [
        { typeId: 'sprint', label: '1. špurtérska prémia', order: ['Michal Pukáč', 'Iveta Leferovičová', 'Adriána Pukáčová', 'Richard Pukáč'] },
        { typeId: 'sprint', label: '2. špurtérska prémia', order: ['Richard Pukáč', 'Michal Pukáč', 'Michaela Pavolková'] },
        { typeId: 'water',  label: 'Vodná prémia',         order: ['Michaela Pavolková', 'Jaroslav Leferovič', 'Patrik Poperník', 'Hanka Poperníková'] },
      ], photos: [] },
    { n: 2, date: '23. 7. 2026', title: 'Huta Różaniecka → Susiec',   type: 'Rovinatá etapa',  dist: '38 km', status: 'upcoming', finish: [], rest: [], premies: [], photos: [] },
    { n: 3, date: '24. 7. 2026', title: 'Okruh Roztocze — Nowiny',     type: 'Kopcovitá etapa', dist: '55 km', status: 'upcoming', finish: [], rest: [], premies: [], photos: [] },
    { n: 4, date: '25. 7. 2026', title: 'Huta Różaniecka → Lubaczów',  type: 'Rovinatá etapa',  dist: '48 km', status: 'upcoming', finish: [], rest: [], premies: [], photos: [] },
    { n: 5, date: '26. 7. 2026', title: 'Huta Różaniecka — kritérium', type: 'Rovinatá etapa',  dist: '25 km', status: 'upcoming', finish: [], rest: [], premies: [], photos: [] },
  ],
  gallery: [],
};

const DATA_URL = 'data.json';

function cloneData(d) { return JSON.parse(JSON.stringify(d)); }
function isValidData(d) { return d && Array.isArray(d.teams) && Array.isArray(d.stages) && Array.isArray(d.premieTypes) && d.points && d.meta; }

/* Načítanie dát z data.json (s fallbackom na DEFAULT_DATA) */
async function fetchData() {
  try {
    const res = await fetch(DATA_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const j = await res.json();
      if (isValidData(j)) return j;
    }
  } catch (e) { /* file:// alebo offline – použije sa fallback */ }
  return null;
}

/* Globálne dáta (naplnia sa po fetchi v script.js / admin.js) */
let DATA = cloneData(DEFAULT_DATA);

/* ---------- GITHUB PUBLIKOVANIE (nastavenia sú len na tomto zariadení) ---------- */
const GH_KEY = 'cykloGhConfig';
function loadGh() { try { return JSON.parse(localStorage.getItem(GH_KEY)) || {}; } catch (e) { return {}; } }
function saveGh(c) { try { localStorage.setItem(GH_KEY, JSON.stringify(c)); } catch (e) {} }
function base64Utf8(str) { return btoa(unescape(encodeURIComponent(str))); }

/* Publikuje objekt data do data.json v GitHub repozitári.
   Vracia {ok, message}. */
async function publishToGithub(data) {
  const c = loadGh();
  if (!c.owner || !c.repo || !c.token) return { ok: false, message: 'Chýbajú GitHub nastavenia (owner, repo, token).' };
  const path = c.path || 'data.json';
  const branch = c.branch || 'main';
  const api = `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}`;
  const headers = { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json' };

  let sha;
  try {
    const g = await fetch(api + '?ref=' + encodeURIComponent(branch), { headers, cache: 'no-store' });
    if (g.ok) { const gj = await g.json(); sha = gj.sha; }
    else if (g.status !== 404) { return { ok: false, message: 'Chyba pri čítaní súboru: ' + g.status }; }
  } catch (e) { return { ok: false, message: 'Sieťová chyba: ' + e.message }; }

  const body = {
    message: 'Aktualizácia výsledkov cyklo tour',
    content: base64Utf8(JSON.stringify(data, null, 2)),
    branch,
  };
  if (sha) body.sha = sha;

  try {
    const res = await fetch(api, { method: 'PUT', headers, body: JSON.stringify(body) });
    if (res.ok) return { ok: true, message: 'Publikované.' };
    const txt = await res.text();
    return { ok: false, message: 'GitHub odmietol zápis (' + res.status + '): ' + txt };
  } catch (e) { return { ok: false, message: 'Sieťová chyba pri zápise: ' + e.message }; }
}
