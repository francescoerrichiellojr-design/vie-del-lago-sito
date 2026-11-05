/* Vie del Lago — movimento della home "Racconto".
   Scorrimento morbido (Lenis, ospitato in /vendor), testi che compaiono riga per riga,
   immagini che si svelano e leggero effetto di profondità.
   Con "riduci movimento" attivo nel sistema, o senza JavaScript, tutto resta fermo e leggibile. */
/* Pulsante "torna su": compare dopo aver scorso un po' e riporta all'inizio della pagina. */
(function () {
  var btn = document.querySelector('.torna-su');
  if (!btn) return;
  var ridotto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var visibile = false;
  function controlla() {
    var si = window.scrollY > window.innerHeight * 0.8;
    if (si !== visibile) { visibile = si; btn.classList.toggle('visibile', si); }
  }
  window.addEventListener('scroll', controlla, { passive: true });
  controlla();
  btn.addEventListener('click', function () {
    if (window.vdlLenis && !ridotto) window.vdlLenis.scrollTo(0, { duration: 1.4 });
    else window.scrollTo({ top: 0, behavior: ridotto ? 'auto' : 'smooth' });
    var logo = document.querySelector('.marca');
    if (logo) logo.focus({ preventScroll: true });
  });
})();

/* Menu su telefono: pulsante "Menu" che apre le voci a tutto schermo. Funziona anche con "riduci movimento". */
(function () {
  var btn = document.querySelector('.menu-apri');
  var nav = document.getElementById('menu-principale');
  if (!btn || !nav) return;
  document.documentElement.classList.add('js-menu');
  var etichetta = btn.querySelector('.menu-apri__testo');
  function imposta(aperto) {
    document.documentElement.classList.toggle('menu-aperto', aperto);
    btn.setAttribute('aria-expanded', aperto ? 'true' : 'false');
    if (etichetta) etichetta.textContent = aperto ? 'Chiudi' : 'Menu';
    if (window.vdlLenis) { aperto ? window.vdlLenis.stop() : window.vdlLenis.start(); }
    if (aperto) { var primo = nav.querySelector('a'); if (primo) primo.focus(); }
  }
  btn.addEventListener('click', function () { imposta(btn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) imposta(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { imposta(false); btn.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 720) imposta(false); });
})();

(function () {
  var root = document.documentElement;
  var ridotto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (ridotto || !('IntersectionObserver' in window)) { root.classList.add('statico'); return; }

  // 1. Scorrimento morbido
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.075, smoothWheel: true });
    window.vdlLenis = lenis;
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var t = document.querySelector(id);
        if (!t) return;
        e.preventDefault();
        lenis.scrollTo(t, { offset: 0, duration: 1.6 });
      });
    });
  }

  // 2. Rivelazioni all'ingresso nello schermo
  var io = new IntersectionObserver(function (voci) {
    voci.forEach(function (v) {
      if (v.isIntersecting) { v.target.classList.add('visibile'); io.unobserve(v.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-rivela], .svela').forEach(function (el) { io.observe(el); });
  // l'apertura è già sullo schermo: parte subito
  requestAnimationFrame(function () {
    document.querySelectorAll('.apertura [data-rivela]').forEach(function (el) { el.classList.add('visibile'); });
  });

  // 3. Profondità: elementi che scorrono a velocità diversa
  var strati = Array.prototype.slice.call(document.querySelectorAll('[data-profondita]'));
  function aggiorna() {
    var h = window.innerHeight;
    strati.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > h + 200) return;
      var k = parseFloat(el.getAttribute('data-profondita')) || 0.1;
      var centro = r.top + r.height / 2 - h / 2;
      el.style.transform = 'translate3d(0,' + (-centro * k).toFixed(1) + 'px,0)';
    });
  }
  if (lenis) lenis.on('scroll', aggiorna); else window.addEventListener('scroll', aggiorna, { passive: true });
  window.addEventListener('resize', aggiorna);
  aggiorna();
})();
