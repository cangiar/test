# BIM Lead Capture

App da stand per Born in Monge, pensata per un iPad. La hostess ferma una
persona, quella lascia nome, cognome ed email, parte l'estrazione con le
biglie e vince sempre lo sconto 20% con codice IPPICA2026.

Quattro schermate in fila, nessun ritorno indietro: intro, dati, estrazione,
premio. Poi si riparte.

## File

```
index.html              schermate, form, informativa
css/app.css             stile, palette e scala in cima al file
js/backdrop.js          sfondo, il mare in WebGL
js/app.js               flusso, biglie, archivio, invio, area riservata
sw.js                   cache offline, alzare CACHE a ogni deploy
manifest.webmanifest    installazione su Home
assets/fonts/           Montserrat 600 e 900 in locale
icons/                  icone PWA
tools/make-icons.py     rigenera le icone
```

## Impianto grafico

Il mare visto dalla riva: massa profonda in basso, luce in alto. Ogni
schermata e' divisa in due fasce. Il testo sta sulla luce, in petrolio. I
comandi stanno sull'acqua e sono in vetro.

Una sola scala tipografica: Montserrat 900 per i titoli, 900 piccolo e
spaziato per le etichette, 600 per il resto. I campi del form sono righe,
non caselle. La ciliegia resta solo sugli errori.

Il pelo dell'acqua sta a `--pelo` in `css/app.css` e a `linea` nello shader.
Se cambi uno cambia anche l'altro, altrimenti i bottoni finiscono fuori
dall'acqua.

## Sfondo

`js/backdrop.js` disegna il mare. Il pelo dell'acqua e' mosso da tre onde
sovrapposte a periodi diversi, quindi non si ripete. Sopra a tutto c'e' una
grana grossa da stampa, che evita le bande sulle sfumature.

Manopole, in fondo a `js/app.js`:

```js
new window.BimBackdrop(document.getElementById('bg'), {
  linea: 0.34,    // altezza del pelo dell'acqua, va d'accordo con --pelo
  grain: 0.075,   // grana, 0 per toglierla
  speed: 1,       // 0.5 per onde ancora piu' lente
  maxDpr: 1.5     // risoluzione massima
});
```

Senza WebGL resta lo stesso impianto, fermo, in CSS. Con
`prefers-reduced-motion` il mare si blocca e l'estrazione non gira.

## Logo

Il marchio in alto a sinistra e' la scritta Born in Monge in Montserrat 900,
ed e' un ripiego. Metti il logo vero in `assets/logo.png` e l'app lo carica
da sola: prende il posto della scritta in alto e compare grande in apertura.

Serve un PNG scontornato, senza i margini bianchi intorno, alto almeno
200 px. Poi aggiungi `'./assets/logo.png'` alla lista `SHELL` in `sw.js` e
alza `CACHE`, altrimenti offline non c'e'.

## Estrazione

Otto biglie, parte da sola appena si apre la schermata. Non e' una discesa
sola, sono sei tempi, ed e' li' che sta la sorpresa:

| tempo | durata | cosa si vede |
| --- | --- | --- |
| pensa | 1,5 s | l'anello striscia a 0,1 giri al secondo, una luce gira fra le biglie |
| lancia | 1,8 s | accelera fino a 0,85 giri al secondo |
| corsa | 0 a 1,2 s | tiene la velocita' quel tanto che serve ad agganciare la frenata |
| frena | 3,4 s | rallenta a lungo e si ferma sulla biglia sbagliata |
| sospeso | 0,7 s | fermo. sembra finita |
| scatto | 1,1 s | avanza di una posizione sola e si ferma sulla vincente |

Poco piu' di dieci secondi fino al premio, due giri e un quarto in tutto.
La frenata parte esattamente alla velocita' con cui finisce il lancio: la
corsa piena si allunga da sola quel tanto che serve a far tornare i conti,
quindi non ci sono strappi.

Le durate stanno in `FASI` in cima alla sezione biglie di `js/app.js`, la
velocita' di punta in `PICCO`.

Il premio e' fisso. La biglia vincente e' scelta a caso solo per
l'animazione, non c'e' nessuna estrazione vera.

## Consenso

La spunta e' facoltativa e parte vuota. Chi non la mette gioca lo stesso,
vince lo stesso, e i suoi dati non vengono salvati ne' inviati da nessuna
parte.

Non e' una scelta di stile, e' quello che serve perche' il consenso valga.
Il GDPR chiede un'azione chiara e volontaria: una casella gia' spuntata, o
un consenso preso solo perche' la persona ha proseguito, non contano
(considerando 32). E se per giocare fosse obbligatorio accettare il
marketing, il consenso non sarebbe liberamente prestato e sarebbe nullo lo
stesso (art. 7.4). Un consenso nullo non e' un dettaglio formale: quelle
email non le puoi usare.

L'informativa sta in `index.html`, nel blocco `id="info"`, ed e' **da
completare prima dell'evento**. I punti fra parentesi quadre sono
segnaposto:

- `[RAGIONE SOCIALE]`, `[INDIRIZZO]`, `[NUMERO]` di partita IVA
- `[EMAIL PRIVACY]`, la casella dove arrivano le richieste
- `[NUMERO]` di mesi di conservazione

Se carichi gli indirizzi su uno strumento di invio email, aggiungilo alla
riga "Dove finiscono". Ogni email che manderai deve avere il link di
disiscrizione.

## Dove finiscono i dati

Due strade insieme, e si coprono a vicenda.

**Sull'iPad**, sempre. Nel `localStorage` di Safari, tre chiavi:

| chiave | cosa contiene |
| --- | --- |
| `bim-leads` | i contatti di chi ha dato il consenso |
| `bim-giocate` | quante partite in tutto, solo un numero |
| `bim-ultimo-csv` | quanti contatti erano gia' stati esportati |

