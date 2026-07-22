/* =====================================================================
   CYKLO TOUR 2026 — ADMIN PANEL
   Pracuje s kópiou dát D. Zmeny sa uložia do localStorage tlačidlom Uložiť.
   ⚠ Prihlásenie je len klientské (nie skutočná bezpečnosť).
   ===================================================================== */

const CREDS = { user: 'admin', pass: 'Bhmk7gh9' };
const SESSION_KEY = 'cykloAdminSession';

/* Bezpečný prístup k úložisku (niektoré prehliadače ho pri file:// blokujú) */
function safeSession(action, val) {
  try {
    if (action === 'get') return sessionStorage.getItem(SESSION_KEY);
    if (action === 'set') sessionStorage.setItem(SESSION_KEY, val);
    if (action === 'del') sessionStorage.removeItem(SESSION_KEY);
  } catch (e) { /* úložisko nedostupné – pokračujeme bez neho */ }
  return null;
}

/* Pracovná kópia dát */
let D = cloneData(DATA);
let dirty = false;

/* ---------- POMOCNÍCI ---------- */
const $ = sel => document.querySelector(sel);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const linesToArr = t => t.split('\n').map(s => s.trim()).filter(Boolean);
const arrToLines = a => (a || []).join('\n');
const numsFromStr = s => s.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n));
const slug = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ('id' + (D.premieTypes.length + D.teams.length));

function markDirty() { dirty = true; $('#save-state').textContent = '● nepublikované zmeny'; $('#save-state').className = 'save-state on'; }
function markClean() { dirty = false; $('#save-state').textContent = 'zosynchronizované'; $('#save-state').className = 'save-state'; }

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false; t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.hidden = true, 300); }, 2200);
}

function allRiderNames() { return D.teams.flatMap(t => t.riders); }

/* ---------- PRIHLÁSENIE ---------- */
async function showAdmin() {
  $('#login').hidden = true;
  $('#admin').hidden = false;
  $('#admin-main').innerHTML = '<p class="hint" style="padding:20px">Načítavam dáta z data.json…</p>';
  const loaded = await fetchData();
  D = loaded ? loaded : cloneData(DEFAULT_DATA);
  markClean();
  renderTab('stages');
}

$('#login-form').addEventListener('submit', e => {
  e.preventDefault();
  const u = $('#u').value.trim(), p = $('#p').value;
  if (u === CREDS.user && p === CREDS.pass) {
    safeSession('set', '1');
    showAdmin();
  } else {
    $('#login-err').textContent = 'Nesprávne meno alebo heslo.';
  }
});

$('#btn-logout').addEventListener('click', () => {
  if (dirty && !confirm('Máš neuložené zmeny. Naozaj sa odhlásiť?')) return;
  safeSession('del');
  location.reload();
});

if (safeSession('get') === '1') showAdmin();

/* ---------- PUBLIKOVANIE ---------- */
$('#btn-save').addEventListener('click', publishNow);

async function publishNow() {
  const c = loadGh();
  if (!c.owner || !c.repo || !c.token) {
    alert('Najprv vyplň GitHub nastavenia v záložke „Publikovanie".');
    document.querySelector('.atab[data-tab="publish"]').click();
    return;
  }
  const btn = $('#btn-save');
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = 'Publikujem…';
  const r = await publishToGithub(D);
  btn.disabled = false; btn.textContent = old;
  if (r.ok) { markClean(); toast('✓ Publikované. Web sa obnoví do ~1 min.'); }
  else { alert('Publikovanie zlyhalo:\n' + r.message + '\n\nTip: skontroluj token a názov repozitára. Alebo použi „Stiahnuť data.json" a nahraj ho ručne.'); }
}

window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- TABY ---------- */
document.querySelectorAll('.atab').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.atab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  renderTab(b.dataset.tab);
}));

