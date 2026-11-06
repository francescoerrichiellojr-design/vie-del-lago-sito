"""Genera la versione inglese del sito in /en/ a partire dalle pagine italiane.

Uso: python3 inglese.py         (si ferma ed elenca le frasi senza traduzione, se ce ne sono)
"""
import re, json, glob, os, sys, html
from html.parser import HTMLParser
from urllib.parse import quote, unquote
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from traduzioni import T

SITO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOM = 'https://www.viedellagoapicoltura.it'
PAGINE = {os.path.basename(f) for f in glob.glob(f'{SITO}/*.html')}
IG_START, IG_END = '<!-- IG:START -->', '<!-- IG:END -->'
ATTR_TESTO = ('alt', 'aria-label', 'title', 'placeholder')
META_TESTO = ('description', 'og:title', 'og:description', 'twitter:title', 'twitter:description', 'og:image:alt', 'twitter:image:alt')
ATTR_URL = ('href', 'src', 'poster', 'data-src', 'data-video', 'action')
MANCANTI = {}
TN = {re.sub(r'\s+', ' ', k).strip(): v for k, v in T.items()}


def ha_testo(v): return bool(re.search(r'[A-Za-zÀ-ÿ]{2}', v))


def tr(testo, pagina):
    """Traduce un testo mantenendo gli spazi iniziali e finali."""
    if not ha_testo(testo):
        return testo
    m = re.match(r'^(\s*)(.*?)(\s*)$', testo, re.S)
    pre, core, post = m.groups()
    chiave = re.sub(r'\s+', ' ', core).strip()
    if chiave in TN:
        return pre + TN[chiave] + post
    MANCANTI.setdefault(chiave, set()).add(pagina)
    return testo


def url_en(v):
    """Riscrive un URL relativo per una pagina che sta in /en/."""
    if not v or v.startswith(('http:', 'https:', 'mailto:', 'tel:', '#', 'data:', '//', 'javascript:')):
        return v
    p = v.lstrip('/')
    base, resto = re.match(r'([^#?]*)(.*)', p).groups()
    if base in ('', 'index.html'):
        return '/en/' + resto
    if base in PAGINE:
        return '/en/' + base + resto
    return '/' + p


def esc(v): return html.escape(v, quote=False).replace('"', '&quot;')


class Trad(HTMLParser):
    def __init__(self, pagina):
        super().__init__(convert_charrefs=False)
        self.p = pagina
        self.out = []
        self.raw = 0          # dentro script/style: testo copiato così com'è
        self.svg = 0

    def tag(self, tag, attrs, chiuso):
        a = []
        attrs = list(attrs)
        d = dict(attrs)
        for k, v in attrs:
            if v is None:
                a.append(k); continue
            if tag == 'html' and k == 'lang':
                v = 'en'
            elif k in ATTR_TESTO and ha_testo(v):
                v = tr(v, self.p)
            elif tag == 'meta' and k == 'content' and (d.get('name') in META_TESTO or d.get('property') in META_TESTO):
                v = tr(v, self.p)
            elif tag == 'meta' and k == 'content' and d.get('property') == 'og:locale':
                v = 'en_GB'
            elif tag == 'meta' and k == 'content' and d.get('property') == 'og:url':
                v = sito_en(v)
            elif tag == 'link' and k == 'href' and d.get('rel') == 'canonical':
                v = sito_en(v)
            elif tag == 'link' and k == 'href' and d.get('rel') == 'alternate':
                pass
            elif k == 'data-wa' and 'text=' in v:
                testo = unquote(v.split('text=', 1)[1])
                v = '?text=' + quote(tr(testo, self.p))
            elif k == 'href' and v.startswith('mailto:') and 'subject=' in v:
                a0, s0 = v.split('subject=', 1)
                v = a0 + 'subject=' + quote(tr(unquote(s0), self.p))
            elif k in ATTR_URL:
                v = url_en(v)
            elif k == 'srcset':
                v = ', '.join(' '.join([url_en(x.split()[0])] + x.split()[1:]) for x in v.split(','))
            elif k == 'style' and 'url(' in v:
                v = re.sub(r'url\((["\']?)(?!https?:|/|data:)', r'url(\1/', v)
            a.append(f'{k}="{esc(v)}"')
        # selettore di lingua: nella versione inglese porta all'italiano
        if tag == 'a' and d.get('class') == 'lingua':
            dest = d['href'].replace('/en/', '/', 1)
            return f'<a class="lingua" href="{dest}" hreflang="it" lang="it" aria-label="Versione italiana">'
        return '<' + tag + (' ' + ' '.join(a) if a else '') + (' />' if chiuso else '>')

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.raw += 1
        self.out.append(self.tag(tag, attrs, False))

    def handle_startendtag(self, tag, attrs):
        self.out.append(self.tag(tag, attrs, True))

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.raw -= 1
        self.out.append(f'</{tag}>')

    def handle_data(self, d):
        if self.raw:
            self.out.append(d)
        elif self.lingua():
            self.out.append('IT')
        else:
            self.out.append(tr(d, self.p))

    def lingua(self):
        ultimo = self.out[-1] if self.out else ''
        return ultimo.startswith('<a class="lingua"')

    def handle_entityref(self, n): self.out.append(f'&{n};')
    def handle_charref(self, n): self.out.append(f'&#{n};')
    def handle_comment(self, d): self.out.append(f'<!--{d}-->')
    def handle_decl(self, d): self.out.append(f'<!{d}>')
    def handle_pi(self, d): self.out.append(f'<?{d}>')
    def unknown_decl(self, d): self.out.append(f'<![{d}]>')


