// Arnia 3D (pagina Le api): l'arnia Dadant-Blatt in tempo reale, si gira, si avvicina e si apre pezzo per pezzo.
// Sorgente: si compila in /js/arnia-3d.js con  npx esbuild scripts/arnia-3d/arnia-3d.src.js --bundle --minify --format=esm --outfile=js/arnia-3d.js
// Il modello (img/arnia3d/arnia.glb) viene da Blender: un nodo vuoto per ogni pezzo (g-tetto, g-coprifavo, g-melario, g-nido, g-fondo),
// i telaini dentro i rispettivi gruppi; i due telaini 'protagonisti' (telaino-n5, telaino-m5) hanno il favo cella per cella.
import {
  WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, DirectionalLight, Mesh, PlaneGeometry, ShadowMaterial,
  Vector3, Raycaster, Vector2, AgXToneMapping, SRGBColorSpace, PCFSoftShadowMap, DoubleSide, Box3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// per ogni scelta: quanto si sollevano (y) e si spostano indietro (z) i pezzi, e da dove si guarda.
// Le misure sono in metri: l'arnia chiusa è alta 0,745 m.
const VIA = { tetto: [0.62, -0.55], coprifavo: [0.46, -0.5], melario: [0.30, -0.5], nido: [0.30, -0.5] };
// per i telaini i pezzi sopra si tolgono del tutto, così il favo si vede da solo
const LONTANO = { tetto: [1.4, -1.6], coprifavo: [1.2, -1.6], melario: [1.0, -1.6] };
const STATI = {
  chiusa: { pezzi: {}, cam: [1.15, 0.95, 1.75], mira: [0, 0.36, 0] },
  tetto: { pezzi: { tetto: [0.16, 0] }, cam: [0.9, 1.25, 1.35], mira: [0, 0.78, 0] },
  coprifavo: { pezzi: { tetto: VIA.tetto }, cam: [0.75, 1.25, 1.05], mira: [0, 0.6, 0] },
  melario: { pezzi: { tetto: VIA.tetto, coprifavo: VIA.coprifavo }, cam: [1.05, 1.3, 1.45], mira: [0, 0.48, -0.1], favo: ['m'] },
  'telaino-melario': { pezzi: { tetto: LONTANO.tetto, coprifavo: LONTANO.coprifavo, 'telaino-m5': [0.24, 0] }, cam: [0.45, 0.85, 0.95], mira: [0, 0.72, 0.02], favo: ['m'] },
  nido: { pezzi: { tetto: VIA.tetto, coprifavo: VIA.coprifavo, melario: VIA.melario }, cam: [1.0, 1.15, 1.4], mira: [0, 0.4, -0.12], favo: ['n'] },
  'telaino-nido': { pezzi: { tetto: LONTANO.tetto, coprifavo: LONTANO.coprifavo, melario: LONTANO.melario, 'telaino-n5': [0.36, 0] }, cam: [0.42, 0.62, 1.02], mira: [0, 0.6, 0.02], favo: ['n'] },
  porticina: { pezzi: {}, cam: [0.32, 0.2, 0.78], mira: [0.05, 0.06, 0.2] },
  fondo: { pezzi: { tetto: VIA.tetto, coprifavo: VIA.coprifavo, melario: VIA.melario, nido: [0.34, -0.5] }, cam: [0.7, 0.75, 0.85], mira: [0, 0.05, 0] },
  cassettino: { pezzi: { cassettino: [0, -0.26] }, cam: [-0.75, 0.42, -0.95], mira: [0, 0.05, -0.3] },
};
const MOBILI = ['tetto', 'coprifavo', 'melario', 'nido', 'fondo', 'telaino-n5', 'telaino-m5', 'cassettino'];
// toccando un pezzo nella scena si sceglie la voce corrispondente
const DA_NODO = { 'g-tetto': 'tetto', 'g-coprifavo': 'coprifavo', 'g-melario': 'melario', 'g-nido': 'nido', 'g-fondo': 'fondo',
  'telaino-n5': 'telaino-nido', 'telaino-m5': 'telaino-melario', porticina: 'porticina', cassettino: 'cassettino' };

export function avvia(contenitore, { modello, onSeleziona, onPronta, onAvanzamento } = {}) {
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = AgXToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
  const tela = renderer.domElement; tela.className = 'arnia3d__tela';
  tela.setAttribute('role', 'img'); tela.setAttribute('aria-label', contenitore.dataset.etichetta || '');
  contenitore.append(tela);

  const scena = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.75;
  const sole = new DirectionalLight(0xfff4e6, 2.4); sole.position.set(1.4, 2.2, 2.0);
  sole.castShadow = true; sole.shadow.mapSize.set(2048, 2048);
  Object.assign(sole.shadow.camera, { left: -1.1, right: 1.1, top: 1.1, bottom: -1.1, near: 0.5, far: 6 });
  sole.shadow.bias = -0.0004; sole.shadow.normalBias = 0.01; sole.shadow.radius = 4;
  scena.add(sole);
  const pav = new Mesh(new PlaneGeometry(6, 6), new ShadowMaterial({ opacity: 0.22 }));
  pav.rotation.x = -Math.PI / 2; pav.receiveShadow = true; scena.add(pav);

  const cam = new PerspectiveCamera(30, 4 / 3, 0.02, 20);
  cam.position.set(...STATI.chiusa.cam);
  const ctl = new OrbitControls(cam, tela);
  ctl.target.set(...STATI.chiusa.mira);
  Object.assign(ctl, { enableDamping: true, dampingFactor: 0.09, enablePan: false, minDistance: 0.25, maxDistance: 3.4,
    maxPolarAngle: Math.PI * 0.53, rotateSpeed: 0.8, zoomSpeed: 0.9 });
  ctl.update();

  let nodi = {}, base = {}, pronto = false, attuale = 'chiusa';
  const corrente = {}, obiettivo = {};     // spostamenti [y, z] dei pezzi
  let volo = null;                         // animazione della camera
  let serve = true;

  const misura = () => {
    const w = contenitore.clientWidth, h = contenitore.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    // su schermi stretti la camera si allontana un po', così l'arnia resta tutta dentro
    cam.fov = w / h < 1 ? 38 : 30; cam.updateProjectionMatrix(); serve = true;
  };
  new ResizeObserver(misura).observe(contenitore); misura();

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(modello, (g) => {
    const radice = g.scene;
    radice.traverse((o) => {
      if (o.name) nodi[o.name] = o;
      if (!o.isMesh) return;
      const m = o.material;
      o.castShadow = !o.name.includes('-favo'); o.receiveShadow = true;
      if (m.name === 'rete') { m.transparent = false; m.alphaTest = 0.5; m.side = DoubleSide; }
      if (m.name === 'miele') { m.roughness = 0.12; m.clearcoat = 1; m.clearcoatRoughness = 0.05; }
      if (m.name === 'larva') { m.roughness = 0.3; }
    });
    for (const n of ['tetto', 'coprifavo', 'melario', 'nido', 'fondo']) nodi[n] = nodi['g-' + n];
    for (const k of MOBILI) if (nodi[k]) base[k] = nodi[k].position.clone();
    scena.add(radice);
    favi();
    pronto = true; serve = true;
    onPronta && onPronta();
  }, (e) => { if (e.total && onAvanzamento) onAvanzamento(e.loaded / e.total); }, () => {
    contenitore.classList.add('arnia3d--errore');
  });

  // i favi cella per cella si disegnano solo quando il loro telaino si vede: risparmia lavoro al telefono
  function favi() {
    const vedi = STATI[attuale].favo || [];
    for (const [k, nome] of [['n', 'telaino-n5'], ['m', 'telaino-m5']]) {
      const t = nodi[nome]; if (!t) continue;
      t.traverse((o) => { if (o !== t && o.name.includes('-favo')) o.visible = vedi.includes(k); });
    }
  }

  function seleziona(parte) {
    if (!STATI[parte]) parte = 'chiusa';
    attuale = parte;
    const s = STATI[parte];
    for (const k of MOBILI) if (nodi[k]) obiettivo[k] = s.pezzi[k] || [0, 0];
    favi();
    const da = { p: cam.position.clone(), m: ctl.target.clone() };
    const a = { p: new Vector3(...s.cam), m: new Vector3(...s.mira) };
    if (cam.aspect < 1) a.p.sub(a.m).multiplyScalar(1.22).add(a.m);
    volo = { da, a, t0: performance.now(), dur: ridotto ? 1 : 1100 };
    serve = true;
  }

  // toccare un pezzo lo sceglie (un tocco, non un trascinamento)
  const ray = new Raycaster(), pt = new Vector2(); let giu = null;
  tela.addEventListener('pointerdown', (e) => { giu = [e.clientX, e.clientY]; });
  tela.addEventListener('pointerup', (e) => {
    if (!pronto || !giu || Math.hypot(e.clientX - giu[0], e.clientY - giu[1]) > 6) return;
    const r = tela.getBoundingClientRect();
    pt.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pt, cam);
    const hit = ray.intersectObjects(scena.children, true).find((h) => h.object !== pav && h.object.visible);
    if (!hit) return;
    let o = hit.object, scelta = null;
    while (o && !scelta) { scelta = DA_NODO[o.name]; o = o.parent; }
    if (scelta) { seleziona(scelta); onSeleziona && onSeleziona(scelta); }
  });
  ctl.addEventListener('change', () => { serve = true; });
  ctl.addEventListener('start', () => { volo = null; contenitore.classList.add('arnia3d--toccata'); });

  const liscia = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  let visibile = true;
  new IntersectionObserver((v) => { visibile = v[0].isIntersecting; }).observe(contenitore);

  let prima = 0;
  function ciclo(t) {
    requestAnimationFrame(ciclo);
    const dt = Math.min(0.1, (t - (prima || t)) / 1000); prima = t;
    if (!visibile) return;
    let muove = false;
    if (pronto) {
      // avvicinamento esponenziale legato al tempo: stessa durata anche su un telefono lento
      const f = ridotto ? 1 : 1 - Math.exp(-dt * 6.5);
      for (const k of Object.keys(obiettivo)) {
        const c = corrente[k] || (corrente[k] = [0, 0]), o = obiettivo[k];
        for (const i of [0, 1]) {
          const d = o[i] - c[i];
          if (Math.abs(d) > 1e-4) { c[i] += d * f; muove = true; } else c[i] = o[i];
        }
        nodi[k].position.set(base[k].x, base[k].y + c[0], base[k].z + c[1]);
      }
    }
    if (volo) {
      const x = Math.min(1, (t - volo.t0) / volo.dur), e = liscia(x);
      cam.position.lerpVectors(volo.da.p, volo.a.p, e); ctl.target.lerpVectors(volo.da.m, volo.a.m, e);
      if (x >= 1) volo = null; muove = true;
    }
    const damp = ctl.update();
    if (muove || damp || serve) { renderer.render(scena, cam); serve = false; }
  }
  requestAnimationFrame(ciclo);

  return { seleziona, _nodi: nodi };
}
