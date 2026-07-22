/* =====================================================================
   CYKLO TOUR 2026 — VEREJNÝ WEB (render + výpočty)
   Dáta prichádzajú z data.js (globálna premenná DATA).
   Úpravy rob cez admin panel (admin.html), nie tu.
   ===================================================================== */

/* ---------- ODVODENÉ POMOCNÍKY ---------- */
let RIDER_TEAM = {};
function rebuildRiderTeam() {
  RIDER_TEAM = {};
  DATA.teams.forEach(t => t.riders.forEach(r => RIDER_TEAM[r] = t));
}
rebuildRiderTeam();

function allRiders() { return DATA.teams.flatMap(t => t.riders); }
function doneStages() { return DATA.stages.filter(s => s.status === 'done'); }
function doneCount() { return doneStages().length; }
function premieType(id) { return DATA.premieTypes.find(t => t.id === id); }

function emptyScore() {
  const s = {};
  allRiders().forEach(r => s[r] = 0);
  return s;
}
function sortScore(s) {
  return Object.entries(s).map(([rider, points]) => ({ rider, points })).sort((a, b) => b.points - a.points);
}

/* ---------- NÁHODA (deterministická podľa seedu) ---------- */
function seededRng(seed) {
  let s = (seed || 1) * 2654435761 % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = s * 16807 % 2147483647) / 2147483647;
}
function seededShuffle(arr, seed) {
  const rng = seededRng(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Kompletné poradie etapy: menovaní + zvyšok na náhodných stabilných miestach */
function stageOrder(st) {
  const named = (st.finish || []).map((rider, i) => ({ rider, pos: i + 1, random: false }));
  const rest = seededShuffle(st.rest || [], st.n).map((rider, i) => ({ rider, pos: named.length + i + 1, random: true }));
  return named.concat(rest);
}

/* =====================================================================
   VÝPOČTY KLASIFIKÁCIÍ
   ===================================================================== */
function computeGC() {
  const s = emptyScore();
  doneStages().forEach(st => {
    stageOrder(st).forEach(o => {
      const idx = o.pos - 1;
      const pts = DATA.points.stage[idx] !== undefined ? DATA.points.stage[idx] : DATA.points.rest;
      if (s[o.rider] !== undefined) s[o.rider] += pts;
    });
  });
  return sortScore(s);
}

function computePremie(typeId) {
  const s = emptyScore();
  const type = premieType(typeId);
  if (!type) return sortScore(s);
  doneStages().forEach(st => {
    (st.premies || []).filter(p => p.typeId === typeId).forEach(p => {
      p.order.forEach((r, i) => {
        if (type.points[i] !== undefined && s[r] !== undefined) s[r] += type.points[i];
      });
    });
  });
  return sortScore(s);
}

function computeTeams() {
  const gc = {};
  computeGC().forEach(row => gc[row.rider] = row.points);
  const rows = DATA.teams.map(t => ({ team: t, points: t.riders.reduce((sum, r) => sum + (gc[r] || 0), 0) }));
  rows.sort((a, b) => b.points - a.points);
  return rows;
}

/* ---------- ROZPIS BODOV (prečo kto koľko) ---------- */
function emptyBreakdown() {
  const m = {};
  allRiders().forEach(r => m[r] = []);
  return m;
}
function gcBreakdown() {
  const m = emptyBreakdown();
  doneStages().forEach(st => stageOrder(st).forEach(o => {
    const idx = o.pos - 1;
    const pts = DATA.points.stage[idx] !== undefined ? DATA.points.stage[idx] : DATA.points.rest;
    if (m[o.rider]) m[o.rider].push({ label: `Etapa ${st.n} · ${o.pos}. miesto v cieli`, pts });
  }));
  return m;
}
function premieBreakdown(typeId) {
  const m = emptyBreakdown();
  const type = premieType(typeId);
  if (!type) return m;
  doneStages().forEach(st => (st.premies || []).filter(p => p.typeId === typeId).forEach(p => {
    p.order.forEach((r, i) => {
      if (type.points[i] !== undefined && m[r]) m[r].push({ label: `Etapa ${st.n} · ${p.label || type.name} · ${i + 1}. miesto`, pts: type.points[i] });
    });
  }));
  return m;
}

/* =====================================================================
   RENDER — POMOCNÍCI
   ===================================================================== */
function teamTag(rider) {
  const t = RIDER_TEAM[rider];
  return t ? `<span class="team-dot" style="background:${t.color}"></span>` : '';
}
function riderLine(rider) {
  const t = RIDER_TEAM[rider];
  return `${teamTag(rider)}<span class="r-name">${rider}</span>` + (t ? `<span class="r-team">${t.name}</span>` : '');
}
function medal(i) { return ['🥇', '🥈', '🥉'][i] || `${i + 1}.`; }
function leaderOf(rows) { return rows.length && rows[0].points > 0 ? rows[0].rider : null; }
function isLight(hex) {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
}

/* =====================================================================
   STRÁNKY
   ===================================================================== */
function renderHome() {
  const jerseys = [{ color: getComputedStyle(document.documentElement).getPropertyValue('--yellow') || '#f7d417', name: 'Žltý dres', sub: 'Celkový líder', leader: leaderOf(computeGC()) }];
  DATA.premieTypes.forEach(t => jerseys.push({ color: t.color, name: t.name + ' — dres', sub: t.name, leader: leaderOf(computePremie(t.id)) }));

  return `
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-kicker">${DATA.meta.dateRange} · ${DATA.stages.length} etáp</p>
        <h1>${DATA.meta.title.replace(/(\d{4})/, '<span>$1</span>')}</h1>
        <p class="hero-sub">${DATA.meta.subtitle}</p>
        <p class="hero-loc">📍 Základňa: <b>${DATA.meta.location}</b>${DATA.meta.region ? ' · ' + DATA.meta.region : ''}</p>
        <div class="hero-stats">
          <div><b>${doneCount()}</b><span>odjazdených etáp</span></div>
          <div><b>${DATA.stages.length}</b><span>etáp celkovo</span></div>
          <div><b>${DATA.teams.length}</b><span>tímov</span></div>
          <div><b>${allRiders().length}</b><span>jazdcov</span></div>
        </div>
      </div>
    </section>

    <div class="wrap">
      <h2 class="sec-title">Nositelia dresov</h2>
      <div class="jersey-grid">
        ${jerseys.map(j => `
          <div class="jersey-card">
            <div class="jersey-icon" style="background:${j.color};color:${isLight(j.color.trim()) ? '#141210' : '#fff'}">👕</div>
            <div class="jersey-meta">
              <span class="jersey-sub">${j.sub}</span>
              <strong>${j.name}</strong>
              <span class="jersey-leader">${j.leader || '— zatiaľ neudelené —'}</span>
            </div>
          </div>`).join('')}
      </div>

      <h2 class="sec-title">Priebeh pretekov</h2>
      <div class="stage-strip">
        ${DATA.stages.map(st => `
          <button class="strip-item ${st.status}" data-goto="stage-${st.n}">
            <span class="strip-n">E${st.n}</span>
            <span class="strip-date">${st.date}</span>
            <span class="strip-status">${st.status === 'done' ? '✓ odjazdená' : 'čaká sa'}</span>
          </button>`).join('')}
      </div>
    </div>`;
}

function renderTeams() {
  const gc = {};
  computeGC().forEach(r => gc[r.rider] = r.points);
  return `
    <div class="wrap">
      <h2 class="sec-title">Tímy a jazdci</h2>
      <div class="team-grid">
        ${DATA.teams.map(t => `
          <div class="team-card" style="--tc:${t.color}">
            <div class="team-head"><span class="team-badge" style="background:${t.color}"></span><h3>${t.name}</h3></div>
            <ul class="team-riders">
              ${t.riders.map(r => `<li><span class="r-name">${r}</span><span class="r-pts">${gc[r] || 0} b.</span></li>`).join('')}
            </ul>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderStagesList() {
  return `
    <div class="wrap">
      <h2 class="sec-title">Etapy</h2>
      <div class="stage-list">
        ${DATA.stages.map(st => `
          <button class="stage-row ${st.status}" data-goto="stage-${st.n}">
            <span class="sr-num">${st.n}</span>
            <span class="sr-main"><strong>${st.title}</strong><small>${st.type} · ${st.dist}</small></span>
            <span class="sr-date">${st.date}</span>
            <span class="sr-badge">${st.status === 'done' ? 'odjazdená' : 'čaká sa'}</span>
          </button>`).join('')}
      </div>
    </div>`;
}

function renderStage(n) {
  const st = DATA.stages.find(s => s.n === n);
  if (!st) return '<div class="wrap"><p>Etapa neexistuje.</p></div>';

  const header = `
    <div class="stage-hero ${st.status}">
      <div class="wrap">
        <button class="back-btn" data-goto="stages">← Všetky etapy</button>
        <p class="stage-eyebrow">Etapa ${st.n} · ${st.date}</p>
        <h1>${st.title}</h1>
        <div class="stage-tags">
          <span>${st.type}</span><span>${st.dist}</span>
          <span class="tag-status ${st.status}">${st.status === 'done' ? '✓ Odjazdená' : 'Čaká sa'}</span>
        </div>
      </div>
    </div>`;

  if (st.status !== 'done') {
    return header + `
      <div class="wrap">
        <div class="upcoming-box">
          <div class="upcoming-icon">🚴</div>
          <h3>Táto etapa ešte neprebehla</h3>
          <p>Výsledky sa doplnia po odjazdení etapy dňa ${st.date}.</p>
        </div>
        ${renderGalleryBlock(st.photos, `Galéria — Etapa ${st.n}`)}
      </div>`;
  }

  const fullOrder = stageOrder(st);
  const podium = fullOrder.slice(0, 3).map(o => o.rider);

  return header + `
    <div class="wrap">
      ${podium.length ? `
      <div class="podium">
        ${podium[1] ? podiumCol(podium[1], 2) : ''}
        ${podium[0] ? podiumCol(podium[0], 1) : ''}
        ${podium[2] ? podiumCol(podium[2], 3) : ''}
      </div>` : ''}

      <div class="stage-cols">
        <div class="panel">
          <h3 class="panel-title">🏁 Poradie v cieli</h3>
          <ol class="result-list">
            ${fullOrder.map(o => `<li><span class="pos">${o.pos}.</span><span class="ri">${riderLine(o.rider)}</span></li>`).join('')}
          </ol>
        </div>

        <div class="panel">
          <h3 class="panel-title">🏆 Prémie</h3>
          ${(st.premies && st.premies.length) ? st.premies.map(p => {
            const type = premieType(p.typeId);
            return `
              <div class="premie">
                <h4><span class="team-dot" style="background:${type ? type.color : '#999'}"></span> ${p.label || (type ? type.name : 'Prémia')}</h4>
                <ol class="mini-list">
                  ${p.order.map((r, i) => `<li><span class="mp">${medal(i)}</span>${riderLine(r)}</li>`).join('')}
                </ol>
              </div>`;
          }).join('') : '<p class="note">V tejto etape neboli žiadne prémie.</p>'}
        </div>
      </div>

      ${renderGalleryBlock(st.photos, `Galéria — Etapa ${st.n}`)}
    </div>`;
}

function podiumCol(rider, place) {
  return `
    <div class="pod pod-${place}">
      <div class="pod-medal">${medal(place - 1)}</div>
      <div class="pod-block"><span class="pod-place">${place}</span></div>
      <div class="pod-name">${teamTag(rider)}${rider}</div>
      <div class="pod-team">${RIDER_TEAM[rider] ? RIDER_TEAM[rider].name : ''}</div>
    </div>`;
}

function breakdownHtml(items) {
  if (!items || !items.length) return '<div class="bd empty">zatiaľ žiadne body</div>';
  return `<div class="bd">${items.map(it => `<span class="bd-row"><span class="bd-l">${it.label}</span><span class="bd-p">+${it.pts}</span></span>`).join('')}</div>`;
}

function renderLeaderboards() {
  const gc = computeGC();
  const teams = computeTeams();

  const boards = [{ head: 'linear-gradient(120deg,var(--yellow),var(--yellow-d))', dark: true, title: '👕 Celkové poradie', sub: 'Žltý dres · body za umiestnenie', rows: gc, bd: gcBreakdown() }];
  DATA.premieTypes.forEach(t => {
    boards.push({ head: t.color, dark: isLight(t.color), title: `👕 ${t.name}`, sub: 'Klasifikácia prémie', rows: computePremie(t.id), bd: premieBreakdown(t.id) });
  });

  return `
    <div class="wrap">
      <h2 class="sec-title">Poradie</h2>
      <p class="lead">Priebežné poradie po ${doneCount()} z ${DATA.stages.length} etáp. Klikni na jazdca a zobrazí sa rozpis bodov. Pravidlá nájdeš v sekcii <a class="inline-link" data-goto="rules" href="#rules">Vysvetlivky</a>.</p>

      <div class="board-grid">
        ${boards.map(b => `
          <div class="board">
            <div class="board-head" style="background:${b.head};color:${b.dark ? '#141210' : '#fff'}">
              <h3>${b.title}</h3><span>${b.sub}</span>
            </div>
            <ol class="board-list">
              ${b.rows.map((row, i) => `
                <li class="${i === 0 && row.points > 0 ? 'leader' : ''} expandable" data-toggle>
                  <span class="bpos">${i + 1}</span>
                  <span class="bri">${riderLine(row.rider)}</span>
                  <span class="bpts">${row.points}</span>
                  <span class="caret">▾</span>
                  ${breakdownHtml(b.bd[row.rider])}
                </li>`).join('')}
            </ol>
          </div>`).join('')}
      </div>

      <div class="board b-team">
        <div class="board-head"><h3>🚩 Tímové poradie</h3><span>Súčet celkových bodov (žltý dres) jazdcov tímu</span></div>
        <ol class="board-list">
          ${teams.map((row, i) => `
            <li class="${i === 0 && row.points > 0 ? 'leader' : ''} expandable" data-toggle>
              <span class="bpos">${i + 1}</span>
              <span class="bri"><span class="team-dot" style="background:${row.team.color}"></span><span class="r-name">${row.team.name}</span></span>
              <span class="bpts">${row.points}</span>
              <span class="caret">▾</span>
              <div class="bd">${row.team.riders.map(r => {
                const g = gc.find(x => x.rider === r);
                return `<span class="bd-row"><span class="bd-l">${r}</span><span class="bd-p">+${g ? g.points : 0}</span></span>`;
              }).join('')}</div>
            </li>`).join('')}
        </ol>
      </div>
    </div>`;
}

function pointChips(arr) {
  return `<div class="pt-chips">${arr.map((p, i) => `<span class="pt-chip"><b>${i + 1}.</b> ${p} b.</span>`).join('')}</div>`;
}

function renderRules() {
  return `
    <div class="wrap">
      <h2 class="sec-title">Vysvetlivky — bodovanie</h2>
      <p class="lead">Ako fungujú jednotlivé súťaže a koľko bodov sa dá získať za umiestnenie.</p>
      <div class="rules">
        <h3 class="panel-title">ℹ️ Ako sa body získavajú</h3>
        <div class="rules-grid">
          <div class="rule">
            <span class="rdot" style="background:var(--yellow)"></span>
            <div>
              <strong>Žltý dres — celkové poradie</strong>
              <p>Body za umiestnenie v cieli každej etapy. Kto v etape nefiguruje menovite, dostane miesto za menovanými a body podľa neho.</p>
              ${pointChips(DATA.points.stage)}
              <small class="rmini">Miesta mimo tabuľky: ${DATA.points.rest} b.</small>
            </div>
          </div>
          ${DATA.premieTypes.map(t => `
            <div class="rule">
              <span class="rdot" style="background:${t.color}"></span>
              <div>
                <strong>${t.name}</strong>
                <p>Body za poradie na prémii typu „${t.name}“ počas etapy.</p>
                ${pointChips(t.points)}
              </div>
            </div>`).join('')}
          <div class="rule">
            <span class="rdot" style="background:#3a352d"></span>
            <div>
              <strong>Tímové poradie</strong>
              <p>Súčet celkových bodov (žltého dresu) všetkých jazdcov tímu.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="rules-note">
        <p><b>Prečo kto má koľko bodov?</b> V sekcii <a class="inline-link" data-goto="board" href="#board">Poradie</a> klikni na ktoréhokoľvek jazdca — rozbalí sa presný rozpis, za čo body získal (etapa po etape).</p>
      </div>
    </div>`;
}

function renderGalleryBlock(photos, title) {
  const list = photos && photos.length ? photos : [];
  const placeholders = list.length ? '' : Array.from({ length: 6 }).map(() => `<div class="gal-item empty"><span>foto</span></div>`).join('');
  return `
    <div class="gallery-block">
      <h3 class="panel-title">📷 ${title}</h3>
      <div class="gallery-grid">
        ${list.map(src => `<a class="gal-item" href="images/${src}" target="_blank"><img src="images/${src}" alt=""></a>`).join('')}
        ${placeholders}
      </div>
      ${list.length ? '' : '<p class="note">Fotky doplníš do priečinka <code>images/</code> a názvy súborov zadáš v admin paneli.</p>'}
    </div>`;
}

function renderGallery() {
  return `<div class="wrap"><h2 class="sec-title">Galéria</h2>${renderGalleryBlock(DATA.gallery, 'Spoločná galéria')}</div>`;
}

/* =====================================================================
   ROUTER
   ===================================================================== */
const app = document.getElementById('app');

function go(route) {
  let html = '';
  if (route === 'home') html = renderHome();
  else if (route === 'teams') html = renderTeams();
  else if (route === 'stages') html = renderStagesList();
  else if (route === 'board') html = renderLeaderboards();
  else if (route === 'rules') html = renderRules();
  else if (route === 'gallery') html = renderGallery();
  else if (route.startsWith('stage-')) html = renderStage(parseInt(route.split('-')[1], 10));
  else html = renderHome();

  app.innerHTML = html;
  window.scrollTo({ top: 0, behavior: 'auto' });
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.route === route));
  location.hash = route;
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-goto]');
  if (el) { e.preventDefault(); go(el.dataset.goto); }
  const nav = e.target.closest('.nav-link');
  if (nav) { e.preventDefault(); go(nav.dataset.route); closeMenu(); }
  const row = e.target.closest('li[data-toggle]');
  if (row) row.classList.toggle('open');
});

function closeMenu() { document.querySelector('.nav-links')?.classList.remove('open'); }
document.getElementById('burger')?.addEventListener('click', () => document.querySelector('.nav-links').classList.toggle('open'));

window.addEventListener('DOMContentLoaded', () => {
  const start = location.hash ? location.hash.slice(1) : 'home';
  go(start);
});