Il rovescio e' che quei dati vivono solo li'. Li perdi se qualcuno cancella
i dati dei siti in Safari, se usi la navigazione privata, se resetti
l'iPad. Non si recuperano.

**Sui moduli Netlify**, quando c'e' rete. Il form in `index.html` e'
dichiarato come modulo Netlify (`data-netlify`, nome `contatti`): Netlify lo
riconosce da solo al caricamento, anche col trascinamento, e le risposte si
leggono nel pannello Netlify, sezione Forms.

Il modulo non parte da solo, perche' il flusso e' guidato dalla app: e'
`js/app.js` che spedisce lo stesso contenuto quando compare il premio.
Vengono inviati solo i contatti che hanno dato il consenso.

**Se la rete manca il contatto non si perde.** Resta in coda sull'iPad e
riparte da solo appena la connessione torna, uno alla volta e in ordine. La
coda viene ripresa anche alla riapertura della app. L'area riservata dice
quanti non sono ancora usciti, e il CSV ha la colonna Inviato.

I campi inviati sono nome, cognome, email, consenso, premio, codice, data e
id. L'id serve a riconoscere i doppioni. Se cambi il nome del modulo,
cambialo in tre punti: l'attributo `name` del form e il campo nascosto
`form-name` in `index.html`, e `corpo()` in `js/app.js`.

In pratica, allo stand:

1. Installa la app da Home, non lasciarla in una scheda di Safari.
2. Non usare la navigazione privata.
3. Scarica il CSV a ogni pausa, non solo a fine giornata.
4. Usa sempre lo stesso iPad. Due iPad fanno due elenchi separati.

## Area riservata

Cinque tocchi sul marchio in alto a sinistra. Da li' vedi quanti contatti ci
sono, quanti restano da esportare, quanti non sono ancora stati inviati
online e quante partite sono state fatte in tutto. Puoi esportare il CSV e
svuotare l'elenco, con un secondo tocco di conferma.

**Esporta CSV** si comporta in due modi, da solo:

- se il dispositivo ha il foglio di condivisione, e l'iPad ce l'ha, si apre
  quello e mandi il file con AirDrop, Mail o lo salvi in File. E' la strada
  buona: su iPad, con la app installata da Home, un download avviato da
  JavaScript spesso non fa niente e non avvisa nemmeno.
- altrimenti scarica il file, che e' quello che succede su un computer.

Sotto c'e' **Mostra il testo**, che apre il CSV in chiaro con un bottone per
copiarlo. Serve se le prime due strade non funzionano.

L'esportazione conta come fatta solo quando e' andata a buon fine. Se
annulli il foglio di condivisione, i contatti restano segnati come da
esportare.

Il CSV ha il BOM UTF-8 e il punto e virgola come separatore, cosi' Excel in
italiano apre le colonne giuste al doppio clic. Colonne: Data, Ora, Nome,
Cognome, Email, Consenso marketing, Premio, Codice, Inviato.

Dal premio si torna all'inizio con la casetta in basso.

## Se offline non funziona

In fondo all'area riservata c'e' una riga di stato: dice se c'e' rete, se la
app gira installata da Home o dentro Safari, e se l'offline e' pronto.

Se legge **offline non attivo**, il service worker non e' partito. Succede
per uno di questi motivi:

- il sito non e' su https, per esempio aperto come file dall'app File
- la app e' in navigazione privata
- la app e' aperta in un browser diverso da Safari, o dentro un altro
  programma, per esempio il browser interno di Instagram
- il primo caricamento con la rete non e' mai stato completato

Se legge **offline a meta**, ricarica una volta con la rete attiva e
ricontrolla.

La prova che conta: apri la app, fai un giro intero, metti l'iPad in
modalita' aereo e rifai un giro. Se il secondo giro arriva al premio, allo
stand sei a posto.

## Metterlo online e installarlo sull'iPad

Va messo online, anche se poi allo stand la rete non serve. Il service
worker, quello che fa funzionare tutto offline, parte solo su https. Aprire
il file a mano dall'app File non basta: niente installazione da Home,
niente offline, e i dati salvati non sono affidabili.

Netlify va bene ed e' gratis:

1. Prendi la cartella con dentro `index.html`.
2. Vai su `app.netlify.com/drop` e trascinala dentro. Senza account funziona
   lo stesso, ma con l'account l'indirizzo resta tuo e vedi la sezione Forms.
3. Netlify ti da' un indirizzo tipo `qualcosa.netlify.app`. Aprilo e
   controlla che la app parta.

Poi sull'iPad, con la rete attiva:

4. Apri quell'indirizzo **in Safari**. Non in Chrome, non dentro Instagram:
   solo Safari sa installare le app da Home.
5. Bottone Condividi, poi **Aggiungi a Home**.
6. Apri la app dall'icona. Deve partire a tutto schermo, senza la barra
   degli indirizzi.
7. **Fai un giro completo di prova**, dalla intro fino al premio.
8. Metti l'iPad in modalita' aereo e rifai un giro.

Prima dell'evento svuota l'elenco dalle prove, dall'area riservata.

Due cose che allo stand fanno la differenza: **Accesso Guidato**
(Impostazioni, Accessibilita') blocca l'iPad su questa app e nessuno puo'
uscirne, e conviene disattivare il blocco schermo automatico.

Quando aggiorni i file: rifai il trascinamento su Netlify e alza `CACHE` in
`sw.js` (`bim-v3`, `bim-v4` e via cosi'), altrimenti l'iPad tiene la
versione vecchia. Sull'iPad la nuova versione arriva alla riapertura.

## Copy

Le frasi sono in `index.html`. Corte, maiuscole, niente motivazionale.
