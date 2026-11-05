#!/usr/bin/env python3
"""Aggiorna la griglia Instagram della home con le ultime 6 foto del profilo.

Eseguito ogni giorno da .github/workflows/instagram.yml.

- Legge il codice di accesso dalla variabile d'ambiente IG_TOKEN
  (un segreto del repository: non compare mai nel codice né nei log).
- Scarica le ultime foto dal profilo tramite l'API ufficiale di Instagram.
- Le ritaglia a 480x480, le salva come img/ig-photo-1..6 (.webp e .jpg)
  e aggiorna link e testi alternativi in index.html.
- Se Instagram non risponde o il codice non è valido, termina con errore
  SENZA toccare il sito: restano le ultime foto scaricate.
- Con l'opzione --refresh rinnova il codice di accesso (dura 60 giorni)
  e, se Instagram ne restituisce uno nuovo, lo scrive nel file indicato
  da NEW_TOKEN_FILE perché il passo successivo aggiorni il segreto.
"""
import html
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
IMG_DIR = ROOT / "img"
API = "https://graph.instagram.com"
# Codici "utente di sistema" (Unified login): passano da graph.facebook.com
# con l'ID numerico del profilo Instagram professionale.
FB_API = "https://graph.facebook.com/" + os.environ.get("IG_GRAPH_VERSION", "v23.0")
IG_USER_ID = os.environ.get("IG_USER_ID", "17841401629302753")  # @viedellagoapicoltura
PROFILE = "https://www.instagram.com/viedellagoapicoltura/"
N_PHOTOS = 6
SIZE = 480
START, END = "<!-- IG:START -->", "<!-- IG:END -->"


class ApiError(Exception):
    pass


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "vie-del-lago-sito/instagram-sync"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        # Il messaggio di Meta non contiene il codice di accesso.
        body = e.read().decode("utf-8", "replace")[:300]
        raise ApiError(f"errore {e.code}: {body}") from None


def fetch_media(token: str) -> list:
    """Prova prima l'API Instagram, poi l'API Graph di Facebook (codici di sistema)."""
    fields = "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp"
    q = urllib.parse.urlencode({"fields": fields, "limit": 25, "access_token": token})
    errors = []
    for url in (f"{API}/me/media?{q}", f"{FB_API}/{IG_USER_ID}/media?{q}"):
        try:
            return get_json(url).get("data", [])
        except ApiError as e:
            errors.append(f"{url.split('?')[0]} → {e}")
    sys.exit("Impossibile leggere i post:\n" + "\n".join(errors))


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "vie-del-lago-sito/instagram-sync"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def alt_text(caption: str | None, i: int) -> str:
    if not caption:
        return f"Foto dal profilo Instagram di Vie del Lago Apicoltura ({i})"
    text = re.sub(r"#\w+", "", caption)          # niente hashtag nel testo alternativo
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > 110:
        text = text[:107].rsplit(" ", 1)[0] + "…"
    return text or f"Foto dal profilo Instagram di Vie del Lago Apicoltura ({i})"


def refresh(token: str) -> None:
    q = urllib.parse.urlencode({"grant_type": "ig_refresh_token", "access_token": token})
    try:
        data = get_json(f"{API}/refresh_access_token?{q}")
    except ApiError:
        # I codici "utente di sistema" non scadono e non si rinnovano: va bene così.
        print("Il codice non è rinnovabile con questo metodo (probabilmente non scade): nessuna azione.")
        return
    new = data.get("access_token")
    days = int(data.get("expires_in", 0)) // 86400
    print(f"Codice di accesso rinnovato: valido per altri {days} giorni.")
    out = os.environ.get("NEW_TOKEN_FILE")
    if new and new != token and out:
        Path(out).write_text(new)
        print("Instagram ha restituito un codice nuovo: verrà salvato nei segreti.")


def sync(token: str) -> None:
    items = fetch_media(token)

    posts = []
    for it in items:
        url = it.get("thumbnail_url") if it.get("media_type") == "VIDEO" else it.get("media_url")
        if url:
            posts.append((it, url))
        if len(posts) == N_PHOTOS:
            break
    if len(posts) < N_PHOTOS:
        sys.exit(f"Trovate solo {len(posts)} foto utilizzabili su {N_PHOTOS}: il sito non viene modificato.")

    links = []
    for i, (it, _url) in enumerate(posts, start=1):
        v = re.sub(r"\W", "", it["id"])[-8:]          # cambia solo quando cambia il post
        alt = html.escape(alt_text(it.get("caption"), i), quote=True)
        href = html.escape(it.get("permalink") or PROFILE, quote=True)
        links.append(
            f'        <a href="{href}" target="_blank" rel="noopener" class="ig-photo-link">\n'
            f'          <picture><source srcset="img/ig-photo-{i}.webp?v={v}" type="image/webp">'
            f'<img src="img/ig-photo-{i}.jpg?v={v}" alt="{alt}" width="240" height="240" loading="lazy"></picture>\n'
            f'        </a>'
        )

    page = INDEX.read_text(encoding="utf-8")
    if START not in page or END not in page:
        sys.exit("Segnaposto IG:START / IG:END non trovati in index.html.")
    block = START + "\n" + "\n".join(links) + "\n        " + END
    current = re.search(re.escape(START) + r".*?" + re.escape(END), page, flags=re.S).group(0)
    if current == block:
        print("Nessun post nuovo: la griglia è già aggiornata.")
        return

    # Prima scarica e prepara tutto in memoria: se qualcosa fallisce, il sito resta com'era.
    prepared = []
    for i, (it, url) in enumerate(posts, start=1):
        im = Image.open(io.BytesIO(download(url)))
        im = ImageOps.exif_transpose(im).convert("RGB")
        im = ImageOps.fit(im, (SIZE, SIZE), Image.LANCZOS)
        prepared.append(im)
    for i, im in enumerate(prepared, start=1):
        im.save(IMG_DIR / f"ig-photo-{i}.webp", "WEBP", quality=80, method=6)
        im.save(IMG_DIR / f"ig-photo-{i}.jpg", "JPEG", quality=82, optimize=True, progressive=True)

    page = page.replace(current, block, 1)
    INDEX.write_text(page, encoding="utf-8")
    print(f"Griglia aggiornata con {N_PHOTOS} foto (la più recente: {posts[0][0].get('timestamp', '?')}).")


def main() -> None:
    token = os.environ.get("IG_TOKEN", "").strip()
    if not token:
        # Durante la configurazione il segreto può non esserci ancora:
        # si esce senza errore per non generare email di fallimento ogni giorno.
        print("::warning::Manca il segreto IG_TOKEN: griglia Instagram non aggiornata.")
        return
    if "--refresh" in sys.argv:
        refresh(token)
    else:
        sync(token)


if __name__ == "__main__":
    main()
