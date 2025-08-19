// Vie del Lago — interazioni eleganti

(function () {
  const prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1) Smooth scroll accessibile */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      if (!hash || hash === '#') return;
      const target = document.querySelector(hash);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: prefersReduced ? 'auto' : 'smooth',
          block: 'start',
        });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
  });

  /* 2) Reveal on scroll */
  const toReveal = document.querySelectorAll('.about, .quote, .bees');
  toReveal.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(14px)';
    el.style.transition = prefersReduced
      ? 'none'
      : 'opacity .6s ease, transform .6s ease';
  });

  const reveal = (el) => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  };

  if (!prefersReduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && reveal(en.target)),
      { threshold: 0.12 }
    );
    toReveal.forEach((el) => io.observe(el));
  } else {
    toReveal.forEach(reveal);
  }

  /* 3) Ripple animato sui pulsanti */
  function addRipple(button, color = 'rgba(255,255,255,0.35)') {
    button.style.position = button.style.position || 'relative';
    button.style.overflow = 'hidden';

    function createRipple(event) {
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x =
        (event.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2
