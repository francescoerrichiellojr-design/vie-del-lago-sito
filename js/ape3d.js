// Ape operaia (Apis mellifera ligustica) costruita in codice — Vie del Lago Apicoltura
import * as THREE from './three.module.min.js';
import { OrbitControls } from './OrbitControls.js';
import { RoomEnvironment } from './RoomEnvironment.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// generatore pseudo-casuale riproducibile: l'ape è sempre la stessa
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

const COL = {
  cuticola: 0x241a12,
  zampe: 0x2a1f16,
  occhio: 0x17110d,
  ambra: 0xcf7a20,
  ambraScuro: 0x9a5418,
  banda: 0x3a2412,
  peloTorace: [0xc49455, 0xd8b077, 0xa77a41],
  peloTesta: [0x9c7a4f, 0xb79466, 0x6f5638],
  peloAddome: [0xd9a33a, 0xc99030],
  polline: 0xe3a136,
};

// ---------- geometrie di base ----------
function ellissoide(sx, sy, sz, seg = 40) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  g.scale(sx, sy, sz);
  return g;
}

function segmento(a, b, r0, r1, mat, piatto = 1, gonfio = 0) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  let g;
  if (gonfio) {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, r = (r0 + (r1 - r0) * t) * (0.78 + 0.22 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + gonfio * Math.sin(Math.PI * t));
      pts.push(new THREE.Vector2(Math.max(r, 0.004), -L / 2 + t * L));
    }
    g = new THREE.LatheGeometry(pts, 14);
  } else g = new THREE.CylinderGeometry(r1, r0, L, 12, 1);
  g.userData = { L };
  g.scale(piatto, 1, 1);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function peloCurvo() {
  const pos = [], idx = [], A = [0, 2.094, 4.189];
  const anello = (y, r) => A.forEach(a => pos.push(0.32 * y * y + Math.cos(a) * r, y, Math.sin(a) * r));
  anello(0, 1); anello(0.55, 0.6); pos.push(0.32, 1, 0);
  for (let k = 0; k < 3; k++) { const n = (k + 1) % 3; idx.push(k, n, 3 + k, n, 3 + n, 3 + k, 3 + k, 3 + n, 6); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------- pelliccia a ciocche (hair cards) ----------
// texture: centinaia di peli sottili, radice scura e punta chiara, su fondo trasparente
let _tc = null;
function texturaCiocca() {
  if (_tc) return _tc;
  const W = 128, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), r = rng(77);
  for (let i = 0; i < 26; i++) {
    const x0 = W * (0.12 + r() * 0.76), lun = H * (0.45 + r() * 0.55), curva = (r() - 0.5) * W * 0.5, lw = 3 + r() * 3.5;
    const g = x.createLinearGradient(0, H, 0, H - lun);
    const b = 0.75 + r() * 0.25;
    g.addColorStop(0, `rgba(${120 * b},${100 * b},${75 * b},0.95)`);
    g.addColorStop(0.45, `rgba(${200 * b},${180 * b},${150 * b},0.95)`);
    g.addColorStop(0.85, `rgba(${250 * b},${240 * b},${215 * b},0.8)`);
    g.addColorStop(1, 'rgba(255,250,235,0)');
    x.strokeStyle = g; x.lineWidth = lw; x.lineCap = 'round';
    x.beginPath(); x.moveTo(x0, H); x.quadraticCurveTo(x0 + curva * 0.4, H - lun * 0.5, x0 + curva, H - lun); x.stroke();
  }
  _tc = new THREE.CanvasTexture(cv); _tc.colorSpace = THREE.SRGBColorSpace; _tc.anisotropy = 4;
  return _tc;
}

// una striscia leggermente piegata: la base sulla pelle, la punta curva in avanti
function geoCiocca() {
  const pos = [], uv = [], idx = [], N = 3;
  for (let j = 0; j <= N; j++) {
    const y = j / N, z = 0.22 * y * y;
    for (const u of [0, 1]) { pos.push(u - 0.5, y, z); uv.push(u, y); }
  }
  for (let j = 0; j < N; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  // normali lungo il pelo: la luce cade sulla ciocca come sulla pelle sotto, senza macchie scure
  const nr = []; for (let i = 0; i < pos.length / 3; i++) nr.push(0, 0.95, 0.3);
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nr, 3));
  g.setIndex(idx);
  return g;
}