def sito_en(v):
    if v.rstrip('/') == DOM:
        return DOM + '/en/'
    if v.startswith(DOM + '/') and v[len(DOM) + 1:].split('#')[0] in PAGINE:
        return DOM + '/en/' + v[len(DOM) + 1:]
    return v


NON_TRADURRE = {'@context', '@type', '@id', 'url', 'image', 'logo', 'sameAs', 'contentUrl', 'thumbnailUrl', 'priceCurrency',
                'availability', 'telephone', 'email', 'postalCode', 'addressCountry', 'latitude', 'longitude', 'uploadDate',
                'duration', 'itemCondition', 'priceValidUntil', 'price', 'ratingValue', 'sku', 'gtin', 'mpn'}


def ld(o, pagina, chiave=None):
    if isinstance(o, dict):
        return {k: ld(v, pagina, k) for k, v in o.items()}
    if isinstance(o, list):
        return [ld(x, pagina, chiave) for x in o]
    if isinstance(o, str):
        if chiave in ('url', 'item', '@id'):
            return sito_en(o)
        if chiave in NON_TRADURRE or o.startswith('http') or not ha_testo(o):
            return o
        return tr(o, pagina)
    return o


def traduci_pagina(p):
    s = open(f'{SITO}/{p}', encoding='utf8').read()
    # la griglia Instagram resta identica (la aggiorna lo script automatico)
    ig = re.search(re.escape(IG_START) + r'.*?' + re.escape(IG_END), s, re.S)
    segnaposto = '<!--IGBLOCCO-->'
    if ig:
        s = s.replace(ig.group(0), segnaposto)
    t = Trad(p)
    t.feed(s); t.close()
    out = ''.join(t.out)
    if ig:
        blocco = re.sub(r'(src|srcset)="img/', r'\1="/img/', ig.group(0))
        out = out.replace(segnaposto, blocco)

    def rld(m):
        dati = ld(json.loads(m.group(2)), p)
        return m.group(1) + '\n  ' + json.dumps(dati, ensure_ascii=False, indent=2).replace('\n', '\n  ') + '\n  ' + m.group(3)
    out = re.sub(r'(<script type="application/ld\+json">)(.*?)(</script>)', rld, out, flags=re.S)
    return out


if __name__ == '__main__':
    risultati = {p: traduci_pagina(p) for p in sorted(PAGINE)}
    if MANCANTI:
        print(f'{len(MANCANTI)} frasi senza traduzione:')
        for k, v in sorted(MANCANTI.items(), key=lambda x: sorted(x[1])):
            print(json.dumps(k, ensure_ascii=False), '←', ', '.join(sorted(v)))
        sys.exit(1)
    os.makedirs(f'{SITO}/en', exist_ok=True)
    for p, h in risultati.items():
        open(f'{SITO}/en/{p}', 'w', encoding='utf8').write(h)
    print(f'inglese: {len(risultati)} pagine scritte in /en/')
