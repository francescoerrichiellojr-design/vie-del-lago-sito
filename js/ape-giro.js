// Ape operaia in 3D: giro a 360° renderizzato in Blender e montato in un video.
// A riposo il video scorre da solo, decodificato dal telefono o dal computer al ritmo dello
// schermo (per questo è fluido); trascinando, si salta al fotogramma sotto il dito.
// I punti numerati seguono le parti fotogramma per fotogramma (posizioni in punti.json).
const CARTELLA = '/img/ape3d/giro/';
const VER = '?v=20261112';   // cambia a ogni nuovo render: video e punti devono arrivare insieme

export function avvia(contenitore, { onSeleziona } = {}) {
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // video da 960 px quasi ovunque (anche sui telefoni, che hanno schermi molto densi); quello da 640 px
  // solo su schermi piccoli e poco densi, o se chi visita ha chiesto di risparmiare dati
  const rete = navigator.connection || {};
  const piccola = contenitore.clientWidth * Math.min(devicePixelRatio || 1, 2) <= 520 || rete.saveData === true || /(^|-)2g$/.test(rete.effectiveType || '');
  const base = CARTELLA + (piccola ? 'ape-p' : 'ape');

  const v = document.createElement('video');
  v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('disableremoteplayback', '');
  v.disablePictureInPicture = true;
  v.setAttribute('role', 'img');
  v.setAttribute('aria-label', contenitore.querySelector('.ape3d__statica')?.alt || '');
  v.tabIndex = 0;
  for (const [est, tipo] of [['mp4', 'video/mp4; codecs="avc1.64001f"'], ['webm', 'video/webm; codecs="vp9"']]) {
    const s = document.createElement('source'); s.src = `${base}.${est}${VER}`; s.type = tipo; v.append(s);
  }
  contenitore.prepend(v);

  let punti = null, FPS = 30, NF = 0;
  let auto = !ridotto;          // gira da sola finché non la si tocca
  let visibile = false, pronto = false, toccata = false, volo = null, giu = null;
  let richiesto = null, inviato = null;   // fotogramma chiesto col dito / ultimo salto mandato al video
  let mostrato = 0;                        // fotogramma che il video sta davvero mostrando

  const norma = i => ((Math.round(i) % NF) + NF) % NF;

  // il fotogramma mostrato: quando il browser lo sa dire con precisione (requestVideoFrameCallback)
  // lo prendo da lì, così i punti restano incollati all'immagine; altrimenti dal tempo del video
  const preciso = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  if (preciso) {
    const suFotogramma = (_, meta) => { mostrato = norma(meta.mediaTime * FPS); v.requestVideoFrameCallback(suFotogramma); };
    v.requestVideoFrameCallback(suFotogramma);
  }
  const fotogramma = () => (preciso ? mostrato : norma(Math.floor(v.currentTime * FPS + 0.01)));

  // salto a un fotogramma: se il video sta ancora eseguendo il salto precedente aspetto che finisca
  // e mando solo l'ultimo richiesto, così non si accumulano
  const salta = i => { inviato = i; v.currentTime = (i + 0.5) / FPS; };
  function vai(x) {
    if (!NF) return;
    const i = norma(x);
    if (i === richiesto) return;
    richiesto = i;
    if (!v.seeking) salta(i);
  }
  v.addEventListener('seeked', () => { if (richiesto !== null && richiesto !== inviato) salta(richiesto); });

  function gira() {
    if (!auto || !visibile || !pronto || giu || volo) return;
    richiesto = inviato = null;
    const p = v.play(); if (p) p.catch(() => {});      // se il telefono blocca l'avvio automatico resta ferma: si può trascinare
  }
  function ferma() { auto = false; if (!v.paused) v.pause(); }

  // posizione dei punti numerati sul fotogramma mostrato
  const bottoni = [...contenitore.querySelectorAll('[data-parte]')];
  let W = 0, H = 0, R = { x: 0, y: 0, w: 0, h: 0 }, disegnato = -1;
  function misura() {
    W = contenitore.clientWidth; H = contenitore.clientHeight;
    const s = Math.min(W / 4, H / 3);     // il video è 4:3, adattato senza tagliare
    R = { w: 4 * s, h: 3 * s, x: (W - 4 * s) / 2, y: (H - 3 * s) / 2 };
    disegnato = -1;
  }
  function mettiPunti() {
    if (!punti || !W) return;
    const i = fotogramma();
    if (i === disegnato) return;
    disegnato = i;
    for (const b of bottoni) {
      const p = punti[i][b.dataset.parte];
      // se la parte è nascosta dietro il corpo il punto sparisce, invece di restare dove non c'è più
      if (p) b.style.transform = `translate(${R.x + p[0] * R.w}px, ${R.y + p[1] * R.h}px) translate(-50%,-50%)`;
      b.style.visibility = p ? '' : 'hidden';
    }
  }

  // trascinamento: in orizzontale gira l'ape, in verticale la pagina continua a scorrere
  function sblocca() {
    // dove l'avvio automatico è bloccato (per esempio in risparmio energetico) il video si carica al primo tocco
    if (!pronto && v.paused) { const p = v.play(); if (p) p.then(() => { if (!auto) v.pause(); }).catch(() => {}); }
  }
  contenitore.addEventListener('pointerdown', sblocca);
  // si può partire anche da sopra un punto numerato (sul telefono coprono buona parte dell'ape):
  // se il dito si sposta è un trascinamento, se resta fermo è un tocco sul punto
  let trascinato = false;
  contenitore.addEventListener('pointerdown', e => {
    if (!NF || !pronto || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target !== v && !e.target.closest('[data-parte]')) return;
    trascinato = false;
    giu = { x: e.clientX, f: richiesto ?? fotogramma(), suVideo: e.target === v };
    if (giu.suVideo) { ferma(); volo = null; richiesto = giu.f; }
  });
  addEventListener('pointermove', e => {
    if (!giu) return;
    const dx = e.clientX - giu.x;
    if (!trascinato) {
      if (Math.abs(dx) < 6) return;
      trascinato = true; ferma(); volo = null; richiesto = giu.f;
      if (!toccata) { toccata = true; contenitore.classList.add('ape3d--toccata'); }
    }
    vai(giu.f - dx / Math.max(W, 1) * NF * 0.85);
  });
  const lascia = () => { giu = null; };
  addEventListener('pointerup', lascia); addEventListener('pointercancel', lascia);
  // dopo un trascinamento partito da un punto numerato, il rilascio non deve valere come tocco sul punto
  contenitore.addEventListener('click', e => { if (trascinato) { trascinato = false; e.stopPropagation(); e.preventDefault(); } }, true);
  v.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    ferma(); volo = null;
    vai((richiesto ?? fotogramma()) + (e.key === 'ArrowLeft' ? 1 : -1) * Math.round(NF / 72));
    e.preventDefault();
  });

  // scegliendo una parte (dal numero o dall'elenco) l'ape gira, per la via più breve, fino alla vista
  // in cui quella parte si vede meglio. Viste scelte a mano sul giro di 288 fotogrammi
  // (0 = tre quarti davanti, 36 = di fronte, 108 = di lato, 180 = da dietro, 252 = l'altro lato)
  const VISTE = {
    occhi: [18, 54], antenne: [36], ligula: [36], peli: [90, 270], ali: [126, 234],
    cestella: [108, 252], addome: [144, 216], pungiglione: [162, 198],
  };
  function seleziona(parte) {
    bottoni.forEach(b => b.setAttribute('aria-pressed', b.dataset.parte === parte ? 'true' : 'false'));
    if (punti) {
      ferma();
      const cur = richiesto ?? fotogramma();
      let meta = null, dmin = Infinity;
      const prova = i => { let d = i - cur; d -= Math.round(d / NF) * NF; if (Math.abs(d) < dmin) { dmin = Math.abs(d); meta = cur + d; } };
      if (VISTE[parte]) VISTE[parte].forEach(i => prova(Math.round(i * NF / 288)));
      else punti.forEach((fr, i) => { const p = fr[parte]; if (p && p[0] >= 0.22 && p[0] <= 0.78) prova(i); });
      if (meta !== null && dmin >= 1) {
        if (ridotto) vai(meta);
        else volo = { da: cur, a: meta, t: 0, durata: 0.45 + 1.1 * dmin / (NF / 2) };
      }
    }
    onSeleziona && onSeleziona(parte);
  }
  bottoni.forEach(b => b.addEventListener('click', () => seleziona(b.dataset.parte)));

  let t0 = performance.now(), inCorso = false;
  function passo(now) {
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    if (volo) {
      volo.t = Math.min(1, volo.t + dt / volo.durata);
      const k = volo.t * volo.t * (3 - 2 * volo.t);
      vai(volo.da + (volo.a - volo.da) * k);
      if (volo.t >= 1) volo = null;
    }
    mettiPunti();
    if (visibile) requestAnimationFrame(passo); else inCorso = false;
  }
  function avviaPasso() { if (!inCorso) { inCorso = true; t0 = performance.now(); requestAnimationFrame(passo); } }

  new IntersectionObserver(([e]) => {
    visibile = e.isIntersecting;
    if (visibile) { avviaPasso(); gira(); } else if (!v.paused) v.pause();
  }).observe(contenitore);
  new ResizeObserver(misura).observe(contenitore);

  v.addEventListener('loadeddata', () => {
    pronto = true; misura(); contenitore.classList.add('ape3d--pronta');
    if (!(auto && visibile) && !v.paused) v.pause();     // fuori schermo aspetta; riparte quando torna visibile
    gira();
  });
  fetch(CARTELLA + 'punti.json' + VER).then(r => r.json()).then(d => {
    punti = d.punti; FPS = d.fps; NF = punti.length; disegnato = -1;
    // l'avvio fa anche partire lo scaricamento sui telefoni, che non precaricano i video
    if (auto) { const p = v.play(); if (p) p.catch(() => {}); } else v.load();
  }).catch(() => {});

  return { seleziona };
}
