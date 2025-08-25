// Vie del Lago — interazioni eleganti
(function () {
  const prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1) Smooth scroll accessibile (supporta anche index.html#...) */
  document.querySelectorAll('a[href^="#"], a[href*="index.html#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href) return;

      // Se è un link del tipo "index.html#..." ma non siamo in home, lascia navigare
      if (href.startsWith('index.html#') && !location.pathname.endsWith('index.html')) return;

      const hash = href.includes('#') ? '#' + href.split('#')[1] : null;
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

  /* 2) Reveal on scroll (aggiunta .p-section) */
  const toReveal = document.querySelectorAll('.about, .quote, .bees, .p-section');
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
      (entries) =>
        entries.forEach((en) => en.isIntersecting && (reveal(en.target), io.unobserve(en.target))),
      { threshold: 0.12 }
    );
    toReveal.forEach((el) => io.observe(el));
  } else {
    toReveal.forEach(reveal);
  }

  /* 3) Ripple animato sui pulsanti */
  function addRipple(button, color = 'rgba(255,255,255,0.35)') {
    if (!button) return;
    if (getComputedStyle(button).position === 'static') {
      button.style.position = 'relative';
    }
    button.style.overflow = 'hidden';

    function createRipple(event) {
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = (event.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2;
      const y = (event.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.style.position = 'absolute';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.borderRadius = '50%';
      ripple.style.background = color;
      ripple.style.pointerEvents = 'none';
      ripple.style.transform = 'scale(0)';
      ripple.style.opacity = '0.6';
      ripple.style.transition = prefersReduced ? 'none' : 'transform 500ms ease, opacity 600ms ease';
      button.appendChild(ripple);

      requestAnimationFrame(() => {
        ripple.style.transform = 'scale(2.4)';
        ripple.style.opacity = '0';
      });
      setTimeout(() => ripple.remove(), prefersReduced ? 0 : 650);
    }

    button.addEventListener('mousedown', createRipple);
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') createRipple(e);
    });
  }

  document.querySelectorAll('.btn-primary').forEach((b) =>
    addRipple(b, 'rgba(255,255,255,0.35)')
  );
  document.querySelectorAll('.btn-secondary').forEach((b) =>
    addRipple(b, 'rgba(212,160,23,0.25)') // honey yellow soft
  );
})();

// ==============================
// NAV: hamburger + dropdown accessibile
// ==============================
(function(){
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('mainnav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Dropdown "Prodotti" su mobile (click) + guardia submenu
  document.querySelectorAll('.submenu-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const submenu = btn.nextElementSibling;
      if (!submenu) return;
      const isOpen = submenu.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  // Chiudi menu mobile dopo click su link
  document.querySelectorAll('#mainnav a').forEach((a) => {
    a.addEventListener('click', () => {
      if (nav && nav.classList.contains('open')) {
        nav.classList.remove('open');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
})();