function renderTab(tab) {
  const m = $('#admin-main');
  if (tab === 'stages') m.innerHTML = tabStages();
  else if (tab === 'teams') m.innerHTML = tabTeams();
  else if (tab === 'premies') m.innerHTML = tabPremies();
  else if (tab === 'scoring') m.innerHTML = tabScoring();
  else if (tab === 'general') m.innerHTML = tabGeneral();
  else if (tab === 'gallery') m.innerHTML = tabGallery();
  else if (tab === 'publish') m.innerHTML = tabPublish();
}

/* =====================================================================
   TAB: VŠEOBECNÉ
   ===================================================================== */
function tabGeneral() {
  const g = D.meta;
  return card('Všeobecné informácie', `
    ${field('Názov pretekov', `<input data-meta="title" value="${esc(g.title)}">`)}
    ${field('Podnadpis', `<input data-meta="subtitle" value="${esc(g.subtitle)}">`)}
    ${field('Lokalita (základňa)', `<input data-meta="location" value="${esc(g.location)}">`)}
    ${field('Región', `<input data-meta="region" value="${esc(g.region)}">`)}
    ${field('Rozsah dátumov', `<input data-meta="dateRange" value="${esc(g.dateRange)}">`)}
  `);
}

/* =====================================================================
   TAB: BODOVANIE
   ===================================================================== */
function tabScoring() {
  return card('Bodovanie za umiestnenie v cieli (žltý dres)', `
    ${field('Body podľa poradia (oddelené čiarkou, od 1. miesta)',
      `<input data-scoring="stage" value="${esc(D.points.stage.join(', '))}">`,
      'Napr. 25, 20, 16, 14, 12, 10, 8, 6, 4, 2')}
    ${field('Body za ostatné miesta (mimo tabuľky)', `<input type="number" data-scoring="rest" value="${esc(D.points.rest)}" style="max-width:120px">`)}
    <p class="hint">Body prémií nastavíš v záložke <b>Typy prémií</b> (každý typ má vlastnú tabuľku).</p>
  `);
}

/* =====================================================================
   TAB: TYPY PRÉMIÍ
   ===================================================================== */
function tabPremies() {
  return `
    <div class="admin-head-row">
      <h2>Typy prémií</h2>
      <button class="btn btn-primary" data-add="premie">+ Nový typ prémie</button>
    </div>
    <p class="hint">Každý typ prémie má vlastnú klasifikáciu (dres) a bodovú tabuľku. V etape môžeš pridať ľubovoľný počet prémií daného typu.</p>
    ${D.premieTypes.map((t, i) => card(
      `<span class="cdot" style="background:${esc(t.color)}"></span> ${esc(t.name)}`,
      `
      ${field('Názov', `<input data-pt="${i}" data-k="name" value="${esc(t.name)}">`)}
      ${field('Farba (dres)', `<input type="color" data-pt="${i}" data-k="color" value="${esc(t.color)}" style="width:60px;padding:2px;height:40px">`)}
      ${field('Body podľa poradia (čiarkou)', `<input data-pt="${i}" data-k="points" value="${esc(t.points.join(', '))}">`)}
      <button class="btn btn-danger btn-sm" data-del="premie" data-i="${i}">Odstrániť typ</button>
      `, `id: ${esc(t.id)}`)).join('')}
  `;
}

/* =====================================================================
   TAB: TÍMY A JAZDCI
   ===================================================================== */
function tabTeams() {
  return `
    <div class="admin-head-row">
      <h2>Tímy a jazdci</h2>
      <button class="btn btn-primary" data-add="team">+ Nový tím</button>
    </div>
    ${D.teams.map((t, i) => card(
      `<span class="cdot" style="background:${esc(t.color)}"></span> ${esc(t.name)}`,
      `
      ${field('Názov tímu', `<input data-team="${i}" data-k="name" value="${esc(t.name)}">`)}
      ${field('Farba tímu', `<input type="color" data-team="${i}" data-k="color" value="${esc(t.color)}" style="width:60px;padding:2px;height:40px">`)}
      ${field('Jazdci (jeden na riadok)', `<textarea data-team="${i}" data-k="riders" rows="${Math.max(2, t.riders.length)}">${esc(arrToLines(t.riders))}</textarea>`)}
      <button class="btn btn-danger btn-sm" data-del="team" data-i="${i}">Odstrániť tím</button>
      `)).join('')}
  `;
}

