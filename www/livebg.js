// Living background: draws the theme's background image through a WebGL shader so it
// can ripple like water where you touch, plus optional effects:
//   flow  - colors slowly warp and drift around the color wheel
//   melt  - the image oozes and drips down the screen
//   rain  - falling streaks, with raindrops rippling where they land
//   storm - rain plus lightning bolts and flashes
//   kaleido - the screen folded into a slowly turning kaleidoscope
//   tunnel  - flying forever into a tunnel made of the image
//   bubbles - soap bubbles drifting up, magnifying what's behind them
// Exposed as window.LiveBg. If WebGL isn't available, LiveBg.ok is false and the app
// keeps its normal still background.

(function () {
  const MAX_DROPS = 12;
  const DROP_LIFE = 2.6; // seconds a ripple lasts
  const EFFECTS = { still: 0, ripple: 0, flow: 1, melt: 2, rain: 3, storm: 4, kaleido: 5, tunnel: 6, bubbles: 7 };
  // Frame pacing per mode (ms). Slow effects run at ~30fps to save battery.
  const FRAME_MS = { flow: 33, melt: 33, rain: 16, storm: 16, kaleido: 33, tunnel: 33, bubbles: 33 };

  const VERT = `
    attribute vec2 pos;
    varying vec2 uv;
    void main() {
      uv = vec2(pos.x * 0.5 + 0.5, 0.5 - pos.y * 0.5); // (0,0) = top-left, like the screen
      gl_Position = vec4(pos, 0.0, 1.0);
    }`;

  const FRAG = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 uv;
    uniform sampler2D tex;
    uniform vec2 res;
    uniform float time;
    uniform float effect;   // 0 none, 1 flow, 2 melt, 3 rain, 4 storm, 5 kaleido, 6 tunnel, 7 bubbles
    uniform float flash;    // lightning brightness 0..1
    uniform vec3 bolt;      // x position, random seed, how far down it reaches
    uniform vec4 drops[${MAX_DROPS}]; // x, y (0..1), start time, strength

    float hash(float n) { return fract(sin(n) * 43758.5453); }
    float noise(float x) {
      float i = floor(x);
      float f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(hash(i), hash(i + 1.0), f);
    }
    vec3 hueShift(vec3 c, float a) {
      const vec3 k = vec3(0.57735);
      float ca = cos(a);
      return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
    }
    // Sample the image, mirroring at the edges so scrolling effects never show a seam
    vec3 sampleMirror(vec2 p) {
      p = abs(mod(p + 1.0, 2.0) - 1.0);
      return texture2D(tex, p).rgb;
    }

    // Three layers of rain streaks at different sizes and speeds
    float rain(vec2 p, float t) {
      float a = 0.0;
      for (int L = 0; L < 3; L++) {
        float fl = float(L);
        float cols = 28.0 + fl * 22.0;
        float rows = 3.0 + fl;
        vec2 g = vec2(p.x * cols, p.y * rows - t * (1.6 + fl * 0.6) * rows);
        float cx = floor(g.x);
        float r = hash(cx * 13.7 + fl * 7.1);
        g.y += r * 10.0;
        float cy = fract(g.y);
        float fx = fract(g.x) - 0.5 - (r - 0.5) * 0.5;
        float lit = step(0.5, hash(cx * 3.1 + floor(g.y) * 17.0 + fl));
        float streak = smoothstep(0.07, 0.0, abs(fx)) * smoothstep(0.0, 0.7, cy) * step(cy, 0.92) * lit;
        a += streak * (0.22 + fl * 0.12);
      }
      return a;
    }

    void main() {
      vec2 aspect = vec2(res.x / res.y, 1.0);
      vec2 offset = vec2(0.0);
      float shade = 0.0;

      // Ripples from touches and raindrops
      for (int i = 0; i < ${MAX_DROPS}; i++) {
        vec4 d = drops[i];
        float age = time - d.z;
        if (d.w <= 0.0 || age < 0.0 || age > ${DROP_LIFE.toFixed(1)}) continue;
        vec2 dir = (uv - d.xy) * aspect;
        float dist = length(dir);
        float x = dist - age * 0.45;
        float envelope = exp(-x * x * 900.0) * (1.0 - age / ${DROP_LIFE.toFixed(1)}) * d.w;
        float wave = sin(x * 160.0) * envelope;
        vec2 n = dist > 0.0001 ? dir / dist : vec2(0.0);
        offset += n / aspect * wave * 0.02;
        shade += wave;
      }

      vec2 p = uv + offset;
      vec3 col;
      float bubbleLight = 0.0;
      if (effect > 6.5) {
        // Bubbles: soap bubbles rising and wobbling, magnifying the picture inside
        for (int i = 0; i < 14; i++) {
          float fi = float(i);
          float size = 0.03 + hash(fi * 7.3) * 0.06;
          float speed = 0.03 + hash(fi * 3.1) * 0.06;
          float y = 1.15 - fract(time * speed + hash(fi * 5.7)) * 1.35;
          float x = hash(fi * 11.9) + sin(time * 0.7 + fi * 2.0) * 0.03;
          vec2 dv = (uv - vec2(x, y)) * aspect;
          float d = length(dv);
          if (d < size) {
            p -= dv / aspect * 0.35 * (1.0 - d / size); // lens
            bubbleLight += smoothstep(size * 0.82, size, d) * 0.55; // rim
            bubbleLight += smoothstep(size * 0.25, 0.0, length(dv + size * vec2(0.35, 0.4))) * 0.6; // shine
          }
        }
        col = texture2D(tex, clamp(p, 0.0, 1.0)).rgb;
      } else if (effect > 5.5) {
        // Tunnel: polar coordinates, depth scrolling toward you forever
        vec2 c = (p - 0.5) * aspect;
        float r = length(c) + 0.0001;
        float ang = atan(c.y, c.x) / 6.2831853 + 0.5 + time * 0.03;
        float depth = 0.3 / r + time * 0.35;
        vec2 q = vec2(abs(fract(ang * 2.0) * 2.0 - 1.0), abs(fract(depth * 0.5) * 2.0 - 1.0));
        col = texture2D(tex, q).rgb * smoothstep(0.0, 0.3, r);
        col = hueShift(col, time * 0.2);
      } else if (effect > 4.5) {
        // Kaleidoscope: fold the picture into 8 mirrored wedges and turn it slowly
        vec2 c = (p - 0.5) * aspect;
        float r = length(c) * (1.0 + 0.12 * sin(time * 0.3));
        float seg = 6.2831853 / 8.0;
        float ang = mod(atan(c.y, c.x) + time * 0.15, seg);
        ang = abs(ang - seg * 0.5);
        vec2 q = vec2(cos(ang), sin(ang)) * r / aspect + 0.5;
        col = sampleMirror(q);
        col = hueShift(col, time * 0.1);
      } else if (effect > 1.5 && effect < 2.5) {
        // Melt: each column slides down at its own wobbly speed, so the picture drips
        float speed = 0.35 + 0.65 * noise(uv.x * 9.0) + 0.3 * noise(uv.x * 37.0);
        float drip = time * 0.035 * speed + 0.025 * sin(uv.x * 45.0 + time * 0.8) * noise(uv.x * 5.0 + time * 0.1);
        p.y -= drip;
        p.x += 0.01 * sin(p.y * 12.0 + time * 0.5);
        col = sampleMirror(p);
        col = hueShift(col, time * 0.08);
      } else {
        if (effect > 0.5 && effect < 1.5) {
          // Flow: slow liquid warping
          p += vec2(sin(uv.y * 9.0 + time * 0.7), cos(uv.x * 7.0 + time * 0.5)) * 0.012;
        }
        col = texture2D(tex, clamp(p, 0.0, 1.0)).rgb;
        if (effect > 0.5 && effect < 1.5) col = hueShift(col, time * 0.35);
      }

      col += shade * 0.22; // light and shadow on the wave crests
      col += bubbleLight;

      if (effect > 2.5 && effect < 4.5) {
        // Rain and storm: darker sky, falling streaks
        col *= effect > 3.5 ? 0.62 : 0.8;
        col = mix(col, vec3(0.86, 0.9, 1.0), clamp(rain(uv, time), 0.0, 1.0) * 0.55);
      }

      if (flash > 0.0) {
        // Jagged lightning bolt plus a flash over the whole sky
        float bx = bolt.x + (noise(uv.y * 7.0 + bolt.y) - 0.5) * 0.2 + (noise(uv.y * 31.0 + bolt.y * 3.0) - 0.5) * 0.05;
        float d = abs(uv.x - bx) * aspect.x;
        float reach = smoothstep(bolt.z, bolt.z - 0.05, uv.y);
        float boltLight = (exp(-d * 500.0) + exp(-d * 45.0) * 0.45) * reach;
        col += flash * (boltLight * vec3(0.85, 0.9, 1.0) + 0.3);
      }

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`;

  let canvas = null;
  let gl = null;
  const loc = {};
  let ok = false;
  let mode = "ripple";
  let drops = [];
  let running = false;
  let lastDraw = 0;
  let nextRain = 0;
  let nextBolt = 0;
  let boltStart = -10;
  let boltData = [0.5, 0, 0.8];
  const start = performance.now();
  const now = () => (performance.now() - start) / 1000;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function init(el) {
    canvas = el;
    try {
      gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
      if (!gl) return false;
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);

      // One rectangle covering the screen
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const pos = gl.getAttribLocation(prog, "pos");
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      // Screen-sized images aren't powers of two, so: no mipmaps, clamp at the edges
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      for (const name of ["tex", "res", "time", "effect", "flash", "bolt", "drops"]) {
        loc[name] = gl.getUniformLocation(prog, name);
      }
      gl.uniform1i(loc.tex, 0);
      ok = true;
      resize();
    } catch (err) {
      console.warn("Living background unavailable", err);
      ok = false;
    }
    document.addEventListener("visibilitychange", () => !document.hidden && kick());
    return ok;
  }

  function resize() {
    if (!ok) return;
    // Below full resolution: the background is soft anyway and this keeps it smooth
    const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.75;
    canvas.width = Math.round(window.innerWidth * scale);
    canvas.height = Math.round(window.innerHeight * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    draw(now());
  }

  function setImage(source) {
    if (!ok) return;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    draw(now());
    kick();
  }

  function setMode(m) {
    mode = m in EFFECTS ? m : "ripple";
    draw(now());
    kick();
  }

  function drop(clientX, clientY, strength = 1) {
    if (!ok || mode === "still") return;
    addDrop(clientX / window.innerWidth, clientY / window.innerHeight, strength);
  }

  function addDrop(x, y, strength) {
    drops.push({ x, y, t: now(), s: strength });
    if (drops.length > MAX_DROPS) drops.shift();
    kick();
  }

  // Lightning brightness over time: bright strike, flicker, second strike, fade
  function flashLevel(t) {
    const age = t - boltStart;
    if (age < 0 || age > 1.2) return 0;
    if (age < 0.07) return 1;
    if (age < 0.14) return 0.15;
    if (age < 0.22) return 0.8;
    return 0.8 * Math.exp(-(age - 0.22) * 5);
  }

  // Raindrops and lightning are scheduled here, in between frames
  function weather(t) {
    if (mode === "rain" || mode === "storm") {
      if (t >= nextRain) {
        addDrop(Math.random(), 0.15 + Math.random() * 0.85, 0.25 + Math.random() * 0.2);
        nextRain = t + 0.12 + Math.random() * 0.25;
      }
    }
    if (mode === "storm" && t >= nextBolt) {
      boltStart = t;
      boltData = [0.15 + Math.random() * 0.7, Math.random() * 100, 0.45 + Math.random() * 0.5];
      nextBolt = t + 4 + Math.random() * 7;
    }
  }

  // Lightning right now (storm mode), instead of waiting for the next random strike
  function strike() {
    if (!ok || mode !== "storm") return;
    nextBolt = 0;
    kick();
  }

  function draw(t) {
    if (!ok) return;
    const data = new Float32Array(MAX_DROPS * 4);
    drops.forEach((d, i) => data.set([d.x, d.y, d.t, d.s], i * 4));
    gl.uniform2f(loc.res, canvas.width, canvas.height);
    gl.uniform1f(loc.time, t);
    gl.uniform1f(loc.effect, EFFECTS[mode]);
    gl.uniform1f(loc.flash, mode === "storm" ? flashLevel(t) : 0);
    gl.uniform3f(loc.bolt, boltData[0], boltData[1], boltData[2]);
    gl.uniform4fv(loc.drops, data);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame(ms) {
    if (document.hidden || canvas.hidden) {
      running = false;
      return;
    }
    const t = now();
    weather(t);
    drops = drops.filter((d) => t - d.t < DROP_LIFE);
    const continuous = EFFECTS[mode] > 0;
    const busy = drops.length > 0;
    // Touch ripples render every frame; continuous effects are paced per mode
    if ((busy && !continuous) || ms - lastDraw >= (FRAME_MS[mode] || 16) - 2) {
      draw(t);
      lastDraw = ms;
    }
    if (busy || continuous) requestAnimationFrame(frame);
    else running = false;
  }

  function kick() {
    if (!ok || running || document.hidden) return;
    running = true;
    requestAnimationFrame(frame);
  }

  window.LiveBg = {
    init,
    resize,
    setImage,
    setMode,
    drop,
    kick,
    strike,
    get ok() {
      return ok;
    },
  };
})();
