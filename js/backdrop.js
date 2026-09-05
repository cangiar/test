/* Sfondo: mare. Una massa profonda che sale dal basso con un bordo mosso
 * dalle onde, sopra la luce. Sfumature larghe, nessun contorno netto e una
 * grana marcata da stampa, che e' quello che tiene insieme il tutto.
 */
(function (global) {
  'use strict';

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uGrain;',
    'uniform float uLinea;',   // altezza del pelo dell\'acqua
    '',
    'const vec3 CREMA   = vec3(0.992, 0.984, 0.965);',
    'const vec3 ACQUA   = vec3(0.498, 0.820, 0.847);',
    'const vec3 AZZURRO = vec3(0.749, 0.882, 0.949);',
    'const vec3 MEDIO   = vec3(0.055, 0.404, 0.545);',
    'const vec3 CUPO    = vec3(0.035, 0.216, 0.310);',
    'const vec3 FONDO   = vec3(0.016, 0.098, 0.157);',
    '',
    'vec3 blob(vec3 col, vec2 p, vec2 c, float r, vec3 tinta, float a) {',
    '  float d = length(p - c) / r;',
    '  return mix(col, tinta, exp(-d * d * 1.9) * a);',
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
    '  // tre onde sovrapposte a periodi diversi: il pelo dell\'acqua non si',
    '  // ripete e non sembra una linea disegnata',
    '  float onda = uLinea',
    '    + 0.034 * sin(p.x * 2.20 + t * 0.128)',
    '    + 0.021 * sin(p.x * 3.90 - t * 0.171)',
    '    + 0.013 * sin(p.x * 6.30 + t * 0.109);',
    '',
    '  // sopra: crema con foschia azzurra che si sposta piano',
    '  vec3 sopra = CREMA;',
    '  sopra = blob(sopra, p, vec2(ar * (0.14 + 0.10 * sin(t * 0.047)),',
    '                              0.92 + 0.08 * cos(t * 0.039)), 0.52, ACQUA,   0.34);',
    '  sopra = blob(sopra, p, vec2(ar * (0.90 + 0.09 * cos(t * 0.041)),',
    '                              0.78 + 0.09 * sin(t * 0.053)), 0.46, AZZURRO, 0.30);',
    '  sopra = blob(sopra, p, vec2(ar * (0.56 + 0.14 * sin(t * 0.031)),',
    '                              1.06 + 0.06 * cos(t * 0.061)), 0.40, MEDIO,   0.13);',
    '',
    '  // sotto: piu\' si scende piu\' e\' fondo',
    '  float prof = smoothstep(onda, -0.02, s.y);',
    '  vec3 sotto = mix(MEDIO, FONDO, prof);',
    '  sotto = mix(sotto, CUPO, 0.55 * smoothstep(0.0, 0.55, prof));',
    '  sotto = blob(sotto, p, vec2(ar * (0.28 + 0.16 * sin(t * 0.037)),',
    '                              0.16 + 0.07 * cos(t * 0.045)), 0.44, ACQUA, 0.26);',
    '  sotto = blob(sotto, p, vec2(ar * (0.82 + 0.12 * cos(t * 0.052)),',
    '                              0.06 + 0.06 * sin(t * 0.033)), 0.38, MEDIO, 0.40);',
    '',
    '  // il passaggio e\' lungo, sfocato: nessun bordo tagliato',
    '  float mare = smoothstep(onda + 0.10, onda - 0.08, s.y);',
    '  vec3 col = mix(sopra, sotto, mare);',
    '',
    '  // schiuma appena accennata sulla cresta',
    '  float d = (s.y - onda) / 0.030;',
    '  col = mix(col, vec3(0.97, 0.99, 0.99), 0.22 * exp(-d * d));',
    '',
    '  // grana grossa da stampa, uguale ovunque',
    '  col += (hash(floor(gl_FragCoord.xy / 1.4)) - 0.5) * uGrain;',
    '',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  function Backdrop(canvas, options) {
    var opt = options || {};
    var grain = opt.grain === undefined ? 0.075 : opt.grain;
    var linea = opt.linea === undefined ? 0.34 : opt.linea;
    var speed = opt.speed === undefined ? 1 : opt.speed;
    var maxDpr = opt.maxDpr === undefined ? 1.5 : opt.maxDpr;

    var gl, prog, uRes, uTime, uGrain, uLinea;
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
      uLinea = gl.getUniformLocation(prog, 'uLinea');

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
      gl.uniform1f(uTime, still ? 8.0 : (clock / 1000) * speed);
      gl.uniform1f(uGrain, grain);
      gl.uniform1f(uLinea, linea);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still && running) raf = global.requestAnimationFrame(draw);
    }

    function play() {
      if (!gl || lost) return;
      if (still) { if (!raf) raf = global.requestAnimationFrame(draw); return; }
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
