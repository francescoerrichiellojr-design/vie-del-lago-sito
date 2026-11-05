/* Vie del Lago — movimento della home "Racconto".
   Scorrimento morbido (Lenis, ospitato in /vendor), testi che compaiono riga per riga,
   immagini che si svelano e leggero effetto di profondità.
   Con "riduci movimento" attivo nel sistema, o senza JavaScript, tutto resta fermo e leggibile. */
(function () {
  var root = document.documentElement;
  var ridotto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (ridotto || !('IntersectionObserver' in window)) { root.classList.add('statico'); return; }

  // 1. Scorrimento morbido
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.075, smoothWheel: true });
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
