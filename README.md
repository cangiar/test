# BIM Lead Capture

App da stand per Born in Monge. La hostess ferma una persona, quella lascia
nome, cognome, email e consenso su un iPad, parte l'estrazione con le biglie
e vince sempre lo sconto 20% con codice MONGE20. I contatti restano
sull'iPad e si esportano in CSV.

Quattro schermate in fila, nessun ritorno indietro: intro, dati, estrazione,
premio. Poi si riparte.

## File

```
index.html              schermate
css/app.css             stile, palette e scala in cima al file
js/backdrop.js          sfondo, campo di colore in WebGL
js/app.js               flusso, biglie, archivio, area riservata
sw.js                   cache offline, alzare CACHE a ogni deploy
manifest.webmanifest    installazione su Home
assets/fonts/           Montserrat 600 e 900 in locale
icons/                  icone PWA
tools/make-icons.py     rigenera le icone
```

## Impianto grafico

Fondo crema, testi petrolio, ciliegia solo sul bottone principale. Una sola
scala tipografica: Montserrat 900 per i titoli grandi, 900 piccolo e
spaziato per le etichette, 600 per il resto. Niente ombre gonfie, niente
riquadri: i campi del form sono righe, non caselle.

Le variabili stanno in cima a `css/app.css`.

## Sfondo

`js/backdrop.js` disegna sei macchie di colore larghissime nei pastelli del
brand, che si spostano su percorsi lenti e sfasati fra loro. Non e' una foto
e non prova a sembrarlo. Il centro e' schiarito perche' il testo ci sta
sopra, e c'e' una grana ferma da pellicola che evita le bande sulle
sfumature.

Manopole, si passano al costruttore in fondo a `js/app.js`:

```js
new window.BimBackdrop(document.getElementById('bg'), {
  speed: 1,       // 0.5 per un movimento ancora piu' lento
  grain: 0.022,   // 0 per togliere la grana
  maxDpr: 1.5     // risoluzione massima
});
```

Se WebGL non parte, lo stesso disegno resta fermo in CSS. Con
`prefers-reduced-motion` lo sfondo si blocca e l'estrazione dura mezzo
secondo.

## Logo

Il marchio in alto a sinistra e' la scritta Born in Monge in Montserrat 900.
Se metti un `assets/logo.png` l'app lo carica da sola e prende il posto
della scritta, senza toccare il codice. Va bene un PNG scontornato alto
almeno 60 px. Poi aggiungilo alla lista `SHELL` in `sw.js` per averlo anche
offline.

## Estrazione

Otto biglie, parte da sola appena si apre la schermata, un giro e tre quarti
in poco piu' di quattro secondi con partenza morbida. La vincente va al
centro e cresce, le altre svaniscono.

Il premio e' fisso. La biglia vincente e' scelta a caso solo per
l'animazione, non c'e' nessuna estrazione vera.

## Contatti e CSV

Tutto in `localStorage`, chiave `bim-leads`. Si salva quando compare il
premio.

Area riservata: cinque tocchi sulla scritta Born in Monge in alto a
sinistra. Da li' vedi quanti contatti ci sono, scarichi il CSV e puoi
svuotare l'elenco, con un secondo tocco di conferma.

Il CSV ha il BOM UTF-8 e il punto e virgola come separatore, cosi' Excel in
italiano apre le colonne giuste al doppio clic. Colonne: Data, Ora, Nome,
Cognome, Email, Consenso marketing, Premio, Codice.

I dati stanno solo su quell'iPad. Scarica il CSV prima di smontare lo stand.

## Deploy

Netlify drag and drop: trascina la cartella su app.netlify.com/drop. Serve
https, altrimenti il service worker non parte e l'app non va offline.

Sull'iPad apri il sito in Safari, Condividi, Aggiungi a Home. Fai girare il
flusso una volta con la rete attiva: dopo funziona anche senza.

Quando aggiorni i file alza `CACHE` in `sw.js` (`bim-v2`, `bim-v3` e via
cosi'), altrimenti l'iPad tiene la versione vecchia.

## Copy

Le frasi sono in `index.html`. Corte, maiuscole, niente motivazionale.
