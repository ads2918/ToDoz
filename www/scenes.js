// Animated scenes: whole backgrounds drawn by a WebGL shader (tie-dye, digital rain, synthwave...),
// ported from the desktop to-do app. Unlike livebg.js, which moves a still picture around, these
// draw the picture itself. Touching makes water ripples; "Still" freezes the scene.
// Renders at half resolution and ~30fps, and stops while hidden or frozen.
// Exposed as window.Scenes. If WebGL isn't available, Scenes.ok is false and the app shows the
// scene's CSS preview as a still background instead.

(function () {
  // accent: the theme color used for buttons and the status bar while the scene is showing
  const PRESETS = [
    { id: "rain", label: "Digital Rain", mode: 11, accent: "#11a84a", css: "repeating-linear-gradient(90deg, #00170a 0 6px, #11d65a 6px 8px)" },
    { id: "tiedye", label: "Tie-dye", mode: 0, accent: "#8a4fff", css: "conic-gradient(from 30deg, #ff3cac, #ffd23f, #3bf4fb, #8a4fff, #ff3cac)" },
    { id: "sunset", label: "Sunset", mode: 1, accent: "#c2305f", css: "linear-gradient(0deg, #ff8c26, #f24072, #5a1f73)" },
    { id: "ocean", label: "Ocean", mode: 2, accent: "#007399", css: "linear-gradient(0deg, #001f4d, #007399)" },
    { id: "aurora", label: "Aurora", mode: 3, accent: "#1f9e63", css: "linear-gradient(0deg, #02040f, #0d2a3a 60%, #3fe38f 75%, #070f2e)" },
    { id: "neon", label: "Neon Acid", mode: 4, accent: "#c400b0", css: "linear-gradient(135deg, #39ff14, #ff00e6, #00e5ff)" },
    { id: "lava", label: "Lava Lamp", mode: 5, accent: "#d9480a", css: "radial-gradient(circle at 40% 60%, #ffb21a, #ff5a0d 25%, #4d0840 60%)" },
    { id: "cosmic", label: "Cosmic", mode: 6, accent: "#6b1a8a", css: "radial-gradient(circle at 30% 40%, #6b1a8a, #0a0018 70%)" },
    { id: "vortex", label: "Vortex", mode: 7, accent: "#2b86c5", css: "repeating-conic-gradient(#ff3cac 0 15deg, #2b86c5 15deg 30deg)" },
    { id: "kaleidoscope", label: "Kaleidoscope", mode: 9, accent: "#8a4fff", css: "conic-gradient(#ff3cac, #ffd23f, #3bf4fb, #ff3cac, #8a4fff, #3bf4fb, #ff3cac)" },
    { id: "synthwave", label: "Synthwave", mode: 10, accent: "#d42f76", css: "linear-gradient(0deg, #14002b 0 42%, #ff3d8b 42%, #ffb03d 62%, #2a0a4a)" },
    { id: "hypno", label: "Hypno Rings", mode: 12, accent: "#c92a8a", css: "repeating-radial-gradient(circle, #ff3cac 0 6px, #1a1030 6px 12px, #3bf4fb 12px 18px)" },
    { id: "marble", label: "Liquid Marble", mode: 13, accent: "#6a5acd", css: "linear-gradient(135deg, #d9a7c7, #7f7fd5, #fffcdc, #86a8e7)" },
    { id: "warp", label: "Warp Speed", mode: 14, accent: "#6a4fd8", css: "radial-gradient(circle, #6a4fd8 0, #0a0624 45%, #000 70%)" },
  ];

  const MAX_TOUCHES = 8;
  const RENDER_SCALE = 0.5;
  const FRAME_MS = 1000 / 30;
  const TOUCH_LIFE = 3.5; // seconds a ripple lasts

  const VERT = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

  const FRAG = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform int u_mode;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
// Up to 8 live touches: x, y (0..1, y up), age in seconds (negative = unused), kind (1 water, 2 vortex, 3 melt).
uniform vec4 u_touches[8];
// Color shift slider, in radians around the color wheel.
uniform float u_hue;

const float TAU = 6.2831853;

// Sine-free hash: the classic fract(sin(x) * 43758.5) amplifies tiny GPU rounding differences
// between neighbouring noise cells, which showed up as square seams across the background.
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float total = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 5; octave++) {
    total += amplitude * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    amplitude *= 0.5;
  }
  return total;
}

