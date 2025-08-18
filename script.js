// Vie del Lago — script base
// - Scroll dolce per gli anchor link
// - Pulsanti "Scopri di più" dei prodotti: compongono una mail precompilata
// - Piccoli miglioramenti di accessibilità

(function(){
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Smooth scroll per link interni (es. #chi-siamo)
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const hash = a.getAttribute('href');
      if(!hash || hash === '#') return; // link vuoto
      const id = hash.slice(1);
      const target = document.getElementById(id);
      if(target){
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
        // sposta il focus per a11y
        target.setAttribute('tabindex','-1');
        target.focus({ preventScroll:true });
      }
    });
  });

  // Trasforma i pulsanti dei prodotti in email precompilate
  const EMAIL_DEST = 'info@viedellago.it';
  document.querySelectorAll('.product-card .btn-secondary').forEach(btn => {
    btn.addEventListener('click', e => {
      const card = e.currentTarget.closest('.product-card');
      const name = card?.querySelector('h4')?.textContent?.trim() || 'Prodotto';
      const mailto = new URL('mailto:' + EMAIL_DEST);
      mailto.searchParams.set('subject', `Richiesta informazioni — ${name}`);
      mailto.searchParams.set('body', `Ciao,
vorrei avere maggiori informazioni su ${name}.
Grazie!`);
      e.preventDefault();
      window.location.href = mailto.toString();
    });
  });

  // Effetto "reveal" semplice: aggiunge la classe .in quando l'elemento entra in viewport
  const toReveal = document.querySelectorAll('.about, .quote, .bees');
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('in'); } });
    }, { threshold: 0.1 });
    toReveal.forEach(el => io.observe(el));
  } else {
    // fallback
    toReveal.forEach(el => el.classList.add('in'));
  }
})();