let _matCiocca = null;
function ciocche(punti, colori) {
  if (!_matCiocca) _matCiocca = new THREE.MeshStandardMaterial({ map: texturaCiocca(), alphaTest: 0.32, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.72, metalness: 0 });
  const im = new THREE.InstancedMesh(geoCiocca(), _matCiocca, punti.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qr = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color(), Y = V(0, 1, 0);
  punti.forEach((p, i) => {
    q.setFromUnitVectors(Y, p.dir).multiply(qr.setFromAxisAngle(Y, p.v * 6.283 * 5.1));
    s.set(p.w || p.len * 0.9, p.len, p.len);
    m.compose(p.pos, q, s); im.setMatrixAt(i, m);
    im.setColorAt(i, c.set(colori[i % colori.length]).multiplyScalar(0.9 + p.v * 0.25));
  });
  im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true;
  return im;
}

// puntinatura fine della cuticola, come normal map
let _np = null;
function normalePuntini() {
  if (_np) return _np;
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const x = cv.getContext('2d'), r = rng(31); x.fillStyle = 'rgb(128,128,255)'; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 900; i++) {
    const cx = r() * N, cy = r() * N, rr = 1 + r() * 2.6;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
    g.addColorStop(0, 'rgb(128,128,200)'); g.addColorStop(0.6, 'rgb(150,110,240)'); g.addColorStop(1, 'rgba(128,128,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill();
  }
  _np = new THREE.CanvasTexture(cv); _np.wrapS = _np.wrapT = THREE.RepeatWrapping; _np.repeat.set(2, 4);
  return _np;
}

// peli: tanti coni sottilissimi, orientati lungo la normale e piegati all'indietro
function peli(punti, colori, materiale) {
  const g = peloCurvo();
  const im = new THREE.InstancedMesh(g, materiale, punti.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qr = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color(), Y = V(0, 1, 0);
  punti.forEach((p, i) => {
    q.setFromUnitVectors(Y, p.dir).multiply(qr.setFromAxisAngle(Y, p.v * 6.283 * 7.3));
    s.set(p.r, p.len, p.r);
    m.compose(p.pos, q, s);
    im.setMatrixAt(i, m);
    im.setColorAt(i, c.set(colori[i % colori.length]).multiplyScalar(0.85 + p.v * 0.3));
  });
  im.instanceMatrix.needsUpdate = true;
  return im;
}

function puntiSuEllissoide(n, centro, S, len, filtro, rand, piega = 0.45) {
  const out = [];
  while (out.length < n) {
    const u = rand() * 2 - 1, t = rand() * Math.PI * 2, k = Math.sqrt(1 - u * u);
    const d = V(k * Math.cos(t), u, k * Math.sin(t));
    if (filtro && !filtro(d)) continue;
    const pos = V(d.x * S.x, d.y * S.y, d.z * S.z).add(centro);
    const nrm = V(d.x / S.x, d.y / S.y, d.z / S.z).normalize();
    const dir = nrm.clone().add(V(-piega, -0.1, 0)).add(V(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.5)).normalize();
    out.push({ pos: pos.addScaledVector(nrm, -0.01), dir, len: len * (0.7 + rand() * 0.6), r: 0.0042 + rand() * 0.0025, v: rand() });
  }
  return out;
}

// ---------- addome: profilo a sei tergiti sovrapposti ----------
const ADDOME = { L: 1.62, R: 0.5, N: 6 };
function raggioAddome(t) {
  const tp = t < 0.38 ? (t / 0.38) * 0.5 : 0.5 + ((t - 0.38) / 0.62) * 0.5;
  let r = ADDOME.R * Math.pow(Math.sin(Math.PI * tp), 0.62);
  const s = (t * ADDOME.N) % 1;                     // posizione dentro il tergite
  if (t > 0.04 && t < 0.97) r *= 0.955 + 0.06 * Math.pow(s, 1.6) - (s > 0.93 ? 0.05 : 0);
  return Math.max(r, 0.004);
}

function addome() {
  const pts = [];
  for (let i = 0; i <= 260; i++) { const t = i / 260; pts.push(new THREE.Vector2(raggioAddome(t), -t * ADDOME.L)); }
  pts.reverse();   // dalla punta alla base: normali verso l'esterno
  const g = new THREE.LatheGeometry(pts, 64);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const amb = new THREE.Color(COL.ambra), ambS = new THREE.Color(COL.ambraScuro), ban = new THREE.Color(COL.banda), pel = new THREE.Color(COL.peloAddome[0]);
  for (let i = 0; i < pos.count; i++) {
    const t = -pos.getY(i) / ADDOME.L, s = (t * ADDOME.N) % 1, seg = Math.floor(t * ADDOME.N);
    if (seg <= 1) c.copy(amb).lerp(ambS, seg * 0.3); else if (seg === 2) c.copy(ambS).lerp(ban, 0.45);   // ligustica: tre bande ambrate
    else c.copy(ban).lerp(ambS, 0.12);
    if (s > 0.72) c.lerp(ban, Math.min(1, (s - 0.72) / 0.12));                 // margine scuro del tergite
    if (s < 0.16 && seg >= 1 && seg <= 4) c.lerp(pel, 0.55 * (1 - s / 0.16));  // fascia di peli chiari
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ---------- ali: membrana trasparente con nervature disegnate ----------
function texturaAla(ant) {
  const W = 1024, H = 384, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(214,160,70,0.28)'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { x.fillStyle = 'rgba(150,100,40,0.18)'; x.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  x.strokeStyle = 'rgba(112,62,24,1)'; x.lineCap = 'round'; x.lineJoin = 'round';
  const L = (w, pts) => { x.lineWidth = w; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a * W, b * H) : x.moveTo(a * W, b * H))); x.stroke(); };
  if (ant) {
    L(7, [[0, .5], [.12, .2], [.45, .1], [.66, .13]]);            // costa
    L(4, [[.05, .5], [.3, .32], [.55, .26], [.66, .13]]);          // radio
    L(3.5, [[.66, .13], [.86, .2], [.95, .3]]);                    // cella marginale
    L(3, [[.55, .26], [.62, .42], [.74, .4], [.86, .2]]);          // celle cubitali
    L(3, [[.62, .42], [.6, .58], [.72, .62], [.74, .4]]);
    L(3, [[.6, .58], [.52, .74], [.4, .66], [.3, .32]]);
    L(3, [[.4, .66], [.2, .78], [.05, .58]]);                      // nervature anali
    L(2.5, [[.72, .62], [.88, .78]]);
    L(2.5, [[.52, .74], [.62, .9]]);
  } else {
    L(6, [[0, .45], [.2, .22], [.5, .18], [.62, .2]]);
    L(3.5, [[.05, .5], [.35, .38], [.55, .45], [.75, .4]]);
    L(3, [[.35, .38], [.4, .62], [.6, .7]]);
    L(2.5, [[.4, .62], [.25, .78]]);
    // uncini (hamuli) sul margine anteriore
    x.lineWidth = 2; for (let i = 0; i < 18; i++) { const a = (.42 + i * .01) * W; x.beginPath(); x.moveTo(a, .2 * H); x.lineTo(a + 3, .13 * H); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function formaAla(L, W, ant) {
  const s = new THREE.Shape();
  if (ant) {
    s.moveTo(0, 0); s.bezierCurveTo(L * .15, W * .62, L * .55, W * .78, L * .86, W * .55);
    s.bezierCurveTo(L * 1.02, W * .4, L * 1.03, -W * .05, L * .9, -W * .22);
    s.bezierCurveTo(L * .7, -W * .48, L * .3, -W * .5, L * .08, -W * .2); s.lineTo(0, 0);
  } else {
    s.moveTo(0, 0); s.bezierCurveTo(L * .2, W * .55, L * .6, W * .6, L * .9, W * .4);
    s.bezierCurveTo(L * 1.03, W * .25, L * 1.0, -W * .15, L * .82, -W * .3);
    s.bezierCurveTo(L * .55, -W * .55, L * .2, -W * .45, 0, 0);
  }
  const g = new THREE.ShapeGeometry(s, 32), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / L, 1 - (p.getY(i) + W * 0.5) / W);
  g.rotateX(-Math.PI / 2);   // ala nel piano orizzontale, la punta verso +x
  return g;
}

function ala(L, W, ant) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: texturaAla(ant), transparent: true, opacity: 1, roughness: 0.22, metalness: 0,
    side: THREE.DoubleSide, depthWrite: false, iridescence: 0.9, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520],
  });
  // membrana leggermente velata dietro le nervature
  const veli = new THREE.MeshPhysicalMaterial({ color: 0xe9b863, transparent: true, opacity: 0.22, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 600] });
  const geo = formaAla(L, W, ant), gr = new THREE.Group();
  gr.add(new THREE.Mesh(geo, veli), new THREE.Mesh(geo, m));
  return gr;
}

