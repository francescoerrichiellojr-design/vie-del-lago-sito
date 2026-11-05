#!/usr/bin/env python3
"""Diagnostica temporanea: mostra a quali oggetti dà accesso il codice IG_TOKEN.
Stampa solo ID e nomi, mai il codice."""
import json, os, urllib.parse, urllib.request
T = os.environ["IG_TOKEN"].strip()
V = "https://graph.facebook.com/v23.0"
def call(path, **params):
    params["access_token"] = T
    url = f"{V}/{path}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {"ERRORE": e.read().decode()[:250]}
print("lunghezza codice:", len(T), "| inizio:", T[:4])
for path, p in [("me", {"fields": "id,name"}),
                ("me/accounts", {"fields": "id,name,instagram_business_account"}),
                ("me/businesses", {"fields": "id,name"}),
                ("me", {"fields": "instagram_business_account"}),
                ("17841401629302753", {"fields": "id,username"}),
                ("me/permissions", {})]:
    print(path, p.get("fields", ""), "→", json.dumps(call(path, **p))[:400])
for host in ["https://graph.instagram.com", "https://graph.instagram.com/v23.0"]:
    try:
        with urllib.request.urlopen(f"{host}/me?fields=id,username&access_token={urllib.parse.quote(T)}", timeout=30) as r:
            print(host, "→", r.read()[:200])
    except urllib.error.HTTPError as e:
        print(host, "→ ERRORE", e.read()[:200])
