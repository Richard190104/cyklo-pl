/* =====================================================================
   CYKLO TOUR 2026 — DÁTA + ÚLOŽISKO
   =====================================================================
   Toto sú VÝCHODZIE dáta. Reálne (upravené v admine) sa ukladajú do
   localStorage prehliadača. Cez admin panel (admin.html) vieš všetko
   meniť a exportovať. Tento súbor je "továrenské nastavenie".
   ===================================================================== */

const DEFAULT_DATA = {
  meta: {
    title: 'CYKLO TOUR 2026',
    subtitle: 'Rodinná viacetapová klasika v štýle Tour de France',
    location: 'Huta Różaniecka',
    region: 'Roztocze',
    dateRange: '22. – 26. júl 2026',
  },

  /* Bodovanie za umiestnenie v cieli (žltý dres) */
  points: {
    stage: [25, 20, 16, 14, 12, 10, 8, 6, 4, 2],
    rest: 1, // za miesta mimo tabuľky vyššie
  },

  /* Konfigurovateľné typy prémií (každý = vlastná klasifikácia / dres) */
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
    {
      n: 1, date: '22. 7. 2026', title: 'Huta Różaniecka → Narol',
      type: 'Kopcovitá etapa', dist: '42 km', status: 'done',
      finish: ['Hanka Poperníková', 'Patrik Poperník', 'Michaela Poperníková', 'Richard Pukáč', 'Michaela Pavolková'],
      rest: ['Michal Pukáč', 'Adriána Pukáčová', 'Jaroslav Leferovič', 'Iveta Leferovičová'],
      premies: [
        { typeId: 'sprint', label: '1. špurtérska prémia', order: ['Michal Pukáč', 'Iveta Leferovičová', 'Adriána Pukáčová', 'Richard Pukáč'] },
        { typeId: 'sprint', label: '2. špurtérska prémia', order: ['Richard Pukáč', 'Michal Pukáč', 'Michaela Pavolková'] },
        { typeId: 'water',  label: 'Vodná prémia',         order: ['Michaela Pavolková', 'Jaroslav Leferovič', 'Patrik Poperník', 'Hanka Poperníková'] },
      ],
      photos: [],
    },
    { n: 2, date: '23. 7. 2026', title: 'Huta Różaniecka → Susiec',    type: 'Rovinatá etapa',  dist: '38 km', status: 'upcoming', finish: [], rest: [], premies: [], photos: [] },
    { n: 3, date: '24. 7. 2026', title: 'Okruh Roztocze — Nowiny',      type: 'Kopcovitá etapa', dist: '55 km', status: 'upcoming', finish: [], rest: [], premies: [], photos: [] },
    { n: 4, date: '25. 7. 2026', title: 'Huta Różaniecka → Lubaczów',   type: 'Rovinatá etapa',  dist: '48 km', status: 'upcoming', finish: [], rest: [], premies: [], photos: [] },
    { n: 5, date: '26. 7. 2026', title: 'Huta Różaniecka — kritérium',  type: 'Rovinatá etapa',  dist: '25 km', status: 'upcoming', finish: [], rest: [], premies: [], photos: [] },
  ],

  gallery: [],
};

/* ---------------- ÚLOŽISKO (localStorage) ---------------- */
const STORE_KEY = 'cykloTour2026';

function cloneData(d) { return JSON.parse(JSON.stringify(d)); }

function isValidData(d) {
  return d && Array.isArray(d.teams) && Array.isArray(d.stages) &&
         Array.isArray(d.premieTypes) && d.points && d.meta;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidData(parsed)) return parsed;
    }
  } catch (e) { /* ignore */ }
  return cloneData(DEFAULT_DATA);
}

function saveData(d) {
  localStorage.setItem(STORE_KEY, JSON.stringify(d));
}

function resetData() {
  localStorage.removeItem(STORE_KEY);
}

/* Globálne dáta, s ktorými pracuje web aj admin */
let DATA = loadData();
