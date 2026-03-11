// Vie del Lago — interazioni eleganti
(function () {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1) Smooth scroll */
  document.querySelectorAll('a[href^="#"], a[href*="index.html#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('index.html#') && !location.pathname.endsWith('index.html')) return;
      const hash = href.includes('#') ? '#' + href.split('#')[1] : null;
      if (!hash || hash === '#') return;
      const target = document.querySelector(hash);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
  });

  /* 2) Active nav state */
  (function setActiveNav() {
    const path = location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    const pageMap = {
      'index.html': 'home', '': 'home',
      'storia.html': 'storia', 'api.html': 'api',
      'educazione.html': 'educazione', 'millefiori.html': 'millefiori',
      'acacia.html': 'acacia', 'sulla.html': 'sulla',
      'contatti.html': 'contatti', 'privacy.html': 'privacy', 'prodotti.html': 'prodotti', 'faq.html': 'faq',
    };
    const currentKey = pageMap[filename] || null;
    if (!currentKey) return;
    document.querySelectorAll('[data-nav]').forEach((el) => {
      if (el.getAttribute('data-nav') === currentKey) {
        el.classList.add('nav-active');
        const li = el.closest('.has-submenu');
        if (li) { const btn = li.querySelector('.submenu-toggle'); if (btn) btn.style.color = 'var(--honey-yellow)'; }
      }
    });
  })();

  /* 3) Reveal on scroll */
  const toReveal = document.querySelectorAll('.about, .quote, .bees, .p-section, .api-section, .story-row, .story-quote, .related-products, .p-trust-info');
  toReveal.forEach((el) => {
    el.style.opacity = '0'; el.style.transform = 'translateY(16px)';
    el.style.transition = prefersReduced ? 'none' : 'opacity .6s ease, transform .6s ease';
  });
  const reveal = (el) => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; };
  if (!prefersReduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => en.isIntersecting && (reveal(en.target), io.unobserve(en.target))), { threshold: 0.1 });
    toReveal.forEach((el) => io.observe(el));
  } else { toReveal.forEach(reveal); }

  /* 4) Ripple */
  function addRipple(button, color = 'rgba(255,255,255,0.35)') {
    if (!button) return;
    if (getComputedStyle(button).position === 'static') button.style.position = 'relative';
    button.style.overflow = 'hidden';
    function createRipple(event) {
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = (event.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2;
      const y = (event.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2;
      const ripple = document.createElement('span');
      Object.assign(ripple.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: color, pointerEvents: 'none', transform: 'scale(0)', opacity: '0.6', transition: prefersReduced ? 'none' : 'transform 500ms ease, opacity 600ms ease' });
      button.appendChild(ripple);
      requestAnimationFrame(() => { ripple.style.transform = 'scale(2.4)'; ripple.style.opacity = '0'; });
      setTimeout(() => ripple.remove(), prefersReduced ? 0 : 650);
    }
    button.addEventListener('mousedown', createRipple);
    button.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') createRipple(e); });
  }
  document.querySelectorAll('.btn-primary').forEach((b) => addRipple(b, 'rgba(255,255,255,0.35)'));
  document.querySelectorAll('.btn-secondary').forEach((b) => addRipple(b, 'rgba(212,160,23,0.25)'));
})();

