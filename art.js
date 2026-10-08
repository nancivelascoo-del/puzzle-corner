/* Puzzle Corner illustrations: small inline SVGs (succulents, pots, game icons). No external files. */
(function (G) {
  'use strict';
  var PC = G.PC = G.PC || {};
  function svg(vb, body, cls) { return '<svg class="art ' + (cls || '') + '" viewBox="' + vb + '" aria-hidden="true" focusable="false">' + body + '</svg>'; }
  // echeveria rosette seen from above; c1 = outer leaves, c2 = inner leaves, tip = blush tips
  function rosetteBody(cx, cy, r, c1, c2, tip) {
    var s = '', k, a;
    for (k = 0; k < 8; k++) { a = k * 45; s += '<ellipse cx="' + cx + '" cy="' + (cy - r * 0.55) + '" rx="' + (r * 0.3) + '" ry="' + (r * 0.55) + '" fill="' + c1 + '" stroke="' + tip + '" stroke-width="' + (r * 0.05) + '" transform="rotate(' + a + ' ' + cx + ' ' + cy + ')"/>'; }
    for (k = 0; k < 6; k++) { a = k * 60 + 30; s += '<ellipse cx="' + cx + '" cy="' + (cy - r * 0.33) + '" rx="' + (r * 0.22) + '" ry="' + (r * 0.36) + '" fill="' + c2 + '" transform="rotate(' + a + ' ' + cx + ' ' + cy + ')"/>'; }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.16) + '" fill="' + c2 + '" stroke="' + c1 + '" stroke-width="' + (r * 0.04) + '"/>';
    return s;
  }
  var A = PC.ART = {};
  A.rosette = function (c1, c2, tip, cls) { return svg('0 0 64 64', rosetteBody(32, 32, 30, c1 || '#8fb996', c2 || '#b7d3b0', tip || '#e8a59a'), cls); };
  // logo: rosette in a terracotta pot
  A.logo = function (cls) {
    return svg('0 0 64 64', '<ellipse cx="32" cy="60" rx="20" ry="2.6" fill="#000" opacity=".08"/>' +
      '<g transform="translate(0 -4)">' + rosetteBody(32, 26, 20, '#86b38c', '#b9d8b2', '#e49b8d') + '</g>' +
      '<path d="M14 36h36l-4.5 22a3 3 0 0 1-3 2.4H21.5a3 3 0 0 1-3-2.4z" fill="#c4683f"/><rect x="12" y="33" width="40" height="7" rx="3" fill="#d27a52"/>' +
      '<path d="M20 46h24" stroke="#e39a76" stroke-width="2" stroke-linecap="round" opacity=".7"/>', cls);
  };
  A.cactus = function (cls) {
    return svg('0 0 64 64', '<path d="M32 10c-4 0-6 3-6 7v19h12V17c0-4-2-7-6-7z" fill="#6f9f76"/><path d="M26 26c-4 0-7-2-7-6v-4c0-2 3-2 3 0v4c0 2 2 3 4 3z" fill="#6f9f76"/><path d="M38 22c4 0 7-2 7-6v-3c0-2-3-2-3 0v3c0 2-2 3-4 3z" fill="#6f9f76"/>' +
      '<path d="M29 14v20M32 12v22M35 14v20" stroke="#5a8862" stroke-width="1" opacity=".8"/><circle cx="32" cy="9" r="3" fill="#f2a7b0"/>' +
      '<path d="M18 36h28l-3.5 20a3 3 0 0 1-3 2.5h-15a3 3 0 0 1-3-2.5z" fill="#c4683f"/><rect x="16" y="33" width="32" height="6" rx="3" fill="#d27a52"/>', cls);
  };
  A.sprig = function (cls) {
    return svg('0 0 64 64', '<path d="M12 58C22 44 30 30 50 8" stroke="#6f9f76" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="22" cy="42" rx="5" ry="10" fill="#9cc29f" transform="rotate(-50 22 42)"/><ellipse cx="34" cy="38" rx="5" ry="10" fill="#b5d4b0" transform="rotate(40 34 38)"/>' +
      '<ellipse cx="32" cy="26" rx="4.5" ry="9" fill="#9cc29f" transform="rotate(-45 32 26)"/><ellipse cx="44" cy="22" rx="4.5" ry="9" fill="#b5d4b0" transform="rotate(45 44 22)"/>', cls);
  };
  // game icons
  var ICON = A.icon = {};
  ICON.ws = svg('0 0 64 64', '<rect x="6" y="6" width="40" height="40" rx="8" fill="#fffdf8" stroke="#3e6e52" stroke-width="3"/>' +
    '<g font-family="Atkinson Hyperlegible, sans-serif" font-weight="700" font-size="11" fill="#3e6e52" text-anchor="middle"><text x="16" y="21">A</text><text x="26" y="21">P</text><text x="36" y="21">O</text><text x="16" y="34">L</text><text x="26" y="34">E</text><text x="36" y="34">T</text></g>' +
    '<rect x="10" y="12" width="32" height="12" rx="6" fill="#f3b8a8" opacity=".55"/>' +
    '<circle cx="40" cy="40" r="11" fill="#e3eedf" fill-opacity=".6" stroke="#b85c38" stroke-width="4"/><path d="M48 48l9 9" stroke="#b85c38" stroke-width="6" stroke-linecap="round"/>');
  ICON.cw = svg('0 0 64 64', '<g stroke="#3e6e52" stroke-width="2.5" fill="#fffdf8"><rect x="6" y="18" width="13" height="13"/><rect x="19" y="18" width="13" height="13" fill="#d8e9f3"/><rect x="32" y="18" width="13" height="13" fill="#d8e9f3"/><rect x="19" y="5" width="13" height="13"/><rect x="19" y="31" width="13" height="13"/><rect x="19" y="44" width="13" height="13"/></g>' +
    '<path d="M44 52l4-12 12-14 5 5-12 14z" fill="#e9a23b" stroke="#8a5a1c" stroke-width="2" stroke-linejoin="round"/><path d="M44 52l4-12 6 5z" fill="#f6dfb8"/>');
  ICON.su = svg('0 0 64 64', '<rect x="6" y="6" width="52" height="52" rx="8" fill="#fffdf8" stroke="#3e6e52" stroke-width="3"/><path d="M23.3 6v52M40.6 6v52M6 23.3h52M6 40.6h52" stroke="#3e6e52" stroke-width="2"/>' +
    '<rect x="24.5" y="24.5" width="15" height="15" fill="#f6e0d3"/><g font-family="Atkinson Hyperlegible, sans-serif" font-weight="700" font-size="12" text-anchor="middle"><text x="14.6" y="19" fill="#3e6e52">5</text><text x="32" y="36.5" fill="#b85c38">7</text><text x="49.3" y="53.5" fill="#3e6e52">3</text><text x="49.3" y="19" fill="#3e6e52">1</text></g>');
  ICON.sc = svg('0 0 64 64', '<g transform="rotate(-8 18 34)"><rect x="5" y="22" width="22" height="22" rx="5" fill="#3e6e52"/><text x="16" y="38.5" fill="#fff" font-family="Atkinson Hyperlegible, sans-serif" font-weight="700" font-size="15" text-anchor="middle">T</text></g>' +
    '<g transform="rotate(6 34 30)"><rect x="22" y="14" width="22" height="22" rx="5" fill="#b85c38"/><text x="33" y="30.5" fill="#fff" font-family="Atkinson Hyperlegible, sans-serif" font-weight="700" font-size="15" text-anchor="middle">E</text></g>' +
    '<g transform="rotate(-4 48 42)"><rect x="37" y="31" width="22" height="22" rx="5" fill="#7fa37f"/><text x="48" y="47.5" fill="#fff" font-family="Atkinson Hyperlegible, sans-serif" font-weight="700" font-size="15" text-anchor="middle">A</text></g>');
  ICON.mm = svg('0 0 64 64', '<g transform="rotate(-10 22 34)"><rect x="8" y="12" width="28" height="38" rx="6" fill="#3e6e52"/><rect x="12" y="16" width="20" height="30" rx="4" fill="none" stroke="#fff" stroke-dasharray="3 3" opacity=".6"/></g>' +
    '<g transform="rotate(8 42 34)"><rect x="28" y="12" width="28" height="38" rx="6" fill="#fffdf8" stroke="#b85c38" stroke-width="2.5"/>' + rosetteBody(42, 31, 9, '#86b38c', '#b9d8b2', '#e49b8d') + '</g>');
  // blooming succulent used for the celebration
  A.bloom = function () {
    var s = '<g class="bl-outer">' + rosetteBody(60, 60, 54, '#86b38c', '#a9cda3', '#e8998b') + '</g><g class="bl-inner">' + rosetteBody(60, 60, 30, '#a9cda3', '#d3e7c9', '#f0b2a8') + '</g>';
    for (var k = 0; k < 5; k++) s += '<ellipse class="bl-petal" cx="60" cy="49" rx="5" ry="10" fill="#f6b6c1" transform="rotate(' + (k * 72) + ' 60 60)"/>';
    s += '<circle cx="60" cy="60" r="5" fill="#f9d77e"/>';
    return svg('0 0 120 120', s, 'bloom');
  };
})(typeof window !== 'undefined' ? window : globalThis);
