"""Biglietti di Natale Vie del Lago (10x7 cm, 8 per foglio A4).

Uso:
  python3 genera.py                      -> biglietti vuoti (da scrivere a mano)
  python3 genera.py messaggi.json        -> biglietti compilati

messaggi.json: lista di oggetti {"per": "...", "messaggio": "...", "da": "...", "copie": 1}
Esempio: [{"per": "Studio Rossi", "messaggio": "Buone feste ...", "da": "Vie del Lago", "copie": 20}]
Crea biglietti.html nella stessa cartella; il PDF si ottiene con pdf.js (Playwright).
"""
import sys, re, json, html, os
D = os.path.dirname(os.path.abspath(__file__))
marchio = open(f'{D}/marchio.d').read()
qr = open(f'{D}/qr.svg').read()
qr = re.sub(r'<\?xml[^>]*>', '', qr); qr = re.sub(r'width="[^"]*"\s*height="[^"]*"', '', qr, count=1).replace('<svg ', '<svg class="qr" ', 1)
ANNO = 'Natale 2026'


def carta(per='', msg='', da=''):
    e = html.escape
    righe_msg = ''
    if msg:
        righe_msg = f'<div class="msg">{e(msg)}</div>'
    else:
        righe_msg = '<div class="riga"></div>' * 4
    return f'''<div class="c">
  <div class="sx">
    <svg class="mk" viewBox="0 0 592 592"><path fill-rule="evenodd" d="{marchio}"/></svg>
    <img class="firma" src="logo-firma-terra.png" alt="">
    <div class="sulla">Miele di Sulla</div>
    <div class="anno">{ANNO}</div>
    <div class="qrb">{qr}<span>Scopri da dove<br>viene questo miele</span></div>
  </div>
  <div class="dx">
    <div class="riga per"><span>Per</span><b>{e(per)}</b></div>
    {righe_msg}
    <div class="riga da"><span>Da</span><b>{e(da)}</b></div>
    <div class="piede">Lago di Conza · Alta Irpinia</div>
  </div>
</div>'''


CSS = '''
@font-face{font-family:G;src:url(gloock-latin-400-normal.woff2)}
@font-face{font-family:EB;src:url(eb-garamond-latin-500-normal.woff2)}
@font-face{font-family:EB;font-style:italic;src:url(eb-garamond-latin-500-italic.woff2)}
@font-face{font-family:M;font-weight:500;src:url(manrope-latin-500-normal.woff2)}
@font-face{font-family:M;font-weight:600;src:url(manrope-latin-600-normal.woff2)}
@page{size:A4;margin:0}
*{margin:0;box-sizing:border-box}
body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.foglio{position:relative;width:210mm;height:297mm;page-break-after:always;overflow:hidden}
.griglia{position:absolute;left:5mm;top:8.5mm;width:200mm;height:280mm;display:grid;grid-template-columns:100mm 100mm;grid-template-rows:repeat(4,70mm)}
.c{position:relative;display:grid;grid-template-columns:38mm 1fr;padding:6mm 6mm 5mm 6mm;color:#1E1A12;outline:.1mm dashed #c9c4b4;outline-offset:-.05mm}
.c::before{content:"";position:absolute;inset:3mm;border:.25mm solid #7E5410;opacity:.55}
.sx{display:flex;flex-direction:column;align-items:center;text-align:center;padding-right:4mm;border-right:.2mm solid rgba(126,84,16,.35)}
.mk{width:8mm;height:8mm;fill:#7E5410;margin-top:1mm}
.firma{width:31mm;margin-top:1.6mm}
.sulla{font:400 12.5pt/1 G;margin-top:2.2mm;color:#8E4478}
.anno{font:italic 500 9pt EB;color:#55574A;margin-top:1mm}
.qrb{margin-top:auto;display:flex;align-items:center;gap:1.8mm}
.qr{width:11mm;height:11mm}.qr path{fill:#1E1A12}
.qrb span{font:500 5.2pt/1.25 M;color:#55574A;text-align:left}
.dx{display:flex;flex-direction:column;padding-left:5mm;padding-top:1.5mm}
.riga{height:7.6mm;border-bottom:.2mm solid rgba(30,26,18,.35);display:flex;align-items:flex-end;gap:2.5mm;padding-bottom:.8mm}
.riga span{font:italic 500 10.5pt EB;color:#7E5410}
.riga b{font:italic 500 11pt EB;color:#1E1A12}
.msg{flex:1;display:flex;align-items:center;padding:2mm 0;font:italic 500 11pt/1.35 EB;color:#1E1A12;border-bottom:.2mm solid rgba(30,26,18,.35)}
.piede{margin-top:auto;font:600 5.2pt M;letter-spacing:.18em;text-transform:uppercase;color:#7E5410;text-align:right}
'''


def genera(voci):
    carte = []
    for v in voci:
        carte += [carta(v.get('per', ''), v.get('messaggio', ''), v.get('da', ''))] * int(v.get('copie', 1))
    if not carte:
        carte = [carta()] * 8
    while len(carte) % 8:
        carte.append(carta())   # completa l'ultimo foglio con biglietti vuoti
    fogli = ''.join(f'<div class="foglio"><div class="griglia">{"".join(carte[i:i+8])}</div></div>' for i in range(0, len(carte), 8))
    open(f'{D}/biglietti.html', 'w').write(f'<!doctype html><html lang="it"><meta charset="utf-8"><title>Biglietti</title><style>{CSS}</style><body>{fogli}</body></html>')
    return len(carte)


if __name__ == '__main__':
    voci = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else []
    print('biglietti:', genera(voci))
