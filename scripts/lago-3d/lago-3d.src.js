// Lago 3D (pagina Il lago): il plastico del Lago di Conza in tempo reale, si gira e si avvicina.
// Sorgente: si compila in /js/lago-3d.js con  npx esbuild scripts/lago-3d/lago-3d.src.js --bundle --minify --format=esm --outfile=js/lago-3d.js
// Il terreno (img/lago3d/lago.glb) viene da Blender con luce e ombre già cotte nella texture, quindi è "unlit".
// Alberi e case sono in img/lago3d/lago-istanze.bin: per ogni gruppo x, y, z in Int16 (x e y a passi di 25 cm,
// z = (quota - 250) * 25), poi rotazione e scala in un byte ciascuno. Coordinate Blender, in metri.
import {
  WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, HemisphereLight, Color, Group,
  InstancedMesh, MeshLambertMaterial, Matrix4, Quaternion, Vector3, Euler, IcosahedronGeometry,
  CylinderGeometry, BoxGeometry, BufferGeometry, Float32BufferAttribute, AgXToneMapping, SRGBColorSpace,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const GRUPPI = ['quercia', 'pioppo', 'casa', 'capannone'];
const CONTI = [8500, 900, 900, 45];
const KM = 1 / 1000;

// colori in lineare, presi dai materiali di Blender
const lin = (r, g, b) => new Color().setRGB(r, g, b);
const tinta = (geo, c) => {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new Float32BufferAttribute(a, 3));
  return geo;
};
const sposta = (geo, x, y, z) => { geo.translate(x, y, z); return geo; };
const piatta = (geo) => geo.index ? geo.toNonIndexed() : geo;

function albero(chioma, alta, tronco, colore) {
  const t = tinta(sposta(piatta(new CylinderGeometry(0.4, 0.6, tronco, 5)), 0, tronco / 2, 0), lin(0.18, 0.12, 0.07));
  const c = piatta(new IcosahedronGeometry(1, 0)); c.scale(chioma, alta / 2, chioma);
  sposta(c, 0, tronco + alta / 2 - 1, 0); tinta(c, colore);
  t.deleteAttribute('uv'); c.deleteAttribute('uv');
  return mergeGeometries([t, c]);
}
function tetto(w, d, h0, h) {
  const x = w / 2, z = d / 2, y1 = h0 + h;
  const p = [-x, h0, z, x, h0, z, 0, y1, z,   x, h0, -z, -x, h0, -z, 0, y1, -z,
    -x, h0, -z, -x, h0, z, 0, y1, z,   -x, h0, -z, 0, y1, z, 0, y1, -z,
    x, h0, z, x, h0, -z, 0, y1, -z,   x, h0, z, 0, y1, -z, 0, y1, z];
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(p, 3)); g.computeVertexNormals();
  return g;
}
function casa() {
  const m = tinta(sposta(piatta(new BoxGeometry(11, 7, 8)), 0, 3.5, 0), lin(0.78, 0.74, 0.66));
  const r = tinta(tetto(11.8, 8.8, 7, 3), lin(0.55, 0.25, 0.15));
  m.deleteAttribute('uv');
  return mergeGeometries([m, r]);
}
function capannone() {
  const g = piatta(new BoxGeometry(60, 10, 30)); sposta(g, 0, 5, 0); g.deleteAttribute('uv');
  return tinta(g, lin(0.45, 0.45, 0.44));
}

