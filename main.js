// Portfolio interactions: loader, scroll-driven scenes, cursor, orbit, loop and text effects.

/* ---------------------------------------------------------------------------
   Personal settings. Empty values are hidden on the page.
   --------------------------------------------------------------------------- */
const CONFIG = {
  email: '',                                            // e.g. 'hello@sweathkumar.com'
  contactUrl: 'https://tools.sweathkumar.com/contact/', // used when no email is set
  timeZone: 'Asia/Kolkata',                             // shown in the footer clock
  socials: {
    github: '',   // full URL
    linkedin: '', // full URL
  },
};

const TALENTS = [
  {
    title: 'Creative & Visual Thinking',
    text: 'An eye for visual aesthetics, layouts, UI and UX, product presentation and the polish that makes a digital experience feel considered.',
    tags: ['UI and UX', 'Layouts', 'Product presentation', 'Motion'],
  },
  {
    title: 'Entrepreneurial Thinking',
    text: 'Drawn to business opportunities, new product ideas and independent ventures, and to the question of how a concept becomes a sustainable product.',
    tags: ['Product ideas', 'Independent ventures', 'Business models', 'Sustainability'],
  },
  {
    title: 'Systems & Infrastructure Thinking',
    text: 'Fascinated by transportation networks, railway operations, simulations and the large interconnected systems that quietly run the world.',
    tags: ['Railways', 'Transport networks', 'Simulations', 'Infrastructure'],
  },
  {
    title: 'Innovation & Future Technologies',
    text: 'Interested in AI, automation and intelligent applications, and in how emerging technology can make everyday life a little better.',
    tags: ['Artificial intelligence', 'Automation', 'Intelligent apps', 'Emerging tech'],
  },
  {
    title: 'Exploration & Discovery',
    text: 'Exploring new ideas, learning about unfamiliar subjects and finding possibilities that sit just beyond familiar boundaries.',
    tags: ['New subjects', 'Self-learning', 'Experiments', 'Open questions'],
  },
];

/* --------------------------------------------------------------------------- */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

document.body.classList.add('is-loading');

let scene = null;

/* ---------- Text splitting ---------- */

function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  [...text].forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'c';
    s.style.setProperty('--i', i);
    s.textContent = ch === ' ' ? ' ' : ch;
    el.appendChild(s);
  });
}

function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          const inner = document.createElement('span');
          inner.style.setProperty('--i', i++);
          inner.textContent = part;
          w.appendChild(inner);
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(el);
}

$$('[data-split]').forEach(splitChars);
$$('[data-split-words]').forEach(splitWords);

// Story paragraph: one span per word, lit progressively by scroll.
const HIGHLIGHT = new Set(['software', 'design', 'intelligence', 'railway', 'ideas', 'use']);
const scrubEls = $$('[data-scrub]').map((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  const spans = words.map((w, i) => {
    const s = document.createElement('span');
    s.className = 'sw';
    if (HIGHLIGHT.has(w.toLowerCase().replace(/[^a-z]/g, ''))) s.classList.add('hl');
    s.textContent = w;
    el.appendChild(s);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    return s;
  });
  return { el, spans, lit: -1 };
});

/* ---------- Reveal on view ---------- */

