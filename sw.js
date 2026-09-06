/* Offline per lo stand: dopo il primo caricamento l'iPad non ha piu' bisogno
 * di rete. Alzare CACHE a ogni deploy, altrimenti resta la versione vecchia.
 */
var CACHE = 'bim-v3';

var SHELL = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/backdrop.js',
  './manifest.webmanifest',
  './assets/fonts/montserrat-latin-600-normal.woff2',
  './assets/fonts/montserrat-latin-900-normal.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // uno alla volta: un asset opzionale mancante non deve far fallire
      // l'installazione e lasciare l'app senza cache
      return Promise.all(SHELL.map(function (url) {
        return c.add(new Request(url, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // navigazioni: rete se c'e', altrimenti la copia in cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html', { ignoreSearch: true })
            .then(function (r) { return r || Response.error(); });
      })
    );
    return;
  }

  // asset: cache prima, rete come riserva e riempimento
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
