import { Store, FurnitureItem, Wall, uid } from './model';
import { CATALOG, CATEGORIES } from './catalog';
import { Editor2D } from './editor2d';

export function setupUI(store: Store, editor: Editor2D): void {
  setupToolbar(store, editor);
  setupCatalog(store, editor);
  setupProperties(store);
  setupStatusbar(editor);
}

// ---------- Toolbar ----------

function setupToolbar(store: Store, editor: Editor2D): void {
  const btnSelect = document.getElementById('tool-select') as HTMLButtonElement;
  const btnWall = document.getElementById('tool-wall') as HTMLButtonElement;

  const updateToolButtons = () => {
    btnSelect.classList.toggle('active', store.tool === 'select');
    btnWall.classList.toggle('active', store.tool === 'wall');
  };
  btnSelect.addEventListener('click', () => store.setTool('select'));
  btnWall.addEventListener('click', () => store.setTool('wall'));
  store.onChange(updateToolButtons);

  const snapSelect = document.getElementById('snap-select') as HTMLSelectElement;
  snapSelect.addEventListener('change', () => {
    store.snap = Number(snapSelect.value);
  });

  document.getElementById('zoom-in')!.addEventListener('click', () => editor.zoomBy(1.3));
  document.getElementById('zoom-out')!.addEventListener('click', () => editor.zoomBy(1 / 1.3));
  document.getElementById('zoom-fit')!.addEventListener('click', () => editor.centerOnContent());

  document.getElementById('btn-export')!.addEventListener('click', () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wohnung.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('btn-import')!.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      if (!store.importJson(text)) {
        alert('Datei konnte nicht gelesen werden (kein gültiger Grundriss).');
      } else {
        editor.centerOnContent();
      }
    });
    input.click();
  });

  document.getElementById('btn-reset')!.addEventListener('click', () => {
    if (confirm('Aktuellen Grundriss verwerfen und Beispielwohnung laden?')) {
      store.reset();
      editor.centerOnContent();
    }
  });
}

// ---------- Katalog ----------

function setupCatalog(store: Store, editor: Editor2D): void {
  const list = document.getElementById('catalog-list')!;
  for (const category of CATEGORIES) {
    const group = document.createElement('div');
    group.className = 'cat-group';
    const h = document.createElement('h3');
    h.textContent = category;
    group.appendChild(h);

    for (const entry of CATALOG.filter((e) => e.category === category)) {
      const btn = document.createElement('button');
      btn.className = 'cat-item';
      btn.title = `${entry.label} hinzufügen (${entry.width} × ${entry.depth} × ${entry.height} cm)`;
      btn.innerHTML = `<span class="swatch" style="background:${entry.color}"></span><span>${entry.label}</span><span class="dims">${entry.width}×${entry.depth}</span>`;
      btn.addEventListener('click', () => {
        const center = editor.viewCenterWorld();
        const item: FurnitureItem = {
          id: uid(),
          type: entry.type,
          name: entry.label,
          x: Math.round(center.x / 5) * 5,
          y: Math.round(center.y / 5) * 5,
          rotation: 0,
          width: entry.width,
          depth: entry.depth,
          height: entry.height,
          elevation: entry.elevation,
          color: entry.color,
          mount: entry.mount,
        };
        store.setTool('select');
        store.addFurniture(item);
      });
      group.appendChild(btn);
    }
    list.appendChild(group);
  }
}

// ---------- Eigenschaften-Panel ----------

function setupProperties(store: Store): void {
  const body = document.getElementById('properties-body')!;
  let renderedFor = ''; // verhindert Neuaufbau während man in einem Feld tippt

  const render = () => {
    const key = store.selection ? `${store.selection.kind}:${store.selection.id}` : 'none';
    const f = store.getSelectedFurniture();
    const w = store.getSelectedWall();

    if (key === renderedFor) {
      updateValues(body, f, w);
      return;
    }
    renderedFor = key;
    body.innerHTML = '';

    if (f) renderFurnitureProps(body, store, f);
    else if (w) renderWallProps(body, store, w);
    else renderApartmentProps(body, store);
  };

  store.onChange(render);
  render();
}