vec3 cosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b * cos(TAU * (c * t + d)); }
vec3 rainbow(float t) { return cosinePalette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67)); }

vec3 hueShift(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a);
  return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}

// Returns the warped sample position; 'shine' collects highlights (ripple glints, vortex shadow).
vec2 applyTouchWarps(vec2 uv, float aspect, inout float shine) {
  for (int i = 0; i < 8; i++) {
    vec4 touch = u_touches[i];
    float age = touch.z;
    if (age < 0.0) continue;
    vec2 delta = (uv - touch.xy) * vec2(aspect, 1.0);
    float dist = length(delta) + 1e-5;
    vec2 direction = delta / dist;

    if (touch.w < 1.5) {
      // Water: a few rings travelling outward, fading with age and distance.
      float front = age * 0.32;
      float envelope = exp(-abs(dist - front) * 9.0) * exp(-age * 1.1);
      float wave = sin(dist * 70.0 - age * 14.0);
      uv += direction / vec2(aspect, 1.0) * wave * envelope * 0.018;
      shine += wave * envelope;
    } else if (touch.w < 2.5) {
      // Vortex: twist in and relax back out over ~3 seconds.
      float strength = sin(clamp(age / 3.0, 0.0, 1.0) * 3.14159);
      float falloff = exp(-dist * 3.5);
      float angle = strength * falloff * 9.0;
      float s = sin(angle);
      float c = cos(angle);
      vec2 twisted = vec2(c * delta.x - s * delta.y, s * delta.x + c * delta.y);
      twisted *= 1.0 + strength * falloff * 0.8;
      uv = touch.xy + twisted / vec2(aspect, 1.0);
      shine -= strength * exp(-dist * 9.0) * 1.5;
    } else {
      // Melt: uneven drips run down from the touch point, then the picture slowly re-forms.
      float grow = smoothstep(0.0, 2.0, age) * (1.0 - smoothstep(5.0, 8.0, age));
      float column = exp(-pow(delta.x * 3.5, 2.0));
      float dripLength = 0.25 + 0.75 * noise(vec2(uv.x * 28.0, 3.0)) * noise(vec2(uv.x * 7.0, 5.0));
      float below = smoothstep(0.05, -0.15, delta.y);
      float pull = grow * column * dripLength * below * 0.45;
      uv.y += pull;
      shine += pull * 2.0 * noise(vec2(uv.x * 40.0, uv.y * 4.0));
    }
  }
  return uv;
}

vec3 tieDye(vec2 p, float t) {
  float n = fbm(p * 2.5 + t * 0.08);
  float radius = length(p);
  float angle = atan(p.y, p.x);
  float swirl = angle / TAU + log(radius + 0.04) * 0.8 - t * 0.04 + n * 0.7;
  vec3 color = rainbow(swirl * 3.0 + n * 0.5);
  // Crinkled white streaks where the dye didn't soak in.
  float crinkle = smoothstep(0.62, 0.8, fbm(vec2(swirl * 9.0, radius * 6.0) + n * 3.0));
  color = mix(color, vec3(1.0, 0.97, 0.95), crinkle * 0.45);
  return color * (0.85 + 0.25 * n);
}

vec3 sunset(vec2 uv, float t) {
  float n = fbm(uv * vec2(2.0, 4.0) + vec2(t * 0.05, 0.0));
  float h = uv.y + n * 0.25;
  vec3 color = mix(vec3(1.0, 0.55, 0.15), vec3(0.95, 0.25, 0.45), smoothstep(0.1, 0.5, h));
  color = mix(color, vec3(0.35, 0.12, 0.45), smoothstep(0.45, 0.95, h));
  float sun = exp(-length((uv - vec2(0.5, 0.25)) * vec2(1.6, 1.0)) * 6.0);
  return color + vec3(1.0, 0.8, 0.4) * sun * 0.6;
}

