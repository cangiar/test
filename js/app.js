/* Born in Monge, lead capture da stand.
 * Flusso: intro -> dati -> estrazione -> premio -> intro.
 * Il premio e' fisso: Sconto 20%, codice MONGE20. Nessuna estrazione reale.
 */
(function () {
  'use strict';

  var STORE = 'bim-leads';
  var PRIZE = 'Sconto 20%';
  var CODE = 'MONGE20';
  var MARBLES = 8;
  var IDLE_MS = 45000;

  var PASTELLI = [
    ['#F7C6D0', '#CFC4EA', '#FBD9BE'],
    ['#BFE1F2', '#C6E4CD', '#F7C6D0'],
    ['#CFC4EA', '#BFE1F2', '#FBD9BE'],
    ['#FBD9BE', '#F7C6D0', '#C6E4CD'],
    ['#C6E4CD', '#BFE1F2', '#CFC4EA'],
    ['#F7C6D0', '#FBD9BE', '#BFE1F2'],
    ['#BFE1F2', '#CFC4EA', '#C6E4CD'],
    ['#CFC4EA', '#F7C6D0', '#BFE1F2']
  ];

  var $ = function (id) { return document.getElementById(id); };
  var reduced = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* --- archivio ------------------------------------------------------ */

  var store = {
    read: function () {
      try {
        var raw = localStorage.getItem(STORE);
        var list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
      } catch (e) {
        return [];
      }
    },
    add: function (lead) {
      var list = store.read();
      list.push(lead);
      try {
        localStorage.setItem(STORE, JSON.stringify(list));
        return true;
      } catch (e) {
        // quota piena o navigazione privata: il contatto non va perso in
        // silenzio, la hostess deve saperlo
        return false;
      }
    },
    clear: function () {
      try { localStorage.removeItem(STORE); } catch (e) {}
    }
  };

  /* --- CSV ----------------------------------------------------------- */

  // punto e virgola: e' il separatore che Excel in italiano si aspetta
  function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (/[";\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function csv(list) {
    var head = ['Data', 'Ora', 'Nome', 'Cognome', 'Email',
                'Consenso marketing', 'Premio', 'Codice'];
    var rows = [head.join(';')];
    list.forEach(function (l) {
      var d = new Date(l.ts);
      var ok = !isNaN(d.getTime());
      rows.push([
        ok ? d.toLocaleDateString('it-IT') : '',
        ok ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '',
        l.nome, l.cognome, l.email,
        l.consenso ? 'SI' : 'NO',
        l.premio || PRIZE, l.codice || CODE
      ].map(csvCell).join(';'));
    });
    return '﻿' + rows.join('\r\n') + '\r\n';   // BOM per Excel
  }

  function stamp() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
           '-' + p(d.getHours()) + p(d.getMinutes());
  }

  function download(list) {
    var blob = new Blob([csv(list)], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'bim-leads-' + stamp() + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* --- schermate ----------------------------------------------------- */

  var screens = {
    intro: $('s-intro'),
    form: $('s-form'),
    draw: $('s-draw'),
    result: $('s-result')
  };
  var current = 'intro';
  var idleTimer = 0;

  function show(name) {
    if (!screens[name] || name === current) return;
    var from = screens[current];
    var to = screens[name];

    from.classList.remove('is-active');
    to.hidden = false;
    // un frame di stacco, altrimenti la transizione non parte
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { to.classList.add('is-active'); });
    });
    setTimeout(function () {
      if (!from.classList.contains('is-active')) from.hidden = true;
    }, 460);

    current = name;
    armIdle();
    if (name === 'result') savePending();
    if (name === 'draw') startDraw();
    if (name === 'intro') resetForm();
  }

  // allo stand nessuno torna indietro da solo: dopo un po' si riparte
  function armIdle() {
    clearTimeout(idleTimer);
    if (current === 'intro') return;
    idleTimer = setTimeout(function () { show('intro'); }, IDLE_MS);
  }

  /* --- form ---------------------------------------------------------- */

  var form = $('lead-form');
  var errBox = $('form-error');
  var pending = null;

  function markBad(el, bad) {
    var wrap = el.closest('.field') || el.closest('.consent');
    if (wrap) wrap.classList.toggle('is-bad', bad);
  }

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
  }

  function fail(msg, el) {
    errBox.textContent = msg;
    errBox.hidden = false;
    if (el) { markBad(el, true); el.focus(); }
  }

  function resetForm() {
    form.reset();
    errBox.hidden = true;
    Array.prototype.forEach.call(
      form.querySelectorAll('.is-bad'),
      function (n) { n.classList.remove('is-bad'); }
    );
    pending = null;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = form.nome.value.trim();
    var cognome = form.cognome.value.trim();
    var email = form.email.value.trim();
    var ok = form.consenso.checked;

    [form.nome, form.cognome, form.email, form.consenso]
      .forEach(function (el) { markBad(el, false); });
    errBox.hidden = true;

    if (!nome) return fail('Manca il nome.', form.nome);
    if (!cognome) return fail('Manca il cognome.', form.cognome);
    if (!validEmail(email)) return fail('Email non valida.', form.email);
    if (!ok) return fail('Serve il consenso per continuare.', form.consenso);

    pending = {
      id: (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)),
      nome: nome,
      cognome: cognome,
      email: email.toLowerCase(),
      consenso: true,
      premio: PRIZE,
      codice: CODE,
      ts: new Date().toISOString()
    };

    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    show('draw');
  });

  form.addEventListener('input', function (e) {
    markBad(e.target, false);
    errBox.hidden = true;
    armIdle();
  });

  /* --- biglie -------------------------------------------------------- */

  var ring = $('ring');
  var hint = $('draw-hint');
  var marbles = [];
  var spinning = false;
  var spinRaf = 0;
  var armed = false;

  function buildMarbles() {
    var i;
    for (i = 0; i < MARBLES; i++) {
      var m = document.createElement('div');
      m.className = 'marble';
      var c = PASTELLI[i % PASTELLI.length];
      m.style.setProperty('--b1', c[0]);
      m.style.setProperty('--b2', c[1]);
      m.style.setProperty('--b3', c[2]);
      m.innerHTML = '<div class="marble__blobs"></div><div class="marble__gloss"></div>';
      ring.appendChild(m);
      marbles.push(m);
    }
  }

  function place(base, radius, scale, only) {
    var i;
    for (i = 0; i < marbles.length; i++) {
      if (only !== undefined && i !== only) continue;
      var a = base + (i / MARBLES) * Math.PI * 2;
      var x = Math.cos(a) * radius;
      var y = Math.sin(a) * radius;
      marbles[i].style.transform =
        'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) ' +
        'scale(' + scale.toFixed(3) + ')';
    }
  }

  function radius() {
    return ring.clientWidth * 0.355;
  }

  function startDraw() {
    spinning = false;
    armed = true;
    if (spinRaf) { cancelAnimationFrame(spinRaf); spinRaf = 0; }
    marbles.forEach(function (m) {
      m.classList.remove('is-out', 'is-winner');
      m.style.opacity = '';
      m.style.transition = '';
    });
    hint.classList.remove('is-off');
    hint.textContent = 'Tocca per estrarre';
    place(-Math.PI / 2, radius(), 1);
  }

  function finish(winner) {
    var r = radius();
    marbles.forEach(function (m, i) {
      m.style.transition = 'transform .85s cubic-bezier(.16,.84,.28,1), opacity .5s ease';
      if (i === winner) {
        m.classList.add('is-winner');
        m.style.transform = 'translate3d(0,0,0) scale(2.05)';
      } else {
        m.classList.add('is-out');
      }
    });
    setTimeout(function () { show('result'); }, reduced.matches ? 400 : 1150);
  }

  function spin() {
    if (spinning || !armed) return;
    spinning = true;
    armed = false;
    hint.classList.add('is-off');

    var winner = Math.floor(Math.random() * MARBLES);
    // giri interi + l'arco che porta la vincente in cima: la corsa finisce
    // sempre pulita, senza scarti finali
    var turns = 4 + Math.floor(Math.random() * 2);
    var target = Math.PI * 2 * turns - (winner / MARBLES) * Math.PI * 2;
    var from = -Math.PI / 2;
    var dur = reduced.matches ? 700 : 3400;
    var t0 = performance.now();

    function frame(now) {
      var k = Math.min((now - t0) / dur, 1);
      var e = 1 - Math.pow(1 - k, 4);           // decelerazione lunga
      var r = radius();
      var pulse = 1 + Math.sin(k * Math.PI) * 0.06;
      place(from + target * e, r * pulse, 1);
      if (k < 1) {
        spinRaf = requestAnimationFrame(frame);
      } else {
        spinRaf = 0;
        spinning = false;
        finish(winner);
      }
    }
    spinRaf = requestAnimationFrame(frame);
  }

  ring.addEventListener('click', spin);
  screens.draw.addEventListener('click', function (e) {
    if (e.target.closest('.ring')) return;
    spin();
  });

  window.addEventListener('resize', function () {
    if (current === 'draw' && !spinning && armed) place(-Math.PI / 2, radius(), 1);
    armIdle();
  });

  /* --- salvataggio al risultato -------------------------------------- */

  var savedFor = null;

  function savePending() {
    if (!pending || savedFor === pending.id) return;
    savedFor = pending.id;
    if (!store.add(pending)) {
      // niente scorciatoie: se non si salva, si dice
      var box = $('code');
      box.textContent = 'NON SALVATO';
      box.style.background = '#C0392F';
      setTimeout(function () {
        box.textContent = CODE;
        box.style.background = '';
      }, 6000);
    }
  }

  /* --- navigazione bottoni ------------------------------------------- */

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (!b) return;
    show(b.getAttribute('data-go'));
  });

  ['pointerdown', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, armIdle, { passive: true });
  });

  /* --- area riservata: 5 tocchi su BIM -------------------------------- */

  var admin = $('admin');
  var taps = 0;
  var tapTimer = 0;

  $('mark').addEventListener('click', function () {
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(function () { taps = 0; }, 1600);
    if (taps >= 5) {
      taps = 0;
      openAdmin();
    }
  });

  function openAdmin() {
    var list = store.read();
    $('admin-count').textContent = String(list.length);
    var last = list[list.length - 1];
    var d = last ? new Date(last.ts) : null;
    $('admin-last').textContent = d && !isNaN(d.getTime())
      ? 'Ultimo: ' + d.toLocaleString('it-IT')
      : '';
    admin.hidden = false;
    clearTimeout(idleTimer);
  }

  function closeAdmin() {
    admin.hidden = true;
    armIdle();
  }

  $('admin-close').addEventListener('click', closeAdmin);
  admin.addEventListener('click', function (e) {
    if (e.target === admin) closeAdmin();
  });

  $('admin-csv').addEventListener('click', function () {
    var list = store.read();
    if (!list.length) {
      $('admin-last').textContent = 'Elenco vuoto.';
      return;
    }
    download(list);
  });

  var wipeArmed = false;
  var wipeTimer = 0;
  $('admin-wipe').addEventListener('click', function () {
    var btn = this;
    if (!wipeArmed) {
      wipeArmed = true;
      btn.textContent = 'Tocca ancora per cancellare';
      wipeTimer = setTimeout(function () {
        wipeArmed = false;
        btn.textContent = 'Svuota elenco';
      }, 4000);
      return;
    }
    clearTimeout(wipeTimer);
    wipeArmed = false;
    btn.textContent = 'Svuota elenco';
    store.clear();
    openAdmin();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !admin.hidden) closeAdmin();
  });

  /* --- asset mancanti: si degrada senza buchi ------------------------- */

  function dropImage(img) {
    img.hidden = true;
    var alt = img.parentNode.querySelector('.wordmark');
    if (alt) alt.hidden = false;
  }

  Array.prototype.forEach.call(
    document.querySelectorAll('.logo, .cherry'),
    function (img) {
      img.addEventListener('error', function () { dropImage(img); });
      // lo script gira a fine body: se l'immagine e' gia' fallita l'evento
      // e' passato e non lo riprendiamo piu'
      if (img.complete && img.naturalWidth === 0) dropImage(img);
    }
  );

  /* --- avvio ---------------------------------------------------------- */

  buildMarbles();
  place(-Math.PI / 2, radius(), 1);

  if (window.BimWater) {
    new window.BimWater($('bg')).start();
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
}());
