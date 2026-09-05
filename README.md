# BIM Lead Capture

App da stand per Born in Monge. La hostess ferma una persona, quella lascia
nome, cognome, email e consenso su un iPad, gioca con le biglie e vince
sempre lo sconto 20% con codice MONGE20. I contatti restano sull'iPad e si
esportano in CSV.

Flusso: intro, dati, estrazione, premio, ritorno alla intro.

## File

```
index.html              schermate
css/app.css             stile, palette in cima al file
js/water.js             sfondo acqua (shader WebGL)
js/app.js               flusso, biglie, archivio, area riservata
sw.js                   cache offline, alzare CACHE a ogni deploy
manifest.webmanifest    installazione su Home
assets/                 water.jpg, logo.png, cherry.png, font Montserrat
icons/                  icone PWA
tools/                  generatore degli asset segnaposto
```

## Asset da sostituire

`assets/water.jpg`, `assets/logo.png`, `assets/cherry.png` e le icone in
`icons/` sono segnaposto generati da `tools/make-placeholder-assets.py`.
Sovrascrivili con gli originali tenendo gli stessi nomi, non serve toccare
il codice. Se un file manca l'app non si rompe: senza logo compare la
scritta Born in Monge, senza ciliegie sparisce la decorazione, senza foto
resta il fondo acqua.

Il Montserrat 600 e 900 e' in `assets/fonts/` come woff2, quindi allo stand
non serve rete per i font.

## Sfondo

Lo shader in `js/water.js` deforma una sorgente reale, non disegna acqua
finta. Le onde sono sei direzionali a frequenze non armoniche piu' due
svergolamenti lenti del dominio: la somma non torna mai uguale, quindi non
si vede il loop. Sopra ci sono rifrazione con leggera dispersione cromatica,
riflessi speculari radi e una spinta di colore verso l'acqua del brand.

Manopole, si passano al costruttore in fondo a `js/app.js`:

```js
new window.BimWater(document.getElementById('bg'), {
  refract: 0.0016,   // quanto increspa, oltre 0.003 si vede che e' finto
  sparkle: 0.34,     // luccichii
  tint:    0.14,     // spinta verso #7FD1D8
  speed:   1.0,      // 0.6 per un moto piu' lento
  zoom:    1.07      // margine di sicurezza sui bordi, non scendere sotto 1.04
});
```

### Video al posto della foto

Se metti un `assets/water.mp4` l'app lo usa da sola come sorgente, con le
onde ridotte perche' il video si muove gia' di suo. Nessuna modifica al
codice, basta il file. Pesa di piu' ma la resa e' quella del girato.
Consigliato: loop di 10 o 15 secondi, 1280x720, H.264, sotto i 4 MB, senza
audio. Aggiungi `'./assets/water.mp4'` alla lista `SHELL` in `sw.js` per
averlo anche offline.

Se WebGL non parte, resta la foto ferma. Con `prefers-reduced-motion` lo
sfondo si ferma su un fotogramma e le biglie fanno un giro corto.

## Contatti e CSV

Tutto in `localStorage`, chiave `bim-leads`. Si salva quando compare il
premio.

Area riservata: cinque tocchi sulla scritta BIM in basso a destra. Da li'
vedi quanti contatti ci sono, scarichi il CSV e puoi svuotare l'elenco
(serve un secondo tocco di conferma).

Il CSV ha il BOM UTF-8 e il punto e virgola come separatore, cosi' Excel in
italiano apre le colonne giuste al doppio clic. Colonne: Data, Ora, Nome,
Cognome, Email, Consenso marketing, Premio, Codice.

I dati stanno solo su quell'iPad. Se lo cancelli o svuoti i dati del sito,
i contatti spariscono. Scarica il CSV prima di smontare lo stand.

## Deploy

Netlify drag and drop: trascina la cartella su app.netlify.com/drop. Serve
https, altrimenti il service worker non parte e l'app non va offline.

Sull'iPad apri il sito in Safari, Condividi, Aggiungi a Home. Da li' parte
a tutto schermo. Fai girare il flusso una volta con la rete attiva: dopo
quel primo giro funziona anche senza.

Quando aggiorni i file, alza `CACHE` in `sw.js` (`bim-v1`, `bim-v2` e via
cosi'), altrimenti l'iPad continua a mostrare la versione vecchia.

## Copy

Le frasi sono in `index.html`. Tono corto, maiuscolo, niente motivazionale.
Il premio e' fisso: non c'e' nessuna estrazione vera, la biglia vincente e'
scelta a caso solo per l'animazione.
