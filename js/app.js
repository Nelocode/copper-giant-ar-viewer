/**
 * app.js — Copper Giant AR Viewer
 *
 * model-viewer = visor 3D principal + AR nativo
 * GLTFExporter  = exporta escena combinada (mina + estructura) para AR
 * Three.js       = genera geometría para la comparación y el export AR
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { MINE_DATA, STRUCTURES_DATA, createOpenPitMine } from './models.js';

// ─── Estado ───────────────────────────────────────────────────────────────────
let activeMode      = '3d';
let activeStructId  = null;      // estructura seleccionada en comparador
let arStructId      = null;      // estructura seleccionada en AR
let combinedBlobUrl = null;      // URL del blob GLB combinado para AR
let stlBlobUrl      = null;      // URL del blob GLB generado a partir del STL
let stlGeometry     = null;      // Geometría cargada del STL para reuso

const DEFAULT_MODEL = './dummy.glb';
const VIRTUAL_MODEL = './dynamic-ar-model.glb'; // El SW interceptará esto

// ─── Boot ─────────────────────────────────────────────────────────────────────
function init() {
  safeRun('Struct cards', buildStructCards);
  safeRun('AR cards',     buildARStructCards);
  safeRun('AR check',     detectARCapabilities);
  setupEvents();
  generateQR();
  
  // Cargar el modelo STL local (el comparador se iniciará al terminar la carga)
  loadSTLModel();
}

function safeRun(label, fn) {
  try { fn(); }
  catch(e) { console.error(`[AR] ${label}:`, e); }
}

/**
 * Carga el archivo .stl local, lo convierte a GLB y lo asigna al visor
 */
/**
 * Carga el archivo .stl local, lo convierte a GLB y lo asigna al visor
 */
