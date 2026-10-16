/**
 * =============================================================================
 *  Organigrama Keralty · Looker Visualization (API 2.0) - Fix Layout Horizontal
 * =============================================================================
 */
looker.plugins.visualizations.add({
  id: "keralty_org_chart",
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

        /* Toolbar Superior */
        .koc-toolbar {
          position: sticky; top: 0; left: 0; z-index: 10;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px);
          padding: 12px 20px; border-bottom: 1px solid #E2E8F0;
        }
        .koc-title { font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
        .koc-title::before { content: ''; width: 4px; height: 16px; border-radius: 2px; background: var(--koc-accent); }
        .koc-stats { display: flex; gap: 8px; }
        .koc-chip { background: #F1F5F9; border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 600; color: #475569; }

        /* Lienzo y Estructura en Árbol */
        .koc-canvas {
          min-width: max-content; padding: 40px 20px;
          display: flex; justify-content: center; align-items: flex-start;
        }
        .koc-tree { display: flex; flex-direction: column; align-items: center; }

        .koc-subtree {
          display: flex; flex-direction: column; align-items: center; position: relative;
        }

        .koc-node {
          position: relative; display: flex; flex-direction: column; align-items: center;
        }

        /* Ramas / Hijos en Horizontal */
        .koc-children {
          display: flex; flex-direction: row; align-items: flex-start; justify-content: center;
          position: relative; margin-top: 20px;
        }
        .koc-children > .koc-subtree { margin: 0 12px; }

        /* Conectores / Líneas */
        .koc-root[data-conn="elbow"] .koc-node::after {
          content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          width: 2px; height: 20px; background: var(--koc-line);
        }
        .koc-root[data-conn="elbow"] .koc-children::before {
          content: ''; position: absolute; top: -20px; left: 0; right: 0; height: 2px;
          background: var(--koc-line);
        }
        .koc-root[data-conn="elbow"] .koc-children > .koc-subtree::before {
          content: ''; position: absolute; top: -20px; left: 50%; transform: translateX(-50%);
          width: 2px; height: 20px; background: var(--koc-line);
        }

        /* Estilos de Tarjeta */
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
        .koc-meta { font-size: 10.5px; color: var(--koc-muted); margin-top: 3px; }
      </style>

      <div class="koc-root" id="koc-root" data-conn="elbow" data-card="glass">
        <div id="koc-toolbar-container"></div>
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
      var nodes = {}, aliasIndex = {}, parentOf = {}, roots = [];

      data.forEach(function (row) {
        var key = str(cellValue(row, fields.key));
        if (!key) return;

        var name = str(cellValue(row, fields.name));
        var bossKey = str(cellValue(row, fields.bossKey));
        var bossName = str(cellValue(row, fields.bossName));

        nodes[key] = {
          key: key,
          name: name || prettifyKey(key),
          bossKey: bossKey,
          bossName: bossName,
          cargo: str(cellValue(row, fields.cargo)),
          role: str(cellValue(row, fields.role)),
          level: num(cellValue(row, fields.level), null),
          email: str(cellValue(row, fields.email)),
          children: []
        };

        registerAlias(aliasIndex, name, key);
      });

      // Resolución de jefes (soporta nombres concatenados "A y B")
      Object.keys(nodes).forEach(function (k) {
        var parentKey = resolveParent(nodes[k], nodes, aliasIndex);
        if (parentKey && parentKey !== k) {
          parentOf[k] = parentKey;
        }
      });

      // Construcción de la jerarquía
      Object.keys(nodes).forEach(function (k) {
        var parentKey = parentOf[k];
        if (parentKey && nodes[parentKey]) {
          nodes[parentKey].children.push(nodes[k]);
        } else {
          roots.push(nodes[k]);
        }
      });

      var levelMap = computeLevels(nodes, roots);
      Object.keys(nodes).forEach(function (k) {
        if (!nodes[k].level) nodes[k].level = levelMap[k];
      });

      var maxLevel = 1;
      Object.keys(nodes).forEach(function (k) { maxLevel = Math.max(maxLevel, nodes[k].level); });

      var palette = {};
      for (var L = 1; L <= maxLevel; L++) {
        palette[L] = mix(LEVEL_COLOR, "#FFFFFF", Math.min(0.5, (L - 1) * 0.15));
      }

      toolbar.innerHTML = `
        <div class="koc-toolbar">
          <span class="koc-title">Organigrama del Equipo</span>
          <div class="koc-stats">
            <span class="koc-chip">Colaboradores: <b>${Object.keys(nodes).length}</b></span>
            <span class="koc-chip">Niveles: <b>${maxLevel}</b></span>
          </div>
        </div>`;

      body.innerHTML = '<div class="koc-tree">' + roots.map(function (r) {
        return renderNode(r, { palette: palette, showBossName: config.showBossName, showEmail: config.showEmail });
      }).join("") + '</div>';

    } catch (err) {
      self.addError({ title: "Error al renderizar", message: String(err) });
    }
    done();
  }
});

