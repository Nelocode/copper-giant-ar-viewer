/**
 * app.js — Copper Giant AR Viewer
 *
 * model-viewer = visor 3D principal + AR nativo
 * GLTFExporter  = exporta escena combinada (mina + estructura) para AR
 * Three.js       = genera geometría para la comparación y el export AR
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MINE_DATA, STRUCTURES_DATA, createOpenPitMine } from './models.js';

// ─── Estado ───────────────────────────────────────────────────────────────────
let activeMode      = '3d';
let activeStructId  = null;      // estructura seleccionada en comparador
let arStructId      = null;      // estructura seleccionada en AR
let combinedBlobUrl = null;      // URL del blob GLB combinado para AR

const DEFAULT_MODEL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

// ─── Boot ─────────────────────────────────────────────────────────────────────
function init() {
  safeRun('Struct cards', buildStructCards);
  safeRun('AR cards',     buildARStructCards);
  safeRun('AR check',     detectARCapabilities);
  setupEvents();
  generateQR();
  // Estructura por defecto en comparador
  setTimeout(() => safeRun('default struct', () => selectStruct('eiffel')), 400);
}

function safeRun(label, fn) {
  try { fn(); }
  catch(e) { console.error(`[AR] ${label}:`, e); }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPARADOR: construir tarjetas del sidebar
// ═══════════════════════════════════════════════════════════════════════════════
function buildStructCards() {
  const container = document.getElementById('structure-selector');
  if (!container) return;
  const maxH = Math.max(MINE_DATA.depth, ...STRUCTURES_DATA.map(s => s.height));

  STRUCTURES_DATA.forEach(data => {
    const btn = document.createElement('button');
    btn.className = 'struct-row';
    btn.id        = `card-${data.id}`;
    const mh = Math.round((MINE_DATA.depth / maxH) * 22);
    const sh = Math.round((data.height / maxH) * 22);
    btn.innerHTML = `
      <div class="struct-emoji">${data.emoji}</div>
      <div class="struct-info">
        <div class="struct-name">${data.name}</div>
        <div class="struct-h">${data.height} m · ${data.location}</div>
      </div>
      <div class="struct-bars">
        <div class="mini-bar bar-mine"   style="height:${mh}px"></div>
        <div class="mini-bar bar-struct" style="height:${sh}px;background:${data.colorHex}88"></div>
      </div>`;
    btn.addEventListener('click', () => selectStruct(data.id));
    container.appendChild(btn);
  });
}

function selectStruct(id) {
  if (id === activeStructId) return;
  activeStructId = id;
  document.querySelectorAll('.struct-row').forEach(r => r.classList.remove('active'));
  document.getElementById(`card-${id}`)?.classList.add('active');
  const data = STRUCTURES_DATA.find(s => s.id === id);
  if (data) updateCompareFacts(data);
}

function updateCompareFacts(data) {
  setText('mine-height-label',   `${MINE_DATA.depth} m prof.`);
  setText('struct-name-tag',     data.name.toUpperCase());
  setText('struct-height-label', `${data.height} m`);
  setText('cmp-label', `Mina Copper Giant (${MINE_DATA.depth} m prof.) vs ${data.name} (${data.height} m)`);
  setText('fact-icon',   data.emoji);
  setText('fact-title',  `${data.name} · ${data.location}`);
  setText('fact-detail', data.fact);
  const ratio   = MINE_DATA.depth / data.height;
  const ratioEl = document.getElementById('fact-ratio');
  if (ratioEl) {
    ratioEl.textContent = ratio >= 1
      ? `Mina ${ratio.toFixed(1)}× más profunda`
      : `Estructura ${(1/ratio).toFixed(1)}× más alta`;
  }
  // Actualizar el model-viewer del comparador con la escena combinada
  loadCombinedInViewer(data.id, 'compare-viewer');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AR SELECTOR: tarjetas de estructura dentro del panel AR
// ═══════════════════════════════════════════════════════════════════════════════
function buildARStructCards() {
  const container = document.getElementById('ar-struct-selector');
  if (!container) return;

  // Opción "Solo mina"
  const base = document.createElement('button');
  base.className = 'ar-struct-chip active';
  base.id        = 'ar-chip-none';
  base.textContent = '⛏ Solo mina';
  base.addEventListener('click', () => selectARStruct(null));
  container.appendChild(base);

  STRUCTURES_DATA.forEach(data => {
    const btn = document.createElement('button');
    btn.className = 'ar-struct-chip';
    btn.id        = `ar-chip-${data.id}`;
    btn.innerHTML = `${data.emoji} ${data.name.split(' ')[0]}`;
    btn.addEventListener('click', () => selectARStruct(data.id));
    container.appendChild(btn);
  });
}

async function selectARStruct(id) {
  arStructId = id;

  // Highlight chips
  document.querySelectorAll('.ar-struct-chip').forEach(c => c.classList.remove('active'));
  document.getElementById(id ? `ar-chip-${id}` : 'ar-chip-none')?.classList.add('active');

  const mv = document.getElementById('primary-viewer');
  if (!mv) return;

  if (!id) {
    // Sin comparación: volver al modelo por defecto
    if (combinedBlobUrl) { URL.revokeObjectURL(combinedBlobUrl); combinedBlobUrl = null; }
    mv.src = DEFAULT_MODEL;
    setText('ar-model-label', 'Modelo: placeholder (mina real próximamente)');
    return;
  }

  // Con comparación: exportar escena combinada
  setARLoading(true);
  try {
    const url = await exportCombinedGLB(id);
    if (url) {
      if (combinedBlobUrl) URL.revokeObjectURL(combinedBlobUrl);
      combinedBlobUrl = url;
      mv.src = url;
      const data = STRUCTURES_DATA.find(s => s.id === id);
      setText('ar-model-label', `AR: Mina + ${data?.name} a escala relativa`);
    }
  } catch(e) {
    console.error('[AR] export failed:', e);
  } finally {
    setARLoading(false);
  }
}

function setARLoading(on) {
  const el = document.getElementById('ar-loading');
  if (el) el.classList.toggle('hidden', !on);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GLTF EXPORTER — escena combinada mina + estructura para AR
// ═══════════════════════════════════════════════════════════════════════════════
async function exportCombinedGLB(structId) {
  const data = STRUCTURES_DATA.find(s => s.id === structId);
  if (!data) return null;

  // ------- Construir escena -------
  const scene = new THREE.Scene();

  // Iluminación básica (model-viewer pone la suya encima pero necesitamos algo para el export)
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.6);
  sun.position.set(1, 2, 1);
  scene.add(sun);

  // Escala AR: queremos que el set quepa en ~2 m de ancho total
  // Real: mina (diámetro 1000 m, prof 500 m) + estructura (hasta 828 m alto)
  // Definimos 1 unit de AR = 1 metro real, luego escalamos el grupo
  const SCALE = 1 / 400; // 1:400 → mina ~2.5 m diámetro, ok para AR demo

  const group = new THREE.Group();
  group.scale.setScalar(SCALE);

  // Mina (lado izquierdo)
  const mine = createOpenPitMine(true); // simplified=true para menos polígonos
  mine.position.set(-700, 0, 0);        // -700 m → separación
  group.add(mine);

  // Estructura (lado derecho)
  const struct = data.createFn();
  struct.position.set(600, 0, 0);       // +600 m → lado derecho
  group.add(struct);

  // Suelo fino para anclar visualmente
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(3800, 1200),
    new THREE.MeshStandardMaterial({ color: 0x0d0d14, roughness: 1.0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1;
  group.add(ground);

  // Línea divisoria
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xd4772c, emissive: new THREE.Color(0xd4772c), emissiveIntensity: 0.5 });
  const line = new THREE.Mesh(new THREE.BoxGeometry(8, Math.max(data.height, MINE_DATA.depth) + 80, 8), lineMat);
  line.position.set(-50, (Math.max(data.height, MINE_DATA.depth) / 2) - 200, 0);
  group.add(line);

  scene.add(group);

  // ------- Exportar a GLB -------
  const exporter = new GLTFExporter();
  return new Promise((resolve) => {
    exporter.parse(scene, (buffer) => {
      const blob = new Blob([buffer], { type: 'model/gltf-binary' });
      resolve(URL.createObjectURL(blob));
    }, (err) => {
      console.error('[GLTFExporter]', err);
      resolve(null);
    }, { binary: true, maxTextureSize: 512 });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPARADOR model-viewer — carga escena combinada en el visor embebido
// ═══════════════════════════════════════════════════════════════════════════════
async function loadCombinedInViewer(structId, viewerId) {
  const mv = document.getElementById(viewerId);
  if (!mv) return;

  mv.setAttribute('loading-state', 'loading');
  try {
    const url = await exportCombinedGLB(structId);
    if (url) {
      // Limpiar blob anterior si lo hay
      const prev = mv.dataset.blobUrl;
      if (prev) URL.revokeObjectURL(prev);
      mv.dataset.blobUrl = url;
      mv.src = url;
    }
  } catch(e) {
    console.error('[viewer] load failed:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DETECCIÓN AR
// ═══════════════════════════════════════════════════════════════════════════════
async function detectARCapabilities() {
  const isIOS     = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  let webxrOK = false;
  if (navigator.xr) webxrOK = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);

  setCheckRow('check-ios',     isIOS   ? 'supported' : isAndroid ? 'unavailable' : 'available');
  setCheckRow('check-android', isAndroid ? 'supported' : isIOS ? 'unavailable' : 'available');
  setCheckRow('check-webxr',   webxrOK ? 'supported' : 'unavailable');
}

function setCheckRow(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('supported','available','unavailable');
  el.classList.add(state);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODOS (tabs)
// ═══════════════════════════════════════════════════════════════════════════════
function setMode(mode) {
  activeMode = mode;
  document.querySelectorAll('.tab[data-mode]').forEach(t =>
    t.classList.toggle('active', t.dataset.mode === mode)
  );
  ['3d','compare','ar'].forEach(m =>
    document.getElementById(`panel-${m}`)?.classList.toggle('hidden', m !== mode)
  );

  // Views
  document.getElementById('view-3d')?.classList.toggle('hidden',
    mode !== '3d' && mode !== 'ar'
  );
  document.getElementById('view-compare')?.classList.toggle('hidden',
    mode !== 'compare'
  );

  // Badge
  const badges = { '3d':'3D INTERACTIVO', compare:'COMPARANDO ESCALA', ar:'AR VIEWER' };
  setText('mode-badge', badges[mode] || '');

  // Compare: cargar la escena en el visor embebido si no está
  if (mode === 'compare' && activeStructId) {
    const mv = document.getElementById('compare-viewer');
    if (mv && !mv.src) loadCombinedInViewer(activeStructId, 'compare-viewer');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AR LAUNCHER
// ═══════════════════════════════════════════════════════════════════════════════
async function launchAR() {
  const isIOS     = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  const mv        = document.getElementById('primary-viewer');

  setMode('ar');

  try {
    let xrOK = false;
    if (navigator.xr) xrOK = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);

    if ((isIOS || isAndroid || xrOK) && mv) {
      try { mv.activateAR(); } catch(_) {
        document.getElementById('mv-ar-btn')?.click();
      }
    } else {
      showQRModal();
    }
  } catch(e) {
    console.warn('[AR]', e);
    showQRModal();
  }
}

// ─── QR ───────────────────────────────────────────────────────────────────────
function showQRModal() {
  document.getElementById('qr-modal')?.classList.remove('hidden');
}

function generateQR() {
  const url = window.location.href;
  setText('qr-url-display', url);
  const el = document.getElementById('qr-code-wrap');
  if (el && window.QRCode) {
    el.innerHTML = '';
    try {
      new QRCode(el, {
        text: url, width: 180, height: 180,
        colorDark:  '#d4772c', colorLight: '#0a0a0a',
        correctLevel: QRCode.CorrectLevel.H,
      });
    } catch(_) {
      el.style.cssText = 'font:.62rem/1 monospace;color:#d4772c;word-break:break-all;padding:8px;';
      el.textContent   = url;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EVENTOS
// ═══════════════════════════════════════════════════════════════════════════════
function setupEvents() {
  document.querySelectorAll('.tab[data-mode]').forEach(t =>
    t.addEventListener('click', () => setMode(t.dataset.mode))
  );
  ['ar-trigger-btn','launch-ar-btn'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', launchAR)
  );
  document.getElementById('explore-btn')?.addEventListener('click', () => setMode('compare'));
  document.getElementById('qr-btn')?.addEventListener('click',      showQRModal);
  document.getElementById('show-qr-btn')?.addEventListener('click', showQRModal);
  document.getElementById('ar-close-btn')?.addEventListener('click', () =>
    document.getElementById('ar-modal')?.classList.add('hidden')
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
