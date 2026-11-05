/* Mappa del territorio: si carica solo se il visitatore la chiede,
   perché le tessere di OpenStreetMap arrivano da un server esterno. */
(function () {
  var box = document.querySelector('[data-mappa]');
  if (!box) return;
  var btn = box.querySelector('[data-mappa-carica]');
  function carica(src, tipo) {
    return new Promise(function (ok, ko) {
      var el = document.createElement(tipo === 'css' ? 'link' : 'script');
      if (tipo === 'css') { el.rel = 'stylesheet'; el.href = src; } else { el.src = src; }
      el.onload = ok; el.onerror = ko; document.head.appendChild(el);
    });
  }
  btn.addEventListener('click', function () {
    btn.disabled = true; btn.textContent = 'Caricamento…';
    Promise.all([carica('/vendor/leaflet-1.9.4/leaflet.css', 'css'), carica('/vendor/leaflet-1.9.4/leaflet.js', 'js')]).then(function () {
      box.innerHTML = '<div class="mappa__carta" id="mappa-carta" data-lenis-prevent></div>';
      box.classList.add('is-loaded');
      var L = window.L;
      var map = L.map('mappa-carta', { center: [40.8813, 15.2985], zoom: 13, scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map);
      function icona(cls) { return L.divIcon({ className: '', html: '<span class="puntino ' + cls + '" style="display:block;width:20px;height:20px"></span>', iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -12] }); }
      var punti = [
        [40.87128953038465, 15.300502782432183, 'puntino--apiario', 'Apiario Priscilla', "Il nostro apiario stanziale: qui vivono le famiglie di <em>Apis mellifera ligustica</em> che producono tutti i nostri mieli."],
        [40.889290, 15.296503, 'puntino--oasi', 'Oasi WWF di Conza', "Area protetta di circa 3.700 ettari, zona umida di importanza europea."],
        [40.89628953038465, 15.312502782432183, 'puntino--oasi', 'Lago di Conza', "Il bacino sul fiume Ofanto: la massa d'acqua regola il microclima delle fioriture."],
        [40.881290, 15.286503, 'puntino--fiori', 'Praterie della sulla', "Le praterie argillose dove la sulla fiorisce a maggio."],
        [40.865290, 15.290503, 'puntino--fiori', "Valloni dell'acacia", "I fondovalle umidi dove cresce la robinia, in fiore per 8–12 giorni l'anno."],
        [40.886290, 15.282503, 'puntino--fiori', 'Prati del millefiori', "Trifoglio, borragine, origano, timo e centaurea: la varietà che fa il nostro Millefiori."]
      ];
      punti.forEach(function (p) {
        L.marker([p[0], p[1]], { icon: icona(p[2]), title: p[3] }).addTo(map).bindPopup('<strong>' + p[3] + '</strong>' + p[4], { maxWidth: 240 });
      });
      L.circle([40.88628953038465, 15.303502782432183], { color: '#4C6B3C', fillColor: '#4C6B3C', fillOpacity: 0.08, weight: 1.5, radius: 2800 }).addTo(map);
    }).catch(function () { btn.disabled = false; btn.textContent = 'Riprova a caricare la mappa'; });
  });
})();
