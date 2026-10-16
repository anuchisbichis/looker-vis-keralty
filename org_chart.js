/**
 * =============================================================================
 *  Organigrama Keralty · Looker Visualization (API 2.0) — v4
 *
 *  Campos que debe traer el explore (los nombres se leen exactos, sin importar el orden):
 *    colaborador_id, nombre_completo, jefe_directo      (obligatorios)
 *    rol_equipo, nivel_jerarquico, cargo, correo_keralty, cuenta_en_equipo   (opcionales)
 *  jefe_keralty (jefe del lado Keralty) se ignora: no es la jerarquía del equipo.
 * =============================================================================
 */
looker.plugins.visualizations.add({
  id: "org_chart",
  label: "Organigrama Keralty (Pro)",

  options: {
    levelColor: { type: "string", label: "Color Principal (Nivel 1)", display: "color", default: "#002B49" },
    headerColor: { type: "string", label: "Color Acento", display: "color", default: "#00B074" },
    cardTextColor: { type: "string", label: "Color Texto", display: "color", default: "#0F172A" },
    pageBg: { type: "string", label: "Fondo Lienzo", display: "color", default: "#F8FAFC" },
    cardStyle: {
      type: "string", label: "Estilo Tarjeta", default: "glass",
      display: "select", values: [
        { "Efecto Cristal": "glass" },
        { "Moderno Corporativo": "modern" },
        { "Minimalista": "minimal" }
      ]
    },
    connectorStyle: {
      type: "string", label: "Conectores", default: "elbow",
      display: "select", values: [
        { "Codo Ortogonal": "elbow" },
        { "Curvas Suaves": "curve" }
      ]
    },
    cardWidth: { type: "number", label: "Ancho Tarjeta (px)", default: 210, display: "number" },
    showBossName: { type: "boolean", label: "Mostrar Jefe", default: false },
    showEmail: { type: "boolean", label: "Mostrar Correo", default: false }
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
          --koc-accent: #00B074;
          --koc-text: #0F172A;
          --koc-muted: #64748B;
          --koc-line: #CBD5E1;
          --koc-bg: #F8FAFC;
          --koc-card-w: 210px;
        }

        /* Toolbar superior (el contenedor es el que queda fijo al hacer scroll) */
        .koc-toolbar-wrap { position: sticky; top: 0; left: 0; z-index: 10; }
        .koc-toolbar {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(8px);
          padding: 12px 20px; border-bottom: 1px solid #E2E8F0;
        }
        .koc-title { font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
        .koc-title::before { content: ''; width: 4px; height: 16px; border-radius: 2px; background: var(--koc-accent); }
        .koc-stats { display: flex; gap: 8px; }
        .koc-chip { background: #F1F5F9; border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 600; color: #475569; }

        /* Blindaje: nada del árbol puede encogerse (evita tarjetas montadas si el host reduce anchos) */
        .koc-tree, .koc-subtree, .koc-node, .koc-children, .koc-card { flex: 0 0 auto; }
        .koc-card { min-width: var(--koc-card-w); max-width: var(--koc-card-w); }
        .koc-subtree, .koc-node, .koc-children { min-width: max-content; }
        .koc-canvas > * { flex: 0 0 auto; }

        /* Lienzo y árbol */
        .koc-canvas {
          min-width: max-content; padding: 40px 20px;
          display: flex; justify-content: center; align-items: flex-start;
        }
        .koc-tree { display: flex; flex-direction: row; align-items: flex-start; gap: 24px; }

        .koc-subtree { display: flex; flex-direction: column; align-items: center; position: relative; }

        /* Fila de tarjetas de un nodo (1 tarjeta, o 2+ cuando son jefes compartidos) */
        .koc-node {
          position: relative; display: flex; flex-direction: row; align-items: flex-start;
          justify-content: center; gap: 12px;
        }

        .koc-children {
          display: flex; flex-direction: row; align-items: flex-start; justify-content: center;
          margin-top: 20px;
        }

        /* ---- Conectores ---- */
        /* Línea vertical que baja del padre: solo si tiene hijos */
        .koc-has-kids > .koc-node::after {
          content: ''; position: absolute; top: 100%; left: 50%; width: 2px; height: 20px;
          margin-left: -1px; background: var(--koc-line);
        }
        /* Cada hijo dibuja su mitad izquierda y derecha de la barra horizontal + su bajante */
        .koc-children > .koc-subtree { padding: 20px 12px 0; }
        .koc-children > .koc-subtree::before,
        .koc-children > .koc-subtree::after {
          content: ''; position: absolute; top: 0; width: 50%; height: 20px;
          border-top: 2px solid var(--koc-line);
        }
        .koc-children > .koc-subtree::before { right: 50%; }
        .koc-children > .koc-subtree::after  { left: 50%; border-left: 2px solid var(--koc-line); margin-left: -1px; }
        .koc-children > .koc-subtree:first-child::before { border-top: 0; }
        .koc-children > .koc-subtree:last-child::after   { border-top: 0; }
        .koc-children > .koc-subtree:only-child::before  { display: none; }
        /* Curvas suaves: redondea las esquinas de la barra */
        .koc-root[data-conn="curve"] .koc-children > .koc-subtree:last-child::before  { border-right: 2px solid var(--koc-line); border-radius: 0 12px 0 0; }
        .koc-root[data-conn="curve"] .koc-children > .koc-subtree:first-child::after  { border-top: 2px solid var(--koc-line); border-radius: 12px 0 0 0; }
        .koc-root[data-conn="curve"] .koc-children > .koc-subtree:only-child::after   { border-radius: 0; border-top: 0; }
        .koc-root[data-conn="curve"] .koc-children > .koc-subtree:last-child::after   { border-radius: 0; }

        /* ---- Tarjetas ---- */
        .koc-card {
          width: var(--koc-card-w); border-radius: 12px; padding: 14px; text-align: center;
          background: #FFFFFF; border: 1px solid #E2E8F0;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
          transition: transform 0.2s, box-shadow 0.2s; position: relative; z-index: 2;
        }
        .koc-root[data-card="glass"] .koc-card {
          background: rgba(255, 255, 255, 0.95);
          border-top: 4px solid var(--koc-level, var(--koc-accent));
        }
        .koc-root[data-card="modern"] .koc-card { border-left: 4px solid var(--koc-level, var(--koc-accent)); text-align: left; }
        .koc-root[data-card="minimal"] .koc-card { box-shadow: none; border-color: var(--koc-level, var(--koc-accent)); }
        .koc-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1); }

        .koc-badge {
          display: inline-block; max-width: 100%;
          background: color-mix(in srgb, var(--koc-level, var(--koc-accent)) 12%, #FFFFFF);
          color: var(--koc-level, var(--koc-accent));
          font-size: 9.5px; font-weight: 700; text-transform: uppercase;
          padding: 2px 8px; border-radius: 12px; margin-bottom: 6px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .koc-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          border: 2px solid var(--koc-level, var(--koc-accent));
          background: #F8FAFC; color: var(--koc-level, var(--koc-accent));
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 6px auto; font-size: 14px; font-weight: 700;
        }
        .koc-name { font-size: 12.5px; font-weight: 700; color: var(--koc-text); line-height: 1.2; }
        .koc-meta { font-size: 10.5px; color: var(--koc-muted); margin-top: 3px; word-break: break-word; }
      </style>

      <div class="koc-root" id="koc-root" data-conn="elbow" data-card="glass">
        <div class="koc-toolbar-wrap" id="koc-toolbar-container"></div>
        <div class="koc-canvas">
          <div id="koc-body"></div>
        </div>
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

      // ---- Resolución de jefes (soporta jefes compartidos "A y B") ----
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
      // El grupo cuelga del jefe de sus miembros
      Object.keys(groups).forEach(function (gk) {
        var first = groups[gk].members[0];
        if (parentOf[first.key]) parentOf[gk] = parentOf[first.key];
      });

      // ---- Construcción de la jerarquía ----
      function attach(child, parentKey) {
        var p = parentKey && (nodes[parentKey] || groups[parentKey]);
        if (p) p.children.push(child); else roots.push(child);
      }
      Object.keys(nodes).forEach(function (k) {
        if (memberGroup[k]) return;                 // se dibuja dentro de su grupo
        attach(nodes[k], parentOf[k]);
      });
      Object.keys(groups).forEach(function (gk) {
        var g = groups[gk];
        g.members.forEach(function (m) {            // hijos propios de los miembros se suman al grupo
          g.children = g.children.concat(m.children);
          m.children = [];
        });
        attach(g, parentOf[gk]);
      });

      // ---- Niveles (y rescate de nodos que quedaron fuera por ciclos) ----
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

      toolbar.innerHTML = `
        <div class="koc-toolbar">
          <span class="koc-title">Organigrama del Equipo</span>
          <div class="koc-stats">
            <span class="koc-chip">Colaboradores: <b>${counted}</b></span>
            <span class="koc-chip">Niveles: <b>${maxLevel}</b></span>
            <span class="koc-chip">v4</span>
          </div>
        </div>`;

      var opts = { palette: palette, showBossName: config.showBossName, showEmail: config.showEmail, seen: {} };
      body.innerHTML = '<div class="koc-tree">' + roots.map(function (r) { return renderNode(r, opts); }).join("") + '</div>';

    } catch (err) {
      self.addError({ title: "Error al renderizar", message: String(err) });
    }
    done();
  }
});