// NAV: hamburger + dropdown
(function () {
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('mainnav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }
  document.querySelectorAll('.submenu-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const submenu = btn.nextElementSibling;
      if (!submenu) return;
      const isOpen = submenu.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });
  document.querySelectorAll('#mainnav a').forEach((a) => {
    a.addEventListener('click', () => {
      if (nav && nav.classList.contains('open')) {
        nav.classList.remove('open');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
})();

// CONTACT FORM
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const name    = form.querySelector('[name="nome"]').value.trim();
    const email   = form.querySelector('[name="email"]').value.trim();
    const product = form.querySelector('[name="prodotto"]').value;
    const qty     = form.querySelector('[name="quantita"]').value.trim();
    const msg     = form.querySelector('[name="messaggio"]').value.trim();
    const subject = encodeURIComponent('RICHIESTA ORDINE — ' + (product || 'Informazioni') + ' — ' + name);
    const body = encodeURIComponent('Gentile Vie del Lago,\n\n--- I MIEI DATI ---\nNome: ' + name + '\nEmail: ' + email + '\n\n--- IL MIO ORDINE ---\nProdotto: ' + (product || 'da definire') + '\nQuantità: ' + (qty || 'da definire') + '\n\n--- MESSAGGIO ---\n' + msg + '\n\nCordiali saluti.\n' + name);
    window.location.href = 'mailto:info@viedellagoapicoltura.it?subject=' + subject + '&body=' + body;
    const success = document.getElementById('contact-form-success');
    if (success) { success.style.display = 'block'; form.style.display = 'none'; }
  });
})();

// Educazione chart utilities
const VL_COLORS = {
  honey: getComputedStyle(document.documentElement).getPropertyValue('--honey-yellow')?.trim() || '#D4A017',
  brown: getComputedStyle(document.documentElement).getPropertyValue('--dark-brown')?.trim() || '#2F2A26',
};
const fmt = {
  int: (v) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(v),
  one: (v, u) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(v) + ' ' + u,
};
function updateKPI({ famiglie, pesoMedioKg, tempMedia, umiMedia }) {
  const el = (id) => document.getElementById(id);
  if (el('kpiFamiglie') && Number.isFinite(famiglie)) el('kpiFamiglie').textContent = String(famiglie);
  if (el('kpiPeso') && Number.isFinite(pesoMedioKg)) el('kpiPeso').textContent = fmt.one(pesoMedioKg, 'kg');
  if (el('kpiTemp') && Number.isFinite(tempMedia)) el('kpiTemp').textContent = fmt.one(tempMedia, '°C');
  if (el('kpiUmi') && Number.isFinite(umiMedia)) el('kpiUmi').textContent = fmt.one(umiMedia, '%');
}

// Time series data
(function () {
  if (!window.Chart) return;
  const dataTS = {"dates":["2024-08-27","2024-08-28","2024-08-29","2024-08-30","2024-08-31","2024-09-01","2024-09-02","2024-09-03","2024-09-04","2024-09-05","2024-09-06","2024-09-07","2024-09-08","2024-09-09","2024-09-10","2024-09-11","2024-09-12","2024-09-13","2024-09-14","2024-09-15","2024-09-16","2024-09-17","2024-09-18","2024-09-19","2024-09-20","2024-09-21","2024-09-22","2024-09-23","2024-09-24","2024-09-25","2024-09-26","2024-09-27","2024-09-28","2024-09-29","2024-09-30","2024-10-01","2024-10-02","2024-10-03","2024-10-04","2024-10-05","2024-10-06","2024-10-07","2024-10-08","2024-10-09","2024-10-10","2024-10-11","2024-10-12","2024-10-13","2024-10-14","2024-10-15","2024-10-16","2024-10-17","2024-10-18","2024-10-19","2024-10-20","2024-10-21","2024-10-22","2024-10-23","2024-10-24","2024-10-25","2024-10-26","2024-10-27","2024-10-28","2024-10-29","2024-10-30","2024-10-31","2024-11-01","2024-11-02","2024-11-03","2024-11-04","2024-11-05","2024-11-06","2024-11-07","2024-11-08","2024-11-09","2024-11-10","2024-11-11","2024-11-12","2024-11-13","2024-11-14","2024-11-15","2024-11-16","2024-11-17","2024-11-18","2024-11-19","2024-11-20","2024-11-21","2024-11-22","2024-11-23","2024-11-24","2024-11-25","2024-11-26","2024-11-27","2024-11-28","2024-11-29","2024-11-30","2024-12-01","2024-12-15","2025-01-01","2025-02-01","2025-03-01","2025-04-01","2025-05-01","2025-06-01","2025-07-01","2025-08-01","2025-08-26"],"weight":[51.68,51.66,52.04,44.16,30.06,29.72,29.53,29.38,29.25,29.11,29.03,29.05,29.13,29.18,29.12,29.12,29.24,29.29,29.14,28.99,28.97,29.07,29.18,29.29,29.53,30.19,31.76,33.03,33.39,33.45,33.76,33.83,34.07,34.08,33.91,34.07,34.26,34.37,34.41,34.37,34.33,34.4,34.54,34.58,34.47,34.36,35.05,35.37,35.29,35.19,35.12,35.01,35.03,35.03,34.96,34.84,34.66,34.49,34.42,34.42,34.5,34.31,34.14,34.05,33.99,33.97,33.86,33.73,33.61,33.56,33.58,33.64,33.69,33.69,33.6,34.08,34.54,34.52,34.52,34.73,34.7,34.58,34.45,34.42,34.43,34.39,34.18,34.41,34.2,34.05,33.9,33.88,33.87,33.88,33.91,33.91,32.5,29.15,27.4,28.55,30.56,40.08,47.17,56.73,65.16,65.67],"temp":[29.45,28.18,26.97,28.29,29.63,29.82,29.89,29.99,30.04,29.75,31.28,30.59,31.36,30.36,29.38,29.06,28.86,26.58,26.82,26.63,25.63,25.16,26.23,25.61,27.33,27.44,27.38,28.26,27.88,27.83,28.26,28.82,27.86,25.31,26.0,26.4,26.58,27.68,26.38,24.99,25.1,26.21,27.02,27.11,26.61,26.55,26.09,25.43,26.27,26.45,26.51,27.17,25.16,23.67,24.0,24.89,25.69,25.99,25.5,24.75,24.96,24.5,23.16,22.6,21.37,20.3,19.49,19.39,19.18,18.05,17.24,18.49,18.65,19.63,18.87,17.31,17.35,15.84,13.97,14.96,13.13,14.46,16.17,17.94,18.43,17.64,15.61,15.7,13.17,13.96,15.73,19.03,20.72,19.67,17.13,11.02,10.01,11.43,13.81,19.35,23.02,26.4,27.8,31.06,33.51,29.66],"hum":[65.22,65.33,65.77,68.34,67.57,67.69,69.05,70.01,71.26,71.83,72.34,71.76,71.06,69.98,70.17,70.45,70.38,70.16,70.98,71.92,72.48,73.48,75.3,75.36,76.01,75.53,75.12,75.27,74.59,73.9,73.44,73.01,72.26,71.59,72.05,72.03,71.85,72.06,71.87,71.84,72.63,73.27,73.42,73.02,72.54,72.4,72.47,72.54,72.91,72.97,72.99,73.15,72.93,73.39,74.88,76.4,77.48,77.92,77.95,78.06,78.16,77.83,77.36,77.12,77.04,77.14,77.21,77.47,77.41,77.21,77.06,77.57,77.89,78.55,78.72,78.71,79.06,79.33,79.12,79.89,80.02,80.81,81.47,82.01,82.55,82.76,82.53,82.71,82.03,81.83,81.93,82.56,82.75,82.72,82.66,81.68,83.73,88.44,86.25,76.11,69.13,66.44,73.1,61.53,65.87,70.93]};

  const getVar = (n, fb) => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb; } catch { return fb; } };
  const COL = { honey: getVar('--honey-yellow', '#D4A017'), brown: getVar('--dark-brown', '#2F2A26') };

  function mkLine(elId, label, values, unit) {
    const el = document.getElementById(elId);
    if (!el) return null;
    return new Chart(el.getContext('2d'), {
      type: 'line',
      data: { labels: dataTS.dates, datasets: [{ label, data: values, fill: false, tension: 0.3, borderColor: COL.brown, pointRadius: 0 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true }, tooltip: { backgroundColor: '#fff', titleColor: COL.brown, bodyColor: COL.brown, borderColor: 'rgba(0,0,0,.12)', borderWidth: 1, displayColors: false, padding: 10, callbacks: { label: (ctx) => ' ' + ctx.parsed.y + ' ' + unit } } },
        scales: { x: { ticks: { color: COL.brown, maxTicksLimit: 8 }, grid: { display: false } }, y: { ticks: { color: COL.brown }, grid: { color: 'rgba(0,0,0,.08)' } } }
      }
    });
  }

  mkLine('chartWeightTrend', 'Peso totale (kg)', dataTS.weight, 'kg');
  mkLine('chartTempTrend', 'Temperatura (°C)', dataTS.temp, '°C');
  mkLine('chartHumTrend', 'Umidità (%)', dataTS.hum, '%');
})();
