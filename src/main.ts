import { Store } from './model';
import { Editor2D } from './editor2d';
import { View3D } from './view3d';
import { setupUI } from './ui';

const store = new Store();

const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
const editor = new Editor2D(canvas, store);

const view3dContainer = document.getElementById('view3d')!;
const overlay = document.getElementById('fp-overlay')!;
const view3d = new View3D(view3dContainer, overlay, store);

setupUI(store, editor);

document.getElementById('btn-3d')!.addEventListener('click', () => view3d.enter());
document.getElementById('btn-back-2d')!.addEventListener('click', () => {
  view3d.exit();
  editor.render();
});

// Beim Start: Grundriss einpassen
requestAnimationFrame(() => editor.centerOnContent());