function numberRow(
  label: string,
  value: number,
  unit: string,
  onCommit: (v: number) => void,
  opts: { min?: number; max?: number; step?: number; field?: string } = {}
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'prop-row';
  const id = `prop-${Math.random().toString(36).slice(2, 8)}`;
  row.innerHTML = `<label for="${id}">${label}</label><input id="${id}" type="number" step="${opts.step ?? 1}" value="${round2(value)}" ${opts.min !== undefined ? `min="${opts.min}"` : ''} ${opts.max !== undefined ? `max="${opts.max}"` : ''} /><span class="unit">${unit}</span>`;
  const input = row.querySelector('input')!;
  if (opts.field) input.dataset.field = opts.field;
  input.addEventListener('change', () => {
    const v = Number(input.value);
    if (!Number.isNaN(v)) onCommit(v);
  });
  return row;
}

function colorRow(label: string, value: string, onCommit: (v: string) => void, field?: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'prop-row';
  row.innerHTML = `<label>${label}</label><input type="color" value="${value}" />`;
  const input = row.querySelector('input')!;
  if (field) input.dataset.field = field;
  input.addEventListener('input', () => onCommit(input.value));
  return row;
}

function textRow(label: string, value: string, onCommit: (v: string) => void, field?: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'prop-row';
  row.innerHTML = `<label>${label}</label><input type="text" value="${escapeHtml(value)}" />`;
  const input = row.querySelector('input')!;
  if (field) input.dataset.field = field;
  input.addEventListener('change', () => onCommit(input.value));
  return row;
}

function renderFurnitureProps(body: HTMLElement, store: Store, f: FurnitureItem): void {
  const commit = () => store.emit();

  body.appendChild(textRow('Name', f.name, (v) => ((f.name = v), commit()), 'name'));
  body.appendChild(numberRow('Position X', f.x, 'cm', (v) => ((f.x = v), commit()), { field: 'x' }));
  body.appendChild(numberRow('Position Y', f.y, 'cm', (v) => ((f.y = v), commit()), { field: 'y' }));
  body.appendChild(
    numberRow('Drehung', f.rotation, '°', (v) => ((f.rotation = ((v % 360) + 360) % 360), commit()), {
      step: 5,
      field: 'rotation',
    })
  );

  const size = document.createElement('div');
  size.className = 'prop-section';
  size.innerHTML = '<h3>Maße (cm-genau)</h3>';
  size.appendChild(numberRow('Breite', f.width, 'cm', (v) => ((f.width = Math.max(1, v)), commit()), { min: 1, field: 'width' }));
  size.appendChild(numberRow('Tiefe', f.depth, 'cm', (v) => ((f.depth = Math.max(1, v)), commit()), { min: 1, field: 'depth' }));
  size.appendChild(numberRow('Höhe', f.height, 'cm', (v) => ((f.height = Math.max(1, v)), commit()), { min: 1, field: 'height' }));
  if (f.mount === 'floor') {
    size.appendChild(
      numberRow('Höhe über Boden', f.elevation, 'cm', (v) => ((f.elevation = Math.max(0, v)), commit()), {
        min: 0,
        field: 'elevation',
      })
    );
  }
  body.appendChild(size);

  const look = document.createElement('div');
  look.className = 'prop-section';
  look.innerHTML = '<h3>Aussehen</h3>';
  look.appendChild(colorRow('Farbe', f.color, (v) => ((f.color = v), commit()), 'color'));
  body.appendChild(look);

  const del = document.createElement('button');
  del.className = 'danger';
  del.textContent = 'Löschen (Entf)';
  del.addEventListener('click', () => store.removeSelected());
  body.appendChild(del);
}