function countUp(el) {
  const to = Number(el.dataset.count);
  if (reducedMotion || to === 0) { el.textContent = String(to); return; }
  const start = performance.now(), dur = 1600;
  const step = (now) => {
    const t = clamp((now - start) / dur);
    const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    el.textContent = String(Math.round(to * e));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const revealIO = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    el.classList.add('is-in');
    $$('[data-count]', el).forEach(countUp);
    revealIO.unobserve(el);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

$$('[data-reveal], [data-split-words]').forEach((el) => revealIO.observe(el));

/* ---------- Loader ---------- */

const loader = {
  el: $('.loader'),
  countEl: $('[data-loader-count]'),
  barEl: $('[data-loader-bar]'),
  shown: 0,
  target: 0.15,
  startedAt: performance.now(),
  done: false,
};

function loaderTick() {
  if (loader.done) return;
  const minTime = reducedMotion ? 200 : 1500;
  const timeCap = clamp((performance.now() - loader.startedAt) / minTime);
  const goal = Math.min(loader.target, timeCap);
  loader.shown = lerp(loader.shown, goal, 0.12);
  if (goal >= 1 && loader.shown > 0.995) loader.shown = 1;
  loader.countEl.textContent = String(Math.round(loader.shown * 100)).padStart(3, '0');
  loader.barEl.style.transform = `scaleX(${loader.shown})`;
  if (loader.shown >= 1) return finishLoading();
  requestAnimationFrame(loaderTick);
}

function finishLoading() {
  loader.done = true;
  loader.el.classList.add('is-done');
  document.body.classList.remove('is-loading');
  setTimeout(() => root.classList.add('is-ready'), 250);
  setTimeout(() => loader.el.remove(), 1400);
}

requestAnimationFrame(loaderTick);
const fontsReady = (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
  loader.target = Math.max(loader.target, 0.6);
});
// Never hold visitors behind the loader for long.
setTimeout(() => { loader.target = 1; }, 4500);

/* ---------- 3D scene ---------- */

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

const sceneReady = (async () => {
  if (!webglAvailable()) { root.classList.add('no-webgl'); return; }
  try {
    const { createScene } = await import('./scene.js');
    scene = createScene($('.stage'), { reducedMotion });
    scene.start();
    applySection(true);
  } catch (err) {
    console.warn('3D scene unavailable:', err);
    root.classList.add('no-webgl');
  }
})();

Promise.all([fontsReady, sceneReady]).finally(() => {
  loader.target = 1;
  layoutHorizontal();
});

/* ---------- Sections, nav and progress ---------- */

const sections = $$('[data-scene]');
const nav = $('.nav');
const navIndex = $('[data-nav-index]');
const navName = $('[data-nav-name]');
const progressBar = $('[data-progress]');
let activeSection = null;

function applySection(force = false) {
  const mid = innerHeight * 0.5;
  let current = sections[0];
  for (const s of sections) {
    const r = s.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) { current = s; break; }
  }
  if (current === activeSection && !force) return;
  activeSection = current;
  const d = current.dataset;
  scene?.setSection({
    shape: d.shape,
    side: d.side,
    dim: d.dim ? Number(d.dim) : 1,
    colors: d.colors ? d.colors.split(',') : null,
  });
  if (navName.textContent !== d.label) {
    navName.classList.add('is-swap');
    setTimeout(() => {
      navName.textContent = d.label;
      navIndex.textContent = d.index;
      navName.classList.remove('is-swap');
    }, 260);
  }
}

/* ---------- Menu ---------- */

const menu = $('#menu');
const menuBtn = $('.menu-btn');
let menuTimer = 0;

function setMenu(open) {
  clearTimeout(menuTimer);
  menuBtn.setAttribute('aria-expanded', String(open));
  root.classList.toggle('menu-open', open);
  $('.menu-btn-label').textContent = open ? 'Close' : 'Menu';
  if (open) {
    menu.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    document.body.style.overflow = 'hidden';
    nav.classList.remove('is-hidden');
  } else {
    menu.classList.remove('is-open');
    document.body.style.overflow = '';
    menuTimer = setTimeout(() => { menu.hidden = true; }, 900);
  }
}

menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
$$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-open')) setMenu(false); });

/* ---------- Smooth anchor scrolling ---------- */

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const target = document.querySelector(id);
  if (!target) return;
  e.preventDefault();
  const top = id === '#top' ? 0 : target.getBoundingClientRect().top + scrollY;
  scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
  history.replaceState(null, '', id === '#top' ? location.pathname : id);
});

/* ---------- Role rotator ---------- */

$$('[data-rotator]').forEach((box) => {
  const words = box.dataset.rotator.split('|');
  box.textContent = '';
  const spans = words.map((w, i) => {
    const s = document.createElement('span');
    s.className = 'role-word' + (i === 0 ? ' is-on' : '');
    s.textContent = w;
    box.appendChild(s);
    return s;
  });
  box.setAttribute('aria-label', words.join(', '));
  if (reducedMotion) return;
  let i = 0;
  setInterval(() => {
    const prev = spans[i];
    i = (i + 1) % spans.length;
    const next = spans[i];
    prev.classList.remove('is-on');
    prev.classList.add('is-off');
    next.classList.remove('is-off');
    void next.offsetWidth;
    next.classList.add('is-on');
    setTimeout(() => prev.classList.remove('is-off'), 800);
  }, 2600);
});

