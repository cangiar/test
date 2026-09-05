/* Sfondo acqua: shader WebGL su foto reale (assets/water.jpg) o su video loop.
 *
 * Ordine delle sorgenti:
 *   1. assets/water.mp4   se presente e riproducibile, texture video
 *   2. assets/water.jpg   foto increspata dallo shader
 *   3. fallback CSS       se WebGL non parte
 *
 * Nessun pattern procedurale disegnato da zero: le onde deformano solo la
 * sorgente reale.
 */
(function (global) {
  'use strict';

  var VERT = [
    'attribute vec2 aPos;',
    'void main() { gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    '',
    'uniform sampler2D uTex;',
    'uniform vec2  uRes;',
    'uniform vec2  uTexRes;',
    'uniform float uTime;',
    'uniform float uRefract;',
    'uniform float uZoom;',
    'uniform float uSparkle;',
    'uniform float uTint;',
    '',
    'const vec3 ACQUA = vec3(0.498, 0.820, 0.847);',
    '',
    '// inquadratura cover: la foto riempie sempre lo schermo senza deformarsi',
    'vec2 coverUV(vec2 s) {',
    '  float ca = uRes.x / uRes.y;',
    '  float ta = uTexRes.x / uTexRes.y;',
    '  vec2 r = (ca > ta) ? vec2(1.0, ta / ca) : vec2(ca / ta, 1.0);',
    '  return (s - 0.5) * r / uZoom + 0.5;',
    '}',
    '',
    '// onda direzionale: x = altezza, yz = gradiente analitico',
    'vec3 wv(vec2 p, vec2 d, float f, float sp, float a, float t) {',
    '  float ph = dot(p, d) * f + t * sp;',
    '  float c = cos(ph) * a * f;',
    '  return vec3(a * sin(ph), c * d.x, c * d.y);',
    '}',
    '',
    'void main() {',
    '  vec2 s = gl_FragCoord.xy / uRes;',
    '  float ca = uRes.x / uRes.y;',
    '  vec2 p = vec2(s.x * ca, s.y);',
    '  float t = uTime;',
    '',
    '  // deriva lenta + svergolamento del dominio: rompe la periodicita\',',
    '  // e\' quello che toglie il senso di loop meccanico',
    '  vec2 q = p + vec2(t * 0.0090, t * 0.0061);',
    '  q += 0.052 * vec2(sin(q.y * 2.30 + t * 0.113),',
    '                    cos(q.x * 2.07 - t * 0.094));',
    '  q += 0.021 * vec2(sin(q.x * 4.7 - t * 0.191),',
    '                    cos(q.y * 5.3 + t * 0.164));',
    '',
    '  // frequenze non armoniche: la somma non si ripete a vista',
    '  vec3 h = vec3(0.0);',
    '  h += wv(q, normalize(vec2( 0.92,  0.39)), 10.30, 0.33, 1.00, t);',
    '  h += wv(q, normalize(vec2(-0.62,  0.78)),  7.07, 0.24, 0.86, t);',
    '  h += wv(q, normalize(vec2( 0.31, -0.95)), 16.73, 0.45, 0.53, t);',
    '  h += wv(q, normalize(vec2(-0.88, -0.47)), 24.91, 0.58, 0.31, t);',
    '  h += wv(q, normalize(vec2( 0.71,  0.70)), 37.31, 0.77, 0.18, t);',
    '  h += wv(q, normalize(vec2(-0.20,  0.98)), 55.13, 0.95, 0.10, t);',
    '  h /= 2.98;',
    '',
    '  vec2 g = h.yz;',
    '  vec2 uv = coverUV(s);',
    '  vec2 off = g * uRefract;',
    '',
    '  // il clamp entro il bordo, sommato al margine di uZoom, evita lo',
    '  // striscio ai lati quando l\'onda spinge la uv fuori dalla foto',
    '  vec2 lo = vec2(0.0015);',
    '  vec2 hi = vec2(0.9985);',
    '  vec3 col;',
    '  col.r = texture2D(uTex, clamp(uv + off * 1.035, lo, hi)).r;',
    '  col.g = texture2D(uTex, clamp(uv + off,         lo, hi)).g;',
    '  col.b = texture2D(uTex, clamp(uv + off * 0.965, lo, hi)).b;',
    '',
    '  // increspatura fine solo per i riflessi, non per la rifrazione',
    '  vec3 hf = vec3(0.0);',
    '  hf += wv(q, normalize(vec2( 0.45,  0.89)),  91.0, 1.31, 0.06, t);',
    '  hf += wv(q, normalize(vec2(-0.97,  0.24)), 127.0, 1.63, 0.04, t);',
    '  hf += wv(q, normalize(vec2( 0.66, -0.75)), 173.0, 2.02, 0.03, t);',
    '  vec3 nf = normalize(vec3(-(g * 0.30 + hf.yz) * 0.020, 1.0));',
    '',
    '  vec3 L = normalize(vec3(-0.34, -0.52, 0.78));',
    '  vec3 Hv = normalize(L + vec3(0.0, 0.0, 1.0));',
    '  float spec = pow(max(dot(nf, Hv), 0.0), 190.0);',
    '  // maschera lenta: i luccichii nascono e muoiono invece di pulsare tutti',
    '  float mask = smoothstep(0.30, 0.92,',
    '      0.5 + 0.5 * sin(q.x * 2.9 + q.y * 2.4 + t * 0.29));',
    '  col += spec * mask * uSparkle * vec3(1.0, 0.99, 0.95);',
    '',
    '  // le creste schiariscono, i cavi scuriscono: da sole le uv non bastano',
    '  col *= 1.0 + 0.085 * h.x;',
    '',
    '  // spinta verso l\'acqua del brand, a luminanza costante',
    '  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));',
    '  col = mix(col, ACQUA * lum / 0.735, uTint);',
    '',
    '  float vig = smoothstep(1.30, 0.30, length(s - 0.5) * 1.32);',
    '  col *= mix(0.80, 1.0, vig);',
    '',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  var DEFAULTS = {
    photo: 'assets/water.jpg',
    video: 'assets/water.mp4',
    refract: 0.0016,
    zoom: 1.07,
    sparkle: 0.34,
    tint: 0.14,
    speed: 1.0,
    maxDpr: 1.5,
    maxPixels: 2400000
  };

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('shader: ' + log);
    }
    return sh;
  }

  function program(gl) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('link: ' + gl.getProgramInfoLog(p));
    }
    return p;
  }

  function loadImage(src) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error('immagine assente: ' + src)); };
      img.src = src;
    });
  }

  // Il video e' opzionale: se il file non c'e' si fallisce in fretta e in
  // silenzio, senza bloccare il caricamento della foto.
  function loadVideo(src) {
    return new Promise(function (res, rej) {
      var v = document.createElement('video');
      v.src = src;
      v.loop = true;
      v.muted = true;
      v.defaultMuted = true;
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
      v.preload = 'auto';
      var done = false;
      var timer = setTimeout(function () {
        if (!done) { done = true; rej(new Error('video lento')); }
      }, 4000);
      v.oncanplay = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        var play = v.play();
        if (play && play.catch) play.catch(function () {});
        res(v);
      };
      v.onerror = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        rej(new Error('video assente: ' + src));
      };
      v.load();
    });
  }

  function Water(canvas, options) {
    // con alpha:false la canvas dipinge nero opaco sopra il proprio
    // background: la riserva va messa sul body, non sotto la canvas
    function fallback() {
      canvas.classList.add('is-fallback');
      document.documentElement.classList.add('no-water');
    }

    var opt = {};
    var k;
    for (k in DEFAULTS) opt[k] = DEFAULTS[k];
    for (k in (options || {})) opt[k] = options[k];

    var gl = null;
    var prog = null;
    var loc = {};
    var tex = null;
    var source = null;
    var isVideo = false;
    var raf = 0;
    var running = false;
    var clock = 0;
    var last = 0;
    var scale = 1;
    var slowFrames = 0;
    var lost = false;

    var reduced = global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    var still = !!(reduced && reduced.matches);

    function context() {
      var attrs = {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false
      };
      return canvas.getContext('webgl', attrs)
          || canvas.getContext('experimental-webgl', attrs);
    }

    function resize() {
      var dpr = Math.min(global.devicePixelRatio || 1, opt.maxDpr) * scale;
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      var px = w * h;
      if (px > opt.maxPixels) {
        var f = Math.sqrt(opt.maxPixels / px);
        w = Math.max(1, Math.round(w * f));
        h = Math.max(1, Math.round(h * f));
      }
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    function upload() {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    }

    function sourceSize() {
      if (isVideo) {
        return [source.videoWidth || 1280, source.videoHeight || 720];
      }
      return [source.naturalWidth || source.width, source.naturalHeight || source.height];
    }

    function draw(now) {
      raf = 0;
      if (lost) return;
      resize();

      if (!still) {
        if (last) clock += Math.min(now - last, 64);
        last = now;
      }
      var t = still ? 0 : (clock / 1000) * opt.speed;

      if (isVideo && source.readyState >= 2) upload();

      var size = sourceSize();
      gl.uniform2f(loc.uRes, canvas.width, canvas.height);
      gl.uniform2f(loc.uTexRes, size[0], size[1]);
      gl.uniform1f(loc.uTime, t);
      gl.uniform1f(loc.uRefract, isVideo ? opt.refract * 0.45 : opt.refract);
      gl.uniform1f(loc.uZoom, opt.zoom);
      gl.uniform1f(loc.uSparkle, isVideo ? opt.sparkle * 0.5 : opt.sparkle);
      gl.uniform1f(loc.uTint, opt.tint);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!still && running) {
        // degrado automatico: se il frame costa troppo si abbassa la
        // risoluzione una volta sola, invece di far scattare l\'animazione
        var cost = performance.now() - now;
        if (cost > 26) {
          slowFrames++;
          if (slowFrames > 45 && scale > 0.7) { scale = 0.7; slowFrames = 0; }
        } else if (slowFrames > 0) {
          slowFrames--;
        }
        raf = global.requestAnimationFrame(draw);
      }
    }

    function schedule() {
      if (!raf && running && !lost) raf = global.requestAnimationFrame(draw);
    }

    function play() {
      if (!gl || lost) return;
      if (still) {                       // moto ridotto: un fermo immagine
        if (!raf) raf = global.requestAnimationFrame(draw);
        return;
      }
      if (running) return;
      running = true;
      last = 0;
      if (isVideo && source.paused) {
        var pr = source.play();
        if (pr && pr.catch) pr.catch(function () {});
      }
      schedule();
    }

    function pause() {
      running = false;
      if (raf) { global.cancelAnimationFrame(raf); raf = 0; }
      if (isVideo && source && !source.paused) source.pause();
    }

    function onVisibility() {
      if (document.hidden) pause();
      else play();
    }

    function onReducedChange() {
      still = reduced.matches;
      last = 0;
      if (still) {
        // un fotogramma fermo, poi stop: nessun ciclo acceso a vuoto
        running = false;
        if (raf) { global.cancelAnimationFrame(raf); raf = 0; }
        global.requestAnimationFrame(draw);
      } else {
        play();
      }
    }

    function onLost(e) {
      e.preventDefault();
      lost = true;
      pause();
    }

    function onRestored() {
      lost = false;
      try {
        setup();
        play();
      } catch (err) {
        fallback();
      }
    }

    function setup() {
      prog = program(gl);
      gl.useProgram(prog);
      ['uRes', 'uTexRes', 'uTime', 'uRefract', 'uZoom', 'uSparkle', 'uTint']
        .forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });
      gl.uniform1i(gl.getUniformLocation(prog, 'uTex'), 0);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      // triangolo unico che copre lo schermo: meno lavoro di un quad
      gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      upload();
      resize();
    }

    this.start = function () {
      if (!canvas) return Promise.resolve(false);
      gl = context();
      if (!gl) {
        fallback();
        return Promise.resolve(false);
      }

      var wanted = opt.video
        ? loadVideo(opt.video).then(function (v) { isVideo = true; return v; },
            function () { return loadImage(opt.photo); })
        : loadImage(opt.photo);

      return wanted.then(function (src) {
        source = src;
        setup();
        canvas.classList.add('is-ready');
        document.addEventListener('visibilitychange', onVisibility);
        canvas.addEventListener('webglcontextlost', onLost, false);
        canvas.addEventListener('webglcontextrestored', onRestored, false);
        global.addEventListener('resize', schedule);
        global.addEventListener('orientationchange', schedule);
        if (reduced && reduced.addEventListener) {
          reduced.addEventListener('change', onReducedChange);
        }
        if (still) {
          global.requestAnimationFrame(draw);
        } else {
          play();
        }
        return true;
      }, function () {
        fallback();
        return false;
      });
    };

    this.play = play;
    this.pause = pause;
    this.isVideo = function () { return isVideo; };
  }

  global.BimWater = Water;
}(window));
