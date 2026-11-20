// Lago 3D (pagina Il lago): il plastico del Lago di Conza in tempo reale, si gira e si avvicina.
// Sorgente: si compila in /js/lago-3d.js con  npx esbuild scripts/lago-3d/lago-3d.src.js --bundle --minify --format=esm --outfile=js/lago-3d.js
// Il terreno (img/lago3d/lago.glb) viene da Blender con luce e ombre già cotte nella texture, quindi è "unlit".
// Alberi e case sono in img/lago3d/lago-istanze.bin: per ogni gruppo x, y, z in Int16 (x e y a passi di 25 cm,
// z = (quota - 250) * 25), poi rotazione e scala in un byte ciascuno. Coordinate Blender, in metri.
import {
  WebGLRenderer, Scene, PerspectiveCamera, DirectionalLight, HemisphereLight, Color, Group,
  InstancedMesh, MeshLambertMaterial, Matrix4, Quaternion, Vector3, Euler, IcosahedronGeometry,
  CylinderGeometry, BoxGeometry, BufferGeometry, Float32BufferAttribute, AgXToneMapping, SRGBColorSpace,
  TextureLoader, NoColorSpace, Raycaster, Vector2,
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

// Fioriture: img/lago3d/fioriture.webp ha la stessa UV del terreno. R = sulla, G = acacia, B = millefiori.
// Le zone di sulla e acacia sono quelle segnate da noi sulla mappa, incrociate con la copertura del suolo (ESA WorldCover).
function fiori(mat, tex, peso) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uFior = { value: tex }; sh.uniforms.uPeso = peso;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uFior; uniform vec3 uPeso;
float hfi(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  vec3 f = texture2D(uFior, vMapUv).rgb;
  vec2 cel = floor(vMapUv * 3072.0);
  float n = hfi(cel), m = hfi(cel + 17.3);
  float punti = smoothstep(0.45, 0.95, n);
  // da lontano conta il colore d'insieme, da vicino i singoli fiori
  vec3 cS = vec3(0.62, 0.0, 0.16), cA = vec3(1.0, 0.98, 0.86), cM0 = vec3(0.86, 0.70, 0.22);
  vec3 cM = m < 0.4 ? vec3(0.95, 0.80, 0.15) : (m < 0.7 ? vec3(0.92, 0.92, 0.90) : vec3(0.55, 0.30, 0.70));
  diffuseColor.rgb = mix(diffuseColor.rgb, cM0, f.b * uPeso.z * 0.32);
  diffuseColor.rgb = mix(diffuseColor.rgb, cM, f.b * uPeso.z * punti * 0.6);
  diffuseColor.rgb = mix(diffuseColor.rgb, cA, f.g * uPeso.y * (0.7 + 0.3 * punti));
  diffuseColor.rgb = mix(diffuseColor.rgb, cS, f.r * uPeso.x * (0.55 + 0.35 * punti));
}`);
  };
  mat.needsUpdate = true;
}

export function avvia(contenitore, { modello, istanze, fioriture, onPronta, onAvanzamento, onTocco, onInterazione } = {}) {
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

  let serve = true, caricati = 0, terreno = null;
  const uPeso = { value: new Vector3(0, 0, 0) }, pesoMeta = new Vector3(0, 0, 0);
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
    g.scene.traverse((o) => {
      if (!o.isMesh || !o.material.map) return;
      terreno = o;
      o.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (fioriture) {
        const t = new TextureLoader().load(fioriture, () => { serve = true; });
        t.flipY = false; t.colorSpace = NoColorSpace;
        fiori(o.material, t, uPeso);
      }
    });
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
  ctl.addEventListener('start', () => { contenitore.classList.add('arnia3d--toccata'); onInterazione && onInterazione(); });
  tela.addEventListener('pointerdown', () => { ctl.enableZoom = true; }, { capture: true });

  let visibile = true;
  new IntersectionObserver((v) => { visibile = v[0].isIntersecting; if (!visibile) ctl.enableZoom = false; }).observe(contenitore);

  let prima = 0;
  function ciclo(t) {
    requestAnimationFrame(ciclo);
    const dt = Math.min(0.5, ((t || 0) - (prima || t || 0)) / 1000); prima = t;
    if (!visibile) return;
    const damp = ctl.update();
    // passaggio morbido tra un mese e l'altro
    const d = pesoMeta.clone().sub(uPeso.value);
    if (d.lengthSq() > 1e-5) { uPeso.value.addScaledVector(d, 1 - Math.exp(-dt * 5)); serve = true; } else uPeso.value.copy(pesoMeta);
    if (damp || serve) { renderer.render(scena, cam); serve = false; }
  }
  requestAnimationFrame(ciclo);
  // tocco (non trascinamento) sul terreno: restituisce le coordinate UV del punto, per leggere la mappa delle fioriture
  const ray = new Raycaster(), ndc = new Vector2();
  let giu = null;
  tela.addEventListener('pointerdown', (e) => { giu = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  tela.addEventListener('pointerup', (e) => {
    if (!giu || !terreno || !onTocco) return;
    const mosso = Math.hypot(e.clientX - giu.x, e.clientY - giu.y), lungo = performance.now() - giu.t; giu = null;
    if (mosso > 8 || lungo > 500) return;
    const r = tela.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObject(terreno, false)[0];
    onTocco(hit && hit.uv ? { u: hit.uv.x, v: hit.uv.y, x: e.clientX - r.left, y: e.clientY - r.top } : null);
  });

  // pesi delle fioriture: [sulla, acacia, millefiori] da 0 a 1
  const mese = (p) => { pesoMeta.set(p[0], p[1], p[2]); serve = true; };
  return { mese, _scena: scena, _cam: cam };
}
