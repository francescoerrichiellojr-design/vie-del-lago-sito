# Biglietti di Natale

Biglietto 10×7 cm, 8 per foglio A4, da stampare al 100% su cartoncino 250–300 g e ritagliare lungo il tratteggio.
Sinistra: pittogramma, firma, "Miele di Sulla", anno, QR alla pagina sulla.html. Destra: Per / messaggio / Da.

- Vuoti: `python3 genera.py && node pdf.js biglietti-vuoti.pdf`
- Con i messaggi: preparare `messaggi.json` (vedi genera.py), poi `python3 genera.py messaggi.json && node pdf.js biglietti.pdf`
- Per un altro anno o un altro miele: cambiare `ANNO` e il testo "Miele di Sulla" in genera.py (e il QR se serve).

Questo ramo non va unito a `main`: contiene solo materiali di lavoro.