/* ---------- Horizontal "drives" section ---------- */

const hSection = $('.drives');
const hTrack = $('[data-htrack]');
const hProgress = $('[data-hprogress]');
let hDistance = 0;

function layoutHorizontal() {
  if (!hSection) return;
  hDistance = Math.max(0, hTrack.scrollWidth - innerWidth);
  hSection.style.height = `${innerHeight + hDistance}px`;
}
layoutHorizontal();
addEventListener('resize', layoutHorizontal);

function updateHorizontal() {
  if (!hSection) return;
  const r = hSection.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const p = hDistance ? clamp(-r.top / hDistance) : 0;
  hTrack.style.transform = `translate3d(${-p * hDistance}px,0,0)`;
  hProgress.style.transform = `scaleX(${p})`;
}

/* ---------- Scrubbed text ---------- */

function updateScrub() {
  for (const s of scrubEls) {
    const r = s.el.getBoundingClientRect();
    if (r.bottom < -innerHeight || r.top > innerHeight * 2) continue;
    const p = reducedMotion ? 1 : clamp((innerHeight * 0.82 - r.top) / (r.height + innerHeight * 0.25));
    const lit = Math.floor(p * s.spans.length);
    if (lit === s.lit) continue;
    s.spans.forEach((sp, i) => sp.classList.toggle('is-lit', i < lit));
    s.lit = lit;
  }
}

/* ---------- Hero parallax and HUD ---------- */

const heroTitle = $('.hero-title');
const hudX = $('[data-hud-x]');
const hudY = $('[data-hud-y]');
const fmt = (v) => (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(3);

function updateHero(y) {
  if (reducedMotion || y > innerHeight * 1.2) return;
  heroTitle.style.transform = `translate3d(0,${y * 0.28}px,0)`;
  heroTitle.style.opacity = String(clamp(1 - y / (innerHeight * 0.8)));
}

/* ---------- Pointer: cursor, magnetic, tilt, spotlight ---------- */

const pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false };
const cursor = $('.cursor');
const ring = $('.cursor-ring');
const dot = $('.cursor-dot');
const cursorLabel = $('.cursor-label');
const ringPos = { x: pointer.x, y: pointer.y };
const useCursor = finePointer && !reducedMotion;
if (useCursor) root.classList.add('has-cursor');

addEventListener('pointermove', (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.active = true;
  const nx = (e.clientX / innerWidth) * 2 - 1;
  const ny = -((e.clientY / innerHeight) * 2 - 1);
  scene?.setPointer(nx, ny, e.pointerType === 'mouse');
  if (hudX) { hudX.textContent = fmt(nx); hudY.textContent = fmt(ny); }

  const spot = e.target.closest?.('[data-spot]');
  if (spot) {
    const r = spot.getBoundingClientRect();
    spot.style.setProperty('--mx', `${e.clientX - r.left}px`);
    spot.style.setProperty('--my', `${e.clientY - r.top}px`);
  }
}, { passive: true });

document.addEventListener('pointerleave', () => {
  pointer.active = false;
  cursor.classList.add('is-hidden');
  scene?.setPointer(9, 9, false);
});
document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));

if (useCursor) {
  document.addEventListener('pointerover', (e) => {
    const labelled = e.target.closest('[data-cursor]');
    const interactive = e.target.closest('a, button, [role="tab"]');
    cursor.classList.toggle('is-label', !!labelled);
    cursor.classList.toggle('is-hover', !!interactive && !labelled);
    if (labelled) cursorLabel.textContent = labelled.dataset.cursor;
  });
}

