looker.plugins.visualizations.add({
  id: "keralty_org_chart",
  label: "Organigrama Keralty",
  options: {
    headerColor: {
      type: "string",
      label: "Color Fondo Cargo",
      default: "#002B49"
    },
    avatarBorderColor: {
      type: "string",
      label: "Color Borde Avatar",
      default: "#00B074"
    }
  },

  // 1. Inicialización de la estructura HTML y estilos CSS
  create: function(element, config) {
    element.innerHTML = `
      <style>
        .org-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow-x: auto;
          overflow-y: auto;
          width: 100%;
          height: 100%;
          font-family: 'Open Sans', Helvetica, Arial, sans-serif;
          padding: 20px;
          box-sizing: border-box;
          background-color: #f8f9fa;
        }
        .org-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 0 12px;
          position: relative;
        }
        .org-card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          padding: 12px 16px;
          text-align: center;
          min-width: 140px;
          border: 1px solid #e2e8f0;
          z-index: 2;
          transition: transform 0.2s ease;
        }
        .org-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.12);
        }
        .org-role-badge {
          background-color: #002B49;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          display: inline-block;
        }
        .org-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid #00B074;
          margin: 0 auto 8px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #00B074;
          background-color: #eafaf1;
          font-size: 15px;
        }
        .org-name {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }
        .org-children {
          display: flex;
          flex-direction: row;
          margin-top: 24px;
          position: relative;
        }
        /* Líneas conectoras */
        .org-children::before {
          content: '';
          position: absolute;
          top: -12px;
          left: 50%;
          width: 2px;
          height: 12px;
          background-color: #cbd5e1;
        }
      </style>
      <div id="org-chart-root" class="org-container"></div>
    `;
  },

  // 2. Renderizado de datos cada vez que se ejecuta la consulta
  updateAsync: function(data, element, config, queryResponse, details, done) {
    this.clearErrors();

    // Validar número de dimensiones requeridas
    if (queryResponse.fields.dimensions.length < 2) {
      this.addError({
        title: "Dimensiones insuficientes",
        message: "El Organigrama requiere al menos 2 dimensiones: 1) Colaborador, 2) Jefe Inmediato, 3) Cargo (opcional)."
      });
      return;
    }

    const dimColaborador = queryResponse.fields.dimensions[0].name;
    const dimJefe = queryResponse.fields.dimensions[1].name;
    const dimCargo = queryResponse.fields.dimensions[2] ? queryResponse.fields.dimensions[2].name : null;

    // Crear mapa de nodos
    const nodesMap = {};
    const roots = [];

    data.forEach(row => {
      const id = row[dimColaborador].value;
      const name = row[dimColaborador].value || "Sin Nombre";
      const parent = row[dimJefe] ? row[dimJefe].value : null;
      const cargo = dimCargo && row[dimCargo] ? row[dimCargo].value : "COLABORADOR";

      nodesMap[id] = { id, name, parent, cargo, children: [] };
    });

    // Construir árbol jerárquico
    Object.keys(nodesMap).forEach(id => {
      const node = nodesMap[id];
      if (node.parent && nodesMap[node.parent] && node.parent !== node.id) {
        nodesMap[node.parent].children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Dibujar el árbol mediante recursividad
    function renderNode(node) {
      const initials = node.name 
        ? node.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() 
        : '??';

      let html = `
        <div class="org-node">
          <div class="org-card">
            <div class="org-role-badge">${node.cargo}</div>
            <div class="org-avatar">${initials}</div>
            <div class="org-name">${node.name}</div>
          </div>
      `;

      if (node.children && node.children.length > 0) {
        html += `<div class="org-children">`;
        node.children.forEach(child => {
          html += renderNode(child);
        });
        html += `</div>`;
      }

      html += `</div>`;
      return html;
    }

    const container = element.querySelector('#org-chart-root');
    container.innerHTML = roots.map(root => renderNode(root)).join('');

    done();
  }
});