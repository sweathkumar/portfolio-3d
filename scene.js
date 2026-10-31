// A single particle field that morphs between formations as the visitor scrolls.
// Positions ease on the CPU (cheap at this count); shimmer, pointer repulsion and colour run in the shader.
import * as THREE from 'three';

const TAU = Math.PI * 2;

// Deterministic random so every visit gets the same shapes.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rnd) {
  return Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(TAU * rnd());
}

function rotateX(arr, a) {
  const c = Math.cos(a), s = Math.sin(a);
  for (let i = 0; i < arr.length; i += 3) {
    const y = arr[i + 1], z = arr[i + 2];
    arr[i + 1] = y * c - z * s;
    arr[i + 2] = y * s + z * c;
  }
  return arr;
}

const SHAPES = {
  sphere(n, rnd) {
    const out = new Float32Array(n * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = i * golden;
      let R = 2.15 * (0.94 + rnd() * 0.06);
      if (rnd() < 0.14) R *= Math.pow(rnd(), 0.6);
      out[i * 3] = Math.cos(t) * r * R;
      out[i * 3 + 1] = y * R;
      out[i * 3 + 2] = Math.sin(t) * r * R;
    }
    return out;
  },

  rings(n, rnd) {
    const out = new Float32Array(n * 3);
    const rings = [
      { r: 1.25, tx: 1.2, tz: 0.2 },
      { r: 1.75, tx: 0.4, tz: -0.6 },
      { r: 2.25, tx: -0.5, tz: 0.9 },
      { r: 2.75, tx: 1.45, tz: -0.25 },
    ];
    for (let i = 0; i < n; i++) {
      let x, y, z;
      if (i < n * 0.16) {
        // Small dense nucleus
        const u = rnd() * TAU, v = Math.acos(2 * rnd() - 1), R = 0.55 * Math.cbrt(rnd());
        x = R * Math.sin(v) * Math.cos(u); y = R * Math.cos(v); z = R * Math.sin(v) * Math.sin(u);
      } else {
        const ring = rings[i % rings.length];
        const a = rnd() * TAU, j = gauss(rnd) * 0.035;
        x = Math.cos(a) * (ring.r + j); y = gauss(rnd) * 0.03; z = Math.sin(a) * (ring.r + j);
        // Tilt around X then Z
        let c = Math.cos(ring.tx), s = Math.sin(ring.tx);
        [y, z] = [y * c - z * s, y * s + z * c];
        c = Math.cos(ring.tz); s = Math.sin(ring.tz);
        [x, y] = [x * c - y * s, x * s + y * c];
      }
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    }
    return out;
  },

  helix(n, rnd) {
    const out = new Float32Array(n * 3);
    const H = 6.2, turns = 2.6, R = 1.15, rungs = 34;
    for (let i = 0; i < n; i++) {
      let x, y, z;
      if (rnd() < 0.72) {
        const t = rnd();
        const a = t * TAU * turns + (i % 2 ? Math.PI : 0);
        const j = gauss(rnd) * 0.06;
        x = Math.cos(a) * (R + j); z = Math.sin(a) * (R + j); y = (t - 0.5) * H + gauss(rnd) * 0.03;
      } else {
        const k = Math.floor(rnd() * rungs), t = (k + 0.5) / rungs, a = t * TAU * turns, f = rnd() * 2 - 1;
        x = Math.cos(a) * R * f; z = Math.sin(a) * R * f; y = (t - 0.5) * H + gauss(rnd) * 0.015;
      }
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    }
    return rotateX(out, 0.28);
  },

  knot(n, rnd) {
    const out = new Float32Array(n * 3);
    const p = 2, q = 3, S = 0.78;
    for (let i = 0; i < n; i++) {
      const u = rnd() * TAU;
      const r = Math.cos(q * u) + 2;
      const cx = r * Math.cos(p * u), cy = r * Math.sin(p * u), cz = -Math.sin(q * u);
      const tube = 0.32 * Math.sqrt(rnd());
      const a = rnd() * TAU, b = Math.acos(2 * rnd() - 1);
      out[i * 3] = (cx + tube * Math.sin(b) * Math.cos(a)) * S;
      out[i * 3 + 1] = (cy + tube * Math.cos(b)) * S;
      out[i * 3 + 2] = (cz + tube * Math.sin(b) * Math.sin(a)) * S;
    }
    return out;
  },

  lattice(n, rnd) {
    const out = new Float32Array(n * 3);
    const g = 3, step = 1.25, off = ((g - 1) * step) / 2;
    const edges = [];
    for (let x = 0; x < g; x++) for (let y = 0; y < g; y++) for (let z = 0; z < g; z++) {
      const p = [x * step - off, y * step - off, z * step - off];
      if (x < g - 1) edges.push([p, [p[0] + step, p[1], p[2]]]);
      if (y < g - 1) edges.push([p, [p[0], p[1] + step, p[2]]]);
      if (z < g - 1) edges.push([p, [p[0], p[1], p[2] + step]]);
    }
    for (let i = 0; i < n; i++) {
      const [a, b] = edges[Math.floor(rnd() * edges.length)];
      const t = rnd();
      const node = rnd() < 0.2; // cluster some points on joints
      const tt = node ? (t < 0.5 ? 0 : 1) : t;
      const j = node ? 0.07 : 0.022;
      out[i * 3] = a[0] + (b[0] - a[0]) * tt + gauss(rnd) * j;
      out[i * 3 + 1] = a[1] + (b[1] - a[1]) * tt + gauss(rnd) * j;
      out[i * 3 + 2] = a[2] + (b[2] - a[2]) * tt + gauss(rnd) * j;
    }
    return out;
  },

  galaxy(n, rnd) {
    const out = new Float32Array(n * 3);
    const arms = 3;
    for (let i = 0; i < n; i++) {
      const r = Math.pow(rnd(), 1.6) * 3.4 + 0.08;
      const arm = (i % arms) * (TAU / arms);
      const a = arm + r * 1.35;
      const spread = 0.12 + r * 0.14;
      out[i * 3] = Math.cos(a) * r + gauss(rnd) * spread;
      out[i * 3 + 1] = gauss(rnd) * (0.08 + 0.12 * (1 - r / 3.5));
      out[i * 3 + 2] = Math.sin(a) * r + gauss(rnd) * spread;
    }
    return rotateX(out, 0.95);
  },

  grid(n, rnd) {
    const out = new Float32Array(n * 3);
    const cols = Math.round(Math.sqrt(n * 1.8));
    const rows = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) {
      const cx = i % cols, cz = Math.floor(i / cols);
      const x = (cx / (cols - 1) - 0.5) * 9;
      const z = (cz / (rows - 1) - 0.5) * 5;
      const y = Math.sin(x * 0.9) * Math.cos(z * 1.3) * 0.45 + Math.sin(x * 2.1 + z) * 0.08;
      out[i * 3] = x + (rnd() - 0.5) * 0.02;
      out[i * 3 + 1] = y - 0.6;
      out[i * 3 + 2] = z;
    }
    return rotateX(out, 0.55);
  },

  // Nodes joined by their nearest neighbours: a transit map in 3D.
  network(n, rnd) {
    const out = new Float32Array(n * 3);
    const nodes = [];
    for (let i = 0; i < 24; i++) {
      const u = rnd() * TAU, v = Math.acos(2 * rnd() - 1), R = 1.2 + rnd() * 1.4;
      nodes.push([R * Math.sin(v) * Math.cos(u) * 1.2, R * Math.cos(v) * 0.8, R * Math.sin(v) * Math.sin(u)]);
    }
    const edges = [];
    nodes.forEach((a, i) => {
      const near = nodes
        .map((b, j) => [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2])
        .filter(([j]) => j !== i)
        .sort((x, y) => x[1] - y[1])
        .slice(0, 3);
      near.forEach(([j]) => { if (i < j || !edges.some(([p, q]) => p === j && q === i)) edges.push([i, j]); });
    });
    for (let i = 0; i < n; i++) {
      let x, y, z;
      if (rnd() < 0.28) {
        const p = nodes[Math.floor(rnd() * nodes.length)];
        const s = 0.09;
        x = p[0] + gauss(rnd) * s; y = p[1] + gauss(rnd) * s; z = p[2] + gauss(rnd) * s;
      } else {
        const [ai, bi] = edges[Math.floor(rnd() * edges.length)];
        const a = nodes[ai], b = nodes[bi], t = rnd();
        x = a[0] + (b[0] - a[0]) * t + gauss(rnd) * 0.012;
        y = a[1] + (b[1] - a[1]) * t + gauss(rnd) * 0.012;
        z = a[2] + (b[2] - a[2]) * t + gauss(rnd) * 0.012;
      }
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    }
    return out;
  },

  burst(n, rnd) {
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rnd() * TAU, v = Math.acos(2 * rnd() - 1);
      const shell = rnd() < 0.55;
      const R = shell ? 3 + gauss(rnd) * 0.25 : 0.5 + Math.sqrt(rnd()) * 2.1;
      out[i * 3] = R * Math.sin(v) * Math.cos(u) * 1.25;
      out[i * 3 + 1] = R * Math.cos(v) * 0.85;
      out[i * 3 + 2] = R * Math.sin(v) * Math.sin(u);
    }
    return out;
  },
};

