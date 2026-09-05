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

Il mare visto dalla riva: massa profonda in basso, luce in alto. Ogni
schermata e' divisa in due fasce. Il testo sta sulla luce, in petrolio. I
comandi stanno sull'acqua e sono in vetro: bianchi, translucidi, sfocati
dietro.

Una sola scala tipografica: Montserrat 900 per i titoli, 900 piccolo e
spaziato per le etichette, 600 per il resto. Niente ombre gonfie, niente
riquadri: i campi del form sono righe.

La ciliegia resta solo sugli errori: nel resto del flusso i comandi sono di
vetro, che sull'acqua funziona meglio di un pieno rosso.

Il pelo dell'acqua sta a `--pelo` in `css/app.css` e a `linea` nello
shader. Se cambi uno cambia anche l'altro, altrimenti i bottoni finiscono
fuori dall'acqua.

## Sfondo

`js/backdrop.js` disegna il mare. Il pelo dell'acqua e' mosso da tre onde
sovrapposte a periodi diversi, quindi non si ripete e non sembra una linea
disegnata. Sotto si va a fondo, sopra resta la crema con una foschia
azzurra che si sposta piano. Il passaggio e' lungo e sfocato, e sopra a
tutto c'e' una grana grossa da stampa: e' quella che tiene insieme il
disegno ed evita le bande.

Manopole, si passano al costruttore in fondo a `js/app.js`:

```js
new window.BimBackdrop(document.getElementById('bg'), {
  linea: 0.34,    // altezza del pelo dell'acqua, va d'accordo con --pelo
  grain: 0.075,   // grana, 0 per toglierla
  speed: 1,       // 0.5 per onde ancora piu' lente
  maxDpr: 1.5     // risoluzione massima
});
```

Se WebGL non parte, lo stesso impianto resta fermo in CSS. Con
`prefers-reduced-motion` il mare si blocca e l'estrazione non gira.

## Logo

Il marchio in alto a sinistra e' la scritta Born in Monge in Montserrat 900,
ed e' un ripiego. Metti il logo vero in `assets/logo.png` e l'app lo carica
da sola: prende il posto della scritta in alto e compare grande sulla
schermata di apertura. Nessuna modifica al codice.

Serve un PNG scontornato, quindi con il fondo trasparente e senza i margini
bianchi intorno, alto almeno 200 px. Poi aggiungi `'./assets/logo.png'`
alla lista `SHELL` in `sw.js` e alza `CACHE`, altrimenti offline non c'e'.

## Estrazione

Otto biglie, parte da sola appena si apre la schermata. Non e' una discesa
sola, sono sei tempi, ed e' li' che sta la sorpresa:

| tempo | durata | cosa si vede |
| --- | --- | --- |
| pensa | 1,2 s | l'anello striscia a 0,1 giri al secondo, una luce gira fra le biglie |
| lancia | 1,5 s | accelera fino a 1,7 giri al secondo |
| corsa | 0 a 0,6 s | tiene la velocita' quel tanto che serve per agganciare la frenata |
| frena | 2,5 s | rallenta a lungo e si ferma sulla biglia sbagliata |
| sospeso | 0,5 s | fermo. sembra finita |
| scatto | 0,9 s | avanza di una posizione sola e si ferma sulla vincente |

In tutto poco piu' di otto secondi fino al premio. La frenata parte
esattamente alla velocita' con cui finisce il lancio, quindi non ci sono
strappi: la durata della corsa piena si allunga da sola quel tanto che
serve a far tornare i conti.

Le durate stanno in `FASI` in cima alla sezione biglie di `js/app.js`, la
velocita' di punta in `PICCO`.

Il premio e' fisso. La biglia vincente e' scelta a caso solo per
l'animazione, non c'e' nessuna estrazione vera.

## Contatti e CSV

Tutto in `localStorage`, chiave `bim-leads`. Si salva quando compare il
premio.

Dal premio si torna all'inizio con la casetta in basso.

Area riservata: cinque tocchi sul marchio in alto a sinistra. Da li' vedi quanti contatti ci sono, scarichi il CSV e puoi
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
