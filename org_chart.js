/**
 * =============================================================================
 *  Organigrama Keralty · Looker Visualization (API 2.0) — v5.1
 *  Layout calculado en JS + conectores SVG (ya no depende de CSS flex anidado)
 *  v5.1: muestra el cargo debajo del nombre
 *
 *  Campos del explore (nombre exacto, sin importar el orden):
 *    colaborador_id, nombre_completo, jefe_directo      (obligatorios)
 *    rol_equipo, nivel_jerarquico, cargo, correo_keralty, cuenta_en_equipo (opcionales)
 * =============================================================================
 */
looker.plugins.visualizations.add({
  id: "org_chart",
  label: "Organigrama Keralty (Pro)",

  options: {
    levelColor: { type: "string", label: "Color Principal (Nivel 1)", display: "color", default: "#002B49", order: 1 },
    headerColor: { type: "string", label: "Color Acento", display: "color", default: "#00B074", order: 2 },
    cardTextColor: { type: "string", label: "Color Texto", display: "color", default: "#0F172A", order: 3 },
    pageBg: { type: "string", label: "Fondo Lienzo", display: "color", default: "#F8FAFC", order: 4 },
    cardStyle: {
      type: "string", label: "Estilo Tarjeta", default: "glass", order: 5,
      display: "select", values: [
        { "Efecto Cristal": "glass" },
        { "Moderno Corporativo": "modern" },
        { "Minimalista": "minimal" }
      ]
    },
    connectorStyle: {
      type: "string", label: "Conectores", default: "elbow", order: 6,
      display: "select", values: [
        { "Codo Ortogonal": "elbow" },
        { "Curvas Suaves": "curve" }
      ]
    },
    cardWidth: { type: "number", label: "Ancho Tarjeta (px)", default: 210, display: "number", order: 7 },
    leafCols: { type: "number", label: "Máx. tarjetas por fila (equipos sin subordinados; 0 = una sola fila)", default: 6, display: "number", order: 8 },
    showBossName: { type: "boolean", label: "Mostrar Jefe", default: false, order: 9 },
    showEmail: { type: "boolean", label: "Mostrar Correo", default: false, order: 10 }
  },

  create: function (element, config) {
    element.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .koc-root, .koc-root * { box-sizing: border-box; }
        .koc-root {
          width: 100%; height: 100%; position: relative; overflow: auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          --koc-accent: #00B074; --koc-text: #0F172A; --koc-muted: #64748B;
          --koc-line: #94A3B8; --koc-card-w: 210px;
        }

        .koc-toolbar-wrap { position: sticky; top: 0; left: 0; z-index: 10; }
        .koc-toolbar {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          background: rgba(255,255,255,0.94); backdrop-filter: blur(8px);
          padding: 10px 20px; border-bottom: 1px solid #E2E8F0;
        }
        .koc-title { font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
        .koc-title::before { content: ''; width: 4px; height: 16px; border-radius: 2px; background: var(--koc-accent); }
        .koc-right { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: flex-end; }
        .koc-stats { display: flex; gap: 8px; }
        .koc-chip { background: #F1F5F9; border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 600; color: #475569; }
        .koc-zoom { display: flex; align-items: center; gap: 4px; }
        .koc-btn {
          border: 1px solid #E2E8F0; background: #fff; color: #334155; border-radius: 8px;
          font-size: 12px; font-weight: 600; padding: 4px 9px; cursor: pointer; font-family: inherit;
        }
        .koc-btn:hover { background: #F1F5F9; }
        .koc-zoom-label { font-size: 11px; font-weight: 600; color: #64748B; min-width: 38px; text-align: center; }

        /* Lienzo: ancho = contenido, así el scroll horizontal siempre funciona */
        .koc-canvas { padding: 24px; width: max-content; min-width: 100%; }
        .koc-sizer { position: relative; margin: 0 auto; }
        .koc-stage { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
        .koc-svg { position: absolute; left: 0; top: 0; pointer-events: none; overflow: visible; }
        .koc-svg path { fill: none; stroke: var(--koc-line); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

        .koc-groupbox {
          position: absolute; border: 2px dashed #CBD5E1; border-radius: 16px;
          background: rgba(148,163,184,0.06);
        }

        /* ---- Tarjetas (posición absoluta, tamaño fijo) ---- */
        .koc-card {
          position: absolute; overflow: hidden; border-radius: 12px; padding: 12px 12px 10px; text-align: center;
          background: #FFFFFF; border: 1px solid #E2E8F0;
          box-shadow: 0 4px 12px rgba(15,23,42,0.06);
          transition: box-shadow 0.2s, transform 0.2s; z-index: 2;
        }
        .koc-root[data-card="glass"] .koc-card { background: rgba(255,255,255,0.97); border-top: 4px solid var(--koc-level, var(--koc-accent)); }
        .koc-root[data-card="modern"] .koc-card { border-left: 4px solid var(--koc-level, var(--koc-accent)); text-align: left; }
        .koc-root[data-card="modern"] .koc-avatar { margin-left: 0; }
        .koc-root[data-card="minimal"] .koc-card { box-shadow: none; border-color: var(--koc-level, var(--koc-accent)); }
        .koc-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(15,23,42,0.12); }

        .koc-badge {
          display: inline-block; max-width: 100%;
          background: color-mix(in srgb, var(--koc-level, var(--koc-accent)) 12%, #FFFFFF);
          color: var(--koc-level, var(--koc-accent));
          font-size: 9.5px; font-weight: 700; text-transform: uppercase;
          padding: 2px 8px; border-radius: 12px; margin-bottom: 6px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: top;
        }
        .koc-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          border: 2px solid var(--koc-level, var(--koc-accent));
          background: #F8FAFC; color: var(--koc-level, var(--koc-accent));
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 6px auto; font-size: 13px; font-weight: 700;
        }
        .koc-name {
          font-size: 12.5px; font-weight: 700; color: var(--koc-text); line-height: 1.25;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .koc-cargo {
          font-size: 11px; font-weight: 500; color: var(--koc-muted); margin-top: 3px; line-height: 1.25;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .koc-meta { font-size: 10.5px; color: var(--koc-muted); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      </style>

      <div class="koc-root" id="koc-root" data-conn="elbow" data-card="glass">
        <div class="koc-toolbar-wrap" id="koc-toolbar-container"></div>
        <div class="koc-canvas"><div id="koc-body"></div></div>
      </div>
    `;
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    var self = this;
    self.clearErrors();

    var root = element.querySelector("#koc-root");
    var body = element.querySelector("#koc-body");
    var toolbar = element.querySelector("#koc-toolbar-container");
    if (!root || !body) { done(); return; }

    try {
      var LEVEL_COLOR = safeColor(config.levelColor, "#002B49");
      var ACCENT = safeColor(config.headerColor, "#00B074");
      var TEXT = safeColor(config.cardTextColor, "#0F172A");
      var BG = safeColor(config.pageBg, "#F8FAFC");
      var CARD_W = clamp(num(config.cardWidth, 210), 140, 360);

      root.style.backgroundColor = BG;
      root.setAttribute("data-conn", config.connectorStyle || "elbow");
      root.setAttribute("data-card", config.cardStyle || "glass");
      root.style.setProperty("--koc-accent", ACCENT);
      root.style.setProperty("--koc-text", TEXT);
      root.style.setProperty("--koc-card-w", CARD_W + "px");

      var fields = pickFields(queryResponse);
      if (!fields.key || !fields.name || !fields.bossName) {
        self.addError({
          title: "Faltan campos en la consulta",
          message: "Agrega al explore: colaborador_id, nombre_completo y jefe_directo " +
                   "(opcionales: rol_equipo, nivel_jerarquico, cargo, correo_keralty, cuenta_en_equipo)."
        });
        done(); return;
      }

      /* ---------- 1. Nodos ---------- */
      var nodes = {}, aliasIndex = {}, parentOf = {}, roots = [];

      data.forEach(function (row) {
        var key = str(cellValue(row, fields.key));
        if (!key) return;
        var name = str(cellValue(row, fields.name));
        nodes[key] = {
          key: key,
          name: name || prettifyKey(key),
          bossKey: str(cellValue(row, fields.bossKey)),
          bossName: str(cellValue(row, fields.bossName)),
          cargo: str(cellValue(row, fields.cargo)),
          role: str(cellValue(row, fields.role)),
          level: num(cellValue(row, fields.level), null),
          email: str(cellValue(row, fields.email)),
          counts: toBool(cellValue(row, fields.counts)),
          children: []
        };
        registerAlias(aliasIndex, nodes[key].name, key);
      });

      /* ---------- 2. Jefes (soporta jefes compartidos "A y B") ---------- */
      var groups = {}, memberGroup = {};
      Object.keys(nodes).forEach(function (k) {
        var ps = resolveParents(nodes[k], nodes, aliasIndex).filter(function (p) { return p !== k; });
        if (ps.length === 1) {
          parentOf[k] = ps[0];
        } else if (ps.length > 1) {
          var gk = "grp:" + ps.slice().sort().join("+");
          if (!groups[gk]) {
            groups[gk] = {
              key: gk, isGroup: true, children: [], level: null,
              members: ps.map(function (p) { return nodes[p]; })
            };
            ps.forEach(function (p) { if (!memberGroup[p]) memberGroup[p] = gk; });
          }
          parentOf[k] = gk;
        }
      });
      Object.keys(groups).forEach(function (gk) {
        var first = groups[gk].members[0];
        if (parentOf[first.key]) parentOf[gk] = parentOf[first.key];
      });

      function attach(child, parentKey) {
        var p = parentKey && (nodes[parentKey] || groups[parentKey]);
        if (p) p.children.push(child); else roots.push(child);
      }
      Object.keys(nodes).forEach(function (k) {
        if (memberGroup[k]) return;
        attach(nodes[k], parentOf[k]);
      });
      Object.keys(groups).forEach(function (gk) {
        var g = groups[gk];
        g.members.forEach(function (m) { g.children = g.children.concat(m.children); m.children = []; });
        attach(g, parentOf[gk]);
      });

      /* ---------- 3. Niveles ---------- */
      var levelMap = computeLevels(roots);
      Object.keys(nodes).forEach(function (k) {
        if (levelMap[k] === undefined) { roots.push(nodes[k]); levelMap = computeLevels(roots); }
      });
      Object.keys(nodes).forEach(function (k) {
        if (!nodes[k].level) nodes[k].level = levelMap[k] || 1;
      });

      var maxLevel = 1;
      Object.keys(nodes).forEach(function (k) { maxLevel = Math.max(maxLevel, nodes[k].level); });

      var palette = {};
      for (var L = 1; L <= maxLevel; L++) {
        palette[L] = mix(LEVEL_COLOR, "#FFFFFF", Math.min(0.5, (L - 1) * 0.15));
      }
      var counted = Object.keys(nodes).filter(function (k) { return nodes[k].counts !== false; }).length;

      /* ---------- 4. Layout calculado ---------- */
      var showBoss = !!config.showBossName, showMail = !!config.showEmail;
      var CARD_H = 152 + (showBoss ? 15 : 0) + (showMail ? 15 : 0);
      var HGAP = 24, VGAP = 64, ROW_GAP = 40, MEMBER_GAP = 12, GROUP_PAD = 10, MARGIN = 16;
      var leafCols = Math.max(0, Math.floor(num(config.leafCols, 6)));
      if (leafCols > 1 && leafCols % 2 === 1) leafCols++;   // par: el tronco pasa por el hueco central

      function nodeW(n) {
        return n.isGroup
          ? n.members.length * CARD_W + (n.members.length - 1) * MEMBER_GAP + 2 * GROUP_PAD
          : CARD_W;
      }

      var seen = {};
      function build(n) {
        if (seen[n.key]) return null;
        seen[n.key] = true;
        var kids = (n.children || []).slice()
          .sort(function (a, b) { return sortKey(a).localeCompare(sortKey(b)); })
          .map(build).filter(Boolean);
        var t = { n: n, kids: kids, w: 0, cx: 0, y: 0, grid: false };
        var allLeaf = kids.length > 0 && kids.every(function (k) { return k.kids.length === 0; });
        if (leafCols > 1 && allLeaf && kids.length > leafCols) { t.grid = true; t.cols = leafCols; }
        return t;
      }

      function measure(t) {
        var nw = nodeW(t.n);
        if (!t.kids.length) { t.w = nw; return t.w; }
        if (t.grid) {
          t.kids.forEach(function (k) { k.w = CARD_W; });
          t.gridW = t.cols * CARD_W + (t.cols - 1) * HGAP;
          t.w = Math.max(nw, t.gridW);
          return t.w;
        }
        var sum = 0;
        t.kids.forEach(function (k, i) { sum += measure(k) + (i ? HGAP : 0); });
        t.childrenW = sum;
        t.w = Math.max(nw, sum);
        return t.w;
      }

      function place(t, left, y) {
        t.y = y;
        if (!t.kids.length) { t.cx = left + t.w / 2; return; }
        var cy = y + CARD_H + VGAP;
        if (t.grid) {
          t.cx = left + t.w / 2;
          var gl = t.cx - t.gridW / 2;
          t.rows = Math.ceil(t.kids.length / t.cols);
          t.kids.forEach(function (k, i) {
            var r = Math.floor(i / t.cols), c = i % t.cols;
            k.cx = gl + c * (CARD_W + HGAP) + CARD_W / 2;
            k.y = cy + r * (CARD_H + ROW_GAP);
          });
          return;
        }
        var x = left + (t.w - t.childrenW) / 2;
        t.kids.forEach(function (k) { place(k, x, cy); x += k.w + HGAP; });
        t.cx = (t.kids[0].cx + t.kids[t.kids.length - 1].cx) / 2;
      }

      var forest = roots.map(build).filter(Boolean);
      var cursor = MARGIN;
      forest.forEach(function (t, i) {
        measure(t);
        place(t, cursor, MARGIN + GROUP_PAD);
        cursor += t.w + HGAP * 2;
      });
      var W = Math.max(cursor - HGAP * 2 + MARGIN, 200);

      /* ---------- 5. Render: tarjetas + conectores SVG ---------- */
      var cardsHtml = [], paths = [], maxY = 0;
      var opts = { palette: palette, showBossName: showBoss, showEmail: showMail };
      var curve = (config.connectorStyle === "curve");

      function emit(t) {
        var n = t.n, pad = n.isGroup ? GROUP_PAD : 0;
        maxY = Math.max(maxY, t.y + CARD_H + pad);

        if (n.isGroup) {
          var gw = nodeW(n);
          cardsHtml.push('<div class="koc-groupbox" style="left:' + (t.cx - gw / 2) + 'px;top:' + (t.y - GROUP_PAD) +
                         'px;width:' + gw + 'px;height:' + (CARD_H + 2 * GROUP_PAD) + 'px"></div>');
          var rowW = n.members.length * CARD_W + (n.members.length - 1) * MEMBER_GAP;
          var sx = t.cx - rowW / 2;
          n.members.forEach(function (m, i) {
            cardsHtml.push(cardHtml(m, opts, sx + i * (CARD_W + MEMBER_GAP), t.y, CARD_W, CARD_H));
          });
        } else {
          cardsHtml.push(cardHtml(n, opts, t.cx - CARD_W / 2, t.y, CARD_W, CARD_H));
        }

        if (!t.kids.length) return;
        var py = t.y + CARD_H + pad;

        if (t.grid) {
          var lastBus = 0;
          for (var r = 0; r < t.rows; r++) {
            var rowKids = t.kids.slice(r * t.cols, (r + 1) * t.cols);
            var rowTop = rowKids[0].y, busY = rowTop - 20;
            var x1 = Math.min(rowKids[0].cx, t.cx), x2 = Math.max(rowKids[rowKids.length - 1].cx, t.cx);
            paths.push("M" + x1 + "," + busY + " H" + x2);
            rowKids.forEach(function (k) { paths.push("M" + k.cx + "," + busY + " V" + rowTop); });
            lastBus = busY;
          }
          paths.push("M" + t.cx + "," + py + " V" + lastBus);
          t.kids.forEach(function (k) {
            cardsHtml.push(cardHtml(k.n, opts, k.cx - CARD_W / 2, k.y, CARD_W, CARD_H));
            maxY = Math.max(maxY, k.y + CARD_H);
          });
          return;
        }

        t.kids.forEach(function (k) {
          var ky = k.y - (k.n.isGroup ? GROUP_PAD : 0);
          var mid = py + (ky - py) / 2;
          if (Math.abs(k.cx - t.cx) < 0.5) {
            paths.push("M" + t.cx + "," + py + " V" + ky);
          } else if (curve) {
            paths.push("M" + t.cx + "," + py + " C" + t.cx + "," + mid + " " + k.cx + "," + mid + " " + k.cx + "," + ky);
          } else {
            paths.push("M" + t.cx + "," + py + " V" + mid + " H" + k.cx + " V" + ky);
          }
          emit(k);
        });
      }
      forest.forEach(emit);

      var H = maxY + MARGIN;

      body.innerHTML =
        '<div class="koc-sizer" id="koc-sizer">' +
          '<div class="koc-stage" id="koc-stage" style="width:' + W + 'px;height:' + H + 'px">' +
            '<svg class="koc-svg" width="' + W + '" height="' + H + '"><path d="' + paths.join(" ") + '"/></svg>' +
            cardsHtml.join("") +
          '</div>' +
        '</div>';

      /* ---------- 6. Toolbar + zoom ---------- */
      toolbar.innerHTML =
        '<div class="koc-toolbar">' +
          '<span class="koc-title">Organigrama del Equipo</span>' +
          '<div class="koc-right">' +
            '<div class="koc-stats">' +
              '<span class="koc-chip">Colaboradores: <b>' + counted + '</b></span>' +
              '<span class="koc-chip">Niveles: <b>' + maxLevel + '</b></span>' +
            '</div>' +
            '<div class="koc-zoom">' +
              '<button class="koc-btn" id="koc-zout" title="Alejar">−</button>' +
              '<span class="koc-zoom-label" id="koc-zlabel">100%</span>' +
              '<button class="koc-btn" id="koc-zin" title="Acercar">+</button>' +
              '<button class="koc-btn" id="koc-zfit" title="Ajustar al ancho">Ajustar</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      var sizer = element.querySelector("#koc-sizer");
      var stage = element.querySelector("#koc-stage");
      var zlabel = element.querySelector("#koc-zlabel");

      function fitScale() { return clamp((root.clientWidth - 48) / W, 0.35, 1); }
      function applyScale() {
        var s = self._scale;
        sizer.style.width = (W * s) + "px";
        sizer.style.height = (H * s) + "px";
        stage.style.transform = "scale(" + s + ")";
        zlabel.textContent = Math.round(s * 100) + "%";
      }
      if (!self._userScaled || !self._scale) { self._scale = fitScale(); self._userScaled = false; }
      applyScale();

      element.querySelector("#koc-zin").onclick = function () {
        self._scale = clamp(self._scale + 0.1, 0.2, 2); self._userScaled = true; applyScale();
      };
      element.querySelector("#koc-zout").onclick = function () {
        self._scale = clamp(self._scale - 0.1, 0.2, 2); self._userScaled = true; applyScale();
      };
      element.querySelector("#koc-zfit").onclick = function () {
        self._scale = fitScale(); self._userScaled = false; applyScale();
      };

    } catch (err) {
      self.addError({ title: "Error al renderizar", message: String(err) });
    }
    done();
  }
});

/* ============================ Helpers ============================ */

function pickFields(qr) {
  var f = (qr && qr.fields) || {};
  var all = (f.dimensions || []).concat(f.measures || []);
  var byShort = {};
  all.forEach(function (d) { byShort[String(d.name).split(".").pop().toLowerCase()] = d.name; });
  return {
    key: byShort["colaborador_id"],
    name: byShort["nombre_completo"],
    bossKey: byShort["jefe_directo_id"],
    bossName: byShort["jefe_directo"],
    cargo: byShort["cargo"],
    role: byShort["rol_equipo"],
    level: byShort["nivel_jerarquico"],
    email: byShort["correo_keralty"],
    counts: byShort["cuenta_en_equipo"]
  };
}

function resolveParents(node, nodes, index) {
  if (node.bossKey && nodes[node.bossKey]) return [node.bossKey];
  var bossStr = node.bossName || node.bossKey;
  if (!bossStr) return [];
  var whole = index[norm(bossStr)];
  if (whole) return [whole];
  var out = [];
  bossStr.split(/\s*,\s*|\s+y\s+|\s*\/\s*|\s*&\s*/i).forEach(function (p) {
    var k = index[norm(p)];
    if (k && out.indexOf(k) === -1) out.push(k);
  });
  return out;
}

function sortKey(n) { return n.isGroup ? (n.members[0].name || "") : (n.name || ""); }

function cardHtml(node, opts, left, top, w, h) {
  var color = opts.palette[node.level] || opts.palette[1] || "#002B49";
  var badge = node.role || "";
  return '<div class="koc-card" style="--koc-level:' + color + ';left:' + left + 'px;top:' + top +
         'px;width:' + w + 'px;height:' + h + 'px" title="' + esc(node.name) + '">' +
           (badge ? '<div class="koc-badge">' + esc(badge) + '</div>' : '') +
           '<div class="koc-avatar">' + esc(initialsFrom(node.name)) + '</div>' +
           '<div class="koc-name">' + esc(node.name) + '</div>' +
           (node.cargo ? '<div class="koc-cargo" title="' + esc(node.cargo) + '">' + esc(node.cargo) + '</div>' : '') +
           (opts.showBossName && node.bossName ? '<div class="koc-meta" title="' + esc(node.bossName) + '">Jefe: ' + esc(node.bossName) + '</div>' : '') +
           (opts.showEmail && node.email ? '<div class="koc-meta">' + esc(node.email) + '</div>' : '') +
         '</div>';
}

function computeLevels(roots) {
  var lvl = {}, seen = {};
  function walk(n, l) {
    if (seen[n.key]) return;
    seen[n.key] = true;
    if (n.isGroup) n.members.forEach(function (m) { lvl[m.key] = l; });
    else lvl[n.key] = l;
    (n.children || []).forEach(function (c) { walk(c, l + 1); });
  }
  roots.forEach(function (r) { walk(r, 1); });
  return lvl;
}

function norm(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}
function registerAlias(idx, name, key) { if (name) idx[norm(name)] = key; }
function toBool(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v;
  var s = String(v).toLowerCase();
  if (s === "true" || s === "yes" || s === "si" || s === "sí" || s === "1") return true;
  if (s === "false" || s === "no" || s === "0") return false;
  return null;
}
function cellValue(row, field) { return row && field && row[field] ? row[field].value : null; }
function str(v) { return v === null || v === undefined ? "" : String(v).trim(); }
function num(v, fb) {
  if (v === null || v === undefined || v === "") return fb;
  var n = Number(v);
  return isFinite(n) ? n : fb;
}
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function safeColor(v, fb) { return /^#([0-9a-f]{3,8})$/i.test(v) ? v : fb; }
function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function prettifyKey(k) { return String(k || "").replace(/[_-]/g, " "); }
function initialsFrom(name) {
  var p = str(name).split(/\s+/);
  return ((p[0] ? p[0][0] : "") + (p[1] ? p[1][0] : "")).toUpperCase();
}
function hexToRgb(h) {
  h = h.replace("#", "");
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function mix(a, b, t) {
  var ca = hexToRgb(safeColor(a, "#002B49")), cb = hexToRgb(b);
  return "#" + ca.map(function (v, i) {
    return ("0" + Math.round(v + (cb[i] - v) * t).toString(16)).slice(-2);
  }).join("");
}
