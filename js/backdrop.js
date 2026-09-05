/* Sfondo: campo di colore morbido nei pastelli del brand, in movimento
 * lentissimo. Non e' una foto e non vuole sembrarlo: e' una sfumatura
 * larga, slavata, con grana da pellicola per non fare le bande.
 */
(function (global) {
  'use strict';

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uGrain;',
    '',
    'const vec3 CREMA    = vec3(0.992, 0.984, 0.965);',
    'const vec3 ACQUA    = vec3(0.498, 0.820, 0.847);',
    'const vec3 AZZURRO  = vec3(0.749, 0.882, 0.949);',
    'const vec3 ROSA     = vec3(0.969, 0.776, 0.816);',
    'const vec3 LILLA    = vec3(0.812, 0.769, 0.918);',
    'const vec3 PESCA    = vec3(0.984, 0.851, 0.745);',
    'const vec3 CILIEGIA = vec3(0.949, 0.427, 0.427);',
    '',
    '// macchia larghissima: exp() non ha bordo, quindi non si vede il cerchio',
    'vec3 blob(vec3 col, vec2 p, vec2 c, float r, vec3 tint, float a) {',
    '  float d = length(p - c) / r;',
    '  return mix(col, tint, exp(-d * d * 1.9) * a);',
    '}',
    '',
    'float hash(vec2 p) {',
    '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);',
    '}',
    '',
    'void main() {',
    '  vec2 s = gl_FragCoord.xy / uRes;',
    '  float ar = uRes.x / uRes.y;',
    '  vec2 p = vec2(s.x * ar, s.y);',
    '  float t = uTime;',
    '',
    '  // svergolamento lento: le macchie non restano tonde',
    '  p += 0.055 * vec2(sin(p.y * 2.1 + t * 0.071), cos(p.x * 1.9 - t * 0.063));',
    '',
    '  vec3 col = CREMA;',
    '  col = blob(col, p, vec2(ar * (0.16 + 0.13 * sin(t * 0.058)),',
    '                          0.82 + 0.10 * cos(t * 0.047)), 0.66, ACQUA,   0.68);',
    '  col = blob(col, p, vec2(ar * (0.88 + 0.10 * cos(t * 0.041)),',
    '                          0.24 + 0.12 * sin(t * 0.053)), 0.60, AZZURRO, 0.63);',
    '  col = blob(col, p, vec2(ar * (0.78 + 0.12 * sin(t * 0.037)),',
    '                          0.86 + 0.09 * cos(t * 0.061)), 0.52, ROSA,    0.53);',
    '  col = blob(col, p, vec2(ar * (0.10 + 0.11 * cos(t * 0.049)),',
    '                          0.14 + 0.10 * sin(t * 0.043)), 0.50, LILLA,   0.46);',
    '  col = blob(col, p, vec2(ar * (0.52 + 0.16 * sin(t * 0.031)),',
    '                          0.04 + 0.08 * cos(t * 0.055)), 0.44, PESCA,   0.41);',
    '  col = blob(col, p, vec2(ar * (0.96 + 0.08 * sin(t * 0.045)),',
    '                          0.98 + 0.07 * cos(t * 0.039)), 0.34, CILIEGIA, 0.16);',
    '',
    '  // centro schiarito: il testo ci sta sopra e deve restare leggibile',
    '  float d = length((s - 0.5) * vec2(ar, 1.0));',
    '  col = mix(col, CREMA, 0.26 * smoothstep(0.86, 0.04, d));',
    '',
    '  // caduta agli angoli, appena accennata',
    '  col *= 1.0 - 0.05 * smoothstep(0.35, 1.05, d);',
    '',
    '  // grana ferma, da carta: toglie le bande senza fare rumore video',
    '  col += (hash(floor(gl_FragCoord.xy)) - 0.5) * uGrain;',
    '',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  function Backdrop(canvas, options) {
    var opt = options || {};
    var grain = opt.grain === undefined ? 0.022 : opt.grain;
    var speed = opt.speed === undefined ? 1 : opt.speed;
    var maxDpr = opt.maxDpr === undefined ? 1.5 : opt.maxDpr;

    var gl, prog, uRes, uTime, uGrain;
    var raf = 0, running = false, clock = 0, last = 0, lost = false;

    var mq = global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var still = !!(mq && mq.matches);

    function sh(type, src) {
      var o = gl.createShader(type);
      gl.shaderSource(o, src);
      gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(o));
      }
      return o;
    }

    function build() {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.bindAttribLocation(prog, 0, 'p');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog));
      }
      gl.useProgram(prog);
      uRes = gl.getUniformLocation(prog, 'uRes');
      uTime = gl.getUniformLocation(prog, 'uTime');
      uGrain = gl.getUniformLocation(prog, 'uGrain');

      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    }

    function resize() {
      var dpr = Math.min(global.devicePixelRatio || 1, maxDpr);
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    function draw(now) {
      raf = 0;
      if (lost) return;
      resize();
      if (!still) {
        if (last) clock += Math.min(now - last, 64);
        last = now;
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, still ? 6.0 : (clock / 1000) * speed);
      gl.uniform1f(uGrain, grain);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still && running) raf = global.requestAnimationFrame(draw);
    }

    function play() {
      if (!gl || lost) return;
      if (still) {
        if (!raf) raf = global.requestAnimationFrame(draw);
        return;
      }
      if (running) return;
      running = true;
      last = 0;
      raf = global.requestAnimationFrame(draw);
    }

    function pause() {
      running = false;
      if (raf) { global.cancelAnimationFrame(raf); raf = 0; }
    }

    this.start = function () {
      try {
        gl = canvas.getContext('webgl', {
          alpha: false, antialias: false, depth: false, stencil: false,
          preserveDrawingBuffer: false
        }) || canvas.getContext('experimental-webgl', { alpha: false });
        if (!gl) throw new Error('niente webgl');
        build();
      } catch (e) {
        // la riserva CSS e' lo stesso disegno, solo fermo
        document.documentElement.classList.add('no-gl');
        canvas.hidden = true;
        return false;
      }

      canvas.classList.add('is-ready');
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) pause(); else play();
      });
      canvas.addEventListener('webglcontextlost', function (e) {
        e.preventDefault(); lost = true; pause();
      });
      canvas.addEventListener('webglcontextrestored', function () {
        lost = false;
        try { build(); play(); } catch (e2) {
          document.documentElement.classList.add('no-gl');
          canvas.hidden = true;
        }
      });
      global.addEventListener('resize', function () {
        if (!raf && !lost) raf = global.requestAnimationFrame(draw);
      });
      if (mq && mq.addEventListener) {
        mq.addEventListener('change', function () {
          still = mq.matches;
          last = 0;
          if (still) { pause(); global.requestAnimationFrame(draw); } else play();
        });
      }
      play();
      return true;
    };

    this.play = play;
    this.pause = pause;
  }

  global.BimBackdrop = Backdrop;
}(window));
