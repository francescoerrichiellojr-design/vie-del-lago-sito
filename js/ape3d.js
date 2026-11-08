// Ape operaia (Apis mellifera ligustica) costruita in codice — Vie del Lago Apicoltura
import * as THREE from './three.module.min.js';
import { OrbitControls } from './OrbitControls.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// generatore pseudo-casuale riproducibile: l'ape è sempre la stessa
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

const COL = {
  cuticola: 0x241a12,
  zampe: 0x2a1f16,
  occhio: 0x17110d,
  ambra: 0xc0802e,
  ambraScuro: 0x8a5520,
  banda: 0x2a1c12,
  peloTorace: [0xc49455, 0xd8b077, 0xa77a41],
  peloTesta: [0x9c7a4f, 0xb79466, 0x6f5638],
  peloAddome: [0xd9c49a, 0xc9b183],
  polline: 0xe3a136,
};

// ---------- geometrie di base ----------
function ellissoide(sx, sy, sz, seg = 40) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  g.scale(sx, sy, sz);
  return g;
}

function segmento(a, b, r0, r1, mat, piatto = 1) {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r1, r0, d.length(), 12, 1);
  g.scale(piatto, 1, 1);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

// peli: tanti coni sottilissimi, orientati lungo la normale e piegati all'indietro
function peli(punti, colori, materiale) {
  const g = new THREE.ConeGeometry(1, 1, 4, 1, true);
  g.translate(0, 0.5, 0);
  const im = new THREE.InstancedMesh(g, materiale, punti.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color();
  punti.forEach((p, i) => {
    q.setFromUnitVectors(V(0, 1, 0), p.dir);
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
    if (seg <= 2) c.copy(amb).lerp(ambS, seg * 0.25);   // ligustica: tre bande ambrate
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
  x.strokeStyle = 'rgba(60,42,26,1)'; x.lineCap = 'round'; x.lineJoin = 'round';
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
    color: 0xf3ecdc, map: texturaAla(ant), transparent: true, opacity: 1, roughness: 0.25, metalness: 0,
    side: THREE.DoubleSide, depthWrite: false, iridescence: 0.9, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520],
  });
  // membrana leggermente velata dietro le nervature
  const veli = new THREE.MeshPhysicalMaterial({ color: 0xd9d2c0, transparent: true, opacity: 0.38, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 600] });
  const geo = formaAla(L, W, ant), gr = new THREE.Group();
  gr.add(new THREE.Mesh(geo, veli), new THREE.Mesh(geo, m));
  return gr;
}

// ---------- zampe ----------
function zampa(punti, raggi, mat, opzioni = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < punti.length - 1; i++) {
    const piatto = opzioni.piatte && opzioni.piatte.includes(i) ? 1.55 : 1;
    const s = segmento(punti[i], punti[i + 1], raggi[i], raggi[i + 1] * (opzioni.allarga && opzioni.allarga.includes(i) ? 1.35 : 1), mat, piatto);
    g.add(s);
    const j = new THREE.Mesh(new THREE.SphereGeometry(raggi[i + 1] * 1.05, 12, 10), mat);
    j.position.copy(punti[i + 1]); g.add(j);
  }
  // tarsi finali: cinque piccoli segmenti e due unghie
  const a = punti[punti.length - 2], b = punti[punti.length - 1], d = new THREE.Vector3().subVectors(b, a).normalize();
  let p = b.clone();
  for (let k = 0; k < 4; k++) { const q = p.clone().addScaledVector(d, 0.07).add(V(0, -0.012, 0)); g.add(segmento(p, q, 0.017, 0.015, mat)); p = q; }
  g.add(segmento(p, p.clone().add(V(d.x * .04, -.05, .025)), 0.008, 0.003, mat), segmento(p, p.clone().add(V(d.x * .04, -.05, -.025)), 0.008, 0.003, mat));
  return g;
}

