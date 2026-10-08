/* Puzzle Corner games: Word Search, Crossword, Sudoku, Word Scramble, Memory Match. */
(function () {
  'use strict';
  var PC = window.PC, E = PC.E;
  var G = PC.G = {};
  function $(s, r) { return r.querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call(r.querySelectorAll(s)); }
  function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }
  var COLORS = ['#a8d5b0', '#f6b8ab', '#aecdef', '#f7d58a', '#cdbbec', '#9fd8cf', '#f3b9d3', '#cfe19a', '#f8c79c', '#b9c9f0', '#e3c9a6', '#bfe3b4'];

  function themePicker(gid, api) {
    var gs = api.gameState(gid), L = api.lang(), cur = gs.theme[L] || 'any';
    var opts = [{ id: 'any', name: api.t('anyTheme'), icon: '\u{1F3B2}' }].concat(api.themes().map(function (x) { return { id: x.id, name: x.name, icon: x.icon }; }));
    var curName = cur === 'any' ? api.t('anyTheme') : api.themeName(cur);
    return { title: api.t('chooseTheme'), label: api.t('theme') + ': ' + curName, current: cur, options: opts, set: function (id) { gs.theme[L] = id; } };
  }

  /* =====================================================================
     WORD SEARCH
     ===================================================================== */
  G.ws = {
    create: function (o) {
      var p = E.genWordSearch(o.seed, o.diff, o.themes, o.theme === 'any' ? null : o.theme);
      return { p: p, found: [], hint: null };
    },
    started: function (st) { return st.found.length > 0; },
    picker: function (api) { return themePicker('ws', api); },
    mount: function (el, st, api) {
      var t = api.t, p = st.p, n = p.size, anchor = null, down = null, dragging = false;
      el.innerHTML = '<div class="two"><div class="board-area"><div class="ws-head"><div class="side-head"><h3>' + api.esc(p.themeName) + '</h3><p class="prog"></p></div><ul class="wlist" aria-label="' + api.esc(t('wordsToFind')) + '"></ul></div><div class="ws-board"><svg class="ws-svg" viewBox="0 0 ' + n + ' ' + n + '" preserveAspectRatio="none" aria-hidden="true"></svg><div class="ws-grid" role="grid"></div></div><p class="status" aria-live="polite"></p></div>' +
        '<div class="side"><div class="actions"><button class="btn" data-hint>\u{1F4A1} ' + t('hint') + '</button><button class="btn" data-reveal>\u{1F441}\uFE0F ' + t('reveal') + '</button></div></div></div>';
      var grid = $('.ws-grid', el), svg = $('.ws-svg', el), board = $('.ws-board', el), area = $('.board-area', el), status = $('.status', el), head = $('.ws-head', el), side = $('.side', el);
      var html = '';
      for (var i = 0; i < n * n; i++) html += '<div class="wc" data-i="' + i + '">' + p.grid[Math.floor(i / n)][i % n] + '</div>';
      grid.innerHTML = html;
      grid.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
      var cells = $$('.wc', grid);
      function say(msg) { status.textContent = msg || ''; }
      function line(a, b, color, cls, op) {
        var r1 = Math.floor(a / n), c1 = a % n, r2 = Math.floor(b / n), c2 = b % n;
        return '<line class="' + (cls || '') + '" x1="' + (c1 + 0.5) + '" y1="' + (r1 + 0.5) + '" x2="' + (c2 + 0.5) + '" y2="' + (r2 + 0.5) + '" stroke="' + color + '" stroke-width="0.76" stroke-linecap="round" opacity="' + (op || 0.85) + '"/>';
      }
      function endOf(w) { return (w.r + w.dr * (w.a.length - 1)) * n + (w.c + w.dc * (w.a.length - 1)); }
      var justFound = -1;
      function draw(sel) {
        var s = '';
        p.words.forEach(function (w, k) {
          var fi = st.found.indexOf(k);
          if (fi >= 0) s += line(w.r * n + w.c, endOf(w), COLORS[fi % COLORS.length]);
          else if (st.revealed) s += line(w.r * n + w.c, endOf(w), '#c9bfb3', 'rev');
        });
        if (sel) s += line(sel[0], sel[1], '#ffd77a', 'sel', 0.8);
        svg.innerHTML = s;
        cells.forEach(function (c, k) { c.classList.toggle('anchor', k === anchor); c.classList.toggle('hint', st.hint !== null && !st.done && k === (p.words[st.hint].r * n + p.words[st.hint].c) && st.found.indexOf(st.hint) < 0); });
        $('.prog', el).textContent = t('ws_found', { a: st.found.length, b: p.words.length });
        $('.wlist', el).innerHTML = p.words.map(function (w, k) {
          var f = st.found.indexOf(k) >= 0;
          return '<li class="' + (f ? 'found' : (st.revealed ? 'rev' : '')) + (k === justFound ? ' pop' : '') + '"' + (f ? ' style="--hl:' + COLORS[st.found.indexOf(k) % COLORS.length] + '"' : '') + '>' + '<span class="w">' + api.esc(w.w) + '</span></li>';
        }).join('');
      }
      function cellAt(x, y) { var e = document.elementFromPoint(x, y); var c = e && e.closest && e.closest('.wc'); return c && grid.contains(c) ? +c.dataset.i : null; }
      function attempt(a, b) {
        var r1 = Math.floor(a / n), c1 = a % n, r2 = Math.floor(b / n), c2 = b % n;
        if (!(r1 === r2 || c1 === c2 || Math.abs(r1 - r2) === Math.abs(c1 - c2))) { say(t('ws_straight')); api.sound('oops'); return; }
        for (var k = 0; k < p.words.length; k++) {
          var w = p.words[k], s = w.r * n + w.c, e = endOf(w);
          if ((s === a && e === b) || (s === b && e === a)) {
            if (st.found.indexOf(k) >= 0) { say(''); return; }
            st.found.push(k); if (st.hint === k) st.hint = null; api.sound('found'); say('\u2714 ' + w.w); api.save(); justFound = k; draw(); justFound = -1;
            if (st.found.length === p.words.length) { say(t('ws_allFound')); api.finish(false); }
            return;
          }
        }
        say(t('ws_notWord')); api.sound('oops');
      }
      function tap(c) {
        if (anchor === null) { anchor = c; api.sound('tap'); say(t('ws_tapLast')); }
        else if (anchor === c) { anchor = null; say(''); }
        else { var a = anchor; anchor = null; attempt(a, c); }
        draw();
      }
      grid.addEventListener('pointerdown', function (e) {
        if (st.done) return;
        var c = cellAt(e.clientX, e.clientY); if (c === null) return;
        e.preventDefault(); down = c; dragging = false;
        try { grid.setPointerCapture(e.pointerId); } catch (x) { }
      });
      grid.addEventListener('pointermove', function (e) {
        if (down === null) return;
        var c = cellAt(e.clientX, e.clientY);
        if (c !== null && c !== down) { dragging = true; anchor = null; draw([down, c]); }
      });
      grid.addEventListener('pointerup', function (e) {
        if (down === null) return;
        var c = cellAt(e.clientX, e.clientY), d = down; down = null;
        if (dragging && c !== null && c !== d) { draw(); attempt(d, c); draw(); }
        else if (!dragging) tap(d);
        else draw();
        dragging = false;
      });
      grid.addEventListener('pointercancel', function () { down = null; dragging = false; draw(); });
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-hint]')) {
          if (st.done) return;
          var left = p.words.map(function (w, k) { return k; }).filter(function (k) { return st.found.indexOf(k) < 0; });
          if (!left.length) return;
          st.hint = left[Math.floor(Math.random() * left.length)]; st.hints = (st.hints || 0) + 1; api.save(); api.sound('tap');
          say(t('ws_hintMsg', { w: p.words[st.hint].w })); draw();
        }
        if (e.target.closest('[data-reveal]')) {
          if (st.done) return;
          api.confirm(t('confirmReveal'), t('yesReveal'), function () { st.revealed = true; anchor = null; draw(); api.finish(true); });
        }
      });
      function layout() {
        // portrait (phones, iPad upright): word list sits right above the grid so both stay on screen.
        // landscape: list goes in the side panel.
        var land = api.isLandscape();
        if (land) { if (head.parentNode !== side) side.insertBefore(head, side.firstChild); }
        else if (head.parentNode !== area) area.insertBefore(head, board);
        el.classList.toggle('ws-compact', !land);
        var reserve = land ? 0 : (api.isPhone() ? status.offsetHeight + 8 : 130);
        var cell = api.fit(area, n, n, reserve, 1, board, api.isPhone() ? 54 : 96, 20);
        board.style.width = board.style.height = (cell * n) + 'px';
        grid.style.fontSize = Math.round(cell * 0.58) + 'px';
      }
      draw(); layout();
      return { layout: layout, onKey: function (e) { if (e.key === 'Escape') { anchor = null; draw(); } } };
    }
  };

  /* =====================================================================
     CROSSWORD
     ===================================================================== */
  G.cw = {
    create: function (o) {
      var favor = o.theme === 'daily' ? { p: 0.3, c: 0.3 } : o.theme === 'plants' ? { p: 0.6 } : o.theme === 'home' ? { c: 0.6 } : { p: 0.08, c: 0.08 };
      var p = E.genCrossword(o.seed, o.diff, o.bank, favor), N = p.w * p.h, z = [];
      for (var i = 0; i < N; i++) z.push('');
      return { p: p, fill: z.slice(), wrong: z.map(function () { return 0; }), rev: z.map(function () { return 0; }), sel: null, undo: [] };
    },
    started: function (st) { return st.fill.some(function (x) { return x; }); },
    picker: function (api) {
      var gs = api.gameState('cw'), L = api.lang(), cur = gs.theme[L] || 'any';
      var names = { any: api.t('topicMixed'), plants: api.t('topicPlants'), home: api.t('topicHome') };
      return { title: api.t('chooseTopic'), label: api.t('topic') + ': ' + (names[cur] || names.any), current: cur,
        options: [{ id: 'any', name: names.any, icon: '\u{1F3B2}' }, { id: 'plants', name: names.plants, icon: '\u{1FAB4}' }, { id: 'home', name: names.home, icon: '\u{1F9FD}' }],
        set: function (id) { gs.theme[L] = id; } };
    },
    mount: function (el, st, api) {
      var t = api.t, p = st.p, W = p.w, H = p.h, N = W * H, ent = p.entries, at = [];
      for (var i = 0; i < N; i++) at.push({});
      ent.forEach(function (e, k) { for (var j = 0; j < e.a.length; j++) at[(e.r + (e.dir === 'D' ? j : 0)) * W + e.c + (e.dir === 'A' ? j : 0)][e.dir] = k; });
      var ans = []; for (i = 0; i < N; i++) ans.push(p.grid[Math.floor(i / W)][i % W]);
      function cellsOf(k) { var e = ent[k], out = []; for (var j = 0; j < e.a.length; j++) out.push((e.r + (e.dir === 'D' ? j : 0)) * W + e.c + (e.dir === 'A' ? j : 0)); return out; }
      if (!st.sel) st.sel = { i: ent[0].r * W + ent[0].c, dir: ent[0].dir };
      el.innerHTML = '<div class="two"><div class="board-area"><div class="cluebar"><button class="btn cnav" data-prev aria-label="' + t('prevClue') + '">\u25C0</button><div class="cluetext"></div><button class="btn cnav" data-next aria-label="' + t('nextClue') + '">\u25B6</button></div>' +
        '<div class="cw-board"><div class="cw-grid"></div></div></div>' +
        '<div class="side"><div class="kbd"></div><div class="actions"><button class="btn" data-hint>\u{1F4A1} ' + t('hint') + '</button><button class="btn" data-check>\u2714\uFE0F ' + t('check') + ' \u25BE</button><button class="btn" data-reveal>\u{1F441}\uFE0F ' + t('reveal') + ' \u25BE</button><button class="btn" data-undo>\u21B6 ' + t('undo') + '</button></div>' +
        '<button class="btn kbmode" data-kb></button><div class="clues"><div><h3>' + t('across') + '</h3><ol class="cl" data-d="A"></ol></div><div><h3>' + t('down') + '</h3><ol class="cl" data-d="D"></ol></div></div></div></div>' +
        '<input class="hidden-input" id="cwin" type="text" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" aria-label="letters" value=" ">';
      var grid = $('.cw-grid', el), board = $('.cw-board', el), area = $('.board-area', el), inp = $('#cwin', el);
      var html = '', nums = {};
      ent.forEach(function (e) { nums[e.r * W + e.c] = e.n; });
      for (i = 0; i < N; i++) html += ans[i] === '#' ? '<div class="cc blank"></div>' : '<div class="cc" data-i="' + i + '">' + (nums[i] ? '<span class="num">' + nums[i] + '</span>' : '') + '<span class="ch"></span></div>';
      grid.innerHTML = html; grid.style.gridTemplateColumns = 'repeat(' + W + ', 1fr)';
      var cellEls = {}; $$('.cc[data-i]', grid).forEach(function (c) { cellEls[c.dataset.i] = c; });
      function curEntry() { var a = at[st.sel.i]; return a[st.sel.dir] !== undefined ? a[st.sel.dir] : a[st.sel.dir === 'A' ? 'D' : 'A']; }
      function draw() {
        var k = curEntry(), e = ent[k], wc = cellsOf(k);
        st.sel.dir = e.dir;
        for (var x in cellEls) {
          var c = cellEls[x], ix = +x;
          c.querySelector('.ch').textContent = st.fill[ix];
          c.classList.toggle('sel', ix === st.sel.i); c.classList.toggle('word', wc.indexOf(ix) >= 0);
          c.classList.toggle('bad', !!st.wrong[ix] && !!st.fill[ix]); c.classList.toggle('rev', !!st.rev[ix]);
        }
        $('.cluetext', el).innerHTML = '<b>' + e.n + ' ' + (e.dir === 'A' ? t('across') : t('down')) + '</b> <span>' + api.esc(e.clue) + '</span> <span class="len">(' + e.a.length + ')</span>';
        $$('.cl', el).forEach(function (ol) {
          ol.innerHTML = ent.map(function (x, j) { if (x.dir !== ol.dataset.d) return ''; var full = cellsOf(j).every(function (q) { return st.fill[q]; });
            return '<li data-e="' + j + '" class="' + (j === k ? 'on ' : '') + (full ? 'full' : '') + '"><b>' + x.n + '</b> ' + api.esc(x.clue) + '</li>'; }).join('');
        });
        var kb = api.settings().kb === 'device';
        $('[data-kb]', el).textContent = '\u2328\uFE0F ' + (kb ? t('kbDevice') : t('kbScreen'));
        $('.kbd', el).hidden = kb;
      }
      function buildKbd() {
        var wide = $('.side', el).clientWidth >= 560 || (!api.isLandscape() && el.clientWidth >= 560);
        var rows = wide ? ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] : ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', 'VWXYZ'];
        $('.kbd', el).className = 'kbd ' + (wide ? 'qwerty' : 'abc');
        $('.kbd', el).innerHTML = rows.map(function (r, ri) { return '<div class="krow">' + r.split('').map(function (ch) { return '<button class="key" data-key="' + ch + '">' + ch + '</button>'; }).join('') + (ri === rows.length - 1 ? '<button class="key del" data-key="DEL">\u232B ' + t('del') + '</button>' : '') + '</div>'; }).join('');
      }
      function select(i2, dir) { st.sel = { i: i2, dir: dir || st.sel.dir }; if (at[i2][st.sel.dir] === undefined) st.sel.dir = st.sel.dir === 'A' ? 'D' : 'A'; draw(); }
      function gotoEntry(k, firstEmpty) {
        var cs = cellsOf(k), target = cs[0];
        if (firstEmpty) for (var j = 0; j < cs.length; j++) if (!st.fill[cs[j]]) { target = cs[j]; break; }
        st.sel = { i: target, dir: ent[k].dir }; draw();
      }
      function nextEntry(step) { var k = curEntry(); gotoEntry((k + step + ent.length) % ent.length, true); }
      function checkDone(justFilled) {
        for (var j = 0; j < N; j++) if (ans[j] !== '#' && !st.fill[j]) return;
        for (j = 0; j < N; j++) if (ans[j] !== '#' && st.fill[j] !== ans[j]) { if (justFilled) { api.toast(t('cw_almost')); } return; }
        draw(); api.finish(false);
      }
      function type(ch) {
        if (st.done) return;
        var i2 = st.sel.i, k = curEntry(), cs = cellsOf(k);
        if (!st.rev[i2]) { st.undo.push([i2, st.fill[i2]]); if (st.undo.length > 300) st.undo.shift(); st.fill[i2] = ch; st.wrong[i2] = 0; }
        api.sound('tap');
        var pos = cs.indexOf(i2), nxt = null;
        if (pos + 1 < cs.length) nxt = cs[pos + 1];
        else if (cs.every(function (q) { return st.fill[q]; })) {
          // end of a finished word: jump to the next clue that still has empty squares
          for (var s = 1; s <= ent.length; s++) { var kk = (k + s) % ent.length; if (cellsOf(kk).some(function (q) { return !st.fill[q]; })) { gotoEntry(kk, true); nxt = -1; break; } }
        }
        if (nxt !== null && nxt >= 0) st.sel.i = nxt;
        api.save(); draw(); checkDone(true);
      }
      function del() {
        if (st.done) return;
        var i2 = st.sel.i, cs = cellsOf(curEntry()), pos = cs.indexOf(i2);
        if (!st.fill[i2] && pos > 0) { i2 = cs[pos - 1]; st.sel.i = i2; }
        if (st.fill[i2] && !st.rev[i2]) { st.undo.push([i2, st.fill[i2]]); st.fill[i2] = ''; st.wrong[i2] = 0; }
        api.sound('tap'); api.save(); draw();
      }
      function scope(s) { return s === 'l' ? [st.sel.i] : s === 'w' ? cellsOf(curEntry()) : Object.keys(cellEls).map(Number); }
      function doCheck(s) {
        var bad = 0, any = 0;
        scope(s).forEach(function (q) { if (st.fill[q]) { any++; if (st.fill[q] !== ans[q]) { st.wrong[q] = 1; bad++; } } });
        api.save(); draw();
        if (bad) { api.sound('oops'); api.toast(t('cw_wrongN', { n: bad })); } else if (any) { api.sound('good'); api.toast(t('cw_allGood')); }
      }
      function doReveal(s) {
        var all = s === 'a';
        var go = function () {
          scope(s).forEach(function (q) { st.fill[q] = ans[q]; st.rev[q] = 1; st.wrong[q] = 0; });
          st.hints = (st.hints || 0) + 1; api.save(); draw();
          if (all) api.finish(true); else checkDone(false);
        };
        if (all) api.confirm(t('confirmReveal'), t('yesReveal'), go); else go();
      }
      function focusDevice() { if (api.settings().kb === 'device') { inp.value = ' '; try { inp.focus({ preventScroll: true }); } catch (x) { inp.focus(); } } }
      grid.addEventListener('click', function (e) {
        var c = e.target.closest('.cc[data-i]'); if (!c) return;
        var i2 = +c.dataset.i;
        if (i2 === st.sel.i && at[i2].A !== undefined && at[i2].D !== undefined) st.sel.dir = st.sel.dir === 'A' ? 'D' : 'A';
        select(i2); api.sound('tap'); focusDevice();
      });
      el.addEventListener('click', function (e) {
        var k = e.target.closest('[data-key]');
        if (k) { if (k.dataset.key === 'DEL') del(); else type(k.dataset.key); return; }
        var li = e.target.closest('[data-e]'); if (li) { gotoEntry(+li.dataset.e, true); api.sound('tap'); window.scrollTo({ top: 0, behavior: 'smooth' }); focusDevice(); return; }
        if (e.target.closest('[data-prev]')) { nextEntry(-1); focusDevice(); return; }
        if (e.target.closest('[data-next]')) { nextEntry(1); focusDevice(); return; }
        if (e.target.closest('[data-hint]')) { if (!st.done) doReveal('l'); return; }
        if (e.target.closest('[data-undo]')) { var u = st.undo.pop(); if (u && !st.done) { st.fill[u[0]] = u[1]; st.wrong[u[0]] = 0; st.sel.i = u[0]; api.save(); draw(); api.sound('tap'); } return; }
        if (e.target.closest('[data-kb]')) { api.setSetting('kb', api.settings().kb === 'device' ? 'screen' : 'device'); draw(); layout(); focusDevice(); return; }
        if (e.target.closest('[data-check]') && !st.done) {
          api.sheet({ title: t('check'), html: '<div class="opts"><button class="btn opt" data-opt="l">' + t('checkLetter') + '</button><button class="btn opt" data-opt="w">' + t('checkWord') + '</button><button class="btn opt" data-opt="a">' + t('checkAll') + '</button></div>', buttons: [{ label: t('cancel') }], onOption: doCheck });
          return;
        }
        if (e.target.closest('[data-reveal]') && !st.done) {
          api.sheet({ title: t('reveal'), html: '<div class="opts"><button class="btn opt" data-opt="l">' + t('revealLetter') + '</button><button class="btn opt" data-opt="w">' + t('revealWord') + '</button><button class="btn opt" data-opt="a">' + t('revealAll') + '</button></div>', buttons: [{ label: t('cancel') }], onOption: doReveal });
        }
      });
      inp.addEventListener('input', function (e) {
        var v = inp.value;
        if (v.length === 0 || e.inputType === 'deleteContentBackward') del();
        else { var chars = E.norm(v.replace(/^ /, '')); for (var j = 0; j < chars.length; j++) type(chars[j]); }
        inp.value = ' ';
      });
      function move(dr, dc) {
        var r = Math.floor(st.sel.i / W), c = st.sel.i % W;
        for (var s = 1; s < Math.max(W, H); s++) { var rr = r + dr * s, cc = c + dc * s; if (rr < 0 || cc < 0 || rr >= H || cc >= W) return; if (ans[rr * W + cc] !== '#') { select(rr * W + cc, dr ? 'D' : 'A'); return; } }
      }
      function layout() {
        buildKbd();
        var kbH = api.settings().kb === 'device' ? 0 : $('.kbd', el).offsetHeight;
        var reserve = api.isLandscape() ? 0 : (api.isPhone() ? kbH + 20 : (api.settings().kb === 'device' ? 120 : 330));
        var cell = api.fit(area, W, H, reserve, 1, board, null, api.isPhone() ? 20 : 24);
        board.style.width = (cell * W) + 'px'; board.style.height = (cell * H) + 'px';
        grid.style.fontSize = Math.round(cell * 0.58) + 'px';
      }
      layout(); draw();
      return {
        layout: layout,
        onKey: function (e) {
          if (st.done) return;
          var fromInp = e.target === inp;
          if (/^[a-zA-Z]$/.test(e.key) && !fromInp) { e.preventDefault(); type(e.key.toUpperCase()); }
          else if (e.key === 'Backspace' && !fromInp) { e.preventDefault(); del(); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); move(0, -1); } else if (e.key === 'ArrowRight') { e.preventDefault(); move(0, 1); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1, 0); } else if (e.key === 'ArrowDown') { e.preventDefault(); move(1, 0); }
          else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); nextEntry(e.shiftKey ? -1 : 1); }
          else if (e.key === ' ' && !fromInp) { e.preventDefault(); select(st.sel.i, st.sel.dir === 'A' ? 'D' : 'A'); }
        },
        test: { ans: ans, cellsOf: cellsOf, type: type, select: select }
      };
    }
  };

  /* =====================================================================
     SUDOKU
     ===================================================================== */
  G.su = {
    create: function (o) {
      var g = E.genSudoku(o.seed, o.diff);
      return { puz: g.puzzle, sol: g.solution, v: g.puzzle.split('').map(Number), notes: new Array(81).fill(0), sel: null, undo: [], notesMode: false, hinted: [] };
    },
    started: function (st) { return st.v.some(function (x, i) { return x && st.puz[i] === '0'; }) || st.notes.some(Boolean); },
    mount: function (el, st, api) {
      var t = api.t, flash = [], flashT = null;
      var sol = st.sol.split('').map(Number), given = st.puz.split('').map(function (c) { return c !== '0'; });
      el.innerHTML = '<div class="two"><div class="board-area"><div class="su-board"><div class="su-grid"></div></div></div>' +
        '<div class="side"><div class="pad"></div><div class="actions"><button class="btn" data-notes></button><button class="btn" data-erase>\u232B ' + t('erase') + '</button><button class="btn" data-undo>\u21B6 ' + t('undo') + '</button>' +
        '<button class="btn" data-hint>\u{1F4A1} ' + t('hint') + '</button><button class="btn" data-check>\u2714\uFE0F ' + t('check') + '</button><button class="btn" data-reveal>\u{1F441}\uFE0F ' + t('reveal') + '</button></div>' +
        '<button class="btn wide" data-mist></button></div></div>';
      var grid = $('.su-grid', el), board = $('.su-board', el), area = $('.board-area', el), html = '';
      for (var i = 0; i < 81; i++) { var r = Math.floor(i / 9), c = i % 9; html += '<div class="sc' + (c % 3 === 2 && c < 8 ? ' br' : '') + (r % 3 === 2 && r < 8 ? ' bb' : '') + '" data-i="' + i + '"></div>'; }
      grid.innerHTML = html;
      $('.pad', el).innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button class="btn num" data-n="' + n + '">' + n + '</button>'; }).join('');
      var cells = $$('.sc', grid);
      function peers(i2) { return E.SU_PEERS[i2]; }
      function draw() {
        var sel = st.sel, sv = sel !== null ? st.v[sel] : 0, mist = api.settings().mistakes, pe = sel !== null ? peers(sel) : [];
        cells.forEach(function (c, k) {
          var v = st.v[k];
          c.className = 'sc' + (k % 9 % 3 === 2 && k % 9 < 8 ? ' br' : '') + (Math.floor(k / 9) % 3 === 2 && k < 72 ? ' bb' : '') + (given[k] ? ' given' : ' user') +
            (k === sel ? ' sel' : '') + (pe.indexOf(k) >= 0 ? ' peer' : '') + (sv && v === sv && k !== sel ? ' same' : '') +
            (v && !given[k] && v !== sol[k] && (mist || flash.indexOf(k) >= 0) ? ' bad' : '') + (st.hinted.indexOf(k) >= 0 ? ' hinted' : '');
          if (v) c.innerHTML = '<span class="v">' + v + '</span>';
          else if (st.notes[k]) { var h2 = '<span class="notes">'; for (var d = 1; d <= 9; d++) h2 += '<i>' + (st.notes[k] & (1 << d) ? d : '') + '</i>'; c.innerHTML = h2 + '</span>'; }
          else c.innerHTML = '';
        });
        var counts = {}; st.v.forEach(function (v) { if (v) counts[v] = (counts[v] || 0) + 1; });
        $$('.num', el).forEach(function (b) { var n = +b.dataset.n; b.classList.toggle('used', counts[n] >= 9); b.classList.toggle('same', n === sv); });
        $('[data-notes]', el).textContent = '\u270F\uFE0F ' + (st.notesMode ? t('notesOn') : t('notesOff'));
        $('[data-notes]', el).classList.toggle('on', st.notesMode);
        $('[data-mist]', el).textContent = (mist ? t('mistakesOn') : t('mistakesOff'));
        $('[data-mist]', el).classList.toggle('on', mist);
      }
      function snapshot(list) { return list.map(function (k) { return [k, st.v[k], st.notes[k]]; }); }
      function pushUndo(list) { st.undo.push(snapshot(list)); if (st.undo.length > 300) st.undo.shift(); }
      function checkDone() {
        if (st.v.some(function (v) { return !v; })) return;
        if (st.v.every(function (v, k) { return v === sol[k]; })) { st.sel = null; draw(); api.finish(false); }
        else api.toast(t('su_almost'));
      }
      function place(n) {
        if (st.done) return;
        var i2 = st.sel;
        if (i2 === null) { api.toast(t('su_pick')); return; }
        if (given[i2]) { api.toast(t('su_given')); return; }
        if (st.notesMode) {
          if (st.v[i2]) return;
          pushUndo([i2]); st.notes[i2] ^= (1 << n); api.sound('tap');
        } else {
          if (st.v[i2] === n) return;
          var ch = [i2].concat(peers(i2).filter(function (k) { return st.notes[k] & (1 << n); }));
          pushUndo(ch);
          st.v[i2] = n; st.notes[i2] = 0;
          peers(i2).forEach(function (k) { st.notes[k] &= ~(1 << n); });
          api.sound(api.settings().mistakes && n !== sol[i2] ? 'oops' : 'tap');
        }
        api.save(); draw(); if (!st.notesMode) checkDone();
      }
      function erase() {
        var i2 = st.sel; if (i2 === null || given[i2] || st.done) return;
        if (!st.v[i2] && !st.notes[i2]) return;
        pushUndo([i2]); st.v[i2] = 0; st.notes[i2] = 0; api.sound('tap'); api.save(); draw();
      }
      function hint() {
        if (st.done) return;
        var target = null;
        if (st.sel !== null && !given[st.sel] && st.v[st.sel] !== sol[st.sel]) target = st.sel;
        if (target === null) {
          var best = 10;
          for (var k = 0; k < 81; k++) if (st.v[k] !== sol[k]) {
            var m = 0; for (var d = 1; d <= 9; d++) if (!peers(k).some(function (q) { return st.v[q] === d; })) m++;
            if (m < best) { best = m; target = k; }
          }
        }
        if (target === null) return;
        pushUndo([target]); st.v[target] = sol[target]; st.notes[target] = 0; st.hinted.push(target); st.sel = target;
        peers(target).forEach(function (q) { st.notes[q] &= ~(1 << sol[target]); });
        api.sound('good'); api.save(); draw(); checkDone();
      }
      grid.addEventListener('click', function (e) { var c = e.target.closest('.sc'); if (!c) return; st.sel = +c.dataset.i; api.sound('tap'); draw(); });
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-n]'); if (b) { place(+b.dataset.n); return; }
        if (e.target.closest('[data-notes]')) { st.notesMode = !st.notesMode; api.sound('tap'); api.save(); draw(); return; }
        if (e.target.closest('[data-erase]')) { erase(); return; }
        if (e.target.closest('[data-undo]')) { var u = st.undo.pop(); if (u && !st.done) { u.forEach(function (x) { st.v[x[0]] = x[1]; st.notes[x[0]] = x[2]; }); st.sel = u[0][0]; api.sound('tap'); api.save(); draw(); } return; }
        if (e.target.closest('[data-hint]')) { hint(); return; }
        if (e.target.closest('[data-mist]')) { api.setSetting('mistakes', !api.settings().mistakes); api.sound('tap'); draw(); return; }
        if (e.target.closest('[data-check]')) {
          if (st.done) return;
          flash = []; st.v.forEach(function (v, k) { if (v && !given[k] && v !== sol[k]) flash.push(k); });
          api.toast(flash.length ? t('su_checkBad', { n: flash.length }) : t('su_checkOk')); api.sound(flash.length ? 'oops' : 'good'); draw();
          clearTimeout(flashT); flashT = setTimeout(function () { flash = []; draw(); }, 4000); return;
        }
        if (e.target.closest('[data-reveal]')) {
          if (st.done) return;
          api.confirm(t('confirmReveal'), t('yesReveal'), function () { st.v = sol.slice(); st.notes.fill(0); st.sel = null; draw(); api.finish(true); });
        }
      });
      function layout() {
        var cell = api.fit(area, 9, 9, api.isLandscape() ? 0 : (api.isPhone() ? Math.min(300, $('.pad', el).offsetHeight + 16) : 300));
        board.style.width = board.style.height = (cell * 9 + 6) + 'px';
        grid.style.fontSize = Math.round(cell * 0.6) + 'px';
      }
      layout(); draw();
      return {
        layout: layout, destroy: function () { clearTimeout(flashT); },
        onKey: function (e) {
          if (/^[1-9]$/.test(e.key)) { e.preventDefault(); place(+e.key); }
          else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); erase(); }
          else if (e.key === 'n' || e.key === 'N') { st.notesMode = !st.notesMode; draw(); }
          else if (/^Arrow/.test(e.key)) {
            e.preventDefault(); var s = st.sel === null ? 40 : st.sel, r = Math.floor(s / 9), c = s % 9;
            if (e.key === 'ArrowUp') r = (r + 8) % 9; if (e.key === 'ArrowDown') r = (r + 1) % 9; if (e.key === 'ArrowLeft') c = (c + 8) % 9; if (e.key === 'ArrowRight') c = (c + 1) % 9;
            st.sel = r * 9 + c; draw();
          }
        }
      };
    }
  };

  /* =====================================================================
     WORD SCRAMBLE
     ===================================================================== */
  function scSetup(st) { var it = st.items[st.idx]; st.tiles = it.s.split(''); st.order = st.tiles.map(function (_, i) { return i; }); st.picked = []; st.locked = 0; st.state = 'play'; }
  G.sc = {
    create: function (o) {
      var g = E.genScramble(o.seed, o.diff, o.themes, o.theme === 'any' ? null : o.theme);
      var st = { items: g.items, idx: 0, res: [] }; scSetup(st); return st;
    },
    started: function (st) { return st.idx > 0 || st.picked.length > 0; },
    picker: function (api) { return themePicker('sc', api); },
    mount: function (el, st, api) {
      var t = api.t;
      el.innerHTML = '<div class="sc-wrap"><div class="sc-top"><span class="chip prog"></span><span class="chip cat"></span></div>' +
        '<div class="slots" aria-live="polite"></div><div class="tiles"></div><p class="status" aria-live="polite"></p>' +
        '<div class="actions"><button class="btn" data-hint>\u{1F4A1} ' + t('hint') + '</button><button class="btn" data-shuffle>\u{1F500} ' + t('sc_shuffle') + '</button><button class="btn" data-undo>\u21B6 ' + t('undo') + '</button><button class="btn" data-clear>\u2716 ' + t('sc_clear') + '</button><button class="btn" data-show>\u{1F441}\uFE0F ' + t('sc_show') + '</button></div>' +
        '<button class="btn primary big next" data-nextw hidden>' + t('sc_next') + ' \u25B6</button><div class="done-list"></div></div>';
      var status = $('.status', el);
      function it() { return st.items[Math.min(st.idx, st.items.length - 1)]; }
      function draw() {
        var item = it(), a = item.a, done = st.done;
        $('.prog', el).textContent = t('sc_wordN', { a: Math.min(st.idx + 1, st.items.length), b: st.items.length });
        $('.cat', el).textContent = t('sc_cat', { c: item.cat });
        var size = Math.max(40, Math.min(92, Math.floor((el.clientWidth - 16) / Math.max(a.length, 5)) - 8));
        el.style.setProperty('--tile', size + 'px');
        var s = '';
        for (var k = 0; k < a.length; k++) {
          var id = st.picked[k], ch = id !== undefined ? st.tiles[id] : '';
          s += '<button class="slot' + (k < st.locked ? ' locked' : '') + (ch ? ' filled' : '') + (st.state === 'right' ? ' right' : st.state === 'shown' ? ' shown' : '') + '" data-slot="' + k + '">' + ch + '</button>';
        }
        $('.slots', el).innerHTML = s;
        $('.tiles', el).innerHTML = st.order.map(function (id) { var used = st.picked.indexOf(id) >= 0; return '<button class="tile' + (used ? ' used' : '') + '" data-tile="' + id + '"' + (used || st.state !== 'play' ? ' disabled' : '') + '>' + (used ? '' : st.tiles[id]) + '</button>'; }).join('');
        var play = st.state === 'play' && !done;
        $$('.actions .btn', el).forEach(function (b) { b.disabled = !play; });
        $('[data-nextw]', el).hidden = play || done;
        $('.done-list', el).innerHTML = st.items.slice(0, st.idx + (st.state !== 'play' ? 1 : 0)).map(function (x, k) { return '<span class="chip ' + (st.res[k] === 'ok' ? 'ok' : 'shown') + '">' + (st.res[k] === 'ok' ? '\u2714 ' : '') + api.esc(x.w) + '</span>'; }).join('');
      }
      function say(m) { status.textContent = m || ''; }
      function evaluate() {
        var item = it(), word = st.picked.map(function (id) { return st.tiles[id]; }).join('');
        if (word === item.a || item.alts.indexOf(word) >= 0) {
          st.state = 'right'; st.res[st.idx] = 'ok'; api.sound('found'); say(t('sc_correct', { w: item.w }));
          api.save(); draw(); if (st.idx === st.items.length - 1) finishRound();
        } else {
          api.sound('oops'); say(t('sc_notQuite'));
          var sl = $('.slots', el); sl.classList.remove('shake'); void sl.offsetWidth; sl.classList.add('shake');
        }
      }
      function finishRound() { var allShown = st.res.every(function (r) { return r === 'shown'; }); api.finish(allShown); }
      function pick(id) {
        if (st.state !== 'play' || st.done || st.picked.indexOf(id) >= 0) return;
        st.picked.push(id); api.sound('tap'); say(''); api.save(); draw();
        if (st.picked.length === it().a.length) evaluate();
      }
      function nextWord() {
        if (st.state === 'play' || st.done) return;
        if (st.idx < st.items.length - 1) { st.idx++; scSetup(st); say(''); api.save(); draw(); }
      }
      function hint() {
        var a = it().a; if (st.locked >= a.length) return;
        st.locked++;
        var used = [], pickedNew = [];
        for (var k = 0; k < st.locked; k++) { for (var id = 0; id < st.tiles.length; id++) if (st.tiles[id] === a[k] && used.indexOf(id) < 0) { used.push(id); pickedNew.push(id); break; } }
        st.picked = pickedNew; st.hints = (st.hints || 0) + 1;
        api.sound('good'); say(t('sc_starts', { l: a.slice(0, st.locked) })); api.save(); draw();
        if (st.picked.length === a.length) evaluate();
      }
      el.addEventListener('click', function (e) {
        var tl = e.target.closest('[data-tile]'); if (tl) { pick(+tl.dataset.tile); return; }
        var sl = e.target.closest('[data-slot]');
        if (sl) { var k = +sl.dataset.slot; if (st.state === 'play' && !st.done && k >= st.locked && k < st.picked.length) { st.picked.splice(k, 1); api.sound('tap'); api.save(); draw(); } return; }
        if (e.target.closest('[data-hint]')) { hint(); return; }
        if (e.target.closest('[data-shuffle]')) { var o = st.order.slice(); for (var i = o.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = o[i]; o[i] = o[j]; o[j] = x; } st.order = o; api.sound('tap'); api.save(); draw(); return; }
        if (e.target.closest('[data-undo]')) { if (st.picked.length > st.locked) { st.picked.pop(); api.sound('tap'); api.save(); draw(); } return; }
        if (e.target.closest('[data-clear]')) { st.picked = st.picked.slice(0, st.locked); api.save(); draw(); return; }
        if (e.target.closest('[data-show]')) {
          var a = it().a, used = [], pk = [];
          for (var q = 0; q < a.length; q++) for (var id2 = 0; id2 < st.tiles.length; id2++) if (st.tiles[id2] === a[q] && used.indexOf(id2) < 0) { used.push(id2); pk.push(id2); break; }
          st.picked = pk; st.state = 'shown'; st.res[st.idx] = 'shown'; say(t('sc_was', { w: it().w })); api.save(); draw();
          if (st.idx === st.items.length - 1) finishRound();
          return;
        }
        if (e.target.closest('[data-nextw]')) { api.sound('tap'); nextWord(); }
      });
      draw();
      return {
        layout: draw,
        onKey: function (e) {
          if (st.done) return;
          if (e.key === 'Enter') { e.preventDefault(); nextWord(); return; }
          if (e.key === 'Backspace') { e.preventDefault(); if (st.state === 'play' && st.picked.length > st.locked) { st.picked.pop(); api.save(); draw(); } return; }
          if (/^[a-zA-Z]$/.test(e.key)) {
            var L = e.key.toUpperCase();
            for (var k = 0; k < st.order.length; k++) { var id = st.order[k]; if (st.tiles[id] === L && st.picked.indexOf(id) < 0) { pick(id); return; } }
          }
        }
      };
    }
  };

  /* =====================================================================
     MEMORY MATCH
     ===================================================================== */
  G.mm = {
    create: function (o) {
      var g = E.genMemory(o.seed, o.diff, PC.MEMORY_SETS);
      return { set: g.set, cards: g.cards, matched: g.cards.map(function () { return 0; }), open: [], moves: 0 };
    },
    started: function (st) { return st.moves > 0; },
    mount: function (el, st, api) {
      var t = api.t, set = PC.MEMORY_SETS.filter(function (s) { return s.id === st.set; })[0], closeT = null, peeking = false, hintIdx = [], hintT = null;
      var n = st.cards.length, pairs = n / 2;
      st.open = st.open.filter(function (i) { return !st.matched[i]; }).slice(0, 1); // closed on reload, keep at most one
      el.innerHTML = '<div class="two"><div class="board-area"><div class="mm-grid"></div></div><div class="side"><div class="side-head"><h3 class="setname"></h3><p class="prog"></p><p class="moves"></p></div>' +
        '<div class="actions"><button class="btn" data-hint>\u{1F4A1} ' + t('hint') + '</button><button class="btn" data-peek>\u{1F440} ' + t('mm_peek') + '</button><button class="btn" data-reveal>\u{1F441}\uFE0F ' + t('reveal') + '</button></div></div></div>';
      var grid = $('.mm-grid', el), area = $('.board-area', el);
      grid.innerHTML = st.cards.map(function (c, i) { return '<button class="mcard" data-c="' + i + '" aria-label="card"><span class="back"></span><span class="face"><span class="em">' + set.items[c][0] + '</span><span class="lb">' + api.esc(api.memLabel(st.set, c)) + '</span></span></button>'; }).join('');
      var cards = $$('.mcard', grid);
      function draw() {
        cards.forEach(function (b, i) {
          var up = st.matched[i] || st.open.indexOf(i) >= 0 || peeking;
          b.classList.toggle('up', !!up); b.classList.toggle('matched', !!st.matched[i]); b.classList.toggle('hint', hintIdx.indexOf(i) >= 0);
          b.setAttribute('aria-label', up ? api.memLabel(st.set, st.cards[i]) : 'card');
        });
        var m = st.matched.filter(Boolean).length / 2;
        $('.setname', el).textContent = t('mm_set', { s: api.memSetName(st.set) });
        $('.prog', el).textContent = t('mm_pairs', { a: m, b: pairs });
        $('.moves', el).textContent = t('mm_moves', { n: st.moves });
      }
      function closeOpen() { clearTimeout(closeT); closeT = null; st.open = []; draw(); }
      function flip(i) {
        if (st.done || peeking || st.matched[i] || st.open.indexOf(i) >= 0) return;
        if (st.open.length >= 2) closeOpen();
        st.open.push(i); api.sound('tap');
        if (st.open.length === 2) {
          st.moves++;
          var a = st.open[0], b = st.open[1];
          if (st.cards[a] === st.cards[b]) {
            st.matched[a] = st.matched[b] = 1; st.open = []; hintIdx = hintIdx.filter(function (x) { return x !== a && x !== b; });
            setTimeout(function () { api.sound('good'); }, 120);
            if (st.matched.every(Boolean)) { api.save(); draw(); api.finish(false); return; }
          } else closeT = setTimeout(closeOpen, 1500);
        }
        api.save(); draw();
      }
      grid.addEventListener('click', function (e) { var b = e.target.closest('.mcard'); if (b) flip(+b.dataset.c); });
      el.addEventListener('click', function (e) {
        if (st.done) return;
        if (e.target.closest('[data-hint]')) {
          var un = []; st.cards.forEach(function (c, i) { if (!st.matched[i]) un.push(i); });
          if (!un.length) return;
          var first = st.open.length === 1 ? st.open[0] : un[0], mate = un.filter(function (i) { return i !== first && st.cards[i] === st.cards[first]; })[0];
          hintIdx = [first, mate]; api.sound('tap'); draw(); clearTimeout(hintT); hintT = setTimeout(function () { hintIdx = []; draw(); }, 2500);
        }
        if (e.target.closest('[data-peek]')) { closeOpen(); peeking = true; api.sound('tap'); draw(); setTimeout(function () { peeking = false; draw(); }, 2200); }
        if (e.target.closest('[data-reveal]')) api.confirm(t('confirmReveal'), t('yesReveal'), function () { st.matched = st.matched.map(function () { return 1; }); st.open = []; draw(); api.finish(true); });
      });
      function layout() {
        var land = api.isLandscape(), cols = pairs === 6 ? (land ? 4 : 3) : pairs === 8 ? 4 : (land ? 6 : 4), rows = n / cols;
        var cell = api.fit(area, cols, rows, land ? 0 : 200, 1.12, null, 170);
        grid.style.gridTemplateColumns = 'repeat(' + cols + ', ' + (cell - 10) + 'px)';
        grid.style.setProperty('--card', (cell - 10) + 'px');
      }
      layout(); draw();
      return { layout: layout, destroy: function () { clearTimeout(closeT); clearTimeout(hintT); } };
    }
  };
})();