const vertexShader = /* glsl */ `
  attribute float aRand;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uAspect;
  uniform float uMotion;
  varying float vRand;
  varying float vDepth;
  varying float vGlow;

  void main() {
    vec3 p = position;
    float t = uTime * uMotion;
    p += 0.035 * vec3(
      sin(t * 0.9 + aRand * 43.0),
      cos(t * 0.7 + aRand * 31.0),
      sin(t * 0.8 + aRand * 17.0)
    );

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;
    vec2 diff = ndc - uMouse;
    diff.x *= uAspect;
    float d = length(diff);
    float f = smoothstep(0.34, 0.0, d) * uMouseStrength;
    vec2 dir = diff / max(d, 1e-4);
    dir.x /= uAspect;
    mv.xy += dir * f * 0.55 * (-mv.z / 8.0);
    vGlow = f;

    gl_Position = projectionMatrix * mv;
    float size = uSize * (0.35 + aRand * aRand * 1.4);
    gl_PointSize = size * uPixelRatio * (1.0 / -mv.z) * (1.0 + f * 1.5);
    vRand = aRand;
    vDepth = -mv.z;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vRand;
  varying float vDepth;
  varying float vGlow;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = pow(smoothstep(0.5, 0.0, d), 1.7);
    vec3 col = mix(uColorA, uColorB, smoothstep(0.15, 0.85, vRand));
    col = mix(col, vec3(1.0), vGlow * 0.55 + step(0.985, vRand) * 0.5);
    float fade = smoothstep(14.0, 5.0, vDepth);
    gl_FragColor = vec4(col, a * uOpacity * fade * (0.45 + vRand * 0.55));
  }
`;