vec3 ocean(vec2 uv, float t) {
  vec2 p = uv * 6.0;
  float caustic = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    p += vec2(sin(p.y * 0.9 + t * 0.6 + fi), cos(p.x * 0.8 - t * 0.5 + fi)) * 0.6;
    caustic += abs(sin(p.x + p.y));
  }
  caustic = pow(1.0 - caustic / 3.0, 3.0);
  vec3 deep = mix(vec3(0.0, 0.12, 0.3), vec3(0.0, 0.45, 0.6), uv.y);
  return deep + vec3(0.4, 0.9, 1.0) * caustic * 0.7;
}

vec3 aurora(vec2 uv, float t) {
  vec3 color = mix(vec3(0.01, 0.02, 0.08), vec3(0.03, 0.06, 0.18), uv.y);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float curtainY = 0.55 + fi * 0.1 + 0.12 * fbm(vec2(uv.x * 2.0 + t * 0.06 + fi * 3.0, t * 0.05));
    float band = exp(-abs(uv.y - curtainY) * (10.0 + fi * 4.0));
    float rays = 0.6 + 0.4 * noise(vec2(uv.x * 40.0 + t * 0.3, fi));
    vec3 tint = mix(vec3(0.1, 1.0, 0.55), vec3(0.6, 0.25, 1.0), fi / 2.0 + 0.3 * sin(t * 0.2));
    color += tint * band * rays * 0.7;
  }
  float stars = step(0.997, hash(floor(uv * u_resolution / 2.0))) * (0.5 + 0.5 * sin(t * 3.0 + uv.x * 50.0));
  return color + stars;
}

vec3 neonAcid(vec2 p, float t) {
  float v = sin(p.x * 8.0 + t) + sin(p.y * 7.0 - t * 1.3) + sin((p.x + p.y) * 6.0 + t * 0.7)
          + sin(length(p) * 12.0 - t * 2.0);
  vec3 color = cosinePalette(v * 0.25 + t * 0.05, vec3(0.5), vec3(0.6), vec3(1.0, 1.0, 1.0), vec3(0.3, 0.2, 0.2));
  return pow(color, vec3(0.8)) * 1.1;
}

vec3 lavaLamp(vec2 p, float t) {
  float field = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 center = vec2(sin(t * 0.21 * (1.0 + fi * 0.13) + fi * 2.1) * 0.55,
                       sin(t * 0.17 * (1.0 + fi * 0.11) + fi * 1.3) * 0.45);
    float radius = 0.12 + 0.05 * sin(fi * 4.0);
    field += radius * radius / dot(p - center, p - center);
  }
  vec3 background = mix(vec3(0.25, 0.02, 0.25), vec3(0.45, 0.05, 0.2), p.y + 0.5);
  vec3 wax = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.85, 0.2), smoothstep(1.0, 3.0, field));
  return mix(background, wax, smoothstep(0.9, 1.1, field));
}

vec3 cosmic(vec2 uv, vec2 p, float t) {
  float n = fbm(p * 1.8 + vec2(t * 0.02, -t * 0.015));
  float n2 = fbm(p * 3.5 - n + t * 0.01);
  vec3 color = vec3(0.02, 0.0, 0.06);
  color += vec3(0.6, 0.1, 0.7) * pow(n, 2.5) * 1.8;
  color += vec3(0.1, 0.4, 0.9) * pow(n2, 3.0) * 1.6;
  vec2 cell = floor(uv * u_resolution / 3.0);
  float star = step(0.996, hash(cell));
  color += star * (0.6 + 0.4 * sin(t * 2.0 + hash(cell) * 40.0));
  return color;
}

vec3 vortexTunnel(vec2 p, float t) {
  float radius = length(p) + 1e-3;
  float angle = atan(p.y, p.x);
  float depth = 0.35 / radius + t * 0.6;
  float spin = angle / TAU + depth * 0.15 + t * 0.05;
  float stripes = 0.5 + 0.5 * sin(spin * TAU * 6.0 + depth * 4.0);
  vec3 color = rainbow(depth * 0.15 + spin) * (0.45 + 0.55 * stripes);
  return color * smoothstep(0.0, 0.35, radius) + vec3(1.0) * exp(-radius * 18.0) * 0.6;
}

