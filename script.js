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


// ===== Educazione & Trasparenza — utilities =====
const VL_COLORS = {
  honey: getComputedStyle(document.documentElement).getPropertyValue('--honey-yellow')?.trim() || '#D4A017',
  brown: getComputedStyle(document.documentElement).getPropertyValue('--dark-brown')?.trim() || '#2F2A26',
  beige: getComputedStyle(document.documentElement).getPropertyValue('--beige')?.trim() || '#F3E9DA'
};

const fmt = {
  int: (v) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(v),
  one: (v, u) => `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(v)} ${u}`,
  pct: (v) => `${new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 1 }).format(v)}`
};

// Plugin: testo al centro del donut
const CenterText = {
  id: 'centerText',
  afterDraw(chart, args, opts) {
    const { ctx, chartArea } = chart;
    if (!opts || !opts.text || !chartArea) return;
    const { width, height } = chartArea;
    ctx.save();
    ctx.font = `600 ${opts.fontSize || 18}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = VL_COLORS.brown;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.text, width / 2, height / 2);
    ctx.restore();
  }
};

const commonTooltip = {
  backgroundColor: '#fff',
  titleColor: VL_COLORS.brown,
  bodyColor: VL_COLORS.brown,
  borderColor: 'rgba(0,0,0,.12)',
  borderWidth: 1,
  displayColors: false,
  padding: 10,
};

function enhanceImportDonut(chartInstance, rawPairs) {
  if (!chartInstance) return;
  const total = Array.isArray(rawPairs) ? rawPairs.reduce((a, b) => a + (b?.value || 0), 0) : null;

  chartInstance.options.plugins = chartInstance.options.plugins || {};
  chartInstance.options.plugins.legend = { position: 'bottom', labels: { usePointStyle: true } };
  chartInstance.options.plugins.tooltip = {
    ...commonTooltip,
    callbacks: {
      label(ctx) {
        const idx = ctx.dataIndex;
        const value = ctx.raw;
        const label = ctx.chart.data.labels?.[idx] ?? ctx.label ?? '';
        const pct = total ? value / total : 0;
        return `${label}: ${fmt.int(value)} t (${fmt.pct(pct)})`;
      }
    }
  };
  chartInstance.options.cutout = '62%';
  chartInstance.options.plugins.centerText = { text: total ? `${fmt.int(total)} t` : '' , fontSize: 20 };
  if (!chartInstance.$_centerTextAdded) {
    chartInstance.$_centerTextAdded = true;
    chartInstance.config.plugins = (chartInstance.config.plugins || []).concat(CenterText);
  }
  chartInstance.update();
}

function enhanceImportBar(chartInstance, unit = 't') {
  if (!chartInstance) return;
  chartInstance.options.plugins = chartInstance.options.plugins || {};
  chartInstance.options.plugins.legend = { display: false };
  chartInstance.options.plugins.tooltip = {
    ...commonTooltip,
    callbacks: { label: (ctx) => ` ${fmt.int(ctx.raw)} ${unit}` }
  };
  chartInstance.options.scales = chartInstance.options.scales || {};
  chartInstance.options.scales.x = { ticks: { color: VL_COLORS.brown } };
  chartInstance.options.scales.y = {
    ticks: { color: VL_COLORS.brown, callback: (v) => fmt.int(v) },
    grid: { color: 'rgba(0,0,0,.08)' }
  };
  chartInstance.update();
}

function updateKPI({ famiglie, pesoMedioKg, tempMedia, umiMedia }) {
  const el = (id) => document.getElementById(id);
  if (el('kpiFamiglie') && Number.isFinite(famiglie)) el('kpiFamiglie').textContent = String(famiglie);
  if (el('kpiPeso') && Number.isFinite(pesoMedioKg)) el('kpiPeso').textContent = fmt.one(pesoMedioKg, 'kg');
  if (el('kpiTemp') && Number.isFinite(tempMedia)) el('kpiTemp').textContent = fmt.one(tempMedia, '°C');
  if (el('kpiUmi') && Number.isFinite(umiMedia)) el('kpiUmi').textContent = fmt.one(umiMedia, '%');
}

// ESEMPIO chiamate dopo creazione grafici:
// if (window.chartImportDonut) {
//   const labels = window.chartImportDonut.data?.labels || [];
//   const values = window.chartImportDonut.data?.datasets?.[0]?.data || [];
//   const donutPairs = labels.map((l, i) => ({ label: l, value: Number(values[i] || 0) }));
//   enhanceImportDonut(window.chartImportDonut, donutPairs);
// }
// if (window.chartImportBar) {
//   enhanceImportBar(window.chartImportBar, 't');
// }
// updateKPI({ famiglie: 20, pesoMedioKg: 32.1, tempMedia: 35.0, umiMedia: 55.2 });


// ===== Serie temporali da arnia_766236.csv =====
(function(){
  if (!window.Chart) return;
  const dataTS = {"dates": ["2024-08-27", "2024-08-28", "2024-08-29", "2024-08-30", "2024-08-31", "2024-09-01", "2024-09-02", "2024-09-03", "2024-09-04", "2024-09-05", "2024-09-06", "2024-09-07", "2024-09-08", "2024-09-09", "2024-09-10", "2024-09-11", "2024-09-12", "2024-09-13", "2024-09-14", "2024-09-15", "2024-09-16", "2024-09-17", "2024-09-18", "2024-09-19", "2024-09-20", "2024-09-21", "2024-09-22", "2024-09-23", "2024-09-24", "2024-09-25", "2024-09-26", "2024-09-27", "2024-09-28", "2024-09-29", "2024-09-30", "2024-10-01", "2024-10-02", "2024-10-03", "2024-10-04", "2024-10-05", "2024-10-06", "2024-10-07", "2024-10-08", "2024-10-09", "2024-10-10", "2024-10-11", "2024-10-12", "2024-10-13", "2024-10-14", "2024-10-15", "2024-10-16", "2024-10-17", "2024-10-18", "2024-10-19", "2024-10-20", "2024-10-21", "2024-10-22", "2024-10-23", "2024-10-24", "2024-10-25", "2024-10-26", "2024-10-27", "2024-10-28", "2024-10-29", "2024-10-30", "2024-10-31", "2024-11-01", "2024-11-02", "2024-11-03", "2024-11-04", "2024-11-05", "2024-11-06", "2024-11-07", "2024-11-08", "2024-11-09", "2024-11-10", "2024-11-11", "2024-11-12", "2024-11-13", "2024-11-14", "2024-11-15", "2024-11-16", "2024-11-17", "2024-11-18", "2024-11-19", "2024-11-20", "2024-11-21", "2024-11-22", "2024-11-23", "2024-11-24", "2024-11-25", "2024-11-26", "2024-11-27", "2024-11-28", "2024-11-29", "2024-11-30", "2024-12-01", "2024-12-02", "2024-12-03", "2024-12-04", "2024-12-05", "2024-12-06", "2024-12-07", "2024-12-08", "2024-12-09", "2024-12-10", "2024-12-11", "2024-12-12", "2024-12-13", "2024-12-14", "2024-12-15", "2024-12-16", "2024-12-17", "2024-12-18", "2024-12-19", "2024-12-20", "2024-12-21", "2024-12-22", "2024-12-23", "2024-12-24", "2024-12-25", "2024-12-26", "2024-12-27", "2024-12-28", "2024-12-29", "2024-12-30", "2024-12-31", "2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05", "2025-01-06", "2025-01-07", "2025-01-08", "2025-01-09", "2025-01-10", "2025-01-11", "2025-01-12", "2025-01-13", "2025-01-14", "2025-01-15", "2025-01-16", "2025-01-17", "2025-01-18", "2025-01-19", "2025-01-20", "2025-01-21", "2025-01-22", "2025-01-23", "2025-01-24", "2025-01-25", "2025-01-26", "2025-01-27", "2025-01-28", "2025-01-29", "2025-01-30", "2025-01-31", "2025-02-01", "2025-02-02", "2025-02-03", "2025-02-04", "2025-02-05", "2025-02-06", "2025-02-07", "2025-02-08", "2025-02-09", "2025-02-10", "2025-02-11", "2025-02-12", "2025-02-13", "2025-02-14", "2025-02-15", "2025-02-16", "2025-02-17", "2025-02-18", "2025-02-19", "2025-02-20", "2025-02-21", "2025-02-22", "2025-02-23", "2025-02-24", "2025-02-25", "2025-02-26", "2025-02-27", "2025-02-28", "2025-03-01", "2025-03-02", "2025-03-03", "2025-03-04", "2025-03-05", "2025-03-06", "2025-03-07", "2025-03-08", "2025-03-09", "2025-03-10", "2025-03-11", "2025-03-12", "2025-03-13", "2025-03-14", "2025-03-15", "2025-03-16", "2025-03-17", "2025-03-18", "2025-03-19", "2025-03-20", "2025-03-21", "2025-03-22", "2025-03-23", "2025-03-24", "2025-03-25", "2025-03-26", "2025-03-27", "2025-03-28", "2025-03-29", "2025-03-30", "2025-03-31", "2025-04-01", "2025-04-02", "2025-04-03", "2025-04-04", "2025-04-05", "2025-04-06", "2025-04-07", "2025-04-08", "2025-04-09", "2025-04-10", "2025-04-11", "2025-04-12", "2025-04-13", "2025-04-14", "2025-04-15", "2025-04-16", "2025-04-17", "2025-04-18", "2025-04-19", "2025-04-20", "2025-04-21", "2025-04-22", "2025-04-23", "2025-04-24", "2025-04-25", "2025-04-26", "2025-04-27", "2025-04-28", "2025-04-29", "2025-04-30", "2025-05-01", "2025-05-02", "2025-05-03", "2025-05-04", "2025-05-05", "2025-05-06", "2025-05-07", "2025-05-08", "2025-05-09", "2025-05-10", "2025-05-11", "2025-05-12", "2025-05-13", "2025-05-14", "2025-05-15", "2025-05-16", "2025-05-17", "2025-05-18", "2025-05-19", "2025-05-20", "2025-05-21", "2025-05-22", "2025-05-23", "2025-05-24", "2025-05-25", "2025-05-26", "2025-05-27", "2025-05-28", "2025-05-29", "2025-05-30", "2025-05-31", "2025-06-01", "2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05", "2025-06-06", "2025-06-07", "2025-06-08", "2025-06-09", "2025-06-10", "2025-06-11", "2025-06-12", "2025-06-13", "2025-06-14", "2025-06-15", "2025-06-16", "2025-06-17", "2025-06-18", "2025-06-19", "2025-06-20", "2025-06-21", "2025-06-22", "2025-06-23", "2025-06-24", "2025-06-25", "2025-06-26", "2025-06-27", "2025-06-28", "2025-06-29", "2025-06-30", "2025-07-01", "2025-07-02", "2025-07-03", "2025-07-04", "2025-07-05", "2025-07-06", "2025-07-07", "2025-07-08", "2025-07-09", "2025-07-10", "2025-07-11", "2025-07-12", "2025-07-13", "2025-07-14", "2025-07-15", "2025-07-16", "2025-07-17", "2025-07-18", "2025-07-19", "2025-07-20", "2025-07-21", "2025-07-22", "2025-07-23", "2025-07-24", "2025-07-25", "2025-07-26", "2025-07-27", "2025-07-28", "2025-07-29", "2025-07-30", "2025-07-31", "2025-08-01", "2025-08-02", "2025-08-03", "2025-08-04", "2025-08-05", "2025-08-06", "2025-08-07", "2025-08-08", "2025-08-09", "2025-08-10", "2025-08-11", "2025-08-12", "2025-08-13", "2025-08-14", "2025-08-15", "2025-08-16", "2025-08-17", "2025-08-18", "2025-08-19", "2025-08-20", "2025-08-21", "2025-08-22", "2025-08-23", "2025-08-24", "2025-08-25", "2025-08-26"], "weight": [51.68, 51.66, 52.04, 44.16, 30.06, 29.72, 29.53, 29.38, 29.25, 29.11, 29.03, 29.05, 29.13, 29.18, 29.12, 29.12, 29.24, 29.29, 29.14, 28.99, 28.97, 29.07, 29.18, 29.29, 29.53, 30.19, 31.76, 33.03, 33.39, 33.45, 33.76, 33.83, 34.07, 34.08, 33.91, 34.07, 34.26, 34.37, 34.41, 34.37, 34.33, 34.4, 34.54, 34.58, 34.47, 34.36, 35.05, 35.37, 35.29, 35.19, 35.12, 35.01, 35.03, 35.03, 34.96, 34.84, 34.66, 34.49, 34.42, 34.42, 34.5, 34.31, 34.14, 34.05, 33.99, 33.97, 33.86, 33.73, 33.61, 33.56, 33.58, 33.64, 33.69, 33.69, 33.6, 34.08, 34.54, 34.52, 34.52, 34.73, 34.7, 34.58, 34.45, 34.42, 34.43, 34.39, 34.18, 34.41, 34.2, 34.05, 33.9, 33.88, 33.87, 33.88, 33.91, 33.91, 33.93, 33.91, 33.86, 33.86, 33.85, 33.8, 33.74, 33.83, 33.85, 33.81, 33.67, 33.56, 33.58, 33.94, 33.51, 33.29, 33.12, 32.97, 32.89, 32.96, 32.73, 32.66, 32.79, 32.68, 32.73, 32.71, 32.65, 32.47, 32.79, 33.16, 33.06, 32.95, 32.92, 33.0, 32.89, 32.89, 32.79, 32.71, 32.57, 32.48, 32.43, 32.39, 36.07, 34.47, 32.34, 32.14, 32.12, 32.14, 32.28, 32.35, 32.15, 31.98, 31.9, 31.69, 31.37, 31.14, 31.04, 30.93, 30.67, 30.49, 30.5, 30.29, 30.21, 30.37, 30.47, 30.23, 29.98, 30.31, 30.68, 30.68, 30.51, 30.26, 30.15, 30.02, 29.89, 29.75, 29.75, 29.62, 29.41, 29.15, 28.97, 28.84, 28.58, 27.32, 27.45, 27.47, 27.47, 27.52, 27.4, 27.18, 27.12, 27.13, 26.94, 26.74, 26.62, 26.52, 26.47, 26.48, 26.44, 26.51, 26.71, 26.84, 26.9, 27.31, 28.04, 28.83, 28.67, 28.44, 27.91, 27.49, 28.55, 28.92, 29.22, 29.93, 30.56, 30.72, 30.41, 30.0, 29.66, 29.51, 29.36, 29.22, 28.89, 27.74, 27.11, 27.44, 28.04, 28.1, 27.76, 27.79, 28.33, 28.88, 29.35, 29.33, 29.71, 30.22, 34.0, 36.76, 36.36, 36.32, 36.96, 37.96, 38.74, 39.23, 39.22, 39.33, 39.04, 38.34, 38.27, 38.11, 37.14, 38.95, 40.08, 43.5, 45.99, 46.05, 46.51, 47.0, 47.17, 47.41, 47.92, 48.36, 48.51, 48.55, 48.7, 48.62, 48.15, 47.96, 47.64, 47.53, 47.96, 48.25, 48.51, 48.62, 48.73, 48.56, 48.91, 49.96, 51.07, 51.52, 51.64, 52.02, 52.63, 53.42, 54.42, 55.73, 56.73, 57.36, 58.07, 58.76, 60.79, 62.11, 67.33, 71.09, 72.64, 73.78, 75.68, 78.6, 80.95, 82.87, 66.97, 61.05, 62.05, 62.69, 63.3, 64.53, 65.95, 66.24, 66.48, 66.41, 65.99, 65.97, 65.99, 65.97, 66.05, 65.99, 65.94, 65.92, 65.59, 65.68, 65.57, 65.45, 65.29, 65.19, 65.16, 65.16, 65.19, 65.19, 65.23, 65.17, 65.14, 65.11, 65.11, 65.17, 62.48, 65.54, 65.37, 65.21, 65.3, 65.51, 65.68, 65.75, 65.82, 65.86, 65.88, 65.95, 66.02, 66.09, 66.1, 66.07, 66.21, 66.24, 66.12, 66.02, 65.95, 65.89, 65.87, 65.91, 66.02, 66.07, 65.99, 65.91, 65.8, 65.74, 65.65, 65.68, 65.72, 65.67, 65.67], "temp": [29.45, 28.18, 26.97, 28.29, 29.63, 29.82, 29.89, 29.99, 30.04, 29.75, 31.28, 30.59, 31.36, 30.36, 29.38, 29.06, 28.86, 26.58, 26.82, 26.63, 25.63, 25.16, 26.23, 25.61, 27.33, 27.44, 27.38, 28.26, 27.88, 27.83, 28.26, 28.82, 27.86, 25.31, 26.0, 26.4, 26.58, 27.68, 26.38, 24.99, 25.1, 26.21, 27.02, 27.11, 26.61, 26.55, 26.09, 25.43, 26.27, 26.45, 26.51, 27.17, 25.16, 23.67, 24.0, 24.89, 25.69, 25.99, 25.5, 24.75, 24.96, 24.5, 23.16, 22.6, 21.37, 20.3, 19.49, 19.39, 19.18, 18.05, 17.24, 18.49, 18.65, 19.63, 18.87, 17.31, 17.35, 15.84, 13.97, 14.96, 13.13, 14.46, 16.17, 17.94, 18.43, 17.64, 15.61, 15.7, 13.17, 13.96, 15.73, 19.03, 20.72, 19.67, 17.13, 11.02, 12.48, 13.42, 15.12, 16.27, 14.81, 15.18, 13.61, 12.15, 12.26, 13.53, 15.1, 16.4, 14.45, 16.49, 15.86, 15.31, 17.06, 18.07, 15.77, 14.43, 11.87, 13.92, 12.21, 10.01, 11.43, 12.81, 13.81, 15.22, 14.73, 14.28, 14.52, 14.0, 14.1, 13.96, 12.98, 16.1, 16.66, 17.01, 17.86, 16.29, 17.93, 16.63, 10.53, 9.81, 11.21, 12.86, 13.29, 12.76, 12.51, 16.48, 18.22, 17.8, 16.81, 19.1, 22.25, 20.7, 19.17, 19.5, 19.61, 16.86, 19.84, 19.7, 18.25, 19.17, 20.16, 19.35, 16.37, 18.12, 19.47, 20.07, 19.03, 19.34, 20.63, 20.63, 21.19, 21.92, 21.54, 21.36, 20.25, 20.31, 19.25, 18.83, 20.24, 21.29, 23.02, 22.45, 22.73, 22.52, 23.54, 22.94, 21.97, 22.82, 22.25, 20.6, 22.63, 22.89, 23.57, 26.4, 26.35, 26.96, 27.8, 26.53, 26.19, 27.9, 29.65, 27.58, 27.57, 26.03, 25.18, 25.54, 27.15, 27.95, 28.53, 28.75, 28.49, 26.65, 26.1, 26.16, 24.9, 25.1, 24.09, 23.5, 24.81, 25.06, 23.99, 24.83, 24.92, 24.62, 25.73, 26.17, 24.96, 25.28, 27.44, 27.36, 29.29, 28.37, 28.29, 28.15, 27.48, 28.49, 29.07, 28.96, 28.92, 28.74, 28.71, 28.03, 27.88, 27.12, 27.66, 27.4, 27.83, 27.76, 28.62, 28.88, 28.41, 29.07, 29.11, 29.33, 28.52, 27.98, 28.85, 26.37, 26.62, 25.97, 26.92, 27.12, 26.67, 27.25, 27.13, 28.67, 28.12, 29.43, 29.49, 29.27, 29.15, 28.37, 28.27, 28.93, 29.8, 29.22, 28.32, 28.93, 29.63, 31.03, 32.0, 31.82, 31.87, 31.89, 31.8, 31.94, 32.34, 32.93, 33.53, 32.72, 32.79, 32.79, 33.51, 33.75, 33.85, 32.94, 33.16, 33.09, 32.71, 32.48, 33.01, 34.07, 33.51, 32.63, 31.98, 31.76, 30.98, 29.65, 29.88, 30.69, 30.2, 30.51, 30.5, 30.71, 30.17, 29.55, 28.11, 26.14, 26.35, 26.94, 27.54, 28.66, 28.75, 28.51, 28.66, 27.65, 27.7, 28.28, 29.68, 29.6, 29.03, 29.15, 29.92, 28.91, 27.84, 26.87, 26.64, 27.7, 28.16, 28.4, 28.7, 28.98, 27.66, 27.4, 28.22, 28.99, 29.44, 30.03, 30.56, 31.06, 31.05, 30.31, 29.98, 29.3, 28.01, 27.94, 28.48, 29.0, 30.06, 30.98, 30.41, 28.5, 29.04, 29.55, 29.66], "hum": [65.22, 65.33, 65.77, 68.34, 67.57, 67.69, 69.05, 70.01, 71.26, 71.83, 72.34, 71.76, 71.06, 69.98, 70.17, 70.45, 70.38, 70.16, 70.98, 71.92, 72.48, 73.48, 75.3, 75.36, 76.01, 75.53, 75.12, 75.27, 74.59, 73.9, 73.44, 73.01, 72.26, 71.59, 72.05, 72.03, 71.85, 72.06, 71.87, 71.84, 72.63, 73.27, 73.42, 73.02, 72.54, 72.4, 72.47, 72.54, 72.91, 72.97, 72.99, 73.15, 72.93, 73.39, 74.88, 76.4, 77.48, 77.92, 77.95, 78.06, 78.16, 77.83, 77.36, 77.12, 77.04, 77.14, 77.21, 77.47, 77.41, 77.21, 77.06, 77.57, 77.89, 78.55, 78.72, 78.71, 79.06, 79.33, 79.12, 79.89, 80.02, 80.81, 81.47, 82.01, 82.55, 82.76, 82.53, 82.71, 82.03, 81.83, 81.93, 82.56, 82.75, 82.72, 82.66, 81.68, 82.38, 83.09, 83.45, 83.75, 83.86, 85.01, 84.88, 84.91, 84.92, 85.02, 85.01, 85.45, 85.86, 86.19, 85.21, 84.93, 85.08, 85.11, 85.12, 85.07, 84.49, 84.55, 84.19, 83.73, 83.93, 84.57, 85.21, 85.08, 84.91, 85.32, 85.19, 84.51, 84.12, 84.12, 83.93, 84.61, 85.22, 85.94, 86.48, 86.4, 86.95, 86.6, 84.71, 84.63, 85.32, 85.86, 86.56, 87.04, 87.57, 88.44, 88.33, 88.54, 88.83, 89.31, 89.31, 88.52, 88.22, 88.18, 87.33, 86.01, 86.64, 86.41, 85.86, 86.25, 86.71, 86.92, 86.55, 86.83, 86.93, 87.21, 87.43, 87.62, 87.5, 87.0, 87.02, 87.19, 86.83, 87.53, 88.04, 88.61, 88.37, 88.69, 89.28, 86.58, 84.68, 85.8, 88.36, 89.83, 90.41, 90.19, 89.48, 89.1, 89.17, 88.08, 86.52, 83.86, 82.69, 84.52, 85.52, 84.85, 84.12, 82.58, 81.7, 81.93, 76.11, 73.3, 75.23, 76.5, 77.3, 74.21, 73.13, 69.13, 70.99, 71.32, 70.2, 70.11, 73.1, 74.25, 77.39, 80.31, 83.39, 81.86, 82.72, 83.93, 80.88, 76.23, 72.61, 75.63, 81.81, 77.24, 74.71, 69.87, 66.41, 66.44, 66.76, 68.41, 66.99, 67.96, 71.38, 67.54, 61.87, 62.7, 62.02, 70.07, 75.53, 72.16, 69.97, 70.05, 72.7, 71.89, 66.55, 64.44, 65.84, 63.91, 59.0, 61.31, 63.08, 63.3, 68.33, 69.37, 66.97, 65.29, 66.68, 66.76, 67.47, 70.12, 67.8, 70.48, 66.78, 68.89, 68.58, 67.67, 70.66, 69.94, 65.73, 64.19, 63.85, 64.11, 66.95, 69.45, 68.72, 65.96, 62.59, 64.1, 65.34, 68.14, 70.01, 65.59, 61.53, 60.96, 64.56, 66.68, 66.78, 65.37, 61.65, 61.53, 62.0, 64.6, 67.08, 68.61, 71.81, 69.69, 69.47, 64.68, 65.25, 68.25, 68.21, 66.91, 67.85, 69.11, 66.34, 65.35, 65.96, 66.29, 66.1, 66.29, 66.3, 66.84, 67.01, 67.44, 67.6, 67.52, 68.01, 68.42, 68.54, 68.68, 68.91, 69.1, 69.5, 69.67, 69.6, 69.7, 69.7, 69.74, 68.24, 66.77, 65.52, 65.93, 66.37, 66.59, 67.19, 68.1, 68.48, 68.63, 68.61, 68.55, 69.11, 69.97, 70.12, 70.1, 69.9, 69.55, 68.98, 68.65, 68.56, 68.62, 69.1, 69.8, 70.35, 71.19, 71.63, 71.82, 71.38, 71.07, 70.94, 70.55, 70.72, 70.78, 70.93]};

  const getVar = (n, fb) => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb; } catch { return fb; } };
  const COL = { honey: getVar('--honey-yellow','#D4A017'), brown: getVar('--dark-brown','#2F2A26') };

  function mkLine(elId, label, values, unit) {
    const el = document.getElementById(elId);
    if (!el) return null;
    const ctx = el.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dataTS.dates,
        datasets: [{ label, data: values, fill: false, tension: 0.25, borderColor: COL.brown, pointRadius: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: COL.brown,
            bodyColor: COL.brown,
            borderColor: 'rgba(0,0,0,.12)', borderWidth: 1, displayColors: false, padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y} ${unit}`
            }
          }
        },
        scales: {
          x: { ticks: { color: COL.brown, maxTicksLimit: 8 }, grid: { display: false } },
          y: { ticks: { color: COL.brown }, grid: { color: 'rgba(0,0,0,.08)' } }
        }
      }
    });
    // attach for potential enhancements
    el.chart = chart;
    return chart;
  }

  mkLine('chartWeightTrend', 'Peso totale (kg)', dataTS.weight, 'kg');
  mkLine('chartTempTrend', 'Temperatura (°C)', dataTS.temp, '°C');
  mkLine('chartHumTrend', 'Umidità (%)', dataTS.hum, '%');
})();