// ---------- zampe ----------
// punti: articolazioni; seg: per ogni segmento [raggio0, raggio1, materiale, piatto, densità peli, lunghezza peli]
function zampa(punti, seg, tarsoMat, peliOut, rand) {
  const g = new THREE.Group();
  for (let i = 0; i < punti.length - 1; i++) {
    let [r0, r1, mat, piatto = 1, dens = 0, lp = 0.08] = seg[i]; r0 *= 1.25; r1 *= 1.25;
    const a = punti[i], b = punti[i + 1];
    g.add(segmento(a, b, r0, r1, mat, piatto, 0.16));
    const j = new THREE.Mesh(new THREE.SphereGeometry(Math.min(r0, r1) * 1.02, 12, 10), mat); j.position.copy(b); g.add(j);
    // peli: escono in tutte le direzioni dal segmento, un po' verso il basso e verso la punta
    const ax = new THREE.Vector3().subVectors(b, a), L = ax.length(); ax.normalize();
    const u = new THREE.Vector3().crossVectors(ax, V(0, 1, 0)); if (u.lengthSq() < 1e-4) u.set(1, 0, 0); u.normalize();
    const w = new THREE.Vector3().crossVectors(ax, u).normalize();
    const n = Math.round(dens * L);
    for (let k = 0; k < n; k++) {
      const t = rand(), phi = rand() * Math.PI * 2, r = (r0 + (r1 - r0) * t);
      const rad = u.clone().multiplyScalar(Math.cos(phi) * piatto).addScaledVector(w, Math.sin(phi)).normalize();
      const pos = a.clone().addScaledVector(ax, t * L).addScaledVector(rad, r * 0.9);
      const dir = rad.clone().multiplyScalar(0.85).addScaledVector(ax, 0.45).add(V(0, -0.25, 0)).add(V(rand() - .5, rand() - .5, rand() - .5).multiplyScalar(0.35)).normalize();
      peliOut.push({ pos, dir, len: lp * (0.6 + rand() * 0.7), r: 0.0035 + rand() * 0.002, v: rand() });
    }
  }
  // tarsi finali: quattro piccoli segmenti e due unghie
  const a = punti[punti.length - 2], b = punti[punti.length - 1], d = new THREE.Vector3().subVectors(b, a).normalize();
  let p = b.clone();
  for (let k = 0; k < 4; k++) { const q = p.clone().addScaledVector(d, 0.04).add(V(0, -0.012, 0)); g.add(segmento(p, q, 0.028 - k * .002, 0.024 - k * .002, tarsoMat)); const jj = new THREE.Mesh(new THREE.SphereGeometry(0.026 - k * .002, 10, 8), tarsoMat); jj.position.copy(q); g.add(jj); p = q; }
  g.add(segmento(p, p.clone().add(V(d.x * .04, -.05, .028)), 0.009, 0.003, tarsoMat), segmento(p, p.clone().add(V(d.x * .04, -.05, -.028)), 0.009, 0.003, tarsoMat));
  return g;
}

