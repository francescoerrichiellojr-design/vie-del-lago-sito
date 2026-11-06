# Versione inglese del sito

Le pagine in `/en/` si generano dalle pagine italiane: non vanno modificate a mano.

Dopo ogni modifica alle pagine italiane:

```
python3 scripts/traduzione/lingua.py     # selettore IT/EN e link hreflang nelle pagine italiane
python3 scripts/traduzione/inglese.py    # rigenera /en/
```

Se una frase italiana è nuova o cambiata, `inglese.py` si ferma e la elenca:
va aggiunta a `traduzioni.py` (testo italiano esatto → traduzione inglese).
La griglia Instagram della home è copiata così com'è e la aggiorna lo script automatico.