// Folds the angle into one mirrored wedge and repeats it 8 times around the centre.
vec3 kaleidoscope(vec2 p, float t) {
  float radius = length(p);
  float wedge = TAU / 8.0;
  float angle = mod(atan(p.y, p.x) + t * 0.1, wedge);
  angle = abs(angle - wedge * 0.5);
  vec2 q = vec2(cos(angle), sin(angle)) * radius + vec2(t * 0.05, 0.0);
  float n = fbm(q * 4.0 + t * 0.1);
  float rings = sin(radius * 14.0 - t * 1.2 + n * 6.0);
  vec3 color = rainbow(n * 1.5 + radius * 0.8 - t * 0.05) * (0.75 + 0.25 * rings);
  return color + vec3(1.0) * smoothstep(0.92, 1.0, rings) * 0.25;
}

// Striped sun and starry sky above the horizon, a neon grid rolling towards you below it.
vec3 synthwave(vec2 uv, vec2 p, float t) {
  float horizon = 0.42;
  if (uv.y > horizon) {
    float height = (uv.y - horizon) / (1.0 - horizon);
    vec3 sky = mix(vec3(1.0, 0.35, 0.55), vec3(0.12, 0.02, 0.3), pow(height, 0.6));
    vec2 sunCentre = vec2(0.0, 0.18);
    float distanceToSun = length(p - sunCentre);
    float sun = smoothstep(0.22, 0.215, distanceToSun);
    float gaps = step(0.5, fract((p.y - sunCentre.y) * 18.0 - t * 0.3));
    sun *= 1.0 - step(p.y, sunCentre.y) * (1.0 - gaps);
    vec3 sunColor = mix(vec3(1.0, 0.85, 0.2), vec3(1.0, 0.2, 0.6), clamp((sunCentre.y + 0.22 - p.y) / 0.44, 0.0, 1.0));
    sky = mix(sky, sunColor, sun) + vec3(1.0, 0.4, 0.7) * exp(-distanceToSun * 6.0) * 0.35;
    return sky + step(0.997, hash(floor(uv * u_resolution / 2.0))) * height;
  }
  float depth = max(horizon - uv.y, 0.001);
  vec2 grid = vec2(p.x / depth * 1.2, 0.12 / depth + t * 0.8);
  vec2 cell = abs(fract(grid) - 0.5);
  // Lines fade out near the horizon, where they'd be thinner than a pixel and shimmer.
  float line = smoothstep(0.4, 0.5, max(cell.x, cell.y)) * smoothstep(0.0, 0.06, depth);
  return vec3(0.08, 0.0, 0.15) + vec3(1.0, 0.25, 0.85) * line * (1.0 + depth * 1.5)
       + vec3(1.0, 0.3, 0.6) * exp(-depth * 18.0) * 0.6;
}

// Columns of flickering block glyphs, each column falling at its own speed with a fading trail.
vec3 digitalRain(vec2 uv, float t) {
  vec2 cellCount = max(floor(u_resolution / vec2(9.0, 12.0)), vec2(8.0, 6.0));
  vec2 cell = floor(uv * cellCount);
  float speed = 0.6 + hash(vec2(cell.x, 1.0)) * 1.4;
  float headRow = mod(t * speed * 12.0 + hash(vec2(cell.x, 7.0)) * 500.0, cellCount.y + 30.0);
  float behindHead = headRow - (cellCount.y - cell.y);
  float trail = behindHead >= 0.0 ? exp(-behindHead * 0.12) : 0.0;
  float glyphSeed = hash(cell + floor(t * (2.0 + hash(cell) * 6.0)));
  vec2 inCell = fract(uv * cellCount);
  float glyph = step(0.5, hash(floor(inCell * vec2(3.0, 4.0)) + glyphSeed * 13.0));
  glyph *= step(0.12, inCell.x) * step(inCell.x, 0.88) * step(0.08, inCell.y) * step(inCell.y, 0.92);
  float head = step(0.0, behindHead) * step(behindHead, 0.99);
  return vec3(0.0, 0.03, 0.01) + vec3(0.1, 1.0, 0.35) * glyph * trail + vec3(0.8, 1.0, 0.85) * glyph * head;
}

