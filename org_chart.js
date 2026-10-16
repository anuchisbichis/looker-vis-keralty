/**
 * =============================================================================
 *  Organigrama Keralty · Looker Visualization (API 2.0) - Design Pro Edition
 *  Fuente de datos: `proyecto-fabio-tafur-datos.demo_proyeccion.rpt_equipo_keralty`
 * =============================================================================
 */
looker.plugins.visualizations.add({
  id: "keralty_org_chart",
  label: "Organigrama Keralty (Pro)",

  options: {
    // -------- Paleta --------
    levelColor: {
      type: "string", label: "Color Nivel Nivel 1 (Principal)", display: "color", default: "#002B49"
    },
    headerColor: {
      type: "string", label: "Color Acento / Destacados", display: "color", default: "#00B074"
    },
    avatarBorderColor: {
      type: "string", label: "Color Borde Avatar", display: "color", default: "#00B074"
    },
    cardTextColor: {
      type: "string", label: "Color Texto Tarjeta", display: "color", default: "#0F172A"
    },
    pageBg: {
      type: "string", label: "Fondo del Lienzo", display: "color", default: "#F8FAFC"
    },

    // -------- Opciones Estructurales e Interactivas --------
    cardStyle: {
      type: "string", label: "Estilo Visual Tarjeta", default: "glass",
      display: "select", values: [
        { "Efecto Cristal (Glassmorphism)": "glass" },
        { "Moderno Corporativo": "modern" },
        { "Minimalista": "minimal" }
      ]
    },
    connectorStyle: {
      type: "string", label: "Estilo Conectores", default: "curve",
      display: "select", values: [
        { "Curvas Suaves (Elegante)": "curve" },
        { "Codo Ortogonal": "elbow" }
      ]
    },
    nodeShape: {
      type: "string", label: "Bordes de Tarjeta", default: "rounded",
      display: "select", values: [
        { "Redondeado Suave": "rounded" },
        { "Recto Corporativo": "square" },
        { "Cápsula": "pill" }
      ]
    },
    cardWidth: {
      type: "number", label: "Ancho de Tarjeta (px)", default: 220, display: "number"
    },
    enableZoomPan: {
      type: "boolean", label: "Habilitar Zoom y Arrastre de Lienzo", default: true
    },
    enableSearch: {
      type: "boolean", label: "Mostrar Barra de Búsqueda", default: true
    },
    showBossName: {
      type: "boolean", label: "Mostrar Nombre de Jefe", default: false
    },
    showEmail: {
      type: "boolean", label: "Mostrar Correo Electrónico", default: false
    },
    showTeamCount: {
      type: "boolean", label: "Mostrar Contador de Equipo", default: true
    },
    showStatusDot: {
      type: "boolean", label: "Punto de Estado / Formación", default: true
    },
    showLegend: {
      type: "boolean", label: "Mostrar Leyenda y Totales", default: true
    },
    colorByLevel: {
      type: "boolean", label: "Colorear por Nivel Jerárquico", default: true
    },
    showPlaceholders: {
      type: "boolean", label: "Mostrar Jefes Sin Datos (Fantasmas)", default: true
    }
  },

  create: function (element, config) {
    element.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .koc-root, .koc-root * { box-sizing: border-box; }
        .koc-root {
          width: 100%; height: 100%; position: relative; overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          --koc-accent: #00B074;
          --koc-text: #0F172A;
          --koc-muted: #64748B;
          --koc-line: #CBD5E1;
          --koc-bg: #F8FAFC;
          --koc-card-w: 220px;
          user-select: none;
        }

        .koc-root[data-shape="rounded"] { --koc-radius: 16px; }
        .koc-root[data-shape="square"]  { --koc-radius: 6px; }
        .koc-root[data-shape="pill"]    { --koc-radius: 28px; }

        /* Toolbar Superior */
        .koc-toolbar {
          position: absolute; top: 16px; left: 16px; right: 16px; z-index: 10;
          display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          padding: 10px 18px; border-radius: 16px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.06);
        }
        .koc-title-group { display: flex; align-items: center; gap: 12px; }
        .koc-title {
          font-size: 14px; font-weight: 700; color: #0F172A; letter-spacing: -0.2px;
          display: flex; align-items: center; gap: 8px;
        }
        .koc-title::before {
          content: ''; width: 6px; height: 18px; border-radius: 3px; background: var(--koc-accent);
        }
        .koc-stats { display: flex; gap: 8px; }
        .koc-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: #F1F5F9; border-radius: 20px; padding: 4px 10px;
          font-size: 11px; font-weight: 600; color: #475569;
        }
        .koc-chip b { color: #0F172A; font-weight: 700; }

        /* Controles de Búsqueda y Zoom */
        .koc-controls { display: flex; align-items: center; gap: 10px; }
        .koc-search-box {
          position: relative; display: flex; align-items: center;
        }
        .koc-search-input {
          padding: 6px 12px 6px 30px; font-size: 12px; border-radius: 20px;
          border: 1px solid #CBD5E1; outline: none; background: #FFF; width: 180px;
          transition: all 0.2s ease;
        }
        .koc-search-input:focus { width: 230px; border-color: var(--koc-accent); box-shadow: 0 0 0 3px rgba(0,176,116,0.15); }
        .koc-search-icon { position: absolute; left: 10px; font-size: 12px; color: #94A3B8; pointer-events: none; }

        .koc-zoom-btn {
          width: 30px; height: 30px; border-radius: 50%; border: 1px solid #E2E8F0;
          background: #FFFFFF; font-weight: bold; cursor: pointer; display: flex;
          align-items: center; justify-content: center; color: #475569; transition: 0.15s;
        }
        .koc-zoom-btn:hover { background: #F1F5F9; color: #0F172A; }

        /* Lienzo interactivo */
        .koc-viewport {
          width: 100%; height: 100%; overflow: hidden; cursor: grab; position: relative;
        }
        .koc-viewport:active { cursor: grabbing; }
        .koc-canvas {
          position: absolute; top: 0; left: 0; transform-origin: 0 0;
          padding: 100px 50px; min-width: 100%; min-height: 100%;
          display: flex; justify-content: center; align-items: flex-start;
        }

        /* Árbol y Nodos */
        .koc-tree { display: flex; flex-direction: column; align-items: center; }
        .koc-subtree {
          position: relative; display: flex; flex-direction: column; align-items: center;
          width: max-content;
        }
        .koc-node { position: relative; display: flex; flex-direction: column; align-items: center; z-index: 2; }
        .koc-branches { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); }
        .koc-children { display: flex; flex-direction: row; align-items: flex-start; justify-content: center; }
        .koc-children > .koc-subtree { margin-top: 24px; }
        .koc-children > .koc-subtree + .koc-subtree { margin-left: 24px; }

        /* Conectores Elegantes */
        .koc-root[data-conn="elbow"] .koc-subtree > .koc-node::after {
          content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          width: 2px; height: 24px; background: var(--koc-line);
        }
        .koc-root[data-conn="elbow"] .koc-children > .koc-subtree:not(.is-last)::before {
          content: ''; position: absolute; top: 0; left: 50%;
          width: calc(100% + 24px); height: 2px; background: var(--koc-line);
        }

        .koc-root[data-conn="curve"] .koc-subtree > .koc-node::after {
          content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          width: 2px; height: 24px; background: var(--koc-line);
        }
        .koc-root[data-conn="curve"] .koc-children > .koc-subtree:not(.is-last)::before {
          content: ''; position: absolute; top: 0; left: 50%;
          width: calc(100% + 24px); height: 24px;
          border-top: 2px solid var(--koc-line);
          border-right: 2px solid var(--koc-line);
          border-radius: 0 16px 0 0; background: transparent;
        }

        /* Diseños de Tarjeta */
        .koc-card {
          position: relative; width: var(--koc-card-w);
          border-radius: var(--koc-radius);
          padding: 16px; text-align: center;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        /* Glassmorphism */
        .koc-root[data-card="glass"] .koc-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.01);
        }
        .koc-root[data-card="glass"] .koc-card::before {
          content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 3px;
          background: var(--koc-level, var(--koc-accent)); border-radius: 0 0 4px 4px;
        }

        /* Modern */
        .koc-root[data-card="modern"] .koc-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-left: 5px solid var(--koc-level, var(--koc-accent));
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
        }

        /* Minimal */
        .koc-root[data-card="minimal"] .koc-card {
          background: #FFFFFF; border: 1px solid #CBD5E1;
          box-shadow: none;
        }

        /* Hover & Estado Activo */
        .koc-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04) !important;
          border-color: var(--koc-level, var(--koc-accent));
        }

        .koc-card.is-highlighted {
          animation: pulse-border 1.5s infinite;
          border-color: #3B82F6 !important;
        }
        @keyframes pulse-border {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }

        /* Badge y Avatar */
        .koc-badge {
          display: inline-block; max-width: 90%;
          background: color-mix(in srgb, var(--koc-level, var(--koc-accent)) 12%, #FFFFFF);
          color: var(--koc-level, var(--koc-accent));
          font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
          padding: 3px 10px; border-radius: 20px; margin-bottom: 8px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .koc-avatar {
          width: 48px; height: 48px; border-radius: 50%;
          border: 2px solid var(--koc-level, var(--koc-accent));
          background: color-mix(in srgb, var(--koc-level, var(--koc-accent)) 8%, #FFFFFF);
          color: var(--koc-level, var(--koc-accent));
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 8px auto; font-size: 15px; font-weight: 700;
        }

        .koc-name {
          font-size: 13px; font-weight: 700; line-height: 1.3; color: var(--koc-text);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .koc-meta {
          margin-top: 4px; font-size: 11px; font-weight: 500; color: var(--koc-muted);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* Botón Colapsar / Expandir */
        .koc-toggle-btn {
          position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%);
          width: 22px; height: 22px; border-radius: 50%; background: #FFFFFF;
          border: 1px solid #CBD5E1; color: #475569; font-size: 12px; font-weight: bold;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: 0.2s; z-index: 5;
        }
        .koc-toggle-btn:hover { background: var(--koc-accent); color: #FFF; border-color: var(--koc-accent); }

        .koc-card.is-ghost { border-style: dashed !important; background: rgba(248, 250, 252, 0.7); }
        .koc-dot {
          position: absolute; top: 12px; left: 12px; width: 10px; height: 10px; border-radius: 50%;
          border: 2px solid #FFF; box-shadow: 0 0 2px rgba(0,0,0,0.2);
        }

        .is-collapsed .koc-branches { display: none !important; }
      </style>

      <div class="koc-root" id="koc-root" data-conn="curve" data-card="glass" data-shape="rounded">
        <div id="koc-toolbar-container"></div>
        <div class="koc-viewport" id="koc-viewport">
          <div class="koc-canvas" id="koc-canvas">
            <div id="koc-body"></div>
          </div>
        </div>
      </div>
    `;
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    var self = this;
    self.clearErrors();

    var root = element.querySelector("#koc-root");
    var body = element.querySelector("#koc-body");
    var viewport = element.querySelector("#koc-viewport");
    var canvas = element.querySelector("#koc-canvas");
    var toolbarContainer = element.querySelector("#koc-toolbar-container");

    if (!root || !body) { done(); return; }

    try {
      var LEVEL_COLOR = safeColor(config.levelColor, "#002B49");
      var ACCENT = safeColor(config.headerColor, "#00B074");
      var TEXT = safeColor(config.cardTextColor, "#0F172A");
      var BG = safeColor(config.pageBg, "#F8FAFC");
      var CARD_W = clamp(num(config.cardWidth, 220), 140, 360);

      root.style.backgroundColor = BG;
      root.setAttribute("data-conn", config.connectorStyle === "elbow" ? "elbow" : "curve");
      root.setAttribute("data-card", config.cardStyle || "glass");
      root.setAttribute("data-shape", config.nodeShape || "rounded");
      root.style.setProperty("--koc-accent", ACCENT);
      root.style.setProperty("--koc-text", TEXT);
      root.style.setProperty("--koc-card-w", CARD_W + "px");

      var picked = pickFields(queryResponse, data);
      var map = picked.map;
      var aliasIndex = picked.alias;

      if (!map.key || !map.name || !map.bossKey) {
        self.addError({
          title: "Dimensiones Insuficientes",
          message: "Se requiere al menos colaborador_id, nombre_completo y jefe_directo_id."
        });
        done(); return;
      }

      var nodes = {}, order = [], roots = [], teamCount = 0, implicit = {}, parentOf = {};

      data.forEach(function (row) {
        var key = str(cellValue(row, map.key));
        if (!key) return;

        var name = str(cellValue(row, map.name)) || prettifyKey(key);
        var bossName = map.bossName ? str(cellValue(row, map.bossName)) : "";
        var bossKey = map.bossKey ? str(cellValue(row, map.bossKey)) : "";
        var cargo = map.cargo ? str(cellValue(row, map.cargo)) : "";
        var role = map.role ? str(cellValue(row, map.role)) : "";
        var level = num(map.level ? cellValue(row, map.level) : null, NaN);
        var email = map.email ? str(cellValue(row, map.email)) : "";
        var status = map.status ? str(cellValue(row, map.status)) : "";
        var formation = map.formation ? str(cellValue(row, map.formation)) : "";

        teamCount++;
        nodes[key] = {
          key: key, name: name, cargo: cargo, role: role,
          level: isFinite(level) ? level : null, email: email, status: status,
          formation: formation, bossKey: bossKey, bossName: bossName, children: [], collapsed: false
        };
        order.push(key);
        registerAlias(aliasIndex, name, key);
      });

      Object.keys(nodes).forEach(function (k) {
        var resolved = resolveParent(nodes[k], nodes, aliasIndex);
        if (resolved) parentOf[k] = resolved;
      });

      Object.keys(nodes).forEach(function (k) {
        var parentKey = parentOf[k];
        if (parentKey && nodes[parentKey] && parentKey !== k) {
          nodes[parentKey].children.push(nodes[k]);
        } else {
          roots.push(nodes[k]);
        }
      });

      var levelMap = computeLevels(nodes, roots);
      Object.keys(nodes).forEach(function (k) {
        nodes[k].level = levelMap[k];
        nodes[k].descendants = countDescendants(nodes[k]);
      });

      var maxLevel = 1;
      Object.keys(nodes).forEach(function (k) { maxLevel = Math.max(maxLevel, nodes[k].level); });
      var palette = {};
      for (var L = 1; L <= maxLevel; L++) {
        palette[L] = config.colorByLevel === false ? LEVEL_COLOR : mix(LEVEL_COLOR, "#FFFFFF", Math.min(0.6, (L - 1) * 0.15));
      }

      var opts = {
        showBossName: !!config.showBossName,
        showEmail: !!config.showEmail,
        showTeamCount: config.showTeamCount !== false,
        showStatusDot: config.showStatusDot !== false,
        palette: palette
      };

      // Renderizado
      body.innerHTML = '<div class="koc-tree">' + roots.map(function (r) { return renderNode(r, opts); }).join("") + '</div>';

      if (config.showLegend !== false) {
        toolbarContainer.innerHTML = renderToolbar(teamCount, Object.keys(nodes).length, maxLevel, config);
        setupSearchAndZoom(viewport, canvas, root);
      }

      // Eventos interactivos: Plegado
      body.addEventListener("click", function (e) {
        var toggle = e.target.closest(".koc-toggle-btn");
        if (toggle) {
          e.stopPropagation();
          var subtree = toggle.closest(".koc-subtree");
          subtree.classList.toggle("is-collapsed");
          toggle.textContent = subtree.classList.contains("is-collapsed") ? "+" : "−";
        }
      });

    } catch (err) {
      self.addError({ title: "Error en Visualización", message: String(err) });
    }
    done();
  }
});

/* --- Utilidades e Interacciones de Zoom / Búsqueda --- */

function setupSearchAndZoom(viewport, canvas, root) {
  var zoom = 1, panX = 0, panY = 0, isDragging = false, startX, startY;

  function updateTransform() {
    canvas.style.transform = "translate(" + panX + "px, " + panY + "px) scale(" + zoom + ")";
  }

  viewport.onmousedown = function (e) {
    if (e.target.closest('.koc-card') || e.target.closest('.koc-toolbar')) return;
    isDragging = true; startX = e.clientX - panX; startY = e.clientY - panY;
  };

  window.onmousemove = function (e) {
    if (!isDragging) return;
    panX = e.clientX - startX; panY = e.clientY - startY;
    updateTransform();
  };

  window.onmouseup = function () { isDragging = false; };

  viewport.onwheel = function (e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoom += e.deltaY * -0.001;
      zoom = Math.min(Math.max(0.4, zoom), 2);
      updateTransform();
    }
  };

  // Búsqueda
  var searchInput = root.querySelector("#koc-search");
  if (searchInput) {
    searchInput.oninput = function (e) {
      var q = e.target.value.toLowerCase().trim();
      var cards = root.querySelectorAll(".koc-card");
      cards.forEach(function (card) {
        var name = card.querySelector(".koc-name").textContent.toLowerCase();
        if (q && name.includes(q)) {
          card.classList.add("is-highlighted");
        } else {
          card.classList.remove("is-highlighted");
        }
      });
    };
  }
}

function renderToolbar(teamCount, nodeCount, maxLevel, config) {
  return '<div class="koc-toolbar">' +
    '<div class="koc-title-group">' +
      '<span class="koc-title">Organigrama</span>' +
      '<div class="koc-stats">' +
        '<span class="koc-chip">Equipo: <b>' + teamCount + '</b></span>' +
        '<span class="koc-chip">Niveles: <b>' + maxLevel + '</b></span>' +
      '</div>' +
    '</div>' +
    '<div class="koc-controls">' +
      (config.enableSearch !== false ? 
        '<div class="koc-search-box">' +
          '<span class="koc-search-icon">🔍</span>' +
          '<input type="text" id="koc-search" class="koc-search-input" placeholder="Buscar colaborador...">' +
        '</div>' : '') +
    '</div>' +
  '</div>';
}

function renderNode(node, opts, isLast) {
  var color = opts.palette[node.level] || "#002B49";
  var badge = node.role || node.cargo || "";
  var initials = initialsFrom(node.name);

  var hasChildren = node.children && node.children.length > 0;
  var toggleBtn = hasChildren ? '<button class="koc-toggle-btn">−</button>' : '';

  var html =
    '<div class="koc-node">' +
      '<div class="koc-card" style="--koc-level:' + color + '">' +
        (badge ? '<div class="koc-badge">' + esc(badge) + '</div>' : '') +
        '<div class="koc-avatar">' + esc(initials) + '</div>' +
        '<div class="koc-name">' + esc(node.name) + '</div>' +
        (opts.showBossName && node.bossName ? '<div class="koc-meta">Jefe: ' + esc(node.bossName) + '</div>' : '') +
        (opts.showEmail && node.email ? '<div class="koc-meta">' + esc(node.email) + '</div>' : '') +
        toggleBtn +
      '</div>';

  if (hasChildren) {
    html += '<div class="koc-branches"><div class="koc-children">';
    node.children.forEach(function (child, i) {
      html += renderNode(child, opts, i === node.children.length - 1);
    });
    html += '</div></div>';
  }

  html += '</div>';
  return '<div class="koc-subtree' + (isLast ? ' is-last' : '') + '">' + html + '</div>';
}

/* Helpers básicos */
function pickFields(qr, data) {
  var dims = qr.fields.dimensions || [];
  return {
    map: {
      key: dims[0] ? dims[0].name : null,
      name: dims[1] ? dims[1].name : null,
      bossKey: dims[2] ? dims[2].name : null,
      bossName: dims[3] ? dims[3].name : null,
      cargo: dims[4] ? dims[4].name : null,
      role: dims[5] ? dims[5].name : null,
      level: dims[6] ? dims[6].name : null,
      email: dims[7] ? dims[7].name : null
    },
    alias: {}
  };
}
function cellValue(row, fieldName) { return row && row[fieldName] ? row[fieldName].value : null; }
function str(v) { return v ? String(v).trim() : ""; }
function num(v, fb) { var n = Number(v); return isFinite(n) ? n : fb; }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function safeColor(v, fb) { return /^#([0-9a-f]{3,8})$/i.test(v) ? v : fb; }
function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function registerAlias(i, a, k) { if (a) i[a.toLowerCase()] = k; }
function resolveParent(n, nodes, i) { return nodes[n.bossKey] ? n.bossKey : i[n.bossName.toLowerCase()]; }
function computeLevels(nodes, roots) {
  var lvl = {};
  function walk(n, l) { lvl[n.key] = l; n.children.forEach(function (c) { walk(c, l + 1); }); }
  roots.forEach(function (r) { walk(r, 1); });
  return lvl;
}
function countDescendants(n) {
  return n.children.reduce(function (acc, c) { return acc + 1 + countDescendants(c); }, 0);
}
function initialsFrom(name) {
  var p = str(name).split(/\s+/);
  return (p[0] ? p[0][0] : '') + (p[1] ? p[1][0] : '');
}
function prettifyKey(k) { return k.replace(/[_-]/g, ' '); }
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
