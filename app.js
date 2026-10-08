/* Puzzle Corner app shell: state, home screen, game frame, settings, sounds, daily puzzle. */
(function () {
  'use strict';
  var PC = window.PC, E = PC.E;
  var KEY = 'puzzleCorner.v1';
  var GAME_IDS = ['ws', 'cw', 'su', 'sc', 'mm'];
  var ICONS = PC.ART.icon;
  var GEAR = '<svg class="gear-ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>';
  var PHONE_MAX_SCALE = 1.3;
  var DIFFS = ['easy', 'medium', 'hard'];
  var SCALES = [0.85, 1, 1.15, 1.3, 1.5, 1.7];

  /* ---------- state ---------- */
  function defaults() {
    var g = {};
    GAME_IDS.forEach(function (id) { g[id] = { diff: 'easy', theme: { en: 'any', tl: 'any' }, saves: {}, solved: 0 }; });
    return { v: 1, settings: { scale: 1, sound: true, timer: false, lang: 'en', mistakes: false, kb: 'screen' }, games: g, daily: {} };
  }
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || S.v !== 1) S = defaults();
  // Tagalog was removed: always English. Older saves may still say 'tl'.
  if (S.settings) S.settings.lang = 'en';
  if (S.games) Object.keys(S.games).forEach(function (id) { var g = S.games[id]; if (g && g.saves) Object.keys(g.saves).forEach(function (k) { if (k.indexOf('tl:') === 0) delete g.saves[k]; }); });
  (function merge() { var d = defaults(); for (var k in d.settings) if (!(k in S.settings)) S.settings[k] = d.settings[k]; GAME_IDS.forEach(function (id) { if (!S.games[id]) S.games[id] = d.games[id]; }); if (!S.daily) S.daily = {}; })();
  var saveTimer = null;
  function persist(now) {
    clearTimeout(saveTimer);
    var write = function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
    if (now) write(); else saveTimer = setTimeout(write, 150);
  }
  window.addEventListener('pagehide', function () { persist(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) persist(true); });

  /* ---------- helpers ---------- */
  function lang() { return 'en'; }
  function t(k, vars) {
    var s = PC.STR.en[k];
    if (s === undefined) return k;
    if (vars) for (var v in vars) s = s.split('{' + v + '}').join(vars[v]);
    return s;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function themes() { return PC.THEMES; }
  function clueBank() { return PC.CLUES; }
  function themeName(id) { var th = themes().filter(function (x) { return x.id === id; })[0]; return th ? th.name : id; }
  function memSetName(id) { var s = PC.MEMORY_SETS.filter(function (x) { return x.id === id; })[0]; return s ? s.name : id; }
  function memLabel(setId, i) { var s = PC.MEMORY_SETS.filter(function (x) { return x.id === setId; })[0]; return s.items[i][1]; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dayIndex(ds) { var p = ds.split('-').map(Number); return Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(2026, 0, 1)) / 86400000); }
  function niceDate(ds) {
    var p = ds.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2]);
    return PC.DAYS_EN[d.getDay()] + ', ' + PC.MONTHS_EN[d.getMonth()] + ' ' + d.getDate();
  }
  function fmtTime(s) { s = Math.floor(s || 0); var m = Math.floor(s / 60), h = Math.floor(m / 60); return (h ? h + ':' + String(m % 60).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); }
  function langScoped(gid) { return gid === 'ws' || gid === 'cw' || gid === 'sc'; }
  function saveKey(gid, diff, daily) { return (langScoped(gid) ? lang() + ':' : '') + (daily ? 'daily:' + today() : diff); }

  /* ---------- daily puzzle ---------- */
  function dailyInfo(ds) {
    ds = ds || today();
    var di = dayIndex(ds), gid = GAME_IDS[((di % 5) + 5) % 5], week = Math.floor(di / 5);
    var th = themes(), featured = th.filter(function (x) { return x.featured; }), others = th.filter(function (x) { return !x.featured; });
    var cyc = ((week % 4) + 4) % 4, theme = cyc < 3 ? featured[cyc].id : others[E.rng('dt' + ds).int(others.length)].id;
    return { date: ds, gid: gid, diff: 'medium', theme: theme, seed: 'daily-' + ds, done: !!S.daily[ds + ':' + gid] };
  }

  /* ---------- sound (gentle WebAudio tones) ---------- */
  var AC = null;
  function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
  document.addEventListener('pointerdown', function () { if (S.settings.sound) audio(); }, { capture: true, passive: true });
  function tone(freq, start, dur, vol, type) {
    var ac = AC; if (!ac) return;
    var o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + start;
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function sound(name) {
    if (!S.settings.sound || !audio()) return;
    var s = { tap: [[660, 0, 0.08, 0.04]], good: [[660, 0, 0.18, 0.08], [880, 0.09, 0.25, 0.07]],
      found: [[523, 0, 0.2, 0.08], [659, 0.1, 0.2, 0.08], [784, 0.2, 0.35, 0.08]], oops: [[330, 0, 0.22, 0.05, 'triangle']],
      win: [[523, 0, 0.3, 0.08], [659, 0.15, 0.3, 0.08], [784, 0.3, 0.3, 0.08], [1047, 0.45, 0.6, 0.08]] }[name] || [];
    s.forEach(function (x) { tone(x[0], x[1], x[2], x[3], x[4]); });
  }

  /* ---------- toast & sheet ---------- */
  var toastT = null;
  function toast(msg, ms) {
    var el = $('#toast'); el.textContent = msg; el.className = 'show';
    clearTimeout(toastT); toastT = setTimeout(function () { el.className = ''; }, ms || 2800);
  }
  // any tap dismisses a showing tip so it never sits on top of the letters
  document.addEventListener('pointerdown', function () { var el = $('#toast'); if (el.className === 'show') { el.className = ''; clearTimeout(toastT); } }, { capture: true, passive: true });
  function sheet(opts) {
    var el = $('#sheet');
    el.innerHTML = '<div class="sheet-box" role="dialog" aria-modal="true">' + (opts.icon ? '<div class="sheet-icon">' + opts.icon + '</div>' : '') +
      (opts.title ? '<h2>' + esc(opts.title) + '</h2>' : '') + (opts.text ? '<p>' + esc(opts.text) + '</p>' : '') + (opts.html || '') +
      '<div class="sheet-btns">' + (opts.buttons || []).map(function (b, i) { return '<button class="btn ' + (b.primary ? 'primary' : '') + '" data-sb="' + i + '"' + (b.id ? ' data-id="' + esc(b.id) + '"' : '') + '>' + esc(b.label) + '</button>'; }).join('') + '</div></div>';
    el.className = 'open';
    el.onclick = function (e) {
      var b = e.target.closest('[data-sb]');
      if (b) { var btn = opts.buttons[+b.dataset.sb]; closeSheet(); if (btn.action) btn.action(); return; }
      var o = e.target.closest('[data-opt]');
      if (o && opts.onOption) { closeSheet(); opts.onOption(o.dataset.opt); return; }
      if (e.target === el && !opts.modal) closeSheet();
    };
  }
  function closeSheet() { var el = $('#sheet'); el.className = ''; el.innerHTML = ''; }
  function confirmIt(text, yes, action) { sheet({ text: text, buttons: [{ label: t('cancel') }, { label: yes, primary: true, action: action }] }); }

  /* ---------- settings ---------- */
  function isPhone() { return Math.min(window.innerWidth, window.innerHeight) < 600; }
  function maxScale() { return isPhone() ? PHONE_MAX_SCALE : SCALES[SCALES.length - 1]; }
  function effScale() { return Math.min(S.settings.scale, maxScale()); }
  function applyScale() {
    document.documentElement.style.setProperty('--scale', effScale());
    document.documentElement.classList.toggle('phone', isPhone());
  }
  function applyLang() { document.documentElement.lang = 'en'; }
  function bumpScale(dir) {
    var list = SCALES.filter(function (x) { return x <= maxScale(); });
    var i = list.indexOf(effScale()); if (i < 0) i = list.indexOf(1);
    i = Math.max(0, Math.min(list.length - 1, i + dir)); S.settings.scale = list[i]; applyScale(); persist();
    sound('tap'); if (cur) setTimeout(function () { cur && cur.ui && cur.ui.layout && cur.ui.layout(); }, 30);
    updateToolbar();
  }
  function gearHtml() { return '<button class="btn gear" data-act="settings" aria-label="' + esc(t('settings')) + '">' + GEAR + '<span class="long">' + esc(t('settings')) + '</span></button>'; }
  function soundLabel() { return (S.settings.sound ? '\u{1F50A} ' : '\u{1F507} ') + esc(t('sound')) + ': ' + esc(S.settings.sound ? t('on') : t('off')); }
  function updateToolbar() {
    document.querySelectorAll('[data-act="smaller"]').forEach(function (b) { b.disabled = effScale() <= SCALES[0]; });
    document.querySelectorAll('[data-act="larger"]').forEach(function (b) { b.disabled = effScale() >= maxScale(); });
  }
  function settingsOpen() { return !!$('#sheet .settings-box'); }
  function openSettings() {
    var el = $('#sheet'), inGame = !!cur, G = cur ? PC.G[cur.gid] : null, html = '';
    if (inGame && !cur.daily) {
      html += '<div class="srow"><div class="slbl">' + esc(t('difficulty')) + '</div><div class="seg wide-seg" role="group">' + DIFFS.map(function (d) { return '<button class="btn ' + (d === cur.diff ? 'on' : '') + '" data-sdiff="' + d + '" aria-pressed="' + (d === cur.diff) + '">' + esc(t(d)) + '</button>'; }).join('') + '</div></div>';
      if (G.picker) html += '<div class="srow"><button class="btn wide" data-spicker="1">' + esc(G.picker(api).label) + ' \u25BE</button></div>';
    }
    var pct = Math.round(effScale() * 100);
    html += '<div class="srow"><div class="slbl">' + esc(t('textSize')) + '</div><div class="sizer"><button class="btn tool" data-act="smaller" aria-label="' + esc(t('smaller')) + '">A\u2212</button><span class="sizeval">' + pct + '%</span><button class="btn tool" data-act="larger" aria-label="' + esc(t('larger')) + '">A+</button></div></div>';
    html += '<div class="srow two-btn"><button class="btn sound" data-act="sound" aria-pressed="' + S.settings.sound + '">' + soundLabel() + '</button>' +
      '<button class="btn" data-act="timer" aria-pressed="' + S.settings.timer + '">\u23F1\uFE0F ' + esc(S.settings.timer ? t('timerOn') : t('timerOff')) + '</button></div>';
    if (inGame) html += '<div class="srow howbox"><div class="slbl">' + esc(t('howShort')) + '</div><p>' + esc(t(cur.gid + '_how')) + '</p></div>';
    el.innerHTML = '<div class="sheet-box settings-box" role="dialog" aria-modal="true" aria-label="' + esc(t('settingsTitle')) + '"><h2>' + GEAR + ' ' + esc(t('settingsTitle')) + '</h2>' + html +
      '<div class="sheet-btns"><button class="btn primary" data-sclose="1">' + esc(t('done')) + '</button></div></div>';
    el.className = 'open';
    el.onclick = function (e) {
      if (e.target.closest('[data-sclose]') || e.target === el) { closeSheet(); return; }
      var d = e.target.closest('[data-sdiff]');
      if (d) { closeSheet(); if (d.dataset.sdiff !== cur.diff) { sound('tap'); S.games[cur.gid].diff = d.dataset.sdiff; persist(); render(); } return; }
      if (e.target.closest('[data-spicker]')) { closeSheet(); openPicker(); }
    };
    updateToolbar();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.dataset.act;
    if (a === 'smaller') bumpScale(-1);
    else if (a === 'larger') bumpScale(1);
    else if (a === 'sound') { S.settings.sound = !S.settings.sound; persist(); if (S.settings.sound) { audio(); sound('good'); } }
    else if (a === 'timer') { S.settings.timer = !S.settings.timer; persist(); sound('tap'); var tm = $('.timer'); if (tm) tm.hidden = !S.settings.timer; }
    else if (a === 'settings') { sound('tap'); openSettings(); return; }
    else if (a === 'home') { go(''); return; }
    if (settingsOpen()) openSettings();
  });

  /* ---------- routing ---------- */
  var cur = null; // { gid, diff, daily, st, ui }
  function go(hash) { if (location.hash.replace('#', '') === hash) render(); else location.hash = hash; }
  window.addEventListener('hashchange', render);
  function render() {
    closeSheet();
    if (cur && cur.ui && cur.ui.destroy) cur.ui.destroy();
    cur = null;
    var h = location.hash.replace(/^#\/?/, '');
    var m = h.match(/^(ws|cw|su|sc|mm)(?:\/(daily))?$/);
    if (m) openGame(m[1], !!m[2]); else renderHome();
    updateToolbar();
    window.scrollTo(0, 0);
  }

  /* ---------- home ---------- */
  function renderHome() {
    var hr = new Date().getHours(), greet = hr < 12 ? t('greetMorning') : hr < 18 ? t('greetAfternoon') : t('greetEvening');
    var di = dailyInfo(), dsave = S.games[di.gid].saves[saveKey(di.gid, di.diff, true)];
    var dsub = di.gid === 'ws' || di.gid === 'sc' ? t('sc_cat', { c: themeName(di.theme) }) : di.gid === 'cw' ? t('topic') + ': ' + t('topicMixed') : t(di.diff);
    var feat = themes().filter(function (x) { return x.featured; });
    var ART = PC.ART;
    var html = '<div class="screen home">' +
      '<header class="home-top"><div class="brand">' + ART.logo('logo') + '<div><h1>Puzzle Corner</h1><p class="greet">' + esc(greet) + '</p></div></div>' + gearHtml() + '</header>' +
      '<p class="sub">' + esc(t('homeSub')) + '</p>' +
      '<section class="daily card ' + (di.done ? 'done' : '') + '">' + ART.rosette(null, null, null, 'daily-deco') + '<div class="daily-ic">' + ICONS[di.gid] + '</div><div class="daily-txt"><div class="kicker">' + esc(t('daily')) + ' \u00B7 ' + esc(niceDate(di.date)) + '</div>' +
      '<h2>' + esc(t(di.gid + '_name')) + '</h2><p>' + esc(dsub) + '</p>' + (di.done ? '<p class="donemsg">\u2714\uFE0F ' + esc(t('dailyDone')) + '</p>' : '') + '</div>' +
      '<button class="btn primary big" data-daily="1">' + esc(di.done ? t('dailyAgain') : dsave ? t('dailyContinue') : t('dailyPlay')) + '</button></section>' +
      '<h2 class="sec">' + ART.sprig('sec-ic') + esc(t('favorites')) + '</h2><p class="secsub">' + esc(t('favSub')) + '</p><div class="favs">' +
      feat.map(function (f) { return '<button class="btn fav" data-fav="' + f.id + '"><span class="fic">' + f.icon + '</span><span>' + esc(f.name) + '</span></button>'; }).join('') + '</div>' +
      '<h2 class="sec">' + ART.sprig('sec-ic') + esc(t('games')) + '</h2><div class="cards">' +
      GAME_IDS.map(function (id) {
        var g = S.games[id], inprog = Object.keys(g.saves).some(function (k) { var s = g.saves[k]; return s && !s.done && k.indexOf('daily') < 0 && (!langScoped(id) || k.indexOf(lang() + ':') === 0); });
        return '<button class="card gcard gc-' + id + '" data-game="' + id + '"><span class="gic">' + ICONS[id] + '</span><span class="gtxt"><span class="gname">' + esc(t(id + '_name')) + '</span><span class="gdesc">' + esc(t(id + '_desc')) + '</span>' +
          '<span class="gmeta">' + (g.solved ? esc(t('solvedN', { n: g.solved })) : '') + (inprog ? ' <span class="pill">' + esc(t('inProgress')) + '</span>' : '') + '</span></span><span class="go">' + esc(inprog ? t('cont') : t('play')) + ' \u203A</span></button>';
      }).join('') + '</div>' +
      '<footer class="home-foot"><div class="garden">' + ART.cactus('pot') + ART.logo('pot big') + ART.rosette('#9cc29f', '#c8e0c0', '#e8a59a', 'pot') + '</div><p>' + esc(t('offlineNote')) + '</p></footer></div>';
    $('#app').innerHTML = html;
    $('#app').onclick = function (e) {
      var g = e.target.closest('[data-game]'); if (g) { sound('tap'); go(g.dataset.game); return; }
      if (e.target.closest('[data-daily]')) { sound('tap'); go(dailyInfo().gid + '/daily'); return; }
      var f = e.target.closest('[data-fav]');
      if (f) { sound('tap'); var gs = S.games.ws; var key = saveKey('ws', gs.diff, false), sv = gs.saves[key];
        if (gs.theme[lang()] !== f.dataset.fav || !sv || sv.done) { gs.theme[lang()] = f.dataset.fav; gs.saves[key] = null; pendingNew = true; }
        persist(); go('ws'); }
    };
  }
  var pendingNew = false;

  /* ---------- game frame ---------- */
  function newState(gid, diff, daily) {
    var G = PC.G[gid], di = daily ? dailyInfo() : null;
    var seed = daily ? di.seed : E.newSeed();
    var theme = daily ? (gid === 'cw' ? 'daily' : di.theme) : S.games[gid].theme[lang()];
    var st = G.create({ seed: seed, diff: diff, theme: theme, themes: themes(), bank: clueBank(), lang: lang() });
    st.seed = seed; st.diff = diff; st.lang = lang(); st.elapsed = 0; st.done = false; st.revealed = false; st.daily = daily ? di.date : null;
    return st;
  }
  function openGame(gid, daily) {
    var G = PC.G[gid], gs = S.games[gid];
    var di = daily ? dailyInfo() : null, diff = daily ? di.diff : gs.diff;
    // tidy old daily saves
    Object.keys(gs.saves).forEach(function (k) { if (k.indexOf('daily:') >= 0 && k.indexOf('daily:' + today()) < 0) delete gs.saves[k]; });
    var key = saveKey(gid, diff, daily), st = gs.saves[key];
    if (!st || (!daily && st.done) || pendingNew) { st = newState(gid, diff, daily); gs.saves[key] = st; persist(); }
    pendingNew = false;
    cur = { gid: gid, diff: diff, daily: daily, st: st, key: key };
    var picker = G.picker ? G.picker(api) : null;
    if (!S.settings.howSeen) S.settings.howSeen = {};
    var phone = isPhone(), firstTime = !S.settings.howSeen[gid];
    S.settings.howSeen[gid] = 1; persist();
    var newBtn = daily ? '' : '<button class="btn newbtn" data-new="1"><span class="spark" aria-hidden="true">\u2728</span> <span class="long">' + esc(t('newPuzzle')) + '</span><span class="short">' + esc(t('newShort')) + '</span></button>';
    var html = '<div class="screen game g-' + gid + '">' +
      '<header class="topbar"><button class="btn homebtn" data-act="home" aria-label="' + esc(t('home')) + '">\u2190 ' + esc(t('home')) + '</button><h1><span class="tic">' + ICONS[gid] + '</span><span class="tname">' + (PC.STR.en[gid + '_short'] ? '<span class="long">' + esc(t(gid + '_name')) + '</span><span class="short">' + esc(t(gid + '_short')) + '</span>' : esc(t(gid + '_name'))) + '</span></h1>' +
      '<span class="timer" ' + (S.settings.timer ? '' : 'hidden') + '>\u23F1\uFE0F <b>' + fmtTime(st.elapsed) + '</b></span>' + (phone ? newBtn : '') + gearHtml() + '</header>' +
      (daily ? '<div class="gamebar"><span class="dtag">\u2B50 ' + esc(t('dailyTag')) + ' \u00B7 ' + esc(niceDate(today())) + '</span></div>' :
        phone ? '' : '<div class="gamebar"><div class="seg" role="group">' + DIFFS.map(function (d) { return '<button class="btn ' + (d === diff ? 'on' : '') + '" data-diff="' + d + '" aria-pressed="' + (d === diff) + '">' + esc(t(d)) + '</button>'; }).join('') + '</div>' +
        (picker ? '<button class="btn" data-picker="1">' + esc(picker.label) + ' \u25BE</button>' : '') + newBtn + '</div>') +
      (phone ? '' : '<p class="how"><b>' + esc(t('howTo')) + '</b> ' + esc(t(gid + '_how')) + '</p>') +
      '<div class="gbody" id="gbody"></div></div>';
    if (phone && firstTime) setTimeout(function () { toast(t(gid + '_how'), 6500); }, 400);
    $('#app').innerHTML = html;
    $('#app').onclick = function (e) {
      var d = e.target.closest('[data-diff]');
      if (d) { if (d.dataset.diff !== cur.diff) { sound('tap'); gs.diff = d.dataset.diff; persist(); render(); } return; }
      if (e.target.closest('[data-new]')) {
        var started = cur.st && !cur.st.done && G.started && G.started(cur.st);
        var doNew = function () { gs.saves[cur.key] = null; pendingNew = true; render(); };
        if (started) confirmIt(t('confirmNew'), t('yesNew'), doNew); else doNew();
        return;
      }
      if (e.target.closest('[data-picker]')) openPicker();
    };
    cur.ui = G.mount($('#gbody'), st, api);
    if (st.done) setTimeout(function () { cur && cur.ui && cur.ui.showDone && cur.ui.showDone(); }, 0);
  }
  function openPicker() {
    var G = PC.G[cur.gid], gs = S.games[cur.gid];
        var p = G.picker(api);
        sheet({ title: p.title, html: '<div class="opts">' + p.options.map(function (o) { return '<button class="btn opt ' + (o.id === p.current ? 'on' : '') + '" data-opt="' + esc(o.id) + '">' + (o.icon ? '<span class="fic">' + o.icon + '</span>' : '') + esc(o.name) + '</button>'; }).join('') + '</div>',
          buttons: [{ label: t('cancel') }], onOption: function (id) {
            if (id === p.current && cur.st && !cur.st.done) return;
            var apply = function () { p.set(id); persist(); gs.saves[cur.key] = null; pendingNew = true; render(); };
            if (cur.st && !cur.st.done && G.started && G.started(cur.st)) confirmIt(t('confirmNew'), t('yesNew'), apply); else apply();
          } });
  }

  // per-second timer (counts only while the game screen is visible and unfinished)
  setInterval(function () {
    if (!cur || !cur.st || cur.st.done || document.hidden || $('#sheet').className === 'open') return;
    cur.st.elapsed = (cur.st.elapsed || 0) + 1;
    if (cur.st.elapsed % 5 === 0) persist();
    var tm = $('.timer b'); if (tm) tm.textContent = fmtTime(cur.st.elapsed);
  }, 1000);

  function finish(revealed) {
    if (!cur || cur.st.done) return;
    var st = cur.st, gid = cur.gid;
    st.done = true; st.revealed = !!revealed;
    if (!revealed) { S.games[gid].solved = (S.games[gid].solved || 0) + 1; }
    if (st.daily) S.daily[st.daily + ':' + gid] = true;
    persist(true);
    if (!revealed) { sound('win'); celebrate(); }
    setTimeout(function () { showDoneSheet(); }, revealed ? 300 : 1500);
  }
  function showDoneSheet() {
    if (!cur) return;
    var st = cur.st, daily = !!st.daily;
    var btns = [{ label: t('seeBoard') }];
    if (!daily) btns.push({ label: t('newPuzzle'), primary: true, action: function () { S.games[cur.gid].saves[cur.key] = null; pendingNew = true; render(); } });
    btns.push({ label: t('backHome'), primary: daily, action: function () { go(''); } });
    sheet({ icon: st.revealed ? '\u{1F4D6}' : '\u{1F338}', title: st.revealed ? t('revealedTitle') : t('wellDone'),
      text: st.revealed ? t('revealedMsg') : (daily ? t('dailyDoneMsg') : t('solvedMsg')) + (S.settings.timer ? '  ' + t('timeTaken', { t: fmtTime(st.elapsed) }) : ''), buttons: btns });
  }
  function celebrate() {
    var fx = $('#fx'), bits = ['\u{1F338}', '\u{1F33F}', '\u{1FAB4}', '\u2728', '\u{1F33C}', '\u{1F335}'];
    fx.innerHTML = '';
    var bw = document.createElement('div'); bw.className = 'bloom-wrap'; bw.innerHTML = PC.ART.bloom(); fx.appendChild(bw);
    setTimeout(function () { bw.remove(); }, 3400);
    for (var i = 0; i < 22; i++) {
      var s = document.createElement('span'); s.className = 'petal'; s.textContent = bits[i % bits.length];
      s.style.left = (Math.random() * 96) + 'vw'; s.style.animationDelay = (0.3 + Math.random() * 0.9) + 's'; s.style.fontSize = (22 + Math.random() * 20) + 'px';
      fx.appendChild(s); setTimeout(function (el) { el.remove(); }.bind(null, s), 4600);
    }
  }

  /* ---------- board fitting ---------- */
  function isLandscape() { return window.innerWidth > window.innerHeight && window.innerWidth >= 700; }
  // returns a cell size that fits cols x rows into the element's width and the remaining viewport height
  function fit(el, cols, rows, reserve, aspect, topEl, maxCell, minCell) {
    aspect = aspect || 1;
    var w = el.clientWidth || window.innerWidth - 24;
    var top = (topEl || el).getBoundingClientRect().top + window.scrollY;
    var avH = window.innerHeight - top - (isLandscape() ? 14 : (reserve || 0));
    if (avH < window.innerHeight * 0.5 && !isPhone()) avH = window.innerHeight * (isLandscape() ? 0.9 : 0.62);
    var cell = Math.floor(Math.min(w / cols, avH / (rows * aspect)));
    return Math.max(minCell || 24, Math.min(cell, maxCell || 96));
  }

  var api = {
    t: t, esc: esc, sound: sound, toast: toast, sheet: sheet, confirm: confirmIt, fit: fit, isLandscape: isLandscape, isPhone: isPhone,
    save: function () { persist(); }, finish: finish, showDoneSheet: showDoneSheet,
    lang: lang, settings: function () { return S.settings; }, setSetting: function (k, v) { S.settings[k] = v; persist(); },
    themes: themes, themeName: themeName, memSetName: memSetName, memLabel: memLabel,
    gameState: function (gid) { return S.games[gid]; }
  };
  PC.api = api;

  // test hook
  window.__pc = { isPhone: isPhone, effScale: effScale, S: function () { return S; }, cur: function () { return cur; }, render: render, dailyInfo: dailyInfo, persist: persist, today: today };

  /* ---------- boot ---------- */
  // a big text size saved earlier would crowd a phone screen: clamp it there
  if (isPhone() && S.settings.scale > PHONE_MAX_SCALE) { S.settings.scale = PHONE_MAX_SCALE; persist(); }
  applyScale(); applyLang();
  var resizeT = null;
  var wasPhone = isPhone();
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () {
    applyScale();
    if (isPhone() !== wasPhone) { wasPhone = isPhone(); if (!settingsOpen()) render(); return; }
    if (cur && cur.ui && cur.ui.layout) cur.ui.layout(); }, 120); });
  document.addEventListener('keydown', function (e) {
    if ($('#sheet').className === 'open') { if (e.key === 'Escape') closeSheet(); return; }
    if (cur && cur.ui && cur.ui.onKey && !e.metaKey && !e.ctrlKey && !e.altKey) cur.ui.onKey(e);
  });
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
  }
})();
