/* Carrello di Vie del Lago.
   Niente pagamento online e niente spedizioni: il carrello prepara un messaggio WhatsApp (o una email)
   con mieli, quantità, totale e modo di consegna. Il resto si concorda in chat.
   - Pulsanti: <button data-carrello-aggiungi="sulla">…</button>
   - I prodotti, i prezzi e la disponibilità stanno solo qui, in CATALOGO.
   - Il carrello resta nel browser di chi visita (localStorage), anche cambiando pagina. */
(() => {
  'use strict';
  const EN = document.documentElement.lang === 'en';
  const CATALOGO = {
    sulla: { it: 'Miele di Sulla', en: 'Sulla honey', formato: '500 g', prezzo: 20, disponibile: true },
    millefiori: { it: 'Miele Millefiori', en: 'Wildflower honey', formato: '500 g', prezzo: 16, disponibile: false },
    acacia: { it: 'Miele di Acacia', en: 'Acacia honey', formato: '500 g', prezzo: 22, disponibile: false },
    dono: { it: 'Il dono di Natale', en: 'The Christmas gift', formato: { it: '1 vasetto di Sulla in busta regalo', en: '1 jar of Sulla in a gift bag' }, prezzo: 22, disponibile: true, natale: true },
    'dono-doppio': { it: 'Il dono doppio di Natale', en: 'The double Christmas gift', formato: { it: '2 vasetti di Sulla in busta regalo', en: '2 jars of Sulla in a gift bag' }, prezzo: 42, disponibile: true, natale: true },
  };
  const T = EN ? {
    carrello: 'Your order', vuoto: 'Your order is empty. Add a honey from its page.', vuotoQui: 'Nothing here yet: add a honey from the list.', aggiungi: 'Add to order', aggiunto: 'Added',
    apri: (n, tot) => `Your order · ${n} ${n === 1 ? 'item' : 'items'} · ${tot}`, chiudi: 'Close', togli: 'Remove', meno: 'One less', piu: 'One more',
    totale: 'Total', ricevi: 'How would you like it?', ritiro: 'Collect at our farm', ritiroDett: 'Contrada Pescara 74, Conza della Campania (AV)',
    consegna: 'Delivery in Campania', consegnaDett: 'We bring it to you: day and cost to be agreed', comune: 'Town for delivery',
    nome: 'Your name', note: 'Notes (optional)', notePh: 'E.g. a day that suits you, a gift message…',
    paga: 'You pay on collection or delivery: bank transfer, Satispay or cash. Nothing is paid online.',
    natale: 'Christmas gifts are collected at our farm by 23 December.',
    invia: 'Send the order on WhatsApp', email: 'Or send it by email', svuota: 'Empty the order',
    dopo: 'We reply on WhatsApp to confirm availability and agree on the day.',
    mancaNome: 'Add your name, so we know who the order is from.', mancaComune: 'Tell us the town for delivery.',
    msg: 'Hello Vie del Lago, I would like to order:', msgTot: 'Total', msgRitiro: 'Collection at your farm', msgConsegna: 'Delivery to', msgNome: 'Name', msgNote: 'Notes',
    oggetto: 'Order from the website',
  } : {
    carrello: 'Il tuo ordine', vuoto: 'Il tuo ordine è vuoto. Aggiungi un miele dalla sua pagina.', vuotoQui: "Ancora niente: aggiungi un miele dall'elenco.", aggiungi: "Aggiungi all'ordine", aggiunto: 'Aggiunto',
    apri: (n, tot) => `Il tuo ordine · ${n} ${n === 1 ? 'pezzo' : 'pezzi'} · ${tot}`, chiudi: 'Chiudi', togli: 'Togli', meno: 'Uno in meno', piu: 'Uno in più',
    totale: 'Totale', ricevi: 'Come lo vuoi ricevere?', ritiro: 'Ritiro in azienda', ritiroDett: 'Contrada Pescara 74, Conza della Campania (AV)',
    consegna: 'Consegna in Campania', consegnaDett: 'Te lo portiamo noi: giorno e costo da concordare', comune: 'Comune di consegna',
    nome: 'Il tuo nome', note: 'Note (facoltative)', notePh: 'Per esempio un giorno che ti va bene, un biglietto per il regalo…',
    paga: 'Paghi al ritiro o alla consegna: bonifico, Satispay o contanti. Online non si paga nulla.',
    natale: 'I regali di Natale si ritirano in azienda entro il 23 dicembre.',
    invia: "Invia l'ordine su WhatsApp", email: 'Oppure mandalo via email', svuota: "Svuota l'ordine",
    dopo: 'Ti rispondiamo su WhatsApp per confermare la disponibilità e fissare il giorno.',
    mancaNome: "Scrivi il tuo nome, così sappiamo di chi è l'ordine.", mancaComune: 'Scrivi il comune dove consegnare.',
    msg: 'Ciao Vie del Lago, vorrei ordinare:', msgTot: 'Totale', msgRitiro: 'Ritiro in azienda', msgConsegna: 'Consegna a', msgNome: 'Nome', msgNote: 'Note',
    oggetto: 'Ordine dal sito',
  };
  const euro = (n) => '€' + (Number.isInteger(n) ? n : n.toFixed(2).replace('.', ','));
  const nome = (id) => CATALOGO[id][EN ? 'en' : 'it'];
  const formato = (id) => { const f = CATALOGO[id].formato; return typeof f === 'string' ? f : f[EN ? 'en' : 'it']; };

  // --- stato, salvato nel browser (se il browser lo permette)
  const CHIAVE = 'vdl-carrello';
  let stato = { righe: {}, modo: 'ritiro', comune: '', nome: '', note: '' };
  try { const s = JSON.parse(localStorage.getItem(CHIAVE) || 'null'); if (s && s.righe) stato = Object.assign(stato, s); } catch (e) { /* niente */ }
  for (const id of Object.keys(stato.righe)) if (!CATALOGO[id] || !CATALOGO[id].disponibile || !(stato.righe[id] > 0)) delete stato.righe[id];
  const salva = () => { try { localStorage.setItem(CHIAVE, JSON.stringify(stato)); } catch (e) { /* niente */ } };
  const pezzi = () => Object.values(stato.righe).reduce((a, b) => a + b, 0);
  const totale = () => Object.entries(stato.righe).reduce((a, [id, q]) => a + CATALOGO[id].prezzo * q, 0);

  // --- interfaccia: pulsante fisso in basso e pannello
  const el = (tag, attr = {}, ...figli) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attr)) { if (k === 'testo') e.textContent = v; else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); }
    for (const f of figli) if (f) e.append(f);
    return e;
  };
  // nella pagina Ordina il carrello sta dentro la pagina; altrove è un pannello che si apre dal pulsante in basso
  const qui = document.querySelector('[data-carrello-qui]');
  const apri = el('button', { type: 'button', class: 'carrello-apri', 'aria-haspopup': 'dialog', hidden: true });
  const pannello = qui ? el('div', { class: 'carrello carrello--pagina', role: 'region', 'aria-labelledby': 'carrello-titolo' }) : el('dialog', { class: 'carrello', 'aria-labelledby': 'carrello-titolo' });
  pannello.innerHTML = `
    <div class="carrello__testa"><h2 id="carrello-titolo">${T.carrello}</h2>${qui ? '' : `<button type="button" class="carrello__chiudi" aria-label="${T.chiudi}">×</button>`}</div>
    <p class="carrello__vuoto">${qui ? T.vuotoQui : T.vuoto}</p>
    <ul class="carrello__righe"></ul>
    <p class="carrello__totale"><span>${T.totale}</span><strong></strong></p>
    <form class="carrello__modulo" novalidate>
      <fieldset class="carrello__modo"><legend>${T.ricevi}</legend>
        <label><input type="radio" name="modo" value="ritiro"><span><b>${T.ritiro}</b><small>${T.ritiroDett}</small></span></label>
        <label><input type="radio" name="modo" value="consegna"><span><b>${T.consegna}</b><small>${T.consegnaDett}</small></span></label>
      </fieldset>
      <label class="carrello__campo carrello__comune"><span>${T.comune}</span><input name="comune" autocomplete="address-level2"></label>
      <label class="carrello__campo"><span>${T.nome}</span><input name="nome" autocomplete="name"></label>
      <label class="carrello__campo"><span>${T.note}</span><textarea name="note" rows="2" placeholder="${T.notePh}"></textarea></label>
      <p class="carrello__avviso carrello__natale" hidden>${T.natale}</p>
      <p class="carrello__avviso">${T.paga}</p>
      <p class="carrello__errore" role="alert"></p>
      <button type="submit" class="btn btn--pieno carrello__invia">${T.invia} <span class="freccia" aria-hidden="true">→</span></button>
      <p class="carrello__dopo">${T.dopo}</p>
      <p class="carrello__altro"><a class="carrello__email" href="mailto:info@viedellagoapicoltura.it">${T.email}</a> · <button type="button" class="carrello__svuota">${T.svuota}</button></p>
    </form>`;
  const $ = (s) => pannello.querySelector(s);
  const modulo = $('.carrello__modulo');

  function disegna() {
    const n = pezzi(), tot = totale();
    apri.hidden = n === 0 || !!qui;
    apri.textContent = T.apri(n, euro(tot));
    pannello.classList.toggle('carrello--vuoto', n === 0);
    const ul = $('.carrello__righe'); ul.textContent = '';
    for (const [id, q] of Object.entries(stato.righe)) {
      const p = CATALOGO[id];
      ul.append(el('li', { class: 'carrello__riga' },
        el('div', {}, el('b', { testo: nome(id) }), el('small', { testo: `${formato(id)} · ${euro(p.prezzo)}` })),
        el('div', { class: 'carrello__qta' },
          el('button', { type: 'button', 'data-meno': id, 'aria-label': `${T.meno}: ${nome(id)}`, testo: '−' }),
          el('output', { 'aria-live': 'polite', testo: String(q) }),
          el('button', { type: 'button', 'data-piu': id, 'aria-label': `${T.piu}: ${nome(id)}`, testo: '+' })),
        el('strong', { class: 'carrello__parziale', testo: euro(p.prezzo * q) }),
        el('button', { type: 'button', class: 'carrello__togli', 'data-togli': id, testo: T.togli })));
    }
    $('.carrello__totale strong').textContent = euro(tot);
    modulo.modo.value = stato.modo;
    $('.carrello__comune').hidden = stato.modo !== 'consegna';
    $('.carrello__natale').hidden = !Object.keys(stato.righe).some((id) => CATALOGO[id].natale);
    $('.carrello__email').href = 'mailto:info@viedellagoapicoltura.it?subject=' + encodeURIComponent(T.oggetto) + '&body=' + encodeURIComponent(messaggio());
  }

  function messaggio() {
    const r = [T.msg];
    for (const [id, q] of Object.entries(stato.righe)) r.push(`• ${q} × ${nome(id)} (${formato(id)}): ${euro(CATALOGO[id].prezzo * q)}`);
    r.push(`${T.msgTot}: ${euro(totale())}`, '');
    r.push(stato.modo === 'consegna' ? `${T.msgConsegna}: ${stato.comune.trim()}` : T.msgRitiro);
    if (stato.nome.trim()) r.push(`${T.msgNome}: ${stato.nome.trim()}`);
    if (stato.note.trim()) r.push(`${T.msgNote}: ${stato.note.trim()}`);
    return r.join('\n');
  }

  function cambia(id, d) {
    const q = (stato.righe[id] || 0) + d;
    if (q > 0) stato.righe[id] = Math.min(q, 99); else delete stato.righe[id];
    salva(); disegna();
  }

  function aggiungi(id, bottone) {
    if (!CATALOGO[id] || !CATALOGO[id].disponibile) return;
    cambia(id, 1);
    if (window.gtag) gtag('event', 'add_to_cart', { currency: 'EUR', value: CATALOGO[id].prezzo, items: [{ item_id: id, item_name: CATALOGO[id].it }] });
    if (bottone) {
      const prima = bottone.dataset.testo || (bottone.dataset.testo = bottone.innerHTML);
      bottone.innerHTML = `${T.aggiunto} ✓`; bottone.classList.add('btn--fatto');
      clearTimeout(bottone._t); bottone._t = setTimeout(() => { bottone.innerHTML = prima; bottone.classList.remove('btn--fatto'); }, 1600);
    }
    apri.classList.remove('carrello-apri--nuovo'); void apri.offsetWidth; apri.classList.add('carrello-apri--nuovo');
  }

  // --- eventi
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-carrello-aggiungi]');
    if (b) { e.preventDefault(); aggiungi(b.getAttribute('data-carrello-aggiungi'), b); }
    const a = e.target.closest('[data-carrello-apri]');
    if (a) { e.preventDefault(); mostra(); }
  });
  apri.addEventListener('click', mostra);
  function mostra() {
    disegna();
    if (qui) { pannello.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (typeof pannello.showModal === 'function') pannello.showModal(); else pannello.setAttribute('open', '');
    document.documentElement.classList.add('carrello-aperto');
  }
  const chiudi = () => { if (pannello.open) pannello.close(); };
  pannello.addEventListener('close', () => document.documentElement.classList.remove('carrello-aperto'));
  if (!qui) $('.carrello__chiudi').addEventListener('click', chiudi);
  pannello.addEventListener('click', (e) => { if (e.target === pannello) chiudi(); });   // tocco fuori dal pannello
  pannello.addEventListener('click', (e) => {
    const m = e.target.closest('[data-meno]'), p = e.target.closest('[data-piu]'), t = e.target.closest('[data-togli]');
    if (m) cambia(m.dataset.meno, -1); else if (p) cambia(p.dataset.piu, 1); else if (t) cambia(t.dataset.togli, -999);
  });
  modulo.addEventListener('input', () => {
    stato.modo = modulo.modo.value || 'ritiro'; stato.comune = modulo.comune.value; stato.nome = modulo.nome.value; stato.note = modulo.note.value;
    $('.carrello__errore').textContent = '';
    salva(); disegna();
  });
  $('.carrello__svuota').addEventListener('click', () => { stato.righe = {}; salva(); disegna(); });
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('.carrello__errore');
    if (!pezzi()) return;
    if (stato.modo === 'consegna' && !stato.comune.trim()) { err.textContent = T.mancaComune; modulo.comune.focus(); return; }
    if (!stato.nome.trim()) { err.textContent = T.mancaNome; modulo.nome.focus(); return; }
    // il numero viene composto qui, come in script.js: nell'HTML non c'è
    const wa = ['39', '329', '349', '6354'].join('');
    if (window.gtag) gtag('event', 'begin_checkout', { currency: 'EUR', value: totale() });
    window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(messaggio()), '_blank', 'noopener');
  });

  // finché c'è il banner dei cookie il pulsante sta sopra, altrimenti resterebbe coperto
  function sopraBanner() {
    const bn = document.getElementById('cookie-banner');
    const h = bn && getComputedStyle(bn).display !== 'none' ? bn.getBoundingClientRect().height : 0;
    apri.style.setProperty('--carrello-su', h ? h + 'px' : '0px');
  }
  const monta = () => {
    modulo.nome.value = stato.nome; modulo.comune.value = stato.comune; modulo.note.value = stato.note;
    document.body.append(apri); (qui || document.body).append(pannello); disegna();
    const bn = document.getElementById('cookie-banner');
    if (bn) {
      new MutationObserver(sopraBanner).observe(bn, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
      if (window.ResizeObserver) new ResizeObserver(sopraBanner).observe(bn);
    }
    sopraBanner();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monta); else monta();
})();
