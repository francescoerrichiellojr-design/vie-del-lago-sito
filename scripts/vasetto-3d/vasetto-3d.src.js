// Vasetto 3D (pagine dei mieli): il vasetto da 500 g in tempo reale, gira da solo e si gira col dito.
// Sorgente: si compila in /js/vasetto-3d.js con  npx esbuild scripts/vasetto-3d/vasetto-3d.src.js --bundle --minify --format=esm --outfile=js/vasetto-3d.js
// Il modello (img/vasetto3d/vasetto.glb) viene da Blender, sulle misure del vasetto vero: Ø 77,9 mm, 91 mm senza tappo.
// Pezzi: Vetro, Miele, Etichetta, Fascetta, TappoLato, TappoTop. L'etichetta è la stessa stampata (img/etichetta-<miele>-flat.webp).
import {
  WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, DirectionalLight, Mesh, PlaneGeometry, ShadowMaterial,
  MeshPhysicalMaterial, MeshStandardMaterial, TextureLoader, Color, Vector2, NeutralToneMapping, SRGBColorSpace,
  NoColorSpace, RepeatWrapping, PCFSoftShadowMap, BackSide, FrontSide,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// colore del miele visto attraverso il vetro (lineare) e quanto in fretta si scurisce nello spessore
const MIELI = {
  sulla: { colore: [1.0, 0.66, 0.10], assorbe: [1.0, 0.72, 0.18], distanza: 0.09 },
  acacia: { colore: [1.0, 0.76, 0.16], assorbe: [1.0, 0.82, 0.26], distanza: 0.14 },
  millefiori: { colore: [0.74, 0.24, 0.04], assorbe: [0.68, 0.20, 0.03], distanza: 0.025 },
};

export function avvia(contenitore, { modello, etichetta, fascetta, esagoni, miele = 'sulla', onPronta } = {}) {
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
  const tela = renderer.domElement; tela.className = 'vasetto3d__tela';
  Object.assign(tela.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', outline: 'none',
    cursor: 'grab', touchAction: 'pan-y', opacity: '0', transition: 'opacity .6s' });
  tela.setAttribute('role', 'img'); tela.setAttribute('aria-label', contenitore.dataset.etichetta || '');
  contenitore.append(tela);

  const scena = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.7;
  const sole = new DirectionalLight(0xfff1dc, 2.2); sole.position.set(0.25, 0.45, 0.35);
  sole.castShadow = true; sole.shadow.mapSize.set(1024, 1024);
  Object.assign(sole.shadow.camera, { left: -0.12, right: 0.12, top: 0.12, bottom: -0.12, near: 0.1, far: 1.2 });
  sole.shadow.bias = -0.0005; sole.shadow.radius = 5;
  scena.add(sole);
  const pav = new Mesh(new PlaneGeometry(0.6, 0.6), new ShadowMaterial({ opacity: 0.2 }));
  pav.rotation.x = -Math.PI / 2; pav.position.y = -0.0003; pav.receiveShadow = true; scena.add(pav);

  const cam = new PerspectiveCamera(26, 4 / 5, 0.01, 3);
  cam.position.set(0, 0.075, 0.34);
  const ctl = new OrbitControls(cam, tela);
  ctl.target.set(0, 0.05, 0);
  Object.assign(ctl, { enableDamping: true, dampingFactor: 0.08, enablePan: false, enableZoom: false,
    minPolarAngle: 0.55, maxPolarAngle: 1.62, rotateSpeed: 0.8, autoRotate: !ridotto, autoRotateSpeed: 1.6 });
  ctl.update();

  const misura = () => {
    const w = contenitore.clientWidth, h = contenitore.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  };
  new ResizeObserver(misura).observe(contenitore); misura();

  const tl = new TextureLoader();
  const tex = (url, srgb) => {
    const t = tl.load(url); t.flipY = false; t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
  };
  const tEtichetta = tex(etichetta, true), tFascetta = tex(fascetta, true), tEsagoni = tex(esagoni, false);
  tEsagoni.wrapS = tEsagoni.wrapT = RepeatWrapping;
  const m = MIELI[miele] || MIELI.sulla;

  const carta = new MeshStandardMaterial({ color: 0xf3efe4, roughness: 0.9, side: BackSide });
  const mat = {
    Vetro: new MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.16,
      depthWrite: false, normalMap: tEsagoni, normalScale: new Vector2(1.4, 1.4), clearcoat: 1, clearcoatRoughness: 0.03,
      envMapIntensity: 1.6, side: FrontSide }),
    Miele: new MeshPhysicalMaterial({ color: new Color(...m.colore), roughness: 0.12, metalness: 0, transmission: 0.85,
      thickness: 0.07, ior: 1.49, attenuationColor: new Color(...m.assorbe), attenuationDistance: m.distanza }),
    Etichetta: new MeshStandardMaterial({ map: tEtichetta, roughness: 0.82 }),
    Fascetta: new MeshStandardMaterial({ map: tFascetta, roughness: 0.85 }),
    TappoLato: new MeshStandardMaterial({ color: new Color(0.62, 0.42, 0.13), metalness: 1, roughness: 0.32 }),
    TappoTop: new MeshStandardMaterial({ color: new Color(0.62, 0.42, 0.13), metalness: 1, roughness: 0.3,
      normalMap: tEsagoni, normalScale: new Vector2(1.2, 1.2) }),
  };

  let pronto = false;
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(modello, (g) => {
    const extra = [];
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      const nome = Object.keys(mat).find((k) => (o.material.name || o.name).startsWith(k));
      if (!nome) return;
      o.material = mat[nome];
      o.castShadow = nome !== 'Vetro'; o.receiveShadow = nome.startsWith('Tappo') || nome === 'Etichetta';
      if (nome === 'Vetro') o.renderOrder = 2;
      // il retro di etichetta e fascetta, visto attraverso il vetro, è carta bianca
      if (nome === 'Etichetta' || nome === 'Fascetta') { const r = new Mesh(o.geometry, carta); extra.push([o, r]); }
    });
    for (const [o, r] of extra) o.add(r);
    scena.add(g.scene);
    pronto = true;
    // la foto resta finché il primo fotogramma non è pronto, poi lascia il posto al 3D
    requestAnimationFrame(() => requestAnimationFrame(() => { tela.style.opacity = '1'; onPronta && onPronta(); }));
  }, undefined, () => contenitore.classList.add('vasetto3d--errore'));

  ctl.addEventListener('start', () => { ctl.autoRotate = false; contenitore.classList.add('vasetto3d--toccato'); });

  let visibile = true;
  new IntersectionObserver((v) => { visibile = v[0].isIntersecting; }).observe(contenitore);
  function ciclo() {
    requestAnimationFrame(ciclo);
    if (!visibile || !pronto) return;
    ctl.update();
    renderer.render(scena, cam);
  }
  requestAnimationFrame(ciclo);
}