// Concentric rings that pulse outward and twist, in shifting rainbow colours.
vec3 hypnoRings(vec2 p, float t) {
  float radius = length(p);
  float angle = atan(p.y, p.x);
  float wave = sin(radius * 30.0 - t * 3.0 + sin(angle * 3.0 + t) * 1.5);
  float twist = sin(angle * 6.0 + radius * 10.0 - t * 2.0);
  vec3 color = rainbow(radius * 1.2 - t * 0.15 + 0.1 * twist);
  return mix(color * 0.15, color, smoothstep(-0.2, 0.2, wave * twist));
}

// Noise fed into noise fed into noise ("domain warping") gives the swirls of marbled ink.
vec3 liquidMarble(vec2 p, float t) {
  vec2 q = vec2(fbm(p * 1.5 + t * 0.03), fbm(p * 1.5 + vec2(5.2, 1.3) - t * 0.03));
  vec2 r = vec2(fbm(p * 1.5 + 4.0 * q + vec2(1.7, 9.2) + t * 0.05),
                fbm(p * 1.5 + 4.0 * q + vec2(8.3, 2.8) - t * 0.04));
  float f = fbm(p * 1.5 + 4.0 * r);
  vec3 color = cosinePalette(f * 1.6 + r.x, vec3(0.6, 0.5, 0.6), vec3(0.4, 0.4, 0.45), vec3(1.0), vec3(0.0, 0.2, 0.45));
  return mix(color, vec3(1.0), smoothstep(0.75, 0.95, f) * 0.5);
}

// Stars on thin spokes from the centre, speeding up and stretching as they fly outward.
vec3 warpSpeed(vec2 p, float t) {
  float radius = length(p);
  float angle = atan(p.y, p.x);
  vec3 color = vec3(0.0, 0.0, 0.03) + vec3(0.3, 0.2, 0.6) * exp(-radius * 4.0) * 0.5;
  for (int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    float spokes = 140.0 + fl * 60.0;
    float spoke = floor(angle / TAU * spokes);
    float rnd = hash(vec2(spoke, fl));
    float travelled = fract(rnd * 7.3 + t * (0.4 + rnd * 1.2) * 0.25);
    float starRadius = travelled * travelled * 1.4;
    float streak = smoothstep(0.02 + travelled * 0.25, 0.0, starRadius - radius) * step(radius, starRadius);
    float acrossSpoke = 1.0 - abs(fract(angle / TAU * spokes) - 0.5) * 2.0;
    streak *= smoothstep(0.6, 1.0, acrossSpoke) * step(0.6, rnd);
    color += mix(vec3(0.6, 0.8, 1.0), vec3(1.0, 0.7, 1.0), rnd) * streak * travelled * 1.5;
  }
  return color;
}

