/**
 * models.js — Copper Giant AR Experience
 * Procedural Three.js 3D models. Scale: 1 unit = 1 meter.
 * All structures have their base at y = 0.
 */
import * as THREE from 'three';

// ── Helpers ───────────────────────────────────────────────────────────────────
function mat(color, rough = 0.75, metal = 0.1, emissive = null, emissiveInt = 0) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = emissiveInt; }
  return m;
}
function box(w, h, d, color, rough = 0.7, metal = 0.2) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, rough, metal));
}
function cyl(rT, rB, h, segs, color, rough = 0.65, metal = 0.2) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, segs), mat(color, rough, metal));
}

// ── Mine data ─────────────────────────────────────────────────────────────────
export const MINE_DATA = {
  id: 'mine',
  name: 'Mina Copper Giant',
  location: 'Canadá',
  depth: 500,        // meters (placeholder — actualizar con dato real)
  diameter: 1000,    // meters
  emoji: '⛏️',
  colorHex: '#C87533',
  fact: 'La profundidad del pit equivale a casi 2 Torres Eiffel apiladas',
};

// ── Structures data ───────────────────────────────────────────────────────────
export const STRUCTURES_DATA = [
  {
    id: 'eiffel',       name: 'Torre Eiffel',
    location: 'París, Francia',  year: 1889,
    height: 330, width: 125,
    emoji: '🗼', colorHex: '#A08050',
    fact: 'La estructura más visitada del mundo: ~7 millones de turistas al año',
    createFn: createEiffelTower,
  },
  {
    id: 'burj',         name: 'Burj Khalifa',
    location: 'Dubái, EAU',      year: 2010,
    height: 828, width: 57,
    emoji: '🏙️', colorHex: '#9EB5C8',
    fact: 'El edificio más alto jamás construido — 828m y 163 pisos habitables',
    createFn: createBurjKhalifa,
  },
  {
    id: 'empirestate',  name: 'Empire State',
    location: 'Nueva York, EE.UU.', year: 1931,
    height: 443, width: 129,
    emoji: '🏛️', colorHex: '#909090',
    fact: 'Con antena: 443m. Fue el edificio más alto del mundo por 41 años',
    createFn: createEmpireState,
  },
  {
    id: 'cntower',      name: 'Torre CN',
    location: 'Toronto, Canadá', year: 1976,
    height: 553, width: 30,
    emoji: '📡', colorHex: '#607080',
    fact: 'Fue la estructura más alta del mundo 34 años seguidos (1975–2007)',
    createFn: createCNTower,
  },
  {
    id: 'onetrade',     name: 'One World Trade',
    location: 'Nueva York, EE.UU.', year: 2014,
    height: 541, width: 60,
    emoji: '🏢', colorHex: '#8BA0B0',
    fact: 'El edificio más alto de las Américas y el 6° más alto del mundo',
    createFn: createOneWTC,
  },
  {
    id: 'pyramid',      name: 'Pirámide de Giza',
    location: 'Egipto',           year: -2560,
    height: 138, width: 230,
    emoji: '🔺', colorHex: '#C8A878',
    fact: 'Única maravilla del mundo antiguo que sigue en pie, ~4,500 años de edad',
    createFn: createPyramidGiza,
  },
  {
    id: 'bigben',       name: 'Big Ben',
    location: 'Londres, R.U.',    year: 1859,
    height: 96,  width: 15,
    emoji: '🕰️', colorHex: '#787870',
    fact: '"Big Ben" es el nombre de la campana de 13 toneladas en su interior',
    createFn: createBigBen,
  },
  {
    id: 'liberty',      name: 'Estatua de la Libertad',
    location: 'Nueva York, EE.UU.', year: 1886,
    height: 93,  width: 35,
    emoji: '🗽', colorHex: '#71A586',
    fact: 'Fue construida en Francia y viajó en piezas hasta Nueva York',
    createFn: createStatueOfLiberty,
  },
  {
    id: 'colosseum',    name: 'Coliseo Romano',
    location: 'Roma, Italia',     year: 80,
    height: 50,  width: 188,
    emoji: '🏟️', colorHex: '#C8A868',
    fact: 'Capacidad para 80,000 espectadores — un récord que duró 2,000 años',
    createFn: createColosseum,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// OPEN PIT MINE — Copper Giant
// depth 500m, surface diameter 1000m
// ═══════════════════════════════════════════════════════════════════════════════
export function createOpenPitMine(simplified = false) {
  const g = new THREE.Group();
  g.name = 'mine';

  const NUM = simplified ? 8 : 15;
  const R = 500;   // surface radius (m)
  const D = 500;   // depth (m)

  // ── Surrounding terrain ──
  const terrain = new THREE.Mesh(
    new THREE.RingGeometry(R * 0.98, R * 3.2, 64),
    mat(0x7A6040, 0.98, 0.01)
  );
  terrain.rotation.x = -Math.PI / 2;
  g.add(terrain);

  // ── Terraces ──
  for (let i = 0; i <= NUM; i++) {
    const t = i / NUM;
    const r  = R * (1 - t * 0.65);
    const yW = -D * t;
    const h  = (D / NUM) * 1.02;

    // Color: sandy-brown at top → dark copper at bottom
    const cr = THREE.MathUtils.lerp(0.60, 0.44, t);
    const cg = THREE.MathUtils.lerp(0.38, 0.20, t);
    const cb = THREE.MathUtils.lerp(0.22, 0.10, t);
    const wallMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cr, cg, cb), roughness: 0.92, metalness: 0.04,
    });
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.9, r, h, simplified ? 32 : 56, 1),
      wallMat
    );
    wall.position.y = yW - h / 2;
    g.add(wall);

    // Bench top
    if (i > 0 && i < NUM) {
      const br = THREE.MathUtils.lerp(0.55, 0.38, t);
      const bg = THREE.MathUtils.lerp(0.33, 0.17, t);
      const bb = THREE.MathUtils.lerp(0.18, 0.08, t);
      const bench = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.9, r, simplified ? 32 : 56),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(br, bg, bb), roughness: 1.0 })
      );
      bench.rotation.x = -Math.PI / 2;
      bench.position.y = yW;
      g.add(bench);
    }
  }

  // ── Copper ore glow at the bottom ──
  const ore = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.04, R * 0.18, 22, 28),
    mat(0xC87533, 0.25, 0.85, 0xB06020, 0.7)
  );
  ore.position.y = -D + 10;
  g.add(ore);

  // ── Haul road (spiral dashes) ──
  if (!simplified) {
    const road = mat(0x3C3C38, 0.98, 0.0);
    for (let i = 0; i < 48; i++) {
      const t   = i / 48;
      const ang = t * Math.PI * 8;
      const r   = R * (1 - t * 0.65) * 0.93;
      const y   = -D * t - 2;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(r * 0.065, 4, 16), road);
      seg.position.set(r * Math.cos(ang), y, r * Math.sin(ang));
      seg.rotation.y = ang + Math.PI / 2;
      g.add(seg);
    }

    // ── Mining trucks ──
    const truckColors = [0xFFCC00, 0xFF8800, 0xFFE240];
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + 0.4;
      const tv  = 0.15 + Math.random() * 0.55;
      const r   = R * (1 - tv * 0.65) * 0.91;
      const y   = -D * tv + 4;
      const truck = new THREE.Group();

      const body = new THREE.Mesh(new THREE.BoxGeometry(26, 9, 13), mat(truckColors[i % 3], 0.7, 0.3));
      truck.add(body);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(11, 11, 13), mat(0xEE8000, 0.6, 0.4));
      cab.position.set(-7, 5, 0);
      truck.add(cab);

      truck.position.set(r * Math.cos(ang), y, r * Math.sin(ang));
      truck.rotation.y = ang + Math.PI;
      g.add(truck);
    }
  }

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EIFFEL TOWER — 330m | Paris, France
// ═══════════════════════════════════════════════════════════════════════════════
export function createEiffelTower() {
  const g = new THREE.Group();
  g.name = 'eiffel';

  const H = 330;
  const BASE = 62.5;
  const m = mat(0x8B7355, 0.55, 0.45);

  // 4 arching legs
  const legAngles = [Math.PI / 4, -Math.PI / 4, Math.PI * 3 / 4, -Math.PI * 3 / 4];
  for (const a of legAngles) {
    const legH = H * 0.3;
    const leg  = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 8, legH, 8), m);
    leg.position.set(BASE * 0.5 * Math.cos(a), legH / 2, BASE * 0.5 * Math.sin(a));
    leg.rotation.z =  Math.cos(a) * 0.38;
    leg.rotation.x = -Math.sin(a) * 0.38;
    g.add(leg);
  }

  // Horizontal struts
  for (let i = 1; i <= 4; i++) {
    const y   = H * 0.30 * (i / 4);
    const hw  = Math.max(3, BASE * (1 - i / 5) * 1.2);
    const bx  = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 4, 4), m);
    const bz  = new THREE.Mesh(new THREE.BoxGeometry(4, 4, hw * 2), m);
    bx.position.y = y; g.add(bx);
    bz.position.y = y; g.add(bz);
  }

  // First platform
  const plat1 = new THREE.Mesh(new THREE.BoxGeometry(50, 5, 50), m);
  plat1.position.y = H * 0.30;
  g.add(plat1);

  // Mid shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 13, H * 0.42, 10), m);
  shaft.position.y = H * 0.30 + H * 0.21;
  g.add(shaft);

  // Second platform
  const plat2 = new THREE.Mesh(new THREE.BoxGeometry(28, 5, 28), m);
  plat2.position.y = H * 0.72;
  g.add(plat2);

  // Upper shaft
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3.5, H * 0.19, 8), m);
  upper.position.y = H * 0.72 + H * 0.095;
  g.add(upper);

  // Antenna
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, H * 0.075, 8), mat(0x666655, 0.4, 0.7));
  ant.position.y = H * 0.965;
  g.add(ant);

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BURJ KHALIFA — 828m | Dubai, UAE
// ═══════════════════════════════════════════════════════════════════════════════
export function createBurjKhalifa() {
  const g = new THREE.Group();
  g.name = 'burj';
  const H = 828;

  // Profile for LatheGeometry (6-sided = hexagonal)
  const pts = [];
  for (let i = 0; i <= 32; i++) {
    const t   = i / 32;
    const rad = t < 0.72
      ? 28.5 * (1 - t * 0.72)
      : 28.5 * (1 - 0.72 * 0.72) * (1 - ((t - 0.72) / 0.28) * 0.94);
    pts.push(new THREE.Vector2(Math.max(0.6, rad), H * t));
  }
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 6),
    new THREE.MeshStandardMaterial({ color: 0xB8C8D8, roughness: 0.08, metalness: 0.92 })
  );
  g.add(body);

  // Setback ridges (3 petals)
  for (let p = 0; p < 3; p++) {
    const ang = (p / 3) * Math.PI * 2 + Math.PI / 6;
    for (let i = 0; i < 6; i++) {
      const y   = H * (0.1 + i * 0.12);
      const rad = 26 * (1 - (y / H) * 0.72);
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(rad * 0.28, H * 0.004, rad * 0.1),
        mat(0xA0B8CC, 0.1, 0.95)
      );
      ridge.position.set(Math.cos(ang) * rad * 0.9, y, Math.sin(ang) * rad * 0.9);
      ridge.rotation.y = ang;
      g.add(ridge);
    }
  }

  // Spire
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 2.5, H * 0.085, 8),
    mat(0xD0D8E0, 0.08, 0.95));
  spire.position.y = H * 0.957;
  g.add(spire);

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPIRE STATE BUILDING — 443m | New York, USA
// ═══════════════════════════════════════════════════════════════════════════════
export function createEmpireState() {
  const g = new THREE.Group();
  g.name = 'empirestate';
  const H = 443;
  const m = mat(0x909090, 0.45, 0.55);

  // Art-deco setbacks
  const tiers = [
    { w: 129, d: 57, h: H * 0.24 },
    { w: 90,  d: 42, h: H * 0.20 },
    { w: 62,  d: 34, h: H * 0.19 },
    { w: 40,  d: 24, h: H * 0.16 },
    { w: 24,  d: 20, h: H * 0.10 },
  ];
  let yOff = 0;
  for (const t of tiers) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(t.w / 2, t.h, t.d / 2), mat(0x909090, 0.45, 0.55));
    b.position.y = yOff + t.h / 2;
    g.add(b);
    yOff += t.h;
  }

  // Observatory lantern
  const obs = new THREE.Mesh(new THREE.CylinderGeometry(10, 12, H * 0.035, 16), mat(0x808080, 0.3, 0.7));
  obs.position.y = yOff + H * 0.018;
  g.add(obs);

  // Spire
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 3.5, H * 0.11, 8), mat(0xC0C0C0, 0.2, 0.85));
  spire.position.y = yOff + H * 0.035 + H * 0.055;
  g.add(spire);

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CN TOWER — 553m | Toronto, Canada
// ═══════════════════════════════════════════════════════════════════════════════
export function createCNTower() {
  const g = new THREE.Group();
  g.name = 'cntower';
  const H = 553;
  const m = mat(0x8090A0, 0.5, 0.45);

  // Tripod base
  for (let i = 0; i < 3; i++) {
    const a   = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 7, H * 0.16, 8), m);
    leg.position.set(Math.cos(a) * 10, H * 0.08, Math.sin(a) * 10);
    leg.rotation.z = Math.cos(a) * 0.12;
    leg.rotation.x = Math.sin(a) * 0.12;
    g.add(leg);
  }

  // Main shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 14, H * 0.60, 16), m);
  shaft.position.y = H * 0.30 + H * 0.16;
  g.add(shaft);

  // Observation pod (glass donut)
  const pod = new THREE.Mesh(
    new THREE.TorusGeometry(16, 6, 10, 32),
    new THREE.MeshStandardMaterial({ color: 0x4A6080, roughness: 0.15, metalness: 0.8 })
  );
  pod.position.y = H * 0.60;
  pod.rotation.x = Math.PI / 2;
  g.add(pod);

  // Pod cap
  const podTop = new THREE.Mesh(new THREE.CylinderGeometry(14, 16, 14, 24), mat(0x50708A, 0.3, 0.7));
  podTop.position.y = H * 0.60 + 7;
  g.add(podTop);

  // SkyPod (upper)
  const sky = new THREE.Mesh(
    new THREE.TorusGeometry(8, 4, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0x506070, roughness: 0.2, metalness: 0.7 })
  );
  sky.position.y = H * 0.75;
  sky.rotation.x = Math.PI / 2;
  g.add(sky);

  // Antenna
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 2.2, H * 0.29, 8), mat(0x7090A8, 0.3, 0.75));
  ant.position.y = H * 0.75 + H * 0.145;
  g.add(ant);

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONE WORLD TRADE CENTER — 541m | New York, USA
// ═══════════════════════════════════════════════════════════════════════════════
export function createOneWTC() {
  const g = new THREE.Group();
  g.name = 'onetrade';
  const H = 541;

  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t   = i / 24;
    const rad = t < 0.85
      ? 30 * (1 - t * 0.85)
      : 30 * (1 - 0.85 * 0.85) * (1 - (t - 0.85) / 0.15 * 0.9);
    pts.push(new THREE.Vector2(Math.max(0.5, rad), H * 0.85 * t));
  }

  const body = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 8),
    new THREE.MeshStandardMaterial({ color: 0x8BA0B0, roughness: 0.05, metalness: 0.95 })
  );
  g.add(body);

  // Parapet
  const para = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, H * 0.045, 8), mat(0x7090A0, 0.2, 0.85));
  para.position.y = H * 0.745;
  g.add(para);

  // Spire
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 2.2, H * 0.155, 8), mat(0xB0C4D4, 0.08, 0.94));
  spire.position.y = H * 0.845;
  g.add(spire);

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PYRAMID OF GIZA — 138m | Egypt
// ═══════════════════════════════════════════════════════════════════════════════
export function createPyramidGiza() {
  const g = new THREE.Group();
  g.name = 'pyramid';
  const H = 138;

  const pyramid = new THREE.Mesh(
    new THREE.ConeGeometry(H * 0.84, H, 4, 8),
    new THREE.MeshStandardMaterial({
      color: 0xD4B483, roughness: 0.95, metalness: 0.0,
      // Visible edges for stone blocks
    })
  );
  pyramid.position.y = H / 2;
  pyramid.rotation.y = Math.PI / 4;
  g.add(pyramid);

  // Bright capstone
  const cap = new THREE.Mesh(new THREE.ConeGeometry(6, 14, 4), mat(0xDAA520, 0.3, 0.7));
  cap.position.y = H - 3;
  cap.rotation.y = Math.PI / 4;
  g.add(cap);

  // Stone block texture (darker bottom band)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(H * 1.68, H * 0.06, H * 1.68),
    mat(0xC8A870, 0.98)
  );
  base.position.y = H * 0.03;
  g.add(base);

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BIG BEN (Elizabeth Tower) — 96m | London, UK
// ═══════════════════════════════════════════════════════════════════════════════
export function createBigBen() {
  const g = new THREE.Group();
  g.name = 'bigben';
  const H = 96;
  const m = mat(0x787870, 0.72, 0.12);

  // Palace wall base
  const base = new THREE.Mesh(new THREE.BoxGeometry(28, H * 0.22, 28), mat(0x908878, 0.82));
  base.position.y = H * 0.11;
  g.add(base);

  // Main tower shaft
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(15, H * 0.56, 15), m);
  shaft.position.y = H * 0.22 + H * 0.28;
  g.add(shaft);

  // Corner turrets
  const tPos = [[-9,-9],[9,-9],[-9,9],[9,9]];
  for (const [tx, tz] of tPos) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, H * 0.4, 8), mat(0x747068, 0.7));
    t.position.set(tx, H * 0.22 + H * 0.20, tz);
    g.add(t);
  }

  // Belfry section
  const belfry = new THREE.Mesh(new THREE.BoxGeometry(18, H * 0.11, 18), mat(0x6A6460, 0.7));
  belfry.position.y = H * 0.78 + H * 0.055;
  g.add(belfry);

  // Clock faces (4 directions)
  const clockMat = new THREE.MeshStandardMaterial({ color: 0xF5F0D8, roughness: 0.5 });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const f = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 1, 24), clockMat);
    f.rotation.x = Math.PI / 2;
    f.position.set(Math.cos(a) * 7.5, H * 0.73, Math.sin(a) * 7.5);
    f.rotation.y = a;
    g.add(f);
  }

  // Gothic spire
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 5.5, H * 0.18, 4), mat(0x787070, 0.65));
  spire.position.y = H * 0.89 + H * 0.09;
  g.add(spire);

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUE OF LIBERTY — 93m | New York, USA
// ═══════════════════════════════════════════════════════════════════════════════
export function createStatueOfLiberty() {
  const g = new THREE.Group();
  g.name = 'liberty';
  const H = 93;
  const m = mat(0x71A586, 0.68, 0.22);
  const stone = mat(0xAA9988, 0.88);

  // Star-shaped pedestal (Fort Wood)
  const fortBase = new THREE.Mesh(new THREE.BoxGeometry(35, H * 0.27, 35), stone);
  fortBase.position.y = H * 0.135;
  g.add(fortBase);

  // Pedestal upper
  const pedUpper = new THREE.Mesh(new THREE.CylinderGeometry(14, 16, H * 0.27, 8), stone);
  pedUpper.position.y = H * 0.27 + H * 0.135;
  g.add(pedUpper);

  // Robe/body (tapered)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 9, H * 0.28, 10), m);
  body.position.y = H * 0.54 + H * 0.14;
  g.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 14), m);
  head.position.y = H * 0.82;
  g.add(head);

  // Crown spikes (7)
  for (let i = 0; i < 7; i++) {
    const a     = (i / 7) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.6, 4.5, 4), m);
    spike.position.set(Math.cos(a) * 5.5, H * 0.86, Math.sin(a) * 5.5);
    spike.rotation.z = Math.cos(a) * 0.45;
    spike.rotation.x = Math.sin(a) * 0.45;
    g.add(spike);
  }

  // Raised arm
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, H * 0.17, 8), m);
  arm.position.set(9, H * 0.80, 0);
  arm.rotation.z = -0.82;
  g.add(arm);

  // Torch flame
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.2, 5, 8), mat(0xFFD700, 0.2, 0.9, 0xFFAA00, 1.2));
  torch.position.set(16, H * 0.93, 0);
  g.add(torch);

  return g;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLOSSEUM — 50m | Rome, Italy