/* Helper Functions */
function pickFields(qr) {
  var dims = (qr && qr.fields && qr.fields.dimensions) || [];
  var map = {};

  dims.forEach(function (d) {
    var n = d.name.toLowerCase();
    if (n.includes("colaborador_id") || n.includes("id")) map.key = d.name;
    else if (n.includes("nombre_completo") || n.includes("colaborador")) map.name = d.name;
    else if (n.includes("jefe_directo_id") || n.includes("jefe_id")) map.bossKey = d.name;
    else if (n.includes("jefe_directo") || n.includes("jefe")) map.bossName = d.name;
    else if (n.includes("cargo")) map.cargo = d.name;
    else if (n.includes("rol_equipo") || n.includes("rol")) map.role = d.name;
    else if (n.includes("nivel_jerarquico") || n.includes("nivel")) map.level = d.name;
    else if (n.includes("correo")) map.email = d.name;
  });

  if (!map.key && dims[0]) map.key = dims[0].name;
  if (!map.name && dims[1]) map.name = dims[1].name;
  if (!map.bossName && dims[2]) map.bossName = dims[2].name;

  return map;
}

function resolveParent(node, nodes, index) {
  if (node.bossKey && nodes[node.bossKey]) return node.bossKey;

  var bossStr = node.bossName || node.bossKey;
  if (!bossStr) return null;

  // Separar "A y B" o "A / B"
  var parts = bossStr.split(/\s*,\s*|\s+y\s+|\s*\/\s*/i);
  for (var i = 0; i < parts.length; i++) {
    var name = parts[i].trim().toLowerCase();
    if (index[name]) return index[name];
  }

  return null;
}

function renderNode(node, opts) {
  var color = opts.palette[node.level] || "#002B49";
  var badge = node.role || node.cargo || "";
  var initials = initialsFrom(node.name);

  var html = `
    <div class="koc-subtree">
      <div class="koc-node">
        <div class="koc-card" style="--koc-level: ${color}">
          ${badge ? `<div class="koc-badge">${esc(badge)}</div>` : ''}
          <div class="koc-avatar">${esc(initials)}</div>
          <div class="koc-name">${esc(node.name)}</div>
          ${opts.showBossName && node.bossName ? `<div class="koc-meta">Jefe: ${esc(node.bossName)}</div>` : ''}
          ${opts.showEmail && node.email ? `<div class="koc-meta">${esc(node.email)}</div>` : ''}
        </div>
      </div>`;

  if (node.children && node.children.length > 0) {
    html += `<div class="koc-children">` +
      node.children.map(function (c) { return renderNode(c, opts); }).join("") +
      `</div>`;
  }

  html += `</div>`;
  return html;
}

function computeLevels(nodes, roots) {
  var lvl = {};
  function walk(n, l) {
    lvl[n.key] = l;
    (n.children || []).forEach(function (c) { walk(c, l + 1); });
  }
  roots.forEach(function (r) { walk(r, 1); });
  return lvl;
}

function registerAlias(idx, name, key) {
  if (name) idx[name.trim().toLowerCase()] = key;
}

function cellValue(row, field) { return row && field && row[field] ? row[field].value : null; }
function str(v) { return v ? String(v).trim() : ""; }
function num(v, fb) { var n = Number(v); return isFinite(n) ? n : fb; }
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