const ORO = [0xe2aa24, 0xd69b1c, 0xf0c03e, 0xc48a16, 0xe8b430, 0x6a4818];   // l'ultimo è il sottopelo scuro
const ORO_SCURO = [0x8a6424, 0x6b4a1e, 0xa87c2c, 0x4e3416, 0xc89a34];

// ---------- l'ape ----------
export function costruisciApe() {
  const rand = rng(20261108);
  const ape = new THREE.Group();
  const mat = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, ...o });
  const cut = mat(0x3a2816, { roughness: 0.75 });
  const pt = { normalMap: normalePuntini(), normalScale: new THREE.Vector2(0.5, 0.5) };
  const nero = mat(0x2a1a10, { roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35, ...pt });
  const rosso = mat(0x9c4422, { roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.3, ...pt });
  const arancio = mat(0xc4602a, { roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3, ...pt });
  const tarso = mat(0xd2722e, { roughness: 0.45, clearcoat: 0.5, ...pt });
  const peloMat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0 });
  const corpo = [];

  // torace: base scura sotto una pelliccia dorata fitta
  const TC = V(0.45, 0.05, 0), TS = V(0.55, 0.5, 0.48);
  const torace = new THREE.Mesh(ellissoide(TS.x, TS.y, TS.z), cut); torace.position.copy(TC); ape.add(torace); corpo.push(torace);
  const scut = new THREE.Mesh(ellissoide(0.17, 0.1, 0.26), cut); scut.position.set(0.0, 0.36, 0); ape.add(scut);
  ape.add(ciocche(puntiSuEllissoide(4200, TC, TS.clone().multiplyScalar(0.97), 0.16, null, rand, 0.3).map(p => ({ ...p, w: 0.045 + p.v * 0.02 })), ORO));
  ape.add(ciocche(puntiSuEllissoide(400, V(0.0, 0.36, 0), V(0.17, 0.1, 0.26), 0.12, d => d.y > -0.2, rand, 0.4).map(p => ({ ...p, w: 0.04 })), ORO));
  ape.add(peli(puntiSuEllissoide(3000, TC, TS.clone().multiplyScalar(0.99), 0.2, null, rand, 0.2), ORO, peloMat));   // peli lunghi isolati sul contorno

  // peziolo e addome
  const pez = new THREE.Mesh(ellissoide(0.12, 0.1, 0.11, 20), cut); pez.position.set(-0.12, -0.02, 0); ape.add(pez);
  const addomeMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.7, sheenColor: new THREE.Color(0xe8b040), sheenRoughness: 0.45 });
  const add = new THREE.Mesh(addome(), addomeMat);
  const gAdd = new THREE.Group(); gAdd.position.set(-0.16, -0.02, 0); gAdd.rotation.z = 0.24; ape.add(gAdd);
  add.rotation.z = -Math.PI / 2; gAdd.add(add); corpo.push(add);
  // peluria su tutto l'addome: dorata davanti, bruna sui segmenti scuri, fasce chiare all'inizio di ogni tergite
  const pDav = [], pDie = [];
  for (let i = 0; i < 3800; i++) {
    const t = 0.03 + rand() * 0.95, s = (t * ADDOME.N) % 1, seg = Math.floor(t * ADDOME.N), phi = rand() * Math.PI * 2, r = raggioAddome(t);
    const pos = V(-t * ADDOME.L, Math.cos(phi) * r * 0.99, Math.sin(phi) * r * 0.99);
    const dir = V(-0.9 - rand() * 0.4, Math.cos(phi), Math.sin(phi)).add(V(0, rand() - .5, rand() - .5).multiplyScalar(0.3)).normalize();
    const fascia = s < 0.2;
    const p = { pos, dir, len: (t > 0.9 ? 0.09 : fascia ? 0.07 : 0.045) * (0.6 + rand() * 0.8), r: 0.003 + rand() * 0.0018, v: rand() };
    (seg <= 1 || fascia ? pDav : pDie).push(p);
  }
  gAdd.add(peli(pDav, [0xe0a02a, 0xd08e22, 0xeeb840, 0xc07a1c], peloMat), peli(pDie, ORO_SCURO, peloMat));
  const cDav = [], cDie = [];
  for (let i = 0; i < 6800; i++) {
    const t = i < 1600 ? 0.02 + rand() * 0.32 : 0.02 + rand() * 0.95, s = (t * ADDOME.N) % 1, seg = Math.floor(t * ADDOME.N), phi = rand() * Math.PI * 2, r = raggioAddome(t);
    const pos = V(-t * ADDOME.L, Math.cos(phi) * r * 0.97, Math.sin(phi) * r * 0.97);
    const dir = V(-1.1 - rand() * 0.5, Math.cos(phi), Math.sin(phi)).normalize();
    const fascia = s < 0.22, len = (t > 0.85 ? 0.11 : fascia ? 0.09 : 0.065) * (0.75 + rand() * 0.5);
    (seg <= 1 || fascia ? cDav : cDie).push({ pos, dir, len, w: len * 0.45, v: rand() });
  }
  gAdd.add(ciocche(cDav, [0xe6a830, 0xd8962a, 0xf0bc48]), ciocche(cDie, [0x8a6428, 0x6e4c20, 0xa47a30, 0x5a3c18]));
  const pung = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.17, 10), mat(0xc0602a, { roughness: 0.35 }));
  pung.rotation.z = Math.PI / 2; pung.position.set(-ADDOME.L - 0.06, 0, 0); gAdd.add(pung);

  // testa
  const HC = V(1.13, 0.02, 0), HS = V(0.3, 0.42, 0.46);
  const gT = ellissoide(HS.x, HS.y, HS.z), pT = gT.attributes.position;
  for (let i = 0; i < pT.count; i++) { const y = pT.getY(i); if (y < 0) pT.setZ(i, pT.getZ(i) * (1 - 0.38 * (-y / HS.y))); }
  gT.computeVertexNormals();
  const testa = new THREE.Mesh(gT, cut); testa.position.copy(HC); testa.rotation.z = -0.15; ape.add(testa); corpo.push(testa);
  const fTesta = d => !(d.x > 0.5 && d.y < -0.05 && Math.abs(d.z) < 0.4) && Math.abs(d.z) < 0.66 && !(d.y < -0.2 && Math.abs(d.z) > 0.45);
  ape.add(ciocche(puntiSuEllissoide(1500, HC, HS.clone().multiplyScalar(0.96), 0.1, fTesta, rand, 0.05).map(p => ({ ...p, w: 0.035 })), ORO));
  ape.add(peli(puntiSuEllissoide(1400, HC, HS, 0.12, fTesta, rand, 0.05), ORO, peloMat));
  // occhi: grandi, grigio scuro opaco, con la trama fine degli ommatidi
  const occhioMat = new THREE.MeshPhysicalMaterial({ color: 0x3a3d41, roughness: 0.62, clearcoat: 0.18, clearcoatRoughness: 0.5, normalMap: texturaOmmatidi(), normalScale: new THREE.Vector2(0.45, 0.45) });
  for (const z of [1, -1]) {
    const gO = ellissoide(0.17, 0.35, 0.13, 56), pO = gO.attributes.position;
    for (let i = 0; i < pO.count; i++) { const y = pO.getY(i); if (y < 0) { const k = 1 - 0.32 * (-y / 0.35); pO.setX(i, pO.getX(i) * k); pO.setZ(i, pO.getZ(i) * (0.85 + 0.15 * k)); } }
    gO.computeVertexNormals();
    const o = new THREE.Mesh(gO, occhioMat);
    o.position.set(1.17, 0.05, 0.355 * z); o.rotation.set(0.12 * z, -0.35 * z, -0.12); ape.add(o); corpo.push(o);
  }
  for (const [x, y, z] of [[1.1, 0.42, 0], [1.03, 0.39, 0.09], [1.03, 0.39, -0.09]]) {
    const oc = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), occhioMat); oc.position.set(x, y, z); ape.add(oc);
  }
  // faccia: clipeo chiaro e lucido, labbro, mandibole arancio
  const clip = new THREE.Mesh(ellissoide(0.035, 0.13, 0.1), mat(0x8f7c60, { roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, ...pt }));
  clip.position.set(1.385, -0.17, 0); ape.add(clip);
  const labbro = new THREE.Mesh(ellissoide(0.05, 0.04, 0.11), mat(0x5a3a22, { roughness: 0.4, clearcoat: 0.5 })); labbro.position.set(1.43, -0.32, 0); ape.add(labbro);
  const mand = mat(0xb4542a, { roughness: 0.35, clearcoat: 0.7 });
  for (const z of [1, -1]) ape.add(segmento(V(1.4, -0.32, 0.1 * z), V(1.47, -0.45, 0.04 * z), 0.04, 0.016, mand));
  // antenne: scapo rossiccio, flagello bruno segmentato con la punta chiara
  const antenne = new THREE.Group(), flag = mat(0x5e3020, { roughness: 0.45, clearcoat: 0.4 }), punta = mat(0xc4602a, { roughness: 0.4 });
  for (const z of [1, -1]) {
    const a0 = V(1.42, 0.08, 0.07 * z), gom = V(1.62, 0.42, 0.14 * z);
    antenne.add(segmento(a0, gom, 0.025, 0.022, rosso));
    const fl = new THREE.CatmullRomCurve3([gom, V(1.84, 0.48, 0.22 * z), V(2.02, 0.38, 0.3 * z), V(2.1, 0.2, 0.35 * z)]);
    for (let k = 0; k < 11; k++) antenne.add(segmento(fl.getPoint(k / 11), fl.getPoint((k + 0.94) / 11), 0.021, 0.023, k === 10 ? punta : flag));
  }
  ape.add(antenne);
  // ligula
  const ligula = new THREE.Mesh(new THREE.BufferGeometry(), mat(0xa85a2a, { roughness: 0.5, clearcoat: 0.3 })); ape.add(ligula);
  const curvaLigula = (k) => new THREE.CatmullRomCurve3([
    V(1.44, -0.38, 0), V(1.39 + 0.45 * k, -0.46 - 0.12 * k, 0), V(1.28 + 0.95 * k, -0.48 - 0.2 * k, 0), V(1.15 + 1.3 * k, -0.43 - 0.35 * k, 0)]);
  const setLigula = (k) => { ligula.geometry.dispose(); ligula.geometry = new THREE.TubeGeometry(curvaLigula(k), 40, 0.02, 8); };
  setLigula(0);

  // ali ambrate, sollevate come nelle foto
  const ali = [];
  for (const z of [1, -1]) {
    for (const [ant, L, W, y, rot, alza] of [[true, 1.62, 0.54, 0.47, 0.5, 0.55], [false, 1.14, 0.37, 0.43, 0.72, 0.42]]) {
      const pivot = new THREE.Group(); pivot.position.set(0.55, y, 0.2 * z);
      const a = ala(L, W, ant); a.rotation.y = Math.PI + rot;
      pivot.add(a); pivot.scale.z = z;
      pivot.rotation.x = -alza * z; pivot.userData = { z, base: -alza * z, ant };
      ape.add(pivot); ali.push(pivot);
    }
  }

  // zampe: femore scuro con frangia dorata, tibia rossiccia, basitarso arancio
  const zamp = new THREE.Group(), pZ = []; let cestella = null;
  for (const z of [1, -1]) {
    const Z = (p) => V(p[0], p[1] < -0.4 ? -0.4 + (p[1] + 0.4) * 0.62 : p[1], p[2] * z * 0.92);
    zamp.add(zampa([[0.78, -0.3, 0.1], [0.84, -0.5, 0.2], [1.07, -0.62, 0.42], [1.16, -0.95, 0.5], [1.32, -1.12, 0.56]].map(Z),
      [[0.062, 0.058, nero, 1, 120, 0.06], [0.058, 0.052, nero, 1.25, 420, 0.1], [0.052, 0.048, nero, 1.2, 380, 0.09], [0.046, 0.04, rosso, 1.15, 200, 0.07]], tarso, pZ, rand));
    zamp.add(zampa([[0.45, -0.38, 0.15], [0.45, -0.55, 0.3], [0.5, -0.64, 0.74], [0.44, -1.04, 0.94], [0.34, -1.24, 1.02]].map(Z),
      [[0.064, 0.06, nero, 1, 120, 0.06], [0.06, 0.054, nero, 1.3, 420, 0.1], [0.055, 0.05, nero, 1.25, 360, 0.09], [0.048, 0.042, rosso, 1.2, 180, 0.07]], tarso, pZ, rand));
    const H = [[0.2, -0.35, 0.15], [0.1, -0.55, 0.32], [-0.2, -0.6, 0.8], [-0.64, -0.98, 0.95], [-0.9, -1.2, 1.0]].map(Z);
    zamp.add(zampa(H, [[0.07, 0.064, nero, 1, 120, 0.06], [0.064, 0.058, nero, 1.3, 380, 0.09], [0.05, 0.066, nero, 1.55, 160, 0.08], [0.058, 0.048, arancio, 1.6, 160, 0.06]], tarso, pZ, rand));
    // pallottola di polline giallo limone nella cestella della tibia
    const pg = new THREE.IcosahedronGeometry(0.1, 4), pp = pg.attributes.position;
    for (let i = 0; i < pp.count; i++) { const v = V(pp.getX(i), pp.getY(i), pp.getZ(i)); v.multiplyScalar(1 + (rand() - 0.5) * 0.06); pp.setXYZ(i, v.x, v.y, v.z); }
    pg.computeVertexNormals(); pg.scale(1, 1.75, 0.9);
    const pol = new THREE.Mesh(pg, mat(0xf0d43c, { roughness: 0.55, clearcoat: 0.25, sheen: 0.6, sheenColor: new THREE.Color(0xfff2a0) }));
    const mid = H[2].clone().lerp(H[3], 0.5), axT = new THREE.Vector3().subVectors(H[3], H[2]).normalize();
    pol.position.copy(mid).add(V(0.02, 0.03, 0.07 * z)); pol.quaternion.setFromUnitVectors(V(0, 1, 0), axT); zamp.add(pol);
    if (z > 0) cestella = pol;
  }
  ape.add(zamp);
  ape.add(peli(pZ.filter((p, i) => i % 2), [0xe8b428, 0xf0c440, 0xd8a020, 0xc89418], peloMat));
  ape.add(ciocche(pZ.filter((p, i) => i % 2 === 0).map(p => ({ ...p, len: p.len * 1.1, w: p.len * 0.35 })), [0xe8b428, 0xf0c440, 0xd8a020]));
  ape.traverse(o => { if (o.isMesh && !o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; } });

  ape.position.set(-0.15, 0.25, 0);
  const pc = cestella.position;
  return { ape, corpo, ali, setLigula, cestella, punti: {
    occhi: V(1.22, 0.14, 0.58), antenne: V(1.62, 0.42, 0.17), ligula: V(1.44, -0.48, 0.05), peli: V(0.5, 0.68, 0.1),
    ali: V(-0.1, 0.75, 0.6), cestella: V(pc.x, pc.y, pc.z + 0.14), addome: V(-0.9, 0.25, 0.46), pungiglione: V(-1.72, -0.42, 0) } };
}