if (finePointer && !reducedMotion) {
  $$('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transition = 'transform .2s cubic-bezier(.22,1,.36,1)';
      el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.3}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .8s cubic-bezier(.22,1,.36,1)';
      el.style.transform = '';
    });
  });

  $$('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = 'transform .15s ease-out, opacity 1s';
      el.style.transform = `perspective(1100px) rotateX(${-py * 7}deg) rotateY(${px * 9}deg)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .9s cubic-bezier(.22,1,.36,1), opacity 1s';
      el.style.transform = '';
    });
  });
}

/* ---------- Creative universe orbit ---------- */

const orbit = $('[data-orbit]');
const orbitNodes = $$('.orbit-node');
const orbitRing = $('.orbit-ring-1');
const planet = $('[data-planet]');
const planetTitle = $('[data-planet-title]');
const planetText = $('[data-planet-text]');
const planetTags = $('[data-planet-tags]');
const planetIndex = $('[data-planet-index]');
const planetTimer = $('[data-planet-timer]');
const ORBIT_INTERVAL = 6000;
let orbitAngle = -Math.PI / 2;
let orbitPaused = false;
let orbitInView = false;
let selected = 0;
let selectedAt = performance.now();

function renderTags(list) {
  planetTags.innerHTML = '';
  list.forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    planetTags.appendChild(li);
  });
}

function selectTalent(i, user = false) {
  i = (i + TALENTS.length) % TALENTS.length;
  selectedAt = performance.now();
  if (i === selected && !user) return;
  selected = i;
  orbitNodes.forEach((n, k) => n.setAttribute('aria-selected', String(k === i)));
  planet.classList.add('is-swapping');
  setTimeout(() => {
    const t = TALENTS[i];
    planetTitle.textContent = t.title;
    planetText.textContent = t.text;
    planetIndex.textContent = String(i + 1).padStart(2, '0');
    renderTags(t.tags);
    planet.classList.remove('is-swapping');
  }, 280);
}

renderTags(TALENTS[0].tags);
orbitNodes.forEach((n, i) => {
  n.addEventListener('click', () => selectTalent(i, true));
  n.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); orbitNodes[(i + 1) % 5].focus(); selectTalent(i + 1, true); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); orbitNodes[(i + 4) % 5].focus(); selectTalent(i - 1, true); }
  });
});
$('[data-planet-next]').addEventListener('click', () => selectTalent(selected + 1, true));
$('[data-planet-prev]').addEventListener('click', () => selectTalent(selected - 1, true));
orbit.addEventListener('pointerenter', () => { orbitPaused = true; });
orbit.addEventListener('pointerleave', () => { orbitPaused = false; });
new IntersectionObserver(([e]) => { orbitInView = e.isIntersecting; if (orbitInView) selectedAt = performance.now(); })
  .observe($('.universe'));

function updateOrbit(dt, now) {
  if (!orbitInView) return;
  if (!orbitPaused && !reducedMotion) orbitAngle += dt * 0.22;
  // Keep the widest pill inside the orbit box on narrow screens.
  const widest = Math.max(...orbitNodes.map((n) => n.offsetWidth));
  const rx = Math.min(orbitRing.offsetWidth / 2, orbit.offsetWidth / 2 - widest * 0.55);
  const ry = orbitRing.offsetHeight / 2;
  const step = (Math.PI * 2) / orbitNodes.length;
  orbitNodes.forEach((n, i) => {
    const a = orbitAngle + i * step;
    const depth = (Math.sin(a) + 1) / 2; // 1 = front
    const s = 0.8 + depth * 0.28;
    n.style.transform = `translate(-50%,-50%) translate(${Math.cos(a) * rx}px, ${Math.sin(a) * ry}px) scale(${s})`;
    n.style.zIndex = String(Math.round(depth * 100));
    n.style.opacity = String(0.5 + depth * 0.5);
  });
  if (!orbitPaused && !reducedMotion) {
    const t = (now - selectedAt) / ORBIT_INTERVAL;
    planetTimer.style.transform = `scaleX(${clamp(t)})`;
    if (t >= 1) selectTalent(selected + 1);
  }
}

/* ---------- Approach loop ---------- */

const loopEl = $('[data-loop]');
const loopRunner = $('.loop-runner');
const loopNodes = $$('.loop-node');
let loopAngle = 0;
let loopInView = false;
let loopStep = -1;
new IntersectionObserver(([e]) => { loopInView = e.isIntersecting; }).observe(loopEl);

function updateLoop(dt) {
  if (!loopInView) return;
  if (!reducedMotion) loopAngle = (loopAngle + dt * 45) % 360;
  loopRunner.setAttribute('transform', `rotate(${loopAngle} 200 200)`);
  const step = Math.floor(((loopAngle + 45) % 360) / 90);
  if (step !== loopStep) {
    loopStep = step;
    loopNodes.forEach((n, i) => n.classList.toggle('is-active', i === step));
  }
}

/* ---------- Marquee ---------- */

const marquees = $$('[data-marquee]').map((row) => {
  [...row.children].forEach((c) => row.appendChild(c.cloneNode(true)));
  return { row, dir: Number(row.dataset.marquee), x: 0 };
});

function updateMarquee(dt, vel) {
  if (reducedMotion) return;
  const boost = Math.min(Math.abs(vel) * 0.9, 900);
  for (const m of marquees) {
    const half = m.row.scrollWidth / 2;
    m.x -= (60 + boost) * dt * m.dir;
    if (m.x <= -half) m.x += half;
    if (m.x > 0) m.x -= half;
    m.row.style.transform = `translate3d(${m.x}px,0,0)`;
  }
}

/* ---------- Contact, socials, clock ---------- */

const emailLink = $('[data-email-link]');
const copyBtn = $('[data-copy-email]');
if (CONFIG.email) {
  emailLink.href = `mailto:${CONFIG.email}`;
  copyBtn.hidden = false;
  $('[data-email-text]').textContent = CONFIG.email;
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(CONFIG.email);
      copyBtn.classList.add('is-copied');
      setTimeout(() => copyBtn.classList.remove('is-copied'), 1800);
    } catch { location.href = `mailto:${CONFIG.email}`; }
  });
} else {
  emailLink.href = CONFIG.contactUrl;
  emailLink.target = '_blank';
  emailLink.rel = 'noopener';
}

const socialList = $('[data-socials]');
const SOCIAL_META = { github: ['i-github', 'GitHub'], linkedin: ['i-linkedin', 'LinkedIn'] };
Object.entries(CONFIG.socials).forEach(([key, url]) => {
  if (!url || !SOCIAL_META[key]) return;
  const [icon, label] = SOCIAL_META[key];
  const li = document.createElement('li');
  li.innerHTML = `<a href="${encodeURI(url)}" target="_blank" rel="noopener me" aria-label="${label}" data-magnetic><svg class="icon"><use href="#${icon}"/></svg></a>`;
  socialList.appendChild(li);
});

$('[data-year]').textContent = String(new Date().getFullYear());
const clockEl = $('[data-clock]');
const clockFmt = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: CONFIG.timeZone, timeZoneName: 'short' });
const tickClock = () => { clockEl.textContent = clockFmt.format(new Date()); };
tickClock();
setInterval(tickClock, 30000);

/* ---------- Main loop ---------- */

let lastY = scrollY;
let lastNow = performance.now();
let velocity = 0;

function tick(now) {
  const dt = Math.min((now - lastNow) / 1000, 0.05);
  lastNow = now;
  const y = scrollY;
  const rawVel = (y - lastY) / Math.max(dt, 1e-3);
  velocity = lerp(velocity, rawVel, 0.15);
  const max = document.documentElement.scrollHeight - innerHeight;
  const progress = max > 0 ? y / max : 0;

  if (Math.abs(y - lastY) > 0.5) {
    if (!root.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > lastY && y > innerHeight * 0.6);
    applySection();
  }
  lastY = y;

  progressBar.style.transform = `scaleX(${progress})`;
  scene?.setScroll(progress, velocity);
  updateHero(y);
  updateHorizontal();
  updateScrub();
  updateOrbit(dt, now);
  updateLoop(dt);
  updateMarquee(dt, velocity);

  if (useCursor) {
    ringPos.x = lerp(ringPos.x, pointer.x, 1 - Math.pow(0.8, dt * 60));
    ringPos.y = lerp(ringPos.y, pointer.y, 1 - Math.pow(0.8, dt * 60));
    ring.style.transform = `translate3d(${ringPos.x}px,${ringPos.y}px,0)`;
    dot.style.transform = `translate3d(${pointer.x}px,${pointer.y}px,0)`;
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
applySection(true);
addEventListener('resize', () => applySection(true));