// ═══════════════════════════════════════════════════════════════════════════════
export function createColosseum() {
  const g = new THREE.Group();
  g.name = 'colosseum';
  const H = 50;
  const OA = 94, OB = 78; // semi-axes (outer ellipse)
  const m  = mat(0xD4B483, 0.80);

  const N = 36;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 1) / N) * Math.PI * 2;

    const midA = (a0 + a1) / 2;

    // Outer wall segment
    const ox = Math.cos(midA) * OA, oz = Math.sin(midA) * OB;
    const segLen = Math.sqrt(
      ((Math.cos(a1) - Math.cos(a0)) * OA) ** 2 +
      ((Math.sin(a1) - Math.sin(a0)) * OB) ** 2
    ) + 1;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(segLen, H, 8), m);
    seg.position.set(ox, H / 2, oz);
    seg.rotation.y = -Math.atan2(Math.sin(a1) * OB - Math.sin(a0) * OB,
                                  Math.cos(a1) * OA - Math.cos(a0) * OA);
    g.add(seg);

    // Inner ring (smaller ellipse)
    const ia = 0.75;
    const ix = Math.cos(midA) * OA * ia, iz = Math.sin(midA) * OB * ia;
    const iLen = Math.sqrt(
      ((Math.cos(a1) - Math.cos(a0)) * OA * ia) ** 2 +
      ((Math.sin(a1) - Math.sin(a0)) * OB * ia) ** 2
    ) + 1;
    const inner = new THREE.Mesh(new THREE.BoxGeometry(iLen, H * 0.80, 6), mat(0xC8A468, 0.85));
    inner.position.set(ix, H * 0.40, iz);
    inner.rotation.y = seg.rotation.y;
    g.add(inner);
  }

  // Arena floor
  const arena = new THREE.Mesh(new THREE.CylinderGeometry(OA * 0.44, OA * 0.47, 3, 36), mat(0xD0C090, 0.9));
  arena.position.y = 1.5;
  arena.scale.z = OB / OA;
  g.add(arena);

  return g;
}