function texturaOmmatidi() {
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const x = cv.getContext('2d'); x.fillStyle = 'rgb(128,128,255)'; x.fillRect(0, 0, N, N);
  const r = 5;
  for (let j = 0; j < N / (r * 1.5) + 2; j++) for (let i = 0; i < N / (r * 1.73) + 2; i++) {
    const cx = i * r * 1.73 + (j % 2) * r * 0.866, cy = j * r * 1.5;
    const g = x.createRadialGradient(cx - 1.5, cy - 1.5, 0, cx, cy, r);
    g.addColorStop(0, 'rgb(110,110,255)'); g.addColorStop(0.7, 'rgb(150,150,255)'); g.addColorStop(1, 'rgb(128,128,230)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r * 0.95, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
  return t;
}

// da dove guardare ogni parte quando viene scelta
const VISTE = {
  occhi: V(1, 0.3, 0.9), antenne: V(1, 0.6, 0.7), ligula: V(0.3, -0.05, 1), peli: V(0.1, 1, 0.8),
  ali: V(-0.2, 1, 0.55), cestella: V(-0.35, 0.05, 1), addome: V(-0.7, 0.45, 0.8), pungiglione: V(-1, 0.25, 0.45),
};

// ---------- scena interattiva ----------
export function avvia(contenitore, { onSeleziona } = {}) {
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const leggero = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  contenitore.prepend(renderer.domElement);

  const scena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(3.4, 1.7, 5.6);
  // ambiente da studio fotografico: riflessi morbidi su occhi, cuticola e ali
  const pm = new THREE.PMREMGenerator(renderer);
  scena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scena.environmentIntensity = 0.55;
  scena.add(new THREE.HemisphereLight(0xfff3dc, 0x5a4a35, 0.55));
  const sole = new THREE.DirectionalLight(0xfff0d8, 2.4); sole.position.set(3, 7, 4); scena.add(sole);
  sole.castShadow = true; sole.shadow.mapSize.set(leggero ? 1024 : 2048, leggero ? 1024 : 2048);
  Object.assign(sole.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 1, far: 16 });
  sole.shadow.bias = -0.0004; sole.shadow.normalBias = 0.02; sole.shadow.radius = 6;
  const contro = new THREE.DirectionalLight(0xbfd4ff, 1.1); contro.position.set(-5, 2, -4); scena.add(contro);
  const basso = new THREE.DirectionalLight(0xffd9a0, 0.5); basso.position.set(0, -5, 3); scena.add(basso);

  const A = costruisciApe(); scena.add(A.ape);
  // ombra morbida a terra
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const cx = cv.getContext('2d');
  const gr = cx.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(40,30,15,0.35)'); gr.addColorStop(1, 'rgba(40,30,15,0)');
  cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  ombra.rotation.x = -Math.PI / 2; ombra.position.set(0, -0.68, 0.1); scena.add(ombra);
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.16 }));
  pav.rotation.x = -Math.PI / 2; pav.position.y = -0.675; pav.receiveShadow = true; scena.add(pav);

  const ctr = new OrbitControls(cam, renderer.domElement);
  ctr.target.set(0, -0.1, 0); ctr.enableDamping = true; ctr.dampingFactor = 0.08; ctr.enablePan = false;
  ctr.minDistance = 2.6; ctr.maxDistance = 9; ctr.maxPolarAngle = Math.PI * 0.82;
  ctr.autoRotate = !ridotto; ctr.autoRotateSpeed = 0.9; ctr.rotateSpeed = 0.7;
  ctr.addEventListener('start', () => { ctr.autoRotate = false; contenitore.classList.add('ape3d--toccata'); });

  // sul telefono il dito deve poter scorrere la pagina: la rotazione si attiva con un tocco
  const tattile = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches), cnv = renderer.domElement;
  const attiva = (si) => {
    if (!tattile) return;
    ctr.enabled = si; cnv.style.touchAction = si ? 'none' : 'pan-y';
    contenitore.classList.toggle('ape3d--attiva', si);
  };
  if (tattile) {
    attiva(false);
    let giu = null;
    cnv.addEventListener('pointerdown', e => { giu = [e.clientX, e.clientY]; });
    cnv.addEventListener('pointerup', e => { if (giu && Math.hypot(e.clientX - giu[0], e.clientY - giu[1]) < 8 && !ctr.enabled) attiva(true); giu = null; });
  }

  // punti interattivi: bottoni HTML già presenti nel contenitore
  const bottoni = [...contenitore.querySelectorAll('[data-parte]')];
  const ray = new THREE.Raycaster(), tmp = new THREE.Vector3();
  let ligK = 0, ligTarget = 0, volo = null;
  function seleziona(parte) {
    bottoni.forEach(b => b.setAttribute('aria-pressed', b.dataset.parte === parte ? 'true' : 'false'));
    ligTarget = parte === 'ligula' ? 1 : 0;
    ctr.autoRotate = false; attiva(true);
    const p = A.punti[parte];
    if (p) {
      const w = A.ape.localToWorld(p.clone()), c = V(0, -0.1, 0);
      const dir = (VISTE[parte] || V(1, 0.4, 1)).clone().normalize();
      const dist = cam.aspect < 1 ? 5.4 : 4.6;
      volo = { t: 0, da: cam.position.clone(), a: c.clone().addScaledVector(dir, dist), tda: ctr.target.clone(), ta: w.clone().lerp(c, cam.aspect < 1 ? 0.25 : 0.5) };
    }
    onSeleziona && onSeleziona(parte);
  }
  bottoni.forEach(b => b.addEventListener('click', () => seleziona(b.dataset.parte)));

  function ridimensiona() {
    const w = contenitore.clientWidth, h = contenitore.clientHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = w / h < 1 ? 38 : 30; cam.updateProjectionMatrix();
  }
  new ResizeObserver(ridimensiona).observe(contenitore); ridimensiona();

  let visibile = true, t0 = performance.now();
  new IntersectionObserver(([e]) => {
    const prima = visibile; visibile = e.isIntersecting;
    if (!visibile) attiva(false);
    if (visibile && !prima) { t0 = performance.now(); requestAnimationFrame(loop); }
  }).observe(contenitore);

  function aggiornaBottoni() {
    const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
    for (const b of bottoni) {
      const p = A.punti[b.dataset.parte]; if (!p) continue;
      const w = A.ape.localToWorld(tmp.copy(p));
      const d = w.distanceTo(cam.position);
      ray.set(cam.position, w.clone().sub(cam.position).normalize()); ray.far = d - 0.04;
      const nascosto = ray.intersectObjects(A.corpo, false).length > 0;
      w.project(cam);
      b.style.transform = `translate(${(w.x * 0.5 + 0.5) * W}px, ${(-w.y * 0.5 + 0.5) * H}px) translate(-50%,-50%)`;
      b.classList.toggle('nascosto', nascosto);
    }
  }

  function loop(now) {
    if (!visibile) return;
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    if (volo) {
      volo.t = Math.min(1, volo.t + dt * 1.4); const k = volo.t * volo.t * (3 - 2 * volo.t);
      cam.position.lerpVectors(volo.da, volo.a, k); ctr.target.lerpVectors(volo.tda, volo.ta, k);
      if (volo.t >= 1) volo = null;
    }
    if (Math.abs(ligTarget - ligK) > 0.002) { ligK += (ligTarget - ligK) * Math.min(1, dt * 4); A.setLigula(ligK); }
    // ali: un leggero fremito ogni tanto
    if (!ridotto) {
      const s = now / 1000, fr = Math.max(0, Math.sin(s * 0.7)) ** 12;
      A.ali.forEach(p => { p.rotation.x = p.userData.base + p.userData.z * Math.sin(s * 60) * 0.06 * fr; });
    }
    ctr.update();
    renderer.render(scena, cam);
    aggiornaBottoni();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  contenitore.classList.add('ape3d--pronta');
  return { seleziona, renderer, scena, cam, ctr, A };
}
