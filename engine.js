/* Puzzle Corner engine: seeded RNG + puzzle generators. Pure functions, no DOM (also runs in Node for tests). */
(function (G) {
  'use strict';
  var PC = G.PC = G.PC || {};
  var E = PC.E = {};

  /* ---------- seeded random ---------- */
  function hash(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
  function rng(seed) {
    var a = hash(String(seed));
    var f = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.int = function (n) { return Math.floor(f() * n); };
    f.pick = function (arr) { return arr[f.int(arr.length)]; };
    f.shuffle = function (arr) { var a2 = arr.slice(); for (var i = a2.length - 1; i > 0; i--) { var j = f.int(i + 1), t = a2[i]; a2[i] = a2[j]; a2[j] = t; } return a2; };
    return f;
  }
  E.hash = hash; E.rng = rng;
  E.norm = function (w) { return String(w).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, ''); };
  E.newSeed = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };

  /* ---------- Word Search ---------- */
  var DIRS8 = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
  E.WS_CFG = {
    easy: { size: 8, count: 6, dirs: [[0, 1], [1, 0]] },
    medium: { size: 10, count: 8, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]] },
    hard: { size: 13, count: 11, dirs: DIRS8 }
  };
  var FILL = 'EEEEEAAAAIIIIOOOUUNNNRRRTTTSSSLLLDDGGHHCCMMPPBBKYWFV';
  var BAD = ['SEX', 'FUCK', 'SHIT', 'DAMN', 'HELL', 'ASS', 'CUNT', 'DICK', 'COCK', 'PISS', 'TIT', 'FAG', 'NIG', 'KKK', 'GAGO', 'PUTA', 'TANGA', 'ULOL', 'PEKPEK', 'TITI', 'KANTOT', 'BOBO', 'TAE', 'PUKE'];
  function countOcc(grid, n, word) {
    var c = 0;
    for (var r = 0; r < n; r++) for (var col = 0; col < n; col++) {
      if (grid[r][col] !== word[0]) continue;
      for (var d = 0; d < 8; d++) {
        var dr = DIRS8[d][0], dc = DIRS8[d][1], ok = true;
        for (var i = 1; i < word.length; i++) {
          var rr = r + dr * i, cc = col + dc * i;
          if (rr < 0 || cc < 0 || rr >= n || cc >= n || grid[rr][cc] !== word[i]) { ok = false; break; }
        }
        if (ok) c++;
      }
    }
    if (word.length === 1) c = c / 8;
    return c;
  }
  E.wsCount = countOcc;
  // opts: { themes: [...], themeId?, seed, diff }
  E.genWordSearch = function (seed, diff, themes, themeId) {
    var cfg = E.WS_CFG[diff], n = cfg.size, R = rng('ws|' + seed + '|' + diff);
    var theme = null;
    for (var t = 0; t < themes.length; t++) if (themes[t].id === themeId) theme = themes[t];
    if (!theme) theme = R.pick(themes);
    var pool = theme.list.map(function (w) { return { w: w, a: E.norm(w) }; })
      .filter(function (o) { return o.a.length >= 3 && o.a.length <= n && (diff !== 'easy' || o.a.length <= 7); });
    for (var attempt = 0; attempt < 60; attempt++) {
      var cand = R.shuffle(pool), chosen = [];
      for (var i = 0; i < cand.length && chosen.length < cfg.count; i++) {
        var a = cand[i].a, clash = false;
        for (var j = 0; j < chosen.length; j++) if (chosen[j].a.indexOf(a) >= 0 || a.indexOf(chosen[j].a) >= 0) clash = true;
        if (!clash) chosen.push(cand[i]);
      }
      chosen.sort(function (x, y) { return y.a.length - x.a.length; });
      var grid = [], r, c;
      for (r = 0; r < n; r++) { grid.push([]); for (c = 0; c < n; c++) grid[r].push(''); }
      var placed = [], fail = false;
      for (i = 0; i < chosen.length; i++) {
        var w = chosen[i].a, opts = [];
        for (var d = 0; d < cfg.dirs.length; d++) {
          var dr = cfg.dirs[d][0], dc = cfg.dirs[d][1];
          for (r = 0; r < n; r++) for (c = 0; c < n; c++) {
            var er = r + dr * (w.length - 1), ec = c + dc * (w.length - 1);
            if (er < 0 || ec < 0 || er >= n || ec >= n) continue;
            var ok = true, overlap = 0;
            for (var k = 0; k < w.length; k++) { var ch = grid[r + dr * k][c + dc * k]; if (ch && ch !== w[k]) { ok = false; break; } if (ch) overlap++; }
            if (ok && overlap < w.length) opts.push([r, c, dr, dc, overlap]);
          }
        }
        if (!opts.length) { fail = true; break; }
        var withOv = opts.filter(function (o) { return o[4] > 0; });
        var pickFrom = (withOv.length && R() < 0.45) ? withOv : opts;
        var p = R.pick(pickFrom);
        for (k = 0; k < w.length; k++) grid[p[0] + p[2] * k][p[1] + p[3] * k] = w[k];
        placed.push({ w: chosen[i].w, a: w, r: p[0], c: p[1], dr: p[2], dc: p[3] });
      }
      if (fail || placed.length < cfg.count) continue;
      // fill & verify each word appears exactly once and no unfriendly words appear
      for (var f = 0; f < 25; f++) {
        var g2 = grid.map(function (row) { return row.map(function (ch) { return ch || FILL[R.int(FILL.length)]; }); });
        var good = placed.every(function (pw) { return countOcc(g2, n, pw.a) === 1; });
        if (good) good = BAD.every(function (b) { return countOcc(g2, n, b) === 0 || placed.some(function (pw) { return pw.a.indexOf(b) >= 0; }); });
        if (good) {
          placed.sort(function (x, y) { return x.a < y.a ? -1 : 1; });
          return { size: n, grid: g2.map(function (row) { return row.join(''); }), words: placed, theme: theme.id, themeName: theme.name };
        }
      }
    }
    throw new Error('word search generation failed');
  };

  /* ---------- Crossword (free-form) ---------- */
  E.CW_CFG = {
    easy: { max: 9, target: 8, minL: 3, maxL: 7 },
    medium: { max: 11, target: 12, minL: 3, maxL: 9 },
    hard: { max: 13, target: 17, minL: 4, maxL: 11 }
  };
  // bank: [{a, c, g}], favor: {group: weight 0..1} to weight some groups up
  E.genCrossword = function (seed, diff, bank, favor) {
    var cfg = E.CW_CFG[diff], R = rng('cw|' + seed + '|' + diff), best = null;
    var words = bank.filter(function (o) { return o.a.length >= cfg.minL && o.a.length <= Math.min(cfg.maxL, cfg.max); });
    for (var attempt = 0; attempt < 24; attempt++) {
      var keyed = words.map(function (o) { return { o: o, k: R() - ((favor && favor[o.g]) || 0) }; });
      keyed.sort(function (x, y) { return x.k - y.k; });
      var cand = keyed.slice(0, 260).map(function (x) { return x.o; });
      var res = buildCw(cand, cfg, R);
      if (!best || res.placed.length > best.placed.length) best = res;
      if (best.placed.length >= cfg.target) break;
    }
    return finishCw(best);
  };
  function buildCw(cand, cfg, R) {
    var cells = {}, placed = [], used = {}, minR = 0, maxR = 0, minC = 0, maxC = 0;
    function key(r, c) { return r + ',' + c; }
    function get(r, c) { return cells[key(r, c)]; }
    function put(w, r, c, dir) {
      var dr = dir === 'D' ? 1 : 0, dc = dir === 'A' ? 1 : 0;
      for (var i = 0; i < w.a.length; i++) {
        var k = key(r + dr * i, c + dc * i), cell = cells[k] || (cells[k] = { ch: w.a[i], A: false, D: false });
        cell[dir] = true;
      }
      placed.push({ a: w.a, c: w.c, r: r, col: c, dir: dir }); used[w.a] = 1;
      minR = Math.min(minR, r); minC = Math.min(minC, c);
      maxR = Math.max(maxR, r + dr * (w.a.length - 1)); maxC = Math.max(maxC, c + dc * (w.a.length - 1));
    }
    function check(w, r, c, dir) {
      var dr = dir === 'D' ? 1 : 0, dc = dir === 'A' ? 1 : 0, L = w.a.length, cross = 0;
      if (get(r - dr, c - dc) || get(r + dr * L, c + dc * L)) return -1;
      var nr0 = Math.min(minR, r), nc0 = Math.min(minC, c), nr1 = Math.max(maxR, r + dr * (L - 1)), nc1 = Math.max(maxC, c + dc * (L - 1));
      if (nr1 - nr0 + 1 > cfg.max || nc1 - nc0 + 1 > cfg.max) return -1;
      for (var i = 0; i < L; i++) {
        var rr = r + dr * i, cc = c + dc * i, cell = get(rr, cc);
        if (cell) {
          if (cell.ch !== w.a[i] || cell[dir]) return -1;
          cross++;
        } else {
          // perpendicular neighbours must be empty
          if (get(rr + dc, cc + dr) || get(rr - dc, cc - dr)) return -1;
        }
      }
      return cross;
    }
    var first = null;
    for (var i = 0; i < cand.length; i++) if (cand[i].a.length >= Math.min(6, cfg.maxL) && cand[i].a.length <= cfg.max) { first = cand[i]; break; }
    if (!first) first = cand[0];
    put(first, 0, 0, R() < 0.5 ? 'A' : 'D');
    var stall = 0;
    while (placed.length < cfg.target && stall < 3) {
      var bestP = null, tried = 0;
      for (i = 0; i < cand.length && tried < 90; i++) {
        var w = cand[i]; if (used[w.a]) continue;
        tried++;
        for (var k in cells) {
          var cell = cells[k]; if (cell.A && cell.D) continue;
          var parts = k.split(','), cr = +parts[0], cc = +parts[1];
          var dir = cell.A ? 'D' : 'A';
          for (var j = 0; j < w.a.length; j++) {
            if (w.a[j] !== cell.ch) continue;
            var r0 = dir === 'D' ? cr - j : cr, c0 = dir === 'A' ? cc - j : cc;
            var x = check(w, r0, c0, dir);
            if (x > 0) {
              var score = x * 10 + R() * 6 + (w.a.length > 4 ? 2 : 0);
              if (!bestP || score > bestP.s) bestP = { w: w, r: r0, c: c0, dir: dir, s: score };
            }
          }
        }
        if (bestP && bestP.s >= 20) break;
      }
      if (bestP) { put(bestP.w, bestP.r, bestP.c, bestP.dir); stall = 0; } else stall++;
      if (!bestP) cand = R.shuffle(cand);
    }
    return { placed: placed, minR: minR, minC: minC, h: maxR - minR + 1, w: maxC - minC + 1 };
  }
  function finishCw(b) {
    var h = b.h, w = b.w, grid = [], r, c, i;
    for (r = 0; r < h; r++) { grid.push([]); for (c = 0; c < w; c++) grid[r].push('#'); }
    b.placed.forEach(function (p) {
      p.r -= b.minR; p.col -= b.minC;
      for (var i2 = 0; i2 < p.a.length; i2++) { var rr = p.r + (p.dir === 'D' ? i2 : 0), cc = p.col + (p.dir === 'A' ? i2 : 0); grid[rr][cc] = p.a[i2]; }
    });
    var num = 0, nums = {};
    for (r = 0; r < h; r++) for (c = 0; c < w; c++) {
      if (grid[r][c] === '#') continue;
      var sa = (c === 0 || grid[r][c - 1] === '#') && c + 1 < w && grid[r][c + 1] !== '#';
      var sd = (r === 0 || grid[r - 1][c] === '#') && r + 1 < h && grid[r + 1][c] !== '#';
      if (sa || sd) nums[r + ',' + c] = ++num;
    }
    var entries = b.placed.map(function (p) { return { n: nums[p.r + ',' + p.col], dir: p.dir, r: p.r, c: p.col, a: p.a, clue: p.c }; });
    entries.sort(function (x, y) { return x.dir === y.dir ? x.n - y.n : (x.dir === 'A' ? -1 : 1); });
    return { w: w, h: h, grid: grid.map(function (row) { return row.join(''); }), entries: entries };
  }
  // consistency check used by tests: every maximal run of 2+ letters is exactly one entry, all letters covered, connected
  E.checkCrossword = function (p) {
    var errs = [], runs = {}, r, c;
    function scan(dir) {
      var H = p.h, W = p.w;
      for (var a = 0; a < (dir === 'A' ? H : W); a++) {
        var s = '', start = 0;
        for (var b = 0; b <= (dir === 'A' ? W : H); b++) {
          var ch = b < (dir === 'A' ? W : H) ? (dir === 'A' ? p.grid[a][b] : p.grid[b][a]) : '#';
          if (ch !== '#') { if (!s) start = b; s += ch; }
          else { if (s.length >= 2) runs[dir + (dir === 'A' ? a + ',' + start : start + ',' + a)] = s; s = ''; }
        }
      }
    }
    scan('A'); scan('D');
    var ents = {};
    p.entries.forEach(function (e) { ents[e.dir + e.r + ',' + e.c] = e.a; });
    Object.keys(runs).forEach(function (k) { if (ents[k] !== runs[k]) errs.push('run ' + k + ' ' + runs[k] + ' != ' + ents[k]); });
    Object.keys(ents).forEach(function (k) { if (runs[k] !== ents[k]) errs.push('entry ' + k + ' ' + ents[k] + ' not a run'); });
    var seen = {}; p.entries.forEach(function (e) { if (seen[e.a]) errs.push('dup ' + e.a); seen[e.a] = 1; if (!e.clue) errs.push('no clue ' + e.a); if (!e.n) errs.push('no number ' + e.a); });
    // connectivity
    var letters = [], start2 = null;
    for (r = 0; r < p.h; r++) for (c = 0; c < p.w; c++) if (p.grid[r][c] !== '#') { letters.push(r + ',' + c); if (!start2) start2 = [r, c]; }
    var vis = {}, st = [start2];
    while (st.length) { var q = st.pop(), kk = q[0] + ',' + q[1]; if (vis[kk]) continue; if (q[0] < 0 || q[1] < 0 || q[0] >= p.h || q[1] >= p.w || p.grid[q[0]][q[1]] === '#') continue; vis[kk] = 1; st.push([q[0] + 1, q[1]], [q[0] - 1, q[1]], [q[0], q[1] + 1], [q[0], q[1] - 1]); }
    if (Object.keys(vis).length !== letters.length) errs.push('not connected');
    return errs;
  };

  /* ---------- Sudoku ---------- */
  var PEERS = [], UNITS = [];
  (function () {
    var i, r, c;
    for (r = 0; r < 9; r++) { var row = []; for (c = 0; c < 9; c++) row.push(r * 9 + c); UNITS.push(row); }
    for (c = 0; c < 9; c++) { var col = []; for (r = 0; r < 9; r++) col.push(r * 9 + c); UNITS.push(col); }
    for (var b = 0; b < 9; b++) { var box = []; for (i = 0; i < 9; i++) box.push((Math.floor(b / 3) * 3 + Math.floor(i / 3)) * 9 + (b % 3) * 3 + (i % 3)); UNITS.push(box); }
    for (i = 0; i < 81; i++) { var s = {}; UNITS.forEach(function (u) { if (u.indexOf(i) >= 0) u.forEach(function (x) { if (x !== i) s[x] = 1; }); }); PEERS.push(Object.keys(s).map(Number)); }
  })();
  E.SU_PEERS = PEERS;
  function candMask(g, i) { var m = 0x3FE; var p = PEERS[i]; for (var k = 0; k < p.length; k++) if (g[p[k]]) m &= ~(1 << g[p[k]]); return m; }
  function bits(m) { var n = 0; while (m) { m &= m - 1; n++; } return n; }
  E.suCount = function (grid, limit) {
    var g = grid.slice(), count = 0;
    function solve() {
      var bi = -1, bm = 0, bc = 10;
      for (var i = 0; i < 81; i++) if (!g[i]) { var m = candMask(g, i), n = bits(m); if (n < bc) { bc = n; bi = i; bm = m; if (n <= 1) break; } }
      if (bi < 0) { count++; return count >= limit; }
      if (!bc) return false;
      for (var d = 1; d <= 9; d++) if (bm & (1 << d)) { g[bi] = d; if (solve()) return true; }
      g[bi] = 0; return false;
    }
    solve(); return count;
  };
  // logic solver: level 1 = naked singles only, level 2 = naked + hidden singles
  E.suLogic = function (grid, level) {
    var g = grid.slice(), changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < 81; i++) if (!g[i]) { var m = candMask(g, i); if (!m) return false; if (bits(m) === 1) { g[i] = Math.log2(m); changed = true; } }
      if (level >= 2 && !changed) {
        for (var u = 0; u < 27; u++) for (var d = 1; d <= 9; d++) {
          var spot = -1, cnt = 0, have = false;
          for (var k = 0; k < 9; k++) { var x = UNITS[u][k]; if (g[x] === d) { have = true; break; } if (!g[x] && (candMask(g, x) & (1 << d))) { cnt++; spot = x; } }
          if (!have && cnt === 1) { g[spot] = d; changed = true; }
        }
      }
    }
    return g.indexOf(0) < 0;
  };
  E.SU_CFG = { easy: { givens: 40, level: 1 }, medium: { givens: 31, level: 2 }, hard: { givens: 25, level: 9 } };
  E.genSudoku = function (seed, diff) {
    var cfg = E.SU_CFG[diff], R = rng('su|' + seed + '|' + diff);
    var g = new Array(81).fill(0);
    (function fill(i) {
      if (i === 81) return true;
      var ds = R.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]), m = candMask(g, i);
      for (var k = 0; k < 9; k++) if (m & (1 << ds[k])) { g[i] = ds[k]; if (fill(i + 1)) return true; }
      g[i] = 0; return false;
    })(0);
    var sol = g.slice(), puz = g.slice(), givens = 81;
    var order = R.shuffle(Array.from({ length: 41 }, function (_, i) { return i; }));
    for (var pass = 0; pass < 2 && givens > cfg.givens; pass++) {
      for (var t = 0; t < order.length && givens > cfg.givens; t++) {
        var a = order[t], b = 80 - a; if (!puz[a]) continue;
        var sa = puz[a], sb = puz[b]; puz[a] = 0; puz[b] = 0;
        var ok = E.suCount(puz, 2) === 1 && (cfg.level > 2 || E.suLogic(puz, cfg.level));
        if (ok) givens -= (a === b ? 1 : 2); else { puz[a] = sa; puz[b] = sb; }
      }
      order = R.shuffle(order);
    }
    return { puzzle: puz.join(''), solution: sol.join('') };
  };

  /* ---------- Word Scramble ---------- */
  E.SC_CFG = { easy: { count: 5, min: 4, max: 5 }, medium: { count: 6, min: 5, max: 7 }, hard: { count: 7, min: 7, max: 10 } };
  function sortLetters(a) { return a.split('').sort().join(''); }
  E.genScramble = function (seed, diff, themes, themeId) {
    var cfg = E.SC_CFG[diff], R = rng('sc|' + seed + '|' + diff), items = [], used = {};
    var all = {};
    themes.forEach(function (t) { t.list.forEach(function (w) { if (!/[\s-]/.test(w)) all[E.norm(w)] = 1; }); });
    function eligible(t) { return t.list.filter(function (w) { var a = E.norm(w); return !/[\s-]/.test(w) && a.length >= cfg.min && a.length <= cfg.max && new Set(a).size > 1; }); }
    var main = null; themes.forEach(function (t) { if (t.id === themeId) main = t; });
    var tries = 0;
    while (items.length < cfg.count && tries++ < 400) {
      var t = main || R.pick(themes), list = eligible(t);
      if (!list.length) { if (main) main = null; continue; }
      var w = R.pick(list), a = E.norm(w); if (used[a]) continue;
      used[a] = 1;
      var key = sortLetters(a), alts = Object.keys(all).filter(function (x) { return x !== a && sortLetters(x) === key; });
      var s, guard = 0;
      do { s = R.shuffle(a.split('')).join(''); } while ((s === a || alts.indexOf(s) >= 0 || s.slice(0, 2) === a.slice(0, 2)) && guard++ < 50);
      items.push({ a: a, w: w, cat: t.name, theme: t.id, s: s, alts: alts });
    }
    return { items: items };
  };

  /* ---------- Memory Match ---------- */
  E.MM_CFG = { easy: { pairs: 6, cols: 4 }, medium: { pairs: 8, cols: 4 }, hard: { pairs: 12, cols: 6 } };
  E.genMemory = function (seed, diff, sets) {
    var cfg = E.MM_CFG[diff], R = rng('mm|' + seed + '|' + diff), set = R.pick(sets);
    var idx = R.shuffle(set.items.map(function (_, i) { return i; })).slice(0, cfg.pairs);
    var cards = R.shuffle(idx.concat(idx));
    return { set: set.id, cards: cards, cols: cfg.cols };
  };
})(typeof window !== 'undefined' ? window : globalThis);