vec3 customGradient(vec2 uv, float t) {
  float f = uv.y + 0.3 * (fbm(uv * 2.0 + t * 0.08) - 0.5) + 0.1 * sin(uv.x * 3.0 + t * 0.3);
  vec3 color = mix(u_color1, u_color2, smoothstep(0.0, 0.5, f));
  return mix(color, u_color3, smoothstep(0.5, 1.0, f));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  float shine = 0.0;
  uv = applyTouchWarps(uv, aspect, shine);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time;

  vec3 color;
  if (u_mode == 0) color = tieDye(p, t);
  else if (u_mode == 1) color = sunset(uv, t);
  else if (u_mode == 2) color = ocean(uv, t);
  else if (u_mode == 3) color = aurora(uv, t);
  else if (u_mode == 4) color = neonAcid(p, t);
  else if (u_mode == 5) color = lavaLamp(p, t);
  else if (u_mode == 6) color = cosmic(uv, p, t);
  else if (u_mode == 7) color = vortexTunnel(p, t);
  else if (u_mode == 9) color = kaleidoscope(p, t);
  else if (u_mode == 10) color = synthwave(uv, p, t);
  else if (u_mode == 11) color = digitalRain(uv, t);
  else if (u_mode == 12) color = hypnoRings(p, t);
  else if (u_mode == 13) color = liquidMarble(p, t);
  else if (u_mode == 14) color = warpSpeed(p, t);
  else color = customGradient(uv, t);

  if (u_hue != 0.0) color = hueShift(color, u_hue);
  color += vec3(0.85, 0.95, 1.0) * clamp(shine, -0.6, 1.0) * 0.35;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

  let canvas = null;
  let gl = null;
  const loc = {};
  let ok = false;
  let scene = PRESETS[0];
  let still = false;
  let hue = 0;
  let animationTime = 0;
  let lastFrameAt = 0;
  let lastDraw = 0;
  let running = false;
  let touches = [];
  const now = () => performance.now() / 1000;

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

      // One triangle bigger than the screen
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const pos = gl.getAttribLocation(prog, "a_position");
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

      for (const name of ["u_resolution", "u_time", "u_mode", "u_color1", "u_color2", "u_color3", "u_touches", "u_hue"]) {
        loc[name] = gl.getUniformLocation(prog, name);
      }
      ok = true;
    } catch (err) {
      console.warn("Animated scenes unavailable", err);
      ok = false;
    }
    document.addEventListener("visibilitychange", () => !document.hidden && redraw());
    window.addEventListener("resize", redraw);
    return ok;
  }

  // Hidden attribute, or display:none while minimized to the bubble
  const isShowing = () => !document.hidden && !canvas.hidden && canvas.offsetWidth > 0;

  function resize() {
    const w = Math.max(1, Math.round(window.innerWidth * RENDER_SCALE));
    const h = Math.max(1, Math.round(window.innerHeight * RENDER_SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function draw() {
    resize();
    const t = now();
    const data = new Float32Array(MAX_TOUCHES * 4);
    for (let i = 0; i < MAX_TOUCHES; i++) {
      const d = touches[i];
      // kind 1 = water ripple in the shader; a negative age marks the slot unused
      data.set(d ? [d.x, d.y, t - d.t, 1] : [0, 0, -1, 0], i * 4);
    }
    gl.uniform2f(loc.u_resolution, canvas.width, canvas.height);
    gl.uniform1f(loc.u_time, animationTime);
    gl.uniform1i(loc.u_mode, scene.mode);
    // Only the desktop app's "your colours" scene uses these
    gl.uniform3f(loc.u_color1, 0, 0, 0);
    gl.uniform3f(loc.u_color2, 0, 0, 0);
    gl.uniform3f(loc.u_color3, 0, 0, 0);
    gl.uniform4fv(loc.u_touches, data);
    gl.uniform1f(loc.u_hue, hue);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(ms) {
    if (!isShowing()) {
      running = false;
      return;
    }
    const elapsed = lastFrameAt ? Math.min(ms - lastFrameAt, 100) : 0;
    lastFrameAt = ms;
    if (!still) animationTime += elapsed / 1000;
    const t = now();
    touches = touches.filter((d) => t - d.t < TOUCH_LIFE);
    if (ms - lastDraw >= FRAME_MS - 2) {
      draw();
      lastDraw = ms;
    }
    if (!still || touches.length) requestAnimationFrame(frame);
    else running = false;
  }

  function kick() {
    if (!ok || running || !isShowing()) return;
    running = true;
    lastFrameAt = 0;
    requestAnimationFrame(frame);
  }

  function redraw() {
    if (!ok || !isShowing()) return;
    draw();
    kick();
  }

  function setScene(id) {
    scene = PRESETS.find((p) => p.id === id) || PRESETS[0];
    redraw();
  }

  function setStill(value) {
    still = !!value;
    redraw();
  }

  // degrees, like the Color shift slider
  function setHue(degrees) {
    hue = ((Number(degrees) || 0) * Math.PI) / 180;
    redraw();
  }

  function drop(clientX, clientY) {
    if (!ok) return;
    touches.push({ x: clientX / window.innerWidth, y: 1 - clientY / window.innerHeight, t: now() });
    if (touches.length > MAX_TOUCHES) touches.shift();
    kick();
  }

  window.Scenes = {
    PRESETS,
    init,
    setScene,
    setStill,
    setHue,
    drop,
    redraw,
    get ok() {
      return ok;
    },
  };
})();