export function createScene(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 8.5);

  const isSmall = () => window.innerWidth < 768;
  const lowPower = (navigator.hardwareConcurrency || 4) <= 4 || isSmall();
  const COUNT = lowPower ? 7000 : 15000;
  const rnd = mulberry32(7);

  const targets = {};
  for (const [name, fn] of Object.entries(SHAPES)) targets[name] = fn(COUNT, mulberry32(name.length * 997 + 13));

  const positions = new Float32Array(targets.sphere);
  // Start scattered so the first frame "assembles" into the hero shape.
  for (let i = 0; i < positions.length; i++) positions[i] = (rnd() - 0.5) * 18;

  const speeds = new Float32Array(COUNT);
  const rands = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) { speeds[i] = 0.018 + rnd() * 0.04; rands[i] = rnd(); }

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('aRand', new THREE.BufferAttribute(rands, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);

  const uniforms = {
    uTime: { value: 0 },
    uSize: { value: lowPower ? 34 : 30 },
    uPixelRatio: { value: 1 },
    uMouse: { value: new THREE.Vector2(9, 9) },
    uMouseStrength: { value: 0 },
    uAspect: { value: 1 },
    uMotion: { value: reducedMotion ? 0 : 1 },
    uOpacity: { value: 1 },
    uColorA: { value: new THREE.Color('#8f7bff') },
    uColorB: { value: new THREE.Color('#4ff0d0') },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader, fragmentShader, uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });

  const group = new THREE.Group();
  const points = new THREE.Points(geometry, material);
  group.add(points);
  scene.add(group);

  // Distant star dust for depth
  const dustCount = lowPower ? 600 : 1400;
  const dust = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dust[i * 3] = (rnd() - 0.5) * 40;
    dust[i * 3 + 1] = (rnd() - 0.5) * 26;
    dust[i * 3 + 2] = -rnd() * 20 - 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0x9aa0c0, size: 0.035, transparent: true, opacity: 0.5, depthWrite: false });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  const state = {
    shape: 'sphere',
    sideX: 0, targetSideX: 0,
    opacity: 1, targetOpacity: 1,
    colorA: new THREE.Color('#8f7bff'), colorB: new THREE.Color('#4ff0d0'),
    pointer: new THREE.Vector2(0, 0), pointerSmooth: new THREE.Vector2(0, 0),
    pointerActive: false,
    scroll: 0, scrollVel: 0,
    spin: 0,
    running: true,
  };

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = pr;
    uniforms.uAspect.value = w / h;
    const s = isSmall() ? 0.72 : w < 1100 ? 0.86 : 1;
    group.scale.setScalar(s);
  }
  resize();

  const sideFor = (side) => {
    if (isSmall()) return 0;
    const span = Math.min(3.1, camera.aspect * 1.75);
    return side === 'left' ? -span : side === 'right' ? span : 0;
  };

  function setSection({ shape, side = 'center', dim = 1, colors }) {
    if (shape && targets[shape] && shape !== state.shape) state.shape = shape;
    state.side = side;
    state.targetSideX = sideFor(side);
    state.targetOpacity = isSmall() ? Math.min(dim, 0.55) : dim;
    if (colors && colors.length === 2) {
      state.nextA = new THREE.Color(colors[0]);
      state.nextB = new THREE.Color(colors[1]);
    }
  }

  function setPointer(x, y, active = true) {
    state.pointer.set(x, y);
    state.pointerActive = active;
  }

  function setScroll(progress, velocity) {
    state.scroll = progress;
    state.scrollVel = velocity;
  }

  window.addEventListener('resize', () => { resize(); state.targetSideX = sideFor(state.side); });

  const clock = new THREE.Clock();
  let raf = 0;

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!state.running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const k60 = dt * 60;
    uniforms.uTime.value += dt;

    // Morph toward the active formation
    const tgt = targets[state.shape];
    const morphBoost = reducedMotion ? 6 : 1;
    for (let i = 0, j = 0; i < COUNT; i++, j += 3) {
      const s = 1 - Math.pow(1 - Math.min(speeds[i] * morphBoost, 0.9), k60);
      positions[j] += (tgt[j] - positions[j]) * s;
      positions[j + 1] += (tgt[j + 1] - positions[j + 1]) * s;
      positions[j + 2] += (tgt[j + 2] - positions[j + 2]) * s;
    }
    posAttr.needsUpdate = true;

    const ease = (rate) => 1 - Math.pow(1 - rate, k60);

    // Colour, opacity, placement
    if (state.nextA) {
      state.colorA.lerp(state.nextA, ease(0.04));
      state.colorB.lerp(state.nextB, ease(0.04));
      uniforms.uColorA.value.copy(state.colorA);
      uniforms.uColorB.value.copy(state.colorB);
    }
    state.opacity += (state.targetOpacity - state.opacity) * ease(0.05);
    uniforms.uOpacity.value = state.opacity;
    state.sideX += (state.targetSideX - state.sideX) * ease(0.04);

    // Pointer
    state.pointerSmooth.lerp(state.pointer, ease(0.12));
    uniforms.uMouse.value.copy(state.pointerSmooth);
    const ms = state.pointerActive && !reducedMotion ? 1 : 0;
    uniforms.uMouseStrength.value += (ms - uniforms.uMouseStrength.value) * ease(0.06);

    // Rotation: idle spin + scroll velocity + pointer tilt
    if (!reducedMotion) state.spin += dt * 0.07 + state.scrollVel * 0.0006;
    group.rotation.y = state.spin + state.pointerSmooth.x * 0.25;
    group.rotation.x += ((-state.pointerSmooth.y * 0.18 + state.scroll * 0.6) - group.rotation.x) * ease(0.05);
    group.position.x = state.sideX;
    group.position.y = Math.sin(uniforms.uTime.value * 0.4) * 0.06 * uniforms.uMotion.value;

    dustPoints.rotation.y = state.spin * 0.15;
    dustPoints.position.y = state.scroll * 3;

    camera.position.x += (state.pointerSmooth.x * 0.35 - camera.position.x) * ease(0.04);
    camera.position.y += (state.pointerSmooth.y * 0.25 - camera.position.y) * ease(0.04);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  document.addEventListener('visibilitychange', () => {
    state.running = !document.hidden;
    if (state.running) clock.getDelta();
  });

  return {
    start() { if (!raf) { clock.start(); frame(); } },
    setSection,
    setPointer,
    setScroll,
    renderOnce() { renderer.render(scene, camera); },
  };
}
