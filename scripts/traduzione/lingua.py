"""Aggiunge alle pagine italiane il selettore di lingua (EN) e i link hreflang. Idempotente."""
import re, glob, os
SITO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOM = 'https://www.viedellagoapicoltura.it'


def url_it(p): return f'{DOM}/' if p == 'index.html' else f'{DOM}/{p}'
def url_en(p): return f'{DOM}/en/' if p == 'index.html' else f'{DOM}/en/{p}'


def hreflang(p):
    if p == '404.html':
        return ''
    return (f'\n  <link rel="alternate" hreflang="it" href="{url_it(p)}">'
            f'\n  <link rel="alternate" hreflang="en" href="{url_en(p)}">'
            f'\n  <link rel="alternate" hreflang="x-default" href="{url_it(p)}">')


def lingua_link(p):
    dest = '/en/' if p == 'index.html' else f'/en/{p}'
    return f'      <a class="lingua" href="{dest}" hreflang="en" lang="en" aria-label="English version">EN</a>\n'


def applica(p):
    f = f'{SITO}/{p}'
    s = open(f, encoding='utf8').read()
    s = re.sub(r'\n\s*<link rel="alternate" hreflang="[^"]+" href="[^"]+">', '', s)
    s = re.sub(r'      <a class="lingua"[^\n]*\n', '', s)
    # la 404 italiana manda alla 404 inglese chi cercava una pagina in /en/
    s = re.sub(r'\n\s*<script>if\(location\.pathname\.indexOf\(\'/en/\'\)===0.*?</script>', '', s)
    if p == '404.html':
        s = re.sub(r'\s*</head>', lambda m: "\n  <script>if(location.pathname.indexOf('/en/')===0&&location.pathname!=='/en/404.html')location.replace('/en/404.html')</script>\n</head>", s, count=1)
    h = hreflang(p)
    if h:
        s = re.sub(r'\s*</head>', lambda m: h + '\n</head>', s, count=1)
    i = s.find('<nav class="menu"')
    if i >= 0:
        j = s.index('</nav>', i)
        k = s.rfind('\n', i, j) + 1          # inizio della riga di </nav>
        s = s[:k] + lingua_link(p) + s[k:]
    open(f, 'w', encoding='utf8').write(s)


if __name__ == '__main__':
    for f in sorted(glob.glob(f'{SITO}/*.html')):
        applica(os.path.basename(f))
    print('lingua: ok')
