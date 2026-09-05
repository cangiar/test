/* Born in Monge, raccolta contatti da stand.
 * intro -> dati -> estrazione -> premio -> intro.
 * Il premio e' fisso: Sconto 20%, MONGE20. La biglia vincente e' scelta a
 * caso solo per l'animazione, non c'e' nessuna estrazione vera.
 */
(function () {
  'use strict';

  var STORE = 'bim-leads';
  var PREMIO = 'Sconto 20%';
  var CODICE = 'MONGE20';
  var BIGLIE = 8;
  var IDLE_MS = 45000;

  // tutte nella famiglia del mare, dal fondo alla schiuma
  var COPPIE = [
    ['#7FD1D8', '#BFE1F2'], ['#4FB3C9', '#A9E2E8'],
    ['#BFE1F2', '#6FC4E0'], ['#1B7FA0', '#7FD1D8'],
    ['#A9E2E8', '#4FB3C9'], ['#6FC4E0', '#BFE1F2'],
    ['#2E6E8E', '#7FD1D8'], ['#9FD8EC', '#4FB3C9']
  ];

  var $ = function (id) { return document.getElementById(id); };
  var reduced = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* --- archivio ------------------------------------------------------- */

  function leggi() {
    try {
      var raw = localStorage.getItem(STORE);
      var l = raw ? JSON.parse(raw) : [];
      return Array.isArray(l) ? l : [];
    } catch (e) { return []; }
  }

  function salva(lead) {
    var l = leggi();
    l.push(lead);
    try {
      localStorage.setItem(STORE, JSON.stringify(l));
      return true;
    } catch (e) { return false; }
  }

  /* --- CSV ------------------------------------------------------------- */

  // punto e virgola: e' il separatore che Excel in italiano si aspetta
  function cella(v) {
    var s = v === null || v === undefined ? '' : String(v);
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function csv(list) {
    var righe = [['Data', 'Ora', 'Nome', 'Cognome', 'Email',
                  'Consenso marketing', 'Premio', 'Codice'].join(';')];
    list.forEach(function (l) {
      var d = new Date(l.ts);
      var ok = !isNaN(d.getTime());
      righe.push([
        ok ? d.toLocaleDateString('it-IT') : '',
        ok ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '',
        l.nome, l.cognome, l.email,
        l.consenso ? 'SI' : 'NO', l.premio || PREMIO, l.codice || CODICE
      ].map(cella).join(';'));
    });
    return '﻿' + righe.join('\r\n') + '\r\n';   // BOM per Excel
  }

  function scarica(list) {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    var nome = 'bim-leads-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' +
               p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.csv';
    var url = URL.createObjectURL(new Blob([csv(list)], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* --- schermate -------------------------------------------------------- */

  var viste = {
    intro: $('v-intro'), form: $('v-form'),
    draw: $('v-draw'), prize: $('v-prize')
  };
  var AVANZAMENTO = { intro: 0, form: 34, draw: 67, prize: 100 };
  var corrente = 'intro';
  var idle = 0;

  function vai(nome) {
    if (!viste[nome] || nome === corrente) return;
    var da = viste[corrente];
    var a = viste[nome];

    da.classList.remove('is-active');
    a.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { a.classList.add('is-active'); });
    });
    setTimeout(function () {
      if (!da.classList.contains('is-active')) da.hidden = true;
    }, 380);

    corrente = nome;
    $('progress').style.width = AVANZAMENTO[nome] + '%';
    riarma();

    if (nome === 'prize') registra();
    if (nome === 'draw') preparaGiro();
    if (nome === 'intro') azzeraForm();
  }

  // allo stand nessuno torna indietro da solo: dopo un po' si riparte
  function riarma() {
    clearTimeout(idle);
    if (corrente !== 'intro') idle = setTimeout(function () { vai('intro'); }, IDLE_MS);
  }

  /* --- form -------------------------------------------------------------- */

  var form = $('form');
  var errore = $('error');
  var inSospeso = null;

  function segna(el, bad) {
    var w = el.closest('.field') || el.closest('.consent');
    if (w) w.classList.toggle('is-bad', bad);
  }

  function stop(msg, el) {
    errore.textContent = msg;
    errore.hidden = false;
    if (el) { segna(el, true); el.focus(); }
  }

  function azzeraForm() {
    form.reset();
    errore.hidden = true;
    Array.prototype.forEach.call(form.querySelectorAll('.is-bad'),
      function (n) { n.classList.remove('is-bad'); });
    inSospeso = null;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = form.nome.value.trim();
    var cognome = form.cognome.value.trim();
    var email = form.email.value.trim();

    [form.nome, form.cognome, form.email, form.consenso]
      .forEach(function (el) { segna(el, false); });
    errore.hidden = true;

    if (!nome) return stop('Manca il nome', form.nome);
    if (!cognome) return stop('Manca il cognome', form.cognome);
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return stop('Email non valida', form.email);
    if (!form.consenso.checked) return stop('Serve il consenso', form.consenso);

    inSospeso = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      nome: nome, cognome: cognome, email: email.toLowerCase(),
      consenso: true, premio: PREMIO, codice: CODICE,
      ts: new Date().toISOString()
    };
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    vai('draw');
  });

  form.addEventListener('input', function (e) {
    segna(e.target, false);
    errore.hidden = true;
    riarma();
  });

  var registrato = null;

  function registra() {
    if (!inSospeso || registrato === inSospeso.id) return;
    registrato = inSospeso.id;
    if (!salva(inSospeso)) {
      // se non si salva, non lo si nasconde
      var c = $('code');
      c.textContent = 'NON SALVATO';
      c.style.background = '#C0392F';
      setTimeout(function () { c.textContent = CODICE; c.style.background = ''; }, 6000);
    }
  }

  /* --- biglie ------------------------------------------------------------ */

  var ring = $('ring');
  var biglie = [];
  var giroRaf = 0;

  var PASSO = Math.PI * 2 / BIGLIE;
  var GIRO = Math.PI * 2;

  // la corsa e' divisa in tempi, non e' una sola discesa: prima pensa, poi
  // lancia, frena a lungo, si ferma quasi sulla biglia sbagliata e scatta di
  // una posizione. E' li' che sta la sorpresa.
  var FASI = { pensa: 1200, lancia: 1500, frena: 2500, sospeso: 520, scatto: 860, respiro: 420 };
  var PICCO = 1.7;      // giri al secondo nel tratto veloce
  var RAMPA = 0.55;     // quota della fase di lancio usata per accelerare
  var DERIVA = 0.10;    // giri al secondo mentre sta ancora pensando

  function costruisci() {
    for (var i = 0; i < BIGLIE; i++) {
      var m = document.createElement('div');
      m.className = 'marble';
      m.style.setProperty('--b1', COPPIE[i % COPPIE.length][0]);
      m.style.setProperty('--b2', COPPIE[i % COPPIE.length][1]);
      m.innerHTML = '<div class="marble__blobs"></div><div class="marble__gloss"></div>';
      ring.appendChild(m);
      biglie.push(m);
    }
  }

  function raggio() { return ring.clientWidth * 0.38; }

  function disponi(base, r, scale) {
    for (var i = 0; i < biglie.length; i++) {
      var ang = base + i * PASSO;
      var sc = typeof scale === 'number' ? scale : scale[i];
      biglie[i].style.transform =
        'translate3d(' + (Math.cos(ang) * r).toFixed(2) + 'px,' +
        (Math.sin(ang) * r).toFixed(2) + 'px,0) scale(' + sc.toFixed(3) + ')';
    }
  }

  // porta la biglia i in cima al cerchio
  function cima(i) { return -Math.PI / 2 - i * PASSO; }

  // luce che gira intorno all'anello: si vede che sta decidendo
  function battito(t) {
    var out = [];
    for (var i = 0; i < BIGLIE; i++) {
      var u = (t / 780 - i / BIGLIE) % 1;
      if (u < 0) u += 1;
      if (u > 0.5) u -= 1;
      out.push(1 + 0.15 * Math.exp(-(u / 0.12) * (u / 0.12)));
    }
    return out;
  }

  // integrale della rampa di velocita', per avere l'angolo senza accumulare
  function percorso(k) {
    if (k >= RAMPA) return RAMPA / 2 + (k - RAMPA);
    return k * k * k / (RAMPA * RAMPA) - k * k * k * k / (2 * RAMPA * RAMPA * RAMPA);
  }

  function preparaGiro() {
    if (giroRaf) { cancelAnimationFrame(giroRaf); giroRaf = 0; }
    biglie.forEach(function (m) {
      m.classList.remove('is-out');
      m.style.transition = '';
      m.style.opacity = '';
    });
    disponi(cima(0), raggio(), 1);
    setTimeout(gira, 420);
  }

  function gira() {
    if (corrente !== 'draw') return;
    var vincente = Math.floor(Math.random() * BIGLIE);
    if (reduced.matches) return giroFermo(vincente);

    var durL = FASI.lancia / 1000;
    var durF = FASI.frena / 1000;
    // easeOutQuint parte con pendenza 5, quindi la frenata copre sempre
    // questo arco: e' da qui che si ricava dove deve iniziare
    var arcoF = PICCO * durF / 5;

    var A0 = cima(0);
    var A1 = A0 + DERIVA * GIRO * (FASI.pensa / 1000);
    var A2 = A1 + DERIVA * GIRO * durL
                + (PICCO - DERIVA) * GIRO * durL * percorso(1);
    // la corsa piena si allunga quel tanto che basta perche' la frenata
    // cominci esattamente alla velocita' con cui e' finito il lancio:
    // arrotondare il bersaglio al giro intero faceva ripartire in accelerazione
    var fase = cima(vincente + 1) - arcoF * GIRO;
    var A3 = fase + GIRO * Math.ceil((A2 - fase) / GIRO);
    var attesa = (A3 - A2) / (PICCO * GIRO) * 1000;
    var bersaglio = A3 + arcoF * GIRO;

    var t1 = FASI.pensa;
    var t2 = t1 + FASI.lancia;
    var t3 = t2 + attesa;
    var t4 = t3 + FASI.frena;
    var t5 = t4 + FASI.sospeso;
    var t6 = t5 + FASI.scatto;
    var t7 = t6 + FASI.respiro;
    var t0 = performance.now();

    function passo(now) {
      var t = now - t0;
      var ang, scale = 1, veloce = 0;

      if (t < t1) {
        ang = A0 + DERIVA * GIRO * (t / 1000);
        scale = battito(t);

      } else if (t < t2) {
        var k = (t - t1) / FASI.lancia;
        ang = A1 + DERIVA * GIRO * ((t - t1) / 1000)
                 + (PICCO - DERIVA) * GIRO * durL * percorso(k);
        veloce = Math.min(k / RAMPA, 1);

      } else if (t < t3) {
        ang = A2 + PICCO * GIRO * ((t - t2) / 1000);
        veloce = 1;

      } else if (t < t4) {
        var f = (t - t3) / FASI.frena;
        ang = A3 + (bersaglio - A3) * (1 - Math.pow(1 - f, 5));
        veloce = Math.pow(1 - f, 4);

      } else if (t < t5) {
        ang = bersaglio;                       // quasi. non ancora

      } else if (t < t6) {
        var c = (t - t5) / FASI.scatto;
        ang = bersaglio + PASSO *
              (c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2);

      } else {
        ang = bersaglio + PASSO;
      }

      // nel tratto veloce il cerchio si allarga appena, come per la forza
      disponi(ang, raggio() * (1 + 0.045 * veloce), scale);

      if (t < t7) {
        giroRaf = requestAnimationFrame(passo);
      } else {
        giroRaf = 0;
        rivela(vincente);
      }
    }
    giroRaf = requestAnimationFrame(passo);
  }

  // moto ridotto: niente rotazione, ma gli stessi tempi, cosi' non sembra
  // che il risultato fosse gia' deciso
  function giroFermo(vincente) {
    var t0 = performance.now();
    function passo(now) {
      var t = now - t0;
      disponi(cima(0), raggio(), battito(t));
      if (t < 1100) giroRaf = requestAnimationFrame(passo);
      else { giroRaf = 0; setTimeout(function () { rivela(vincente); }, 380); }
    }
    giroRaf = requestAnimationFrame(passo);
  }

  function rivela(vincente) {
    biglie.forEach(function (m, i) {
      if (i === vincente) {
        m.style.transition = 'transform .9s cubic-bezier(.16,.84,.28,1)';
        m.style.transform = 'translate3d(0,0,0) scale(2.1)';
      } else {
        m.classList.add('is-out');
      }
    });
    setTimeout(function () { vai('prize'); }, reduced.matches ? 700 : 1050);
  }

  window.addEventListener('resize', function () {
    if (corrente === 'draw' && !giroRaf) disponi(cima(0), raggio(), 1);
    riarma();
  });

  /* --- navigazione -------------------------------------------------------- */

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b) vai(b.getAttribute('data-go'));
  });

  ['pointerdown', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, riarma, { passive: true });
  });

  /* --- area riservata: cinque tocchi sul marchio --------------------------- */

  var admin = $('admin');
  var tocchi = 0;
  var tocchiT = 0;

  $('brand').addEventListener('click', function () {
    tocchi++;
    clearTimeout(tocchiT);
    tocchiT = setTimeout(function () { tocchi = 0; }, 1600);
    if (tocchi >= 5) { tocchi = 0; apri(); }
  });

  function apri() {
    var l = leggi();
    $('admin-count').textContent = String(l.length);
    var u = l[l.length - 1];
    var d = u ? new Date(u.ts) : null;
    $('admin-last').textContent = d && !isNaN(d.getTime())
      ? 'Ultimo ' + d.toLocaleString('it-IT') : 'Elenco vuoto';
    admin.hidden = false;
    clearTimeout(idle);
  }

  function chiudiAdmin() { admin.hidden = true; riarma(); }

  $('admin-close').addEventListener('click', chiudiAdmin);
  admin.addEventListener('click', function (e) { if (e.target === admin) chiudiAdmin(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !admin.hidden) chiudiAdmin();
  });

  $('admin-csv').addEventListener('click', function () {
    var l = leggi();
    if (!l.length) { $('admin-last').textContent = 'Elenco vuoto'; return; }
    scarica(l);
  });

  var armato = false;
  var armatoT = 0;
  $('admin-wipe').addEventListener('click', function () {
    var b = this;
    if (!armato) {
      armato = true;
      b.textContent = 'Tocca ancora per cancellare';
      armatoT = setTimeout(function () { armato = false; b.textContent = 'Svuota elenco'; }, 4000);
      return;
    }
    clearTimeout(armatoT);
    armato = false;
    b.textContent = 'Svuota elenco';
    try { localStorage.removeItem(STORE); } catch (e) {}
    apri();
  });

  /* --- logo opzionale ------------------------------------------------------ */

  // se assets/logo.png esiste prende il posto della scritta, in alto e nella
  // schermata di attesa, senza toccare nulla
  (function () {
    var probe = new Image();
    probe.onload = function () {
      var img = $('brand-img');
      img.src = probe.src;
      img.hidden = false;
      $('brand-text').hidden = true;
      var hero = $('hero-logo');
      hero.src = probe.src;
      hero.hidden = false;
    };
    probe.src = 'assets/logo.png';
  }());

  /* --- avvio --------------------------------------------------------------- */

  costruisci();
  $('progress').style.width = '0%';

  if (window.BimBackdrop) new window.BimBackdrop($('bg')).start();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
}());