/* =====================================================================
   TAB: ETAPY
   ===================================================================== */
function tabStages() {
  const riders = allRiderNames();
  return `
    <div class="admin-head-row">
      <h2>Etapy</h2>
      <button class="btn btn-primary" data-add="stage">+ Nová etapa</button>
    </div>
    <p class="hint">Dostupní jazdci: ${riders.map(r => `<span class="tagname">${esc(r)}</span>`).join(' ')}</p>
    ${D.stages.map((st, i) => stageCard(st, i)).join('')}
  `;
}

function stageCard(st, i) {
  const done = st.status === 'done';
  const premieOpts = D.premieTypes.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
  return `
    <div class="acard stage-acard ${done ? 'is-done' : ''}">
      <div class="acard-title collapsible" data-collapse>
        <span><b>Etapa ${st.n}</b> — ${esc(st.title || '(bez názvu)')} <small>${esc(st.date)}</small></span>
        <span class="badge ${done ? 'b-on' : ''}">${done ? 'odjazdená' : 'čaká sa'}</span>
      </div>
      <div class="acard-body">
        <div class="grid2">
          ${field('Číslo etapy', `<input type="number" data-stage="${i}" data-k="n" value="${esc(st.n)}">`)}
          ${field('Dátum', `<input data-stage="${i}" data-k="date" value="${esc(st.date)}">`)}
          ${field('Názov / trasa', `<input data-stage="${i}" data-k="title" value="${esc(st.title)}">`)}
          ${field('Typ', `<input data-stage="${i}" data-k="type" value="${esc(st.type)}">`)}
          ${field('Vzdialenosť', `<input data-stage="${i}" data-k="dist" value="${esc(st.dist)}">`)}
          ${field('Stav', `<select data-stage="${i}" data-k="status">
              <option value="upcoming" ${!done ? 'selected' : ''}>čaká sa</option>
              <option value="done" ${done ? 'selected' : ''}>odjazdená</option>
            </select>`)}
        </div>

        ${field('Poradie v cieli — menovaní (jeden na riadok, v poradí)',
          `<textarea data-stage="${i}" data-k="finish" rows="5">${esc(arrToLines(st.finish))}</textarea>`)}
        ${field(`Zvyšok pelotónu (bez presného poradia) <button class="btn btn-sm btn-ghost" data-fillrest="${i}">Doplniť ostatných</button>`,
          `<textarea data-stage="${i}" data-k="rest" rows="3">${esc(arrToLines(st.rest))}</textarea>`)}

        <div class="premie-block">
          <div class="admin-head-row sm">
            <h4>Prémie v tejto etape</h4>
            <div class="addrow">
              <select data-newpremie-type="${i}">${premieOpts}</select>
              <button class="btn btn-sm btn-primary" data-add="stagepremie" data-i="${i}">+ Pridať prémiu</button>
            </div>
          </div>
          ${(st.premies || []).map((p, pi) => {
            const type = D.premieTypes.find(t => t.id === p.typeId);
            return `
              <div class="premie-edit">
                <div class="premie-edit-head">
                  <span class="cdot" style="background:${type ? esc(type.color) : '#999'}"></span>
                  <select data-premie="${i}-${pi}" data-k="typeId">
                    ${D.premieTypes.map(t => `<option value="${esc(t.id)}" ${t.id === p.typeId ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
                  </select>
                  <input data-premie="${i}-${pi}" data-k="label" placeholder="Názov prémie" value="${esc(p.label)}">
                  <button class="btn btn-danger btn-sm" data-del="stagepremie" data-i="${i}" data-pi="${pi}">✕</button>
                </div>
                ${field('Poradie (jeden na riadok)', `<textarea data-premie="${i}-${pi}" data-k="order" rows="4">${esc(arrToLines(p.order))}</textarea>`)}
              </div>`;
          }).join('') || '<p class="hint">Zatiaľ žiadne prémie.</p>'}
        </div>

        ${field('Fotky etapy (názvy súborov z images/, jeden na riadok)',
          `<textarea data-stage="${i}" data-k="photos" rows="2">${esc(arrToLines(st.photos))}</textarea>`)}

        <button class="btn btn-danger btn-sm" data-del="stage" data-i="${i}">Odstrániť etapu</button>
      </div>
    </div>`;
}

/* =====================================================================
   TAB: GALÉRIA
   ===================================================================== */
function tabGallery() {
  return card('Spoločná galéria', `
    ${field('Názvy súborov (z priečinka images/, jeden na riadok)',
      `<textarea data-gallery rows="6">${esc(arrToLines(D.gallery))}</textarea>`,
      'Fotku najprv skopíruj do priečinka images/, potom sem zadaj jej názov, napr. start.jpg')}
  `);
}

/* =====================================================================
   TAB: PUBLIKOVANIE (GitHub) + ZÁLOHA
   ===================================================================== */
function tabPublish() {
  const c = loadGh();
  return `
    ${card('Publikovanie na GitHub Pages', `
      <p class="hint">Zmeny sa zapíšu do súboru <code>data.json</code> priamo v GitHub repozitári. GitHub Pages sa prebuduje a novú tabuľku uvidia všetci (aj mobil) do ~1 minúty. Žiadne cookies, žiadne ručné nahrávanie.</p>
      <div class="grid2">
        ${field('GitHub používateľ / organizácia', `<input data-gh="owner" value="${esc(c.owner || '')}" placeholder="napr. richardpukac">`)}
        ${field('Názov repozitára', `<input data-gh="repo" value="${esc(c.repo || '')}" placeholder="napr. cyklo">`)}
        ${field('Vetva (branch)', `<input data-gh="branch" value="${esc(c.branch || 'main')}" placeholder="main">`)}
        ${field('Cesta k súboru', `<input data-gh="path" value="${esc(c.path || 'data.json')}" placeholder="data.json">`)}
      </div>
      ${field('GitHub token', `<input type="password" data-gh="token" value="${esc(c.token || '')}" placeholder="github_pat_… alebo ghp_…">`,
        'Fine-grained token s právom „Contents: Read and write" na tento repozitár. Uloží sa len v tomto prehliadači.')}
      <div class="btnrow">
        <button class="btn btn-primary" data-publish>🚀 Publikovať teraz</button>
        <button class="btn btn-ghost" data-reload>↻ Načítať zo servera</button>
        <button class="btn btn-ghost" data-gh-clear>Vymazať token</button>
      </div>
      <p class="hint"><b>Kde vziať token:</b> GitHub → Settings → Developer settings → Personal access tokens → <b>Fine-grained tokens</b> → Generate new token. Repository access = tvoj repozitár, Permissions → <b>Contents = Read and write</b>. Token skopíruj sem.</p>
    `)}
    ${card('Záloha / obnova', `
      <div class="btnrow">
        <button class="btn btn-ghost" data-export="json">⬇ Stiahnuť data.json</button>
        <button class="btn btn-ghost" data-import>⬆ Importovať JSON zo súboru</button>
        <button class="btn btn-danger" data-reset>↺ Obnoviť továrenské dáta</button>
      </div>
      <input type="file" id="import-file" accept="application/json,.json" hidden>
      <p class="hint">„Stiahnuť data.json" je záloha aj núdzový spôsob — súbor vieš nahrať do repozitára aj ručne. Po importe/obnove/zmenách nezabudni <b>Publikovať</b>.</p>
      ${field('Náhľad dát (JSON, len na čítanie)', `<textarea readonly rows="10" class="mono">${esc(JSON.stringify(D, null, 2))}</textarea>`)}
    `)}
  `;
}

/* =====================================================================
   UI STAVEBNÉ BLOKY
   ===================================================================== */
function card(title, body, meta) {
  return `<div class="acard"><div class="acard-title"><span>${title}</span>${meta ? `<small class="cmeta">${meta}</small>` : ''}</div><div class="acard-body">${body}</div></div>`;
}
function field(label, control, hint) {
  return `<label class="fld"><span class="fld-l">${label}</span>${control}${hint ? `<span class="fld-h">${hint}</span>` : ''}</label>`;
}

/* =====================================================================
   OBSLUHA ZMIEN (event delegation)
   ===================================================================== */
$('#admin-main').addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.meta !== undefined) { D.meta[el.dataset.meta] = el.value; markDirty(); }
  else if (el.dataset.scoring !== undefined) {
    if (el.dataset.scoring === 'stage') D.points.stage = numsFromStr(el.value);
    else D.points.rest = parseInt(el.value, 10) || 0;
    markDirty();
  }
  else if (el.dataset.pt !== undefined) {
    const t = D.premieTypes[+el.dataset.pt], k = el.dataset.k;
    if (k === 'points') t.points = numsFromStr(el.value);
    else t[k] = el.value;
    markDirty();
  }
  else if (el.dataset.team !== undefined) {
    const t = D.teams[+el.dataset.team], k = el.dataset.k;
    if (k === 'riders') t.riders = linesToArr(el.value);
    else t[k] = el.value;
    markDirty();
  }
  else if (el.dataset.stage !== undefined) {
    const st = D.stages[+el.dataset.stage], k = el.dataset.k;
    if (k === 'finish' || k === 'rest' || k === 'photos') st[k] = linesToArr(el.value);
    else if (k === 'n') st.n = parseInt(el.value, 10) || st.n;
    else st[k] = el.value;
    markDirty();
  }
  else if (el.dataset.premie !== undefined) {
    const [si, pi] = el.dataset.premie.split('-').map(Number);
    const p = D.stages[si].premies[pi], k = el.dataset.k;
    if (k === 'order') p.order = linesToArr(el.value);
    else p[k] = el.value;
    markDirty();
  }
  else if (el.dataset.gallery !== undefined) { D.gallery = linesToArr(el.value); markDirty(); }
  else if (el.dataset.gh !== undefined) { const c = loadGh(); c[el.dataset.gh] = el.value.trim(); saveGh(c); }
});

/* Zmena stavu/typu (select) hneď prekreslí kartu kvôli farbám/badge */
$('#admin-main').addEventListener('change', e => {
  const el = e.target;
  if ((el.dataset.stage !== undefined && el.dataset.k === 'status') || (el.dataset.premie !== undefined && el.dataset.k === 'typeId')) {
    const active = document.querySelector('.atab.active').dataset.tab;
    // zachovaj rozbalené karty
    renderTab(active);
  }
});

/* Kliky: pridať/odstrániť/collapse/export... */
$('#admin-main').addEventListener('click', e => {
  const t = e.target.closest('[data-add],[data-del],[data-collapse],[data-fillrest],[data-export],[data-import],[data-reset],[data-publish],[data-reload],[data-gh-clear]');
  if (!t) return;

  /* Collapse etapy */
  if (t.dataset.collapse !== undefined) { t.closest('.acard').classList.toggle('collapsed'); return; }

  /* Doplniť zvyšok jazdcov */
  if (t.dataset.fillrest !== undefined) {
    const st = D.stages[+t.dataset.fillrest];
    const inFinish = new Set(st.finish);
    st.rest = allRiderNames().filter(r => !inFinish.has(r));
    markDirty(); renderTab('stages'); return;
  }

  /* Pridať */
  if (t.dataset.add) {
    if (t.dataset.add === 'premie') {
      const name = 'Nová prémia';
      D.premieTypes.push({ id: slug(name) + '-' + D.premieTypes.length, name, color: '#9b59b6', points: [5, 3, 2, 1] });
      markDirty(); renderTab('premies');
    } else if (t.dataset.add === 'team') {
      D.teams.push({ id: 'tim-' + D.teams.length, name: 'Nový tím', color: '#888888', riders: [] });
      markDirty(); renderTab('teams');
    } else if (t.dataset.add === 'stage') {
      const maxN = D.stages.reduce((m, s) => Math.max(m, s.n), 0);
      D.stages.push({ n: maxN + 1, date: '', title: 'Nová etapa', type: '', dist: '', status: 'upcoming', finish: [], rest: [], premies: [], photos: [] });
      markDirty(); renderTab('stages');
    } else if (t.dataset.add === 'stagepremie') {
      const i = +t.dataset.i;
      const typeSel = document.querySelector(`[data-newpremie-type="${i}"]`);
      const typeId = typeSel ? typeSel.value : (D.premieTypes[0] && D.premieTypes[0].id);
      const type = D.premieTypes.find(x => x.id === typeId);
      D.stages[i].premies.push({ typeId, label: type ? type.name : 'Prémia', order: [] });
      markDirty(); renderTab('stages');
    }
    return;
  }

  /* Odstrániť */
  if (t.dataset.del) {
    if (t.dataset.del === 'premie' && confirm('Odstrániť tento typ prémie?')) { D.premieTypes.splice(+t.dataset.i, 1); markDirty(); renderTab('premies'); }
    else if (t.dataset.del === 'team' && confirm('Odstrániť tento tím?')) { D.teams.splice(+t.dataset.i, 1); markDirty(); renderTab('teams'); }
    else if (t.dataset.del === 'stage' && confirm('Odstrániť túto etapu?')) { D.stages.splice(+t.dataset.i, 1); markDirty(); renderTab('stages'); }
    else if (t.dataset.del === 'stagepremie') { D.stages[+t.dataset.i].premies.splice(+t.dataset.pi, 1); markDirty(); renderTab('stages'); }
    return;
  }

  /* Publikovanie / GitHub */
  if (t.dataset.publish !== undefined) { publishNow(); return; }
  if (t.dataset.reload !== undefined) {
    if (dirty && !confirm('Máš nepublikované zmeny. Načítať zo servera a prepísať ich?')) return;
    (async () => {
      const loaded = await fetchData();
      D = loaded ? loaded : cloneData(DEFAULT_DATA);
      markClean(); renderTab('publish');
      toast(loaded ? '✓ Načítané zo servera.' : 'data.json sa nepodarilo načítať (použité továrenské).');
    })();
    return;
  }
  if (t.dataset.ghClear !== undefined) {
    const c = loadGh(); delete c.token; saveGh(c); renderTab('publish'); toast('Token vymazaný.');
    return;
  }

  /* Export / Import / Reset */
  if (t.dataset.export === 'json') download('data.json', JSON.stringify(D, null, 2));
  else if (t.dataset.import !== undefined) $('#import-file').click();
  else if (t.dataset.reset !== undefined) {
    if (confirm('Naozaj obnoviť pôvodné (továrenské) dáta? Zmeny sa prejavia až po publikovaní.')) {
      D = cloneData(DEFAULT_DATA);
      markDirty(); renderTab('publish'); toast('Obnovené na továrenské dáta. Publikuj, aby sa prejavili.');
    }
  }
});

/* Import JSON súboru */
document.addEventListener('change', e => {
  if (e.target.id !== 'import-file') return;
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!isValidData(parsed)) throw new Error('neplatný formát');
      D = parsed; markDirty(); renderTab('publish'); toast('✓ Importované. Nezabudni Publikovať.');
    } catch (err) { alert('Import zlyhal: ' + err.message); }
  };
  reader.readAsText(file);
});

/* ---------- SŤAHOVANIE ---------- */
function download(filename, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}