// ---------- l'ape ----------
export function costruisciApe() {
  const rand = rng(20260708);
  const ape = new THREE.Group();
  const cut = new THREE.MeshPhysicalMaterial({ color: COL.cuticola, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(0x6b5236), sheenRoughness: 0.6 });
  const legMat = new THREE.MeshPhysicalMaterial({ color: COL.zampe, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.45 });
  const peloMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  const corpo = [];   // mesh usate per capire se un punto è nascosto

  // torace
  const TC = V(0.45, 0.05, 0), TS = V(0.55, 0.5, 0.48);
  const torace = new THREE.Mesh(ellissoide(TS.x, TS.y, TS.z), cut); torace.position.copy(TC); ape.add(torace); corpo.push(torace);
  // scutello, la piccola gobba dietro il torace
  const scut = new THREE.Mesh(ellissoide(0.17, 0.1, 0.26), cut); scut.position.set(0.0, 0.36, 0); ape.add(scut);
  ape.add(peli(puntiSuEllissoide(500, V(0.0, 0.36, 0), V(0.17, 0.1, 0.26), 0.07, d => d.y > -0.2, rand, 0.4), COL.peloTorace, peloMat));
  ape.add(peli(puntiSuEllissoide(7000, TC, TS.clone().multiplyScalar(0.99), 0.1, null, rand, 0.3), COL.peloTorace, peloMat));

  // peziolo e addome
  const pez = new THREE.Mesh(ellissoide(0.12, 0.1, 0.11, 20), cut); pez.position.set(-0.12, -0.02, 0); ape.add(pez);
  const addomeMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, clearcoat: 0.2, clearcoatRoughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color(0xe0c08a), sheenRoughness: 0.5 });
  const add = new THREE.Mesh(addome(), addomeMat);
  const gAdd = new THREE.Group(); gAdd.position.set(-0.16, -0.02, 0); gAdd.rotation.z = 0.24; ape.add(gAdd);
  add.rotation.z = -Math.PI / 2;   // asse dell'addome lungo -x
  gAdd.add(add); corpo.push(add);
  // peli corti sulle fasce chiare dell'addome
  const pAdd = [];
  for (let i = 0; i < 2600; i++) {
    const fascia = rand() < 0.6, seg = fascia ? 1 + Math.floor(rand() * 4) : Math.floor(rand() * 6), t = (seg + rand() * (fascia ? 0.15 : 0.9)) / ADDOME.N, phi = rand() * Math.PI * 2, r = raggioAddome(t);
    const pos = V(-t * ADDOME.L, Math.cos(phi) * r, Math.sin(phi) * r);
    const dir = V(-0.6, Math.cos(phi), Math.sin(phi)).normalize();
    pAdd.push({ pos, dir, len: fascia ? 0.045 + rand() * 0.03 : 0.02 + rand() * 0.02, r: fascia ? 0.0045 : 0.003, v: rand() });
  }
  const pa = peli(pAdd, COL.peloAddome, peloMat); gAdd.add(pa);
  // pungiglione
  const pung = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.4 }));
  pung.rotation.z = Math.PI / 2; pung.position.set(-ADDOME.L - 0.06, 0, 0); gAdd.add(pung);

  // testa
  const HC = V(1.13, 0.02, 0), HS = V(0.3, 0.42, 0.46);
  const testa = new THREE.Mesh(ellissoide(HS.x, HS.y, HS.z), cut); testa.position.copy(HC); testa.rotation.z = -0.15; ape.add(testa); corpo.push(testa);
  ape.add(peli(puntiSuEllissoide(1400, HC, HS, 0.06, d => d.x < 0.55 && Math.abs(d.z) < 0.55, rand, 0.1), COL.peloTesta, peloMat));
  // occhi composti con la trama degli ommatidi
  const occhioMat = new THREE.MeshPhysicalMaterial({ color: COL.occhio, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: new THREE.Color(0x5a4a3a), normalMap: texturaOmmatidi(), normalScale: new THREE.Vector2(0.6, 0.6) });
  for (const z of [1, -1]) {
    const o = new THREE.Mesh(ellissoide(0.17, 0.33, 0.13, 48), occhioMat);
    o.position.set(1.16, 0.06, 0.37 * z); o.rotation.set(0.12 * z, -0.35 * z, -0.12); ape.add(o); corpo.push(o);
  }
  // ocelli
  for (const [x, y, z] of [[1.1, 0.42, 0], [1.03, 0.39, 0.09], [1.03, 0.39, -0.09]]) {
    const oc = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), occhioMat); oc.position.set(x, y, z); ape.add(oc);
  }
  // clipeo e mandibole
  const clip = new THREE.Mesh(ellissoide(0.08, 0.13, 0.15), cut); clip.position.set(1.38, -0.17, 0); ape.add(clip);
  for (const z of [1, -1]) ape.add(segmento(V(1.38, -0.3, 0.09 * z), V(1.45, -0.42, 0.03 * z), 0.035, 0.018, legMat));
  // antenne: scapo lungo, gomito, flagello segmentato
  const antenne = new THREE.Group();
  for (const z of [1, -1]) {
    const a0 = V(1.4, 0.13, 0.07 * z), gom = V(1.62, 0.44, 0.15 * z);
    antenne.add(segmento(a0, gom, 0.03, 0.026, legMat));
    const fl = new THREE.CatmullRomCurve3([gom, V(1.84, 0.5, 0.24 * z), V(2.02, 0.4, 0.33 * z), V(2.1, 0.22, 0.38 * z)]);
    for (let k = 0; k < 11; k++) {
      const p0 = fl.getPoint(k / 11), p1 = fl.getPoint((k + 0.92) / 11);
      antenne.add(segmento(p0, p1, 0.022, 0.024, legMat));
    }
  }
  ape.add(antenne);
  // ligula: la lingua, ripiegata sotto la testa; si distende a comando
  const ligMat = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.6 });
  const ligula = new THREE.Mesh(new THREE.BufferGeometry(), ligMat); ape.add(ligula);
  const curvaLigula = (k) => new THREE.CatmullRomCurve3([
    V(1.42, -0.4, 0), V(1.37 + 0.45 * k, -0.46 - 0.12 * k, 0), V(1.26 + 0.95 * k, -0.48 - 0.2 * k, 0), V(1.13 + 1.3 * k, -0.43 - 0.35 * k, 0)]);
  const setLigula = (k) => { ligula.geometry.dispose(); ligula.geometry = new THREE.TubeGeometry(curvaLigula(k), 40, 0.022, 8); };
  setLigula(0);

  // ali (lato destro z>0, specchiate a sinistra)
  const ali = [];
  for (const z of [1, -1]) {
    for (const [ant, L, W, y, rot] of [[true, 1.6, 0.52, 0.47, 0.42], [false, 1.12, 0.36, 0.43, 0.62]]) {
      const pivot = new THREE.Group(); pivot.position.set(0.55, y, 0.2 * z);
      const a = ala(L, W, ant); a.rotation.y = Math.PI + rot;   // punta verso dietro e in fuori
      pivot.add(a); pivot.scale.z = z;                           // il lato sinistro è lo specchio del destro
      const alza = ant ? 0.34 : 0.26; pivot.rotation.x = -alza * z; pivot.userData = { z, base: -alza * z, ant };
      ape.add(pivot); ali.push(pivot);
    }
  }

  // zampe
  const zamp = new THREE.Group(); let cestella = null;
  for (const z of [1, -1]) {
    const Z = (p) => V(p[0], p[1] < -0.4 ? -0.4 + (p[1] + 0.4) * 0.68 : p[1], p[2] * z * 0.92);
    zamp.add(zampa([[0.78, -0.3, 0.1], [0.84, -0.5, 0.2], [1.07, -0.62, 0.42], [1.16, -0.95, 0.5], [1.32, -1.12, 0.56]].map(Z), [0.05, 0.046, 0.04, 0.032, 0.025], legMat));
    zamp.add(zampa([[0.45, -0.38, 0.15], [0.45, -0.55, 0.3], [0.5, -0.64, 0.74], [0.44, -1.04, 0.94], [0.34, -1.24, 1.02]].map(Z), [0.052, 0.048, 0.042, 0.034, 0.026], legMat));
    // zampa posteriore: tibia e basitarso larghi, la cestella del polline
    zamp.add(zampa([[0.2, -0.35, 0.15], [0.1, -0.55, 0.32], [-0.2, -0.6, 0.8], [-0.64, -0.98, 0.95], [-0.9, -1.2, 1.0]].map(Z), [0.06, 0.055, 0.05, 0.055, 0.04], legMat, { piatte: [2, 3], allarga: [2] }));
    // pallottola di polline sulla tibia
    const pg = new THREE.IcosahedronGeometry(0.13, 3), pp = pg.attributes.position;
    for (let i = 0; i < pp.count; i++) { const v = V(pp.getX(i), pp.getY(i), pp.getZ(i)); v.multiplyScalar(1 + (rand() - 0.5) * 0.12); pp.setXYZ(i, v.x, v.y, v.z); }
    pg.computeVertexNormals(); pg.scale(1.25, 0.95, 0.85);
    const pol = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ color: COL.polline, roughness: 0.95 }));
    pol.position.set(-0.43, -0.67, 0.92 * z); pol.rotation.z = 0.7; zamp.add(pol);
    if (z > 0) cestella = pol;
  }
  ape.add(zamp);
  // peli sulle zampe
  const pZ = [];
  zamp.traverse(o => { if (o.isMesh && o.geometry.type === 'CylinderGeometry') {
    for (let i = 0; i < 14; i++) {
      const p = V((rand() - .5) * .05, (rand() - .5) * o.geometry.parameters.height, (rand() - .5) * .05).applyMatrix4(o.matrixWorld.clone().compose(o.position, o.quaternion, o.scale));
      pZ.push({ pos: p, dir: V(rand() - .7, -rand(), rand() - .5).normalize(), len: 0.04 + rand() * .04, r: 0.004, v: rand() });
    } } });
  ape.add(peli(pZ, COL.peloTesta, peloMat));

  ape.position.set(-0.15, 0.25, 0);
  return { ape, corpo, ali, setLigula, cestella, punti: {
    occhi: V(1.22, 0.14, 0.56), antenne: V(1.62, 0.44, 0.17), ligula: V(1.42, -0.48, 0.05), peli: V(0.5, 0.62, 0.1),
    ali: V(-0.15, 0.55, 0.6), cestella: V(-0.43, -0.67, 1.06), addome: V(-0.9, 0.2, 0.42), pungiglione: V(-1.72, -0.42, 0) } };
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
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
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
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  contenitore.prepend(renderer.domElement);

  const scena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(3.4, 1.7, 5.6);
  scena.add(new THREE.HemisphereLight(0xfff3dc, 0x5a4a35, 1.1));
  const sole = new THREE.DirectionalLight(0xffe2b0, 2.6); sole.position.set(4, 6, 5); scena.add(sole);
  const contro = new THREE.DirectionalLight(0xbfd4ff, 1.1); contro.position.set(-5, 2, -4); scena.add(contro);
  const basso = new THREE.DirectionalLight(0xffd9a0, 0.5); basso.position.set(0, -5, 3); scena.add(basso);

  const A = costruisciApe(); scena.add(A.ape);
  // ombra morbida a terra
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const cx = cv.getContext('2d');
  const gr = cx.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(40,30,15,0.35)'); gr.addColorStop(1, 'rgba(40,30,15,0)');
  cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  ombra.rotation.x = -Math.PI / 2; ombra.position.set(0, -0.78, 0.1); scena.add(ombra);

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