function renderWallProps(body: HTMLElement, store: Store, w: Wall): void {
  const commit = () => store.emit();

  body.appendChild(numberRow('Start X', w.x1, 'cm', (v) => ((w.x1 = v), commit()), { field: 'x1' }));
  body.appendChild(numberRow('Start Y', w.y1, 'cm', (v) => ((w.y1 = v), commit()), { field: 'y1' }));
  body.appendChild(numberRow('Ende X', w.x2, 'cm', (v) => ((w.x2 = v), commit()), { field: 'x2' }));
  body.appendChild(numberRow('Ende Y', w.y2, 'cm', (v) => ((w.y2 = v), commit()), { field: 'y2' }));

  body.appendChild(
    numberRow(
      'Länge',
      Math.hypot(w.x2 - w.x1, w.y2 - w.y1),
      'cm',
      (v) => {
        const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
        if (len > 0 && v > 0) {
          const s = v / len;
          w.x2 = w.x1 + (w.x2 - w.x1) * s;
          w.y2 = w.y1 + (w.y2 - w.y1) * s;
          commit();
        }
      },
      { min: 1, field: 'length' }
    )
  );

  const size = document.createElement('div');
  size.className = 'prop-section';
  size.innerHTML = '<h3>Querschnitt</h3>';
  size.appendChild(numberRow('Dicke', w.thickness, 'cm', (v) => ((w.thickness = Math.max(1, v)), commit()), { min: 1, step: 0.5, field: 'thickness' }));
  size.appendChild(numberRow('Höhe', w.height, 'cm', (v) => ((w.height = Math.max(10, v)), commit()), { min: 10, field: 'wheight' }));
  body.appendChild(size);

  const look = document.createElement('div');
  look.className = 'prop-section';
  look.innerHTML = '<h3>Aussehen</h3>';
  look.appendChild(colorRow('Wandfarbe', w.color, (v) => ((w.color = v), commit()), 'color'));
  body.appendChild(look);

  const del = document.createElement('button');
  del.className = 'danger';
  del.textContent = 'Wand löschen (Entf)';
  del.addEventListener('click', () => store.removeSelected());
  body.appendChild(del);
}

function renderApartmentProps(body: HTMLElement, store: Store): void {
  const apt = store.apartment;
  const commit = () => store.emit();

  const hint = document.createElement('p');
  hint.className = 'prop-hint';
  hint.innerHTML =
    'Nichts ausgewählt.<br /><br />' +
    'Klicke auf eine <b>Wand</b> oder ein <b>Möbelstück</b>, um es zu bearbeiten – alle Maße sind zentimetergenau einstellbar.<br /><br />' +
    'Tipp: Lasse beim Wändezeichnen Lücken für Türen (üblich: 80–90 cm).';
  body.appendChild(hint);

  const section = document.createElement('div');
  section.className = 'prop-section';
  section.innerHTML = '<h3>Wohnung</h3>';
  section.appendChild(
    numberRow('Raumhöhe', apt.ceilingHeight, 'cm', (v) => ((apt.ceilingHeight = Math.max(180, v)), commit()), {
      min: 180,
      field: 'ceilingHeight',
    })
  );
  section.appendChild(colorRow('Bodenfarbe', apt.floorColor, (v) => ((apt.floorColor = v), commit()), 'floorColor'));
  section.appendChild(colorRow('Deckenfarbe', apt.ceilingColor, (v) => ((apt.ceilingColor = v), commit()), 'ceilingColor'));
  body.appendChild(section);
}

/** Aktualisiert Input-Werte ohne das Panel neu aufzubauen (z. B. beim Ziehen). */
function updateValues(body: HTMLElement, f: FurnitureItem | undefined, w: Wall | undefined): void {
  const set = (field: string, value: number | string) => {
    const input = body.querySelector<HTMLInputElement>(`input[data-field="${field}"]`);
    if (input && document.activeElement !== input) {
      input.value = typeof value === 'number' ? String(round2(value)) : value;
    }
  };
  if (f) {
    set('x', f.x);
    set('y', f.y);
    set('rotation', f.rotation);
    set('width', f.width);
    set('depth', f.depth);
    set('height', f.height);
    set('elevation', f.elevation);
    set('color', f.color);
  } else if (w) {
    set('x1', w.x1);
    set('y1', w.y1);
    set('x2', w.x2);
    set('y2', w.y2);
    set('length', Math.hypot(w.x2 - w.x1, w.y2 - w.y1));
    set('thickness', w.thickness);
    set('wheight', w.height);
    set('color', w.color);
  }
}

// ---------- Statusleiste ----------

function setupStatusbar(editor: Editor2D): void {
  const pos = document.getElementById('status-pos')!;
  const scale = document.getElementById('status-scale')!;
  editor.onCursorMove = (p, zoom) => {
    pos.textContent = `x: ${(p.x / 100).toFixed(2)} m, y: ${(p.y / 100).toFixed(2)} m`;
    // Bildschirm-Maßstab: Annahme ~96 dpi -> 1 px ≈ 0,02646 cm real auf dem Monitor
    const ratio = 1 / (zoom * 0.02646);
    scale.textContent = `Bildschirm-Maßstab ≈ 1:${Math.round(ratio)}`;
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