/* ============================ Helpers ============================ */

// Busca cada campo por su nombre EXACTO (ignora el prefijo "vista."), sin depender del orden ni de coincidencias parciales
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

// Devuelve TODOS los jefes encontrados (uno o varios)
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

function cardHtml(node, opts) {
  var color = opts.palette[node.level] || opts.palette[1] || "#002B49";
  var badge = node.role || node.cargo || "";
  return `
    <div class="koc-card" style="--koc-level: ${color}">
      ${badge ? `<div class="koc-badge">${esc(badge)}</div>` : ''}
      <div class="koc-avatar">${esc(initialsFrom(node.name))}</div>
      <div class="koc-name">${esc(node.name)}</div>
      ${opts.showBossName && node.bossName ? `<div class="koc-meta">Jefe: ${esc(node.bossName)}</div>` : ''}
      ${opts.showEmail && node.email ? `<div class="koc-meta">${esc(node.email)}</div>` : ''}
    </div>`;
}

function renderNode(node, opts) {
  if (opts.seen[node.key]) return "";               // protección contra ciclos
  opts.seen[node.key] = true;

  var kids = (node.children || []).slice()
    .sort(function (a, b) { return sortKey(a).localeCompare(sortKey(b)); })
    .map(function (c) { return renderNode(c, opts); })
    .filter(Boolean);

  var cards = node.isGroup
    ? node.members.map(function (m) { return cardHtml(m, opts); }).join("")
    : cardHtml(node, opts);

  return '<div class="koc-subtree' + (kids.length ? ' koc-has-kids' : '') + '">' +
           '<div class="koc-node' + (node.isGroup ? ' koc-group' : '') + '">' + cards + '</div>' +
           (kids.length ? '<div class="koc-children">' + kids.join("") + '</div>' : '') +
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
function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function prettifyKey(k) { return String(k || "").replace(/[_-]/g, ' '); }
function initialsFrom(name) {
  var p = str(name).split(/\s+/);
  return ((p[0] ? p[0][0] : '') + (p[1] ? p[1][0] : '')).toUpperCase();
}
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function mix(a, b, t) {
  var ca = hexToRgb(safeColor(a, "#002B49")), cb = hexToRgb(b);
  return "#" + ca.map(function (v, i) {
    return ("0" + Math.round(v + (cb[i] - v) * t).toString(16)).slice(-2);
  }).join("");
}