async function loadSTLModel() {
  const loader = new STLLoader();
  const stlPath = './dummy.stl?v=' + Date.now(); // Cache busting para el archivo
  
  console.log('[STL] Intentando cargar:', stlPath);
  
  const mv = document.getElementById('primary-viewer');
  if (mv) mv.setAttribute('loading-state', 'loading');

  loader.load(stlPath, 
    // SUCCESS
    async (geometry) => {
      console.log('[STL] Geometría cargada con éxito. Polígonos:', geometry.attributes.position.count / 3);
      stlGeometry = geometry;
      stlGeometry.center(); 
      
      const material = new THREE.MeshStandardMaterial({ 
        color: 0xC87533, 
        roughness: 0.3, 
        metalness: 0.8 
      });
      const mesh = new THREE.Mesh(stlGeometry, material);
      
      const scene = new THREE.Scene();
      scene.add(mesh);
      
      const exporter = new GLTFExporter();
      exporter.parse(scene, (buffer) => {
        const blob = new Blob([buffer], { type: 'model/gltf-binary' });
        if (stlBlobUrl) URL.revokeObjectURL(stlBlobUrl);
        stlBlobUrl = URL.createObjectURL(blob);
        
        if (mv) {
          mv.src = DEFAULT_MODEL;
          mv.removeAttribute('loading-state');
          if (!arStructId) {
            setText('ar-model-label', 'Modelo: dummy.glb (estático)');
          }
        }
        console.log('[STL] Conversión a GLB completada. Iniciando comparador...');
        
        // AHORA SÍ: Iniciamos el comparador por defecto una vez que tenemos la geometría
        safeRun('default struct', () => selectStruct('eiffel'));

      }, (err) => {
        console.error('[STL] Error en GLTFExporter:', err);
        if (mv) mv.removeAttribute('loading-state');
      }, { binary: true });
    },
    // PROGRESS
    (xhr) => {
      if (xhr.lengthComputable) {
        const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
        console.log(`[STL] ${percent}% cargado`);
        setText('ar-model-label', `Cargando STL: ${percent}%`);
      }
    },
    // ERROR
    (err) => {
      console.error('[STL] Error crítico de carga:', err);
      if (mv) {
        mv.removeAttribute('loading-state');
        mv.src = DEFAULT_MODEL;
      }
      setText('ar-model-label', 'Error de red al cargar dummy.stl');
      // Iniciar comparador aunque falle el STL (usará fallback)
      safeRun('default struct fallback', () => selectStruct('eiffel'));
    }
  );
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
    // Sin comparación: volver al modelo GLB estático (mejor para AR nativo)
    if (combinedBlobUrl) { URL.revokeObjectURL(combinedBlobUrl); combinedBlobUrl = null; }
    mv.src = DEFAULT_MODEL;
    setText('ar-model-label', 'Modelo: dummy.glb (estático)');
    return;
  }

  // Con comparación: exportar escena combinada
  setARLoading(true);
  try {
    const url = await exportCombinedGLB(id);
    if (url) {
      if (combinedBlobUrl) URL.revokeObjectURL(combinedBlobUrl);
      combinedBlobUrl = url;
      
      // Enviamos el blob al Service Worker para que el visor nativo pueda leerlo
      const blob = await fetch(url).then(r => r.blob());
      updateServiceWorkerModel(blob);

      // Importante: usamos el path virtual para el visor
      mv.src = VIRTUAL_MODEL + '?v=' + Date.now();
      
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

/**
 * Muestra/oculta el spinner del comparador
 */
function setCmpLoading(on) {
  const el = document.getElementById('cmp-loading');
  if (el) el.style.display = on ? 'flex' : 'none';
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

  // Mina / Modelo Base
  let baseModel;
  if (stlGeometry) {
    const material = new THREE.MeshStandardMaterial({ color: 0xC87533, roughness: 0.3, metalness: 0.8 });
    baseModel = new THREE.Mesh(stlGeometry, material);
    baseModel.scale.setScalar(200); 
  } else {
    // Si no hay STL, mostramos un plano base para evitar errores
    baseModel = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    baseModel.rotation.x = -Math.PI / 2;
  }
  
  baseModel.position.set(-700, 0, 0);
  group.add(baseModel);

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

  setCmpLoading(true);
  try {
    console.log('[Comparator] Generando escena para:', structId);
    const url = await exportCombinedGLB(structId);
    if (url) {
      const prev = mv.dataset.blobUrl;
      if (prev) URL.revokeObjectURL(prev);
      mv.dataset.blobUrl = url;
      
      // Actualizamos el SW para que el visor nativo tenga el modelo correcto
      const blob = await fetch(url).then(r => r.blob());
      updateServiceWorkerModel(blob);

      mv.src = VIRTUAL_MODEL + '?v=' + Date.now();
      console.log('[Comparator] Escena cargada vía SW');
    }
  } catch(e) {
    console.error('[viewer] load failed:', e);
  } finally {
    // Retraso mínimo para que la transición no sea brusca
    setTimeout(() => setCmpLoading(false), 500);
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
    // Si es el modelo base estático, Scene Viewer funcionará sin ARCore
    console.log('[AR] Iniciando con:', mv.src);

    let xrOK = false;
    if (navigator.xr) xrOK = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);

    if ((isIOS || isAndroid || xrOK) && mv) {
      // Priorizar el botón interno de model-viewer si existe
      try { 
        mv.activateAR(); 
      } catch(_) {
        const btn = document.getElementById('mv-ar-btn');
        if (btn) btn.click();
      }
    } else {
      showQRModal();
    }
  } catch(e) {
    console.warn('[AR] Fallo al iniciar:', e);
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
  document.getElementById('export-glb-btn')?.addEventListener('click', exportStaticGLB);
}

/**
 * Exporta el modelo STL actual a un archivo GLB para que el usuario lo suba al repo
 */
function exportStaticGLB() {
  if (!stlGeometry) {
    alert('El modelo STL aún no ha cargado. Espera un segundo.');
    return;
  }

  const material = new THREE.MeshStandardMaterial({ color: 0xC87533, roughness: 0.3, metalness: 0.8 });
  const mesh = new THREE.Mesh(stlGeometry, material);
  const scene = new THREE.Scene();
  scene.add(mesh);
  
  const exporter = new GLTFExporter();
  exporter.parse(scene, (buffer) => {
    const blob = new Blob([buffer], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dummy.glb';
    link.click();
    URL.revokeObjectURL(url);
    console.log('[Export] GLB generado y descargado');
  }, (err) => {
    console.error('[Export] Error:', err);
  }, { binary: true });
}

/**
 * Envía un blob al Service Worker para guardarlo en la caché virtual
 */
function updateServiceWorkerModel(blob) {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'UPDATE_MODEL',
      blob: blob
    });
    console.log('[SW] Modelo enviado a la caché virtual');
  } else {
    console.warn('[SW] No hay controlador activo para recibir el modelo');
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
