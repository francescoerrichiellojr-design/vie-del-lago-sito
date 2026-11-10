// Ape operaia in 3D: giro a 360° fatto di fotogrammi renderizzati in Blender.
// Si trascina per ruotarla; i punti numerati seguono le parti fotogramma per fotogramma.
const NF = 72, CARTELLA = '/img/ape3d/giro/';

export function avvia(contenitore, { onSeleziona } = {}) {
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cnv = document.createElement('canvas');
  cnv.setAttribute('role', 'img');
  cnv.setAttribute('aria-label', contenitore.querySelector('.ape3d__statica')?.alt || '');
  cnv.style.touchAction = 'pan-y';          // in verticale la pagina scorre, in orizzontale l'ape gira
  contenitore.prepend(cnv);
  const ctx = cnv.getContext('2d');
  const foto = new Array(NF).fill(null);
  // sui telefoni basta la serie da 640 px (circa 1,6 MB), sugli schermi grandi quella da 960 (circa 2,7 MB)
  const piccola = contenitore.clientWidth * Math.min(devicePixelRatio || 1, 2) <= 700;
  const nome = i => `${CARTELLA}${piccola ? 's/' : ''}giro-${String(i).padStart(2, '0')}.webp`;
  let punti = null, ang = 0, vel = ridotto ? 0 : 3.2, auto = !ridotto, toccata = false, volo = null;

  // caricamento progressivo: prima un fotogramma ogni 6, poi ogni 2, poi tutti
  const ordine = [];
  for (const passo of [6, 2, 1]) for (let i = 0; i < NF; i += passo) if (!ordine.includes(i)) ordine.push(i);
  let prossimo = 0;
  function carica() {
    if (prossimo >= ordine.length) return;
    const i = ordine[prossimo++], im = new Image();
    im.decoding = 'async';
    im.onload = () => { foto[i] = im; if (i === 0) pronta(); carica(); };
    im.onerror = carica;
    im.src = nome(i);
  }
  for (let k = 0; k < 3; k++) carica();
  fetch(CARTELLA + 'punti.json').then(r => r.json()).then(d => { punti = d; }).catch(() => {});

  const vicino = (i, dir) => {       // il fotogramma caricato più vicino in quella direzione
    for (let k = 0; k < NF; k++) { const j = ((i + dir * k) % NF + NF) % NF; if (foto[j]) return j; }
    return -1;
  };

  let W = 0, H = 0, R = { x: 0, y: 0, w: 0, h: 0 };
  function ridimensiona() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = contenitore.clientWidth; H = contenitore.clientHeight;
    cnv.width = Math.round(W * dpr); cnv.height = Math.round(H * dpr);
    cnv.style.width = W + 'px'; cnv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = Math.min(W / 4, H / 3);  // i fotogrammi sono 4:3, adattati senza tagliare
    R = { w: 4 * s, h: 3 * s, x: (W - 4 * s) / 2, y: (H - 3 * s) / 2 };
    disegna();
  }

  const bottoni = [...contenitore.querySelectorAll('[data-parte]')];
  function disegna() {
    if (!W) return;
    const f = ((ang % NF) + NF) % NF, i0 = Math.floor(f), t = f - i0, i1 = (i0 + 1) % NF;
    const a = foto[i0] ? i0 : vicino(i0, t < 0.5 ? -1 : 1);
    ctx.clearRect(0, 0, W, H);
    if (a < 0) return;
    ctx.globalAlpha = 1; ctx.drawImage(foto[a], R.x, R.y, R.w, R.h);
    if (a === i0 && foto[i1] && t > 0.02) { ctx.globalAlpha = t; ctx.drawImage(foto[i1], R.x, R.y, R.w, R.h); ctx.globalAlpha = 1; }
    if (!punti) return;
    for (const b of bottoni) {
      const p0 = punti[i0][b.dataset.parte], p1 = punti[i1][b.dataset.parte];
      const p = p0 && p1 ? [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t] : (t < 0.5 ? p0 : p1);
      if (p) { b._p = p; b.classList.remove('nascosto'); } else b.classList.add('nascosto');
      if (b._p) b.style.transform = `translate(${R.x + b._p[0] * R.w}px, ${R.y + b._p[1] * R.h}px) translate(-50%,-50%)`;
      b.style.visibility = b._p ? '' : 'hidden';
    }
  }

  // trascinamento con un po' di inerzia
  let giu = null;
  cnv.addEventListener('pointerdown', e => { giu = { x: e.clientX, a: ang, t: performance.now(), v: 0 }; auto = false; volo = null; vel = 0; });
  addEventListener('pointermove', e => {
    if (!giu) return;
    const nuovo = giu.a - (e.clientX - giu.x) / Math.max(W, 1) * NF * 0.85, now = performance.now();
    giu.v = (nuovo - ang) / Math.max(1, now - giu.t) * 1000; giu.t = now; ang = nuovo;
    if (!toccata) { toccata = true; contenitore.classList.add('ape3d--toccata'); }
    disegna();
  });
  const lascia = () => { if (giu) { vel = ridotto ? 0 : Math.max(-60, Math.min(60, giu.v)); giu = null; } };
  addEventListener('pointerup', lascia); addEventListener('pointercancel', lascia);
  cnv.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { auto = false; volo = null; ang += e.key === 'ArrowLeft' ? 2 : -2; disegna(); e.preventDefault(); }
  });
  cnv.tabIndex = 0;

  // scegliendo una parte l'ape gira, per la via più breve, fino a un fotogramma in cui la parte si vede bene
  function seleziona(parte) {
    bottoni.forEach(b => b.setAttribute('aria-pressed', b.dataset.parte === parte ? 'true' : 'false'));
    auto = false; vel = 0;
    if (punti) {
      const cur = ((ang % NF) + NF) % NF;
      let meta = null, dmin = Infinity;
      punti.forEach((fr, i) => {
        const p = fr[parte]; if (!p || p[0] < 0.22 || p[0] > 0.78) return;
        let d = i - cur; d -= Math.round(d / NF) * NF;
        if (Math.abs(d) < dmin) { dmin = Math.abs(d); meta = ang + d; }
      });
      if (meta !== null && dmin > 0.3) volo = { da: ang, a: meta, t: 0 };
    }
    onSeleziona && onSeleziona(parte);
  }
  bottoni.forEach(b => b.addEventListener('click', () => seleziona(b.dataset.parte)));

  let visibile = true, t0 = performance.now(), gira = false;
  function loop(now) {
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    let mosso = false;
    if (volo) {
      volo.t = Math.min(1, volo.t + dt * 1.6); const k = volo.t * volo.t * (3 - 2 * volo.t);
      ang = volo.da + (volo.a - volo.da) * k; mosso = true; if (volo.t >= 1) volo = null;
    } else if (!giu && auto) { ang += 3.2 * dt; mosso = true; }
    else if (!giu && Math.abs(vel) > 0.05) { ang += vel * dt; vel *= Math.pow(0.04, dt); mosso = true; }
    if (mosso) disegna();
    if (visibile) requestAnimationFrame(loop); else gira = false;
  }
  function avviaLoop() { if (!gira) { gira = true; t0 = performance.now(); requestAnimationFrame(loop); } }
  new IntersectionObserver(([e]) => { visibile = e.isIntersecting; if (visibile) avviaLoop(); }).observe(contenitore);
  new ResizeObserver(ridimensiona).observe(contenitore);

  function pronta() { ridimensiona(); contenitore.classList.add('ape3d--pronta'); avviaLoop(); }
  return { seleziona };
}