export function avvia(contenitore, { modello, istanze, onPronta, onAvanzamento } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = AgXToneMapping; renderer.toneMappingExposure = 1.05;
  const tela = renderer.domElement; tela.className = 'arnia3d__tela';
  tela.setAttribute('role', 'img'); tela.setAttribute('aria-label', contenitore.dataset.etichetta || '');
  contenitore.append(tela);

  const scena = new Scene();
  // sole basso da ovest, come nei render di Blender
  const sole = new DirectionalLight(0xffd7a8, 2.6); sole.position.set(-0.911, 0.242, -0.332); scena.add(sole);
  scena.add(new HemisphereLight(0xc9d6ee, 0x6b5a3a, 1.1));

  const mondo = new Group(); mondo.scale.setScalar(KM); scena.add(mondo);

  const cam = new PerspectiveCamera(32, 16 / 10, 0.05, 60);
  const mira = new Vector3(0, 0.58, 0);
  cam.position.set(1.6, 6.0, 8.6);
  const ctl = new OrbitControls(cam, tela);
  ctl.target.copy(mira);
  Object.assign(ctl, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 1.6, maxDistance: 12,
    minPolarAngle: 0.35, maxPolarAngle: 1.32, rotateSpeed: 0.7, zoomSpeed: 0.9 });
  ctl.enableZoom = false;
  ctl.update();

  let serve = true, caricati = 0;
  const fatto = () => { if (++caricati === 2) { serve = true; onPronta && onPronta(); } };

  const misura = () => {
    const w = contenitore.clientWidth, h = contenitore.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = w / h < 1 ? 46 : 32; cam.updateProjectionMatrix(); serve = true;
  };
  new ResizeObserver(misura).observe(contenitore); misura();

  const pesi = [0, 0];
  const avanza = () => onAvanzamento && onAvanzamento(pesi[0] * 0.85 + pesi[1] * 0.15);
  const errore = () => contenitore.classList.add('arnia3d--errore');

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(modello, (g) => {
    g.scene.traverse((o) => { if (o.isMesh && o.material.map) o.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy(); });
    mondo.add(g.scene); fatto();
  }, (e) => { if (e.total) { pesi[0] = e.loaded / e.total; avanza(); } }, errore);

  fetch(istanze).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then((buf) => {
    const forme = { quercia: albero(7, 10, 6, lin(0.10, 0.20, 0.06)), pioppo: albero(3.2, 16, 4, lin(0.22, 0.33, 0.10)), casa: casa(), capannone: capannone() };
    const mat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const m4 = new Matrix4(), q = new Quaternion(), e = new Euler(), p = new Vector3(), s = new Vector3();
    let off = 0;
    GRUPPI.forEach((nome, gi) => {
      const n = CONTI[gi];
      const x = new Int16Array(buf, off, n); off += n * 2;
      const y = new Int16Array(buf, off, n); off += n * 2;
      const z = new Int16Array(buf, off, n); off += n * 2;
      const r = new Uint8Array(buf, off, n); off += n;
      const k = new Uint8Array(buf, off, n); off += n;
      const im = new InstancedMesh(forme[nome], mat, n);
      for (let i = 0; i < n; i++) {
        // da Blender (z in alto) a three.js (y in alto): x, z, -y
        p.set(x[i] * 0.25, z[i] / 25 + 250, -y[i] * 0.25);
        q.setFromEuler(e.set(0, (r[i] / 255) * Math.PI * 2, 0));
        const sc = k[i] / 50; s.set(sc, sc, sc);
        im.setMatrixAt(i, m4.compose(p, q, s));
      }
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
      mondo.add(im);
    });
    pesi[1] = 1; avanza(); fatto();
  }).catch(errore);

  ctl.addEventListener('change', () => { serve = true; });
  ctl.addEventListener('start', () => contenitore.classList.add('arnia3d--toccata'));
  tela.addEventListener('pointerdown', () => { ctl.enableZoom = true; }, { capture: true });

  let visibile = true;
  new IntersectionObserver((v) => { visibile = v[0].isIntersecting; if (!visibile) ctl.enableZoom = false; }).observe(contenitore);

  function ciclo() {
    requestAnimationFrame(ciclo);
    if (!visibile) return;
    const damp = ctl.update();
    if (damp || serve) { renderer.render(scena, cam); serve = false; }
  }
  requestAnimationFrame(ciclo);
  return { _scena: scena, _cam: cam };
}
