/* ==========================================================
   Shahin Hosen — Motion Portfolio
   Everything here is animation / interaction. No libraries.
   Sections:
     1. helpers            7. 3D tilt + glare
     2. loader             8. reveal + counters + rings
     3. WebGL shader       9. marquee (scroll velocity)
     4. split text        10. sticky service stack
     5. scramble role     11. timeline, FAQ, nav
     6. cursor + magnetic 12. project links, photo, form
   ========================================================== */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const low = innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

document.body.classList.add('loading');
$('#yr').textContent = new Date().getFullYear();

/* ---------- shared pointer + scroll state ---------- */
const state = { mx: innerWidth / 2, my: innerHeight / 2, sy: scrollY, vel: 0 };
addEventListener('pointermove', e => { state.mx = e.clientX; state.my = e.clientY; }, { passive: true });

/* ---------- 2. Loader ---------- */
(function loader() {
  const num = $('#ldNum'), bar = $('#ldBar'), el = $('#loader');
  let seen = null; try { seen = sessionStorage.getItem('sh-seen'); } catch {}
  const t0 = performance.now(), MIN = (seen || reduce) ? 1 : 650; // repeat visits skip the wait
  let loaded = document.readyState === 'complete';
  addEventListener('load', () => loaded = true);
  setTimeout(() => loaded = true, 2200); // failsafe: never get stuck on a slow asset
  (function tick(t) {
    const k = clamp((t - t0) / MIN, 0, 1);
    const eased = 1 - Math.pow(1 - k, 3);
    const shown = loaded ? eased : Math.min(eased, .92);
    num.textContent = Math.round(shown * 100);
    bar.style.transform = `scaleX(${shown})`;
    if (k >= 1 && loaded) return done();
    requestAnimationFrame(tick);
  })(t0);
  function done() {
    try { sessionStorage.setItem('sh-seen', '1'); } catch {}
    el.classList.add('out');
    document.body.classList.remove('loading');
    setTimeout(() => { document.body.classList.add('ready'); intro(); }, 120);
    setTimeout(() => el.remove(), 900);
  }
})();

/* ---------- 3. WebGL shader backdrop (domain-warped noise) ---------- */
(function shader() {
  const cv = $('#gl');
  const gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return;
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `precision mediump float;
uniform vec2 uR; uniform float uT; uniform vec2 uM; uniform float uS; uniform float uV;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n(p);p=p*2.02+vec2(3.1,1.7);a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/uR.y;
  float t=uT*.08;
  vec2 q=vec2(fbm(uv*1.3+t),fbm(uv*1.3+vec2(5.2,1.3)-t));
  vec2 r=vec2(fbm(uv*1.7+3.6*q+vec2(1.7,9.2)+t*1.5),fbm(uv*1.7+3.6*q+vec2(8.3,2.8)-t*1.2));
  float f=fbm(uv*1.2+3.6*r);
  vec2 m=uM*vec2(uR.x/uR.y,1.);
  float d=distance(uv,m);
  float glow=smoothstep(.62,0.,d);
  float ripple=sin(d*26.-uT*3.2)*exp(-d*4.2)*(.25+uV);
  vec3 c1=vec3(1.,.24,.56), c2=vec3(.48,.36,1.), c3=vec3(0.,.82,1.), c4=vec3(1.,.69,.12);
  float s=uS*3.2;
  vec3 col=vec3(.02,.015,.07);
  vec3 ribbon=mix(c2,c1,smoothstep(.2,.85,r.x+.15*sin(s)));
  ribbon=mix(ribbon,c3,smoothstep(.38,.92,r.y)*.9);
  ribbon=mix(ribbon,c4,smoothstep(.72,1.,f*r.x*2.2)*.5);
  col=mix(col,ribbon,smoothstep(.2,.9,f)*1.25);
  col+=pow(f,3.2)*c3*.55;
  float topo=smoothstep(.07,0.,abs(fract(f*8.+t*2.)-.5)-.4);
  col+=topo*.07;
  col+=glow*mix(c1,c3,f)*.42+ripple*mix(c3,c1,.5)*.25;
  col*=.82;
  col*=1.-.38*length(gl_FragCoord.xy/uR-.5);
  col+=(h(gl_FragCoord.xy+uT)-.5)*.035;
  gl_FragColor=vec4(col,1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uR = U('uR'), uT = U('uT'), uM = U('uM'), uS = U('uS'), uV = U('uV');
  const SCALE = low ? .3 : .5; // render at half resolution, CSS stretches it (fast + soft)
  const resize = () => {
    cv.width = Math.max(2, Math.floor(innerWidth * SCALE));
    cv.height = Math.max(2, Math.floor(innerHeight * SCALE));
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform2f(uR, cv.width, cv.height);
  };
  resize(); addEventListener('resize', resize);
  let lastT = 0, mx = .5, my = .5, vis = true, pv = 0, lx = state.mx, ly = state.my;
  document.addEventListener('visibilitychange', () => vis = !document.hidden);
  const draw = (t) => {
    if (vis && t - lastT >= (low ? 32 : 15)) {
      lastT = t;
      mx = lerp(mx, state.mx / innerWidth, .06);
      my = lerp(my, 1 - state.my / innerHeight, .06);
      const sp = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
      gl.uniform1f(uT, t / 1000);
      gl.uniform2f(uM, mx, my);
      gl.uniform1f(uS, sp);
      pv = lerp(pv, clamp(Math.hypot(state.mx - lx, state.my - ly) / 40, 0, 1.2), .08); lx = state.mx; ly = state.my;
      gl.uniform1f(uV, pv);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (!reduce) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();

/* ---------- 4. Split text ---------- */
function splitInto(el) {
  if (el.dataset.done) return;
  el.dataset.done = '1';
  const label = el.textContent.trim().replace(/\s+/g, ' ');
  let ci = 0;
  const walk = (node) => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'sp-w'; w.setAttribute('aria-hidden', 'true');
          [...part].forEach(ch => {
            const c = document.createElement('span'); c.className = 'sp-c'; c.textContent = ch; c.style.setProperty('--ci', ci++); w.appendChild(c);
          });
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
  el.setAttribute('aria-label', label);
}
const title = $('#title');
splitInto(title);
$$('[data-split]').forEach(splitInto);
if (reduce) $$('.sp-c').forEach(c => c.style.transform = 'none');

function intro() {
  title.style.setProperty('--base', '0ms');
  title.classList.add('split-in');
  $$('#home [data-reveal]').forEach(el => el.classList.add('in'));
}

/* ---------- 5. Role text scramble ---------- */
(function role() {
  const el = $('#role');
  const words = ["Web Developer", "Front-end Developer", "Responsive Design Expert", "Problem Solver"];
  if (reduce) { el.textContent = words[0]; return; }
  const chars = '!<>-_\\/[]{}=+*^?#01';
  let w = 0, frame = 0, queue = [], resolve;
  const set = (txt) => {
    const old = el.textContent, len = Math.max(old.length, txt.length);
    queue = Array.from({ length: len }, (_, i) => ({ from: old[i] || '', to: txt[i] || '', s: Math.floor(Math.random() * 18), e: 18 + Math.floor(Math.random() * 22), c: '' }));
    frame = 0;
    return new Promise(r => { resolve = r; });
  };
  const update = () => {
    let out = '', done = 0;
    queue.forEach(q => {
      if (frame >= q.e) { done++; out += q.to; }
      else if (frame >= q.s) { if (!q.c || Math.random() < .28) q.c = chars[Math.floor(Math.random() * chars.length)]; out += q.c; }
      else out += q.from;
    });
    el.textContent = out;
    if (done === queue.length) resolve(); else { frame++; requestAnimationFrame(update); }
  };
  const loop = () => { const p = set(words[w]); update(); p.then(() => { w = (w + 1) % words.length; setTimeout(loop, 2200); }); };
  setTimeout(loop, 1900);
})();

/* ---------- 6. Cursor + magnetic buttons ---------- */
if (fine && !reduce) {
  document.body.classList.add('has-cursor');
  const dot = $('.cur-dot'), ring = $('.cur-ring'), lab = $('span', ring);
  let rx = state.mx, ry = state.my;
  (function tick() {
    dot.style.transform = `translate(${state.mx}px,${state.my}px)`;
    rx = lerp(rx, state.mx, .16); ry = lerp(ry, state.my, .16);
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(tick);
  })();
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor], a, button');
    document.body.classList.toggle('cur-hover', !!t);
    const lbl = t && t.dataset.cursor;
    document.body.classList.toggle('cur-label', !!lbl && !t.classList.contains('empty'));
    lab.textContent = lbl || '';
  });
  $$('.mag').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .28}px,${(e.clientY - r.top - r.height / 2) * .38}px)`;
    });
    b.addEventListener('pointerleave', () => b.style.transform = '');
  });
}

/* ---------- 7. 3D tilt + glare ---------- */
$$('[data-tilt]').forEach(el => {
  if (!fine || reduce) return;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(.5 - y) * 12}deg) rotateY(${(x - .5) * 14}deg) translateY(-6px)`;
    el.style.setProperty('--gx', x * 100 + '%'); el.style.setProperty('--gy', y * 100 + '%');
  });
  el.addEventListener('pointerleave', () => el.style.transform = '');
});
/* hero stage: layers follow the mouse over the whole hero */
(function stage() {
  const st = $('#stage'); if (!st || !fine || reduce) return;
  let rx = 0, ry = 0, tx = 0, ty = 0;
  addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
  (function tick() {
    rx = lerp(rx, tx, .07); ry = lerp(ry, ty, .07);
    st.style.transform = `rotateY(${rx * 16}deg) rotateX(${-ry * 12}deg)`;
    requestAnimationFrame(tick);
  })();
})();

/* ---------- 8. Reveal, counters, rings ---------- */
const countUp = (el) => {
  const to = +el.dataset.n, s = el.dataset.s || '', t0 = performance.now();
  (function f(t) { const k = clamp((t - t0) / 1600, 0, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 4))) + s; if (k < 1) requestAnimationFrame(f); })(t0);
};
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target;
  if (el.closest('#home')) return io.unobserve(el);
  if (el.hasAttribute('data-split')) { el.style.setProperty('--base', '0ms'); el.classList.add('split-in'); }
  else el.classList.add('in');
  $$('[data-n]', el).forEach(countUp);
  if (el.classList.contains('ring')) {
    const v = +el.dataset.v, c = $('.v', el), b = $('b', el);
    setTimeout(() => { c.style.strokeDashoffset = 264 * (1 - v / 100); }, 120);
    const t0 = performance.now();
    (function f(t) { const k = clamp((t - t0) / 1800, 0, 1); b.textContent = Math.round(v * (1 - Math.pow(1 - k, 4))) + '%'; if (k < 1) requestAnimationFrame(f); })(t0);
  }
  io.unobserve(el);
}), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
$$('[data-reveal], [data-split], .ring').forEach(el => io.observe(el));
if (reduce) $$('.ring').forEach(r => { $('.v', r).style.strokeDashoffset = 264 * (1 - +r.dataset.v / 100); $('b', r).textContent = r.dataset.v + '%'; });

/* ---------- 9. Marquee: speed reacts to scroll velocity ---------- */
(function marquee() {
  const TECH = ["HTML5", "CSS3", "JavaScript", "Responsive Design", "Bootstrap", "Tailwind CSS", "Node.js", "Express", "PHP", "MySQL", "Git", "GitHub", "REST API", "jQuery"];
  const html = [...TECH, ...TECH].map(t => `<span>${t}</span>`).join('');
  const r1 = $('#row1'), r2 = $('#row2');
  r1.innerHTML = html; r2.innerHTML = [...TECH].reverse().concat([...TECH].reverse()).map(t => `<span>${t}</span>`).join('');
  if (reduce) return;
  let x1 = 0, x2 = 0, h1 = 0, h2 = 0, on = true;
  const meas = () => { h1 = r1.scrollWidth / 2; h2 = r2.scrollWidth / 2; };
  meas(); addEventListener('resize', meas); addEventListener('load', meas); document.fonts && document.fonts.ready.then(meas);
  new IntersectionObserver(es => on = es[0].isIntersecting).observe($('.marq'));
  (function tick() {
    requestAnimationFrame(tick);
    if (!on || !h1) return;
    const half1 = h1, half2 = h2;
    const boost = clamp(state.vel, -60, 60) * .35;
    x1 -= .7 + Math.abs(boost);
    x2 += .7 + Math.abs(boost);
    if (x1 <= -half1) x1 += half1;
    if (x2 >= 0) x2 -= half2;
    r1.style.transform = `translate3d(${x1}px,0,0)`;
    r2.style.transform = `translate3d(${x2}px,0,0)`;
  })();
})();

/* ---------- 10. Sticky service stack: cards scale back as next one arrives ---------- */
const svcs = $$('.svc');
function stackUpdate() {
  if (innerWidth <= 760) { svcs.forEach(c => { c.style.transform = ''; c.style.removeProperty('--svcdim'); }); return; }
  svcs.forEach((c, i) => {
    const next = svcs[i + 1]; if (!next) return;
    const top = 110 + i * 22;
    const p = clamp(1 - (next.getBoundingClientRect().top - top) / (c.offsetHeight + 26), 0, 1);
    c.style.transform = `scale(${1 - p * .06})`;
    c.style.setProperty('--svcdim', (p * .5).toFixed(3)); // overlay instead of filter: far cheaper to paint
  });
}

/* ---------- 11. Timeline, FAQ, nav ---------- */
const tl = $('#tl'), steps = $$('.step', tl);
const wide = matchMedia('(min-width: 1081px)');
function tlUpdate() {
  const r = tl.getBoundingClientRect();
  let p;
  if (wide.matches) p = clamp((innerHeight * .8 - r.top) / (innerHeight * .42), 0, 1);   // horizontal line: fills as the row scrolls in
  else p = clamp((innerHeight * .62 - r.top) / r.height, 0, 1);
  tl.style.setProperty('--p', p.toFixed(4));
  steps.forEach((s, i) => {
    const on = wide.matches ? p > (i + .35) / steps.length : (() => { const sr = s.getBoundingClientRect(); return sr.top + sr.height / 2 < innerHeight * .62; })();
    s.classList.toggle('on', on);
  });
}
$$('.q').forEach(q => $('button', q).addEventListener('click', () => {
  const open = q.classList.toggle('open');
  $('button', q).setAttribute('aria-expanded', open);
}));

const links = $('#links'), ind = $('#ind'), anchors = $$('#links a');
const secs = $$('main section[id]');
function moveInd(a) {
  if (!a || innerWidth <= 960) return;
  ind.style.width = a.offsetWidth + 'px';
  ind.style.transform = `translateX(${a.offsetLeft}px)`;
}
let current = null;
function navUpdate() {
  let cur = secs[0].id;
  secs.forEach(s => { if (scrollY >= s.offsetTop - 220) cur = s.id; });
  if (cur !== current) {
    current = cur;
    anchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
    moveInd(anchors.find(a => a.classList.contains('active')));
  }
}
anchors.forEach(a => {
  a.addEventListener('mouseenter', () => moveInd(a));
  a.addEventListener('click', () => { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); });
});
links.addEventListener('mouseleave', () => moveInd(anchors.find(a => a.classList.contains('active'))));
const burger = $('#burger');
burger.addEventListener('click', () => { const o = links.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
addEventListener('resize', () => moveInd(anchors.find(a => a.classList.contains('active'))));


/* ---------- 13. Scroll-linked word reveal (About) ---------- */
const wrs = $$('.wr');
wrs.forEach(p => {
  const text = p.textContent.trim().replace(/\s+/g, ' ');
  p.setAttribute('aria-label', text);
  p.innerHTML = text.split(' ').map(w => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
  p._w = $$('.w', p);
  if (reduce) p._w.forEach(w => w.classList.add('on'));
});
function wordReveal() {
  if (reduce) return;
  wrs.forEach(p => {
    const r = p.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const k = clamp((innerHeight * .88 - r.top) / (innerHeight * .4 + r.height * .5), 0, 1);
    const n = Math.round(k * p._w.length * 1.12);
    if (p._n === n) return;
    p._n = n;
    p._w.forEach((w, i) => w.classList.toggle('on', i < n));
  });
}

/* ---------- 14. Project image parallax ---------- */
const projs = $$('.proj');
function projParallax() {
  if (reduce) return;
  projs.forEach(c => {
    const r = c.getBoundingClientRect();
    if (r.bottom < -100 || r.top > innerHeight + 100) return;
    const k = clamp(((r.top + r.height / 2) - innerHeight / 2) / innerHeight, -1, 1);
    c.style.setProperty('--py', (k * -14).toFixed(1) + 'px');
  });
}

/* ---------- 15. Button ripple ---------- */
$$('.btn').forEach(b => b.addEventListener('pointerdown', e => {
  if (reduce) return;
  const r = b.getBoundingClientRect(), d = document.createElement('span');
  d.className = 'ripple'; d.style.left = (e.clientX - r.left) + 'px'; d.style.top = (e.clientY - r.top) + 'px';
  b.appendChild(d); setTimeout(() => d.remove(), 750);
}));

/* ---------- master scroll loop ---------- */
const heroCopy = $('.hero-copy'), heroSec = $('#home');
const prog = $('#progress');
const nativeProg = CSS.supports && CSS.supports('animation-timeline: scroll()');
let last = scrollY;
let dirty = true, lastSY = -1, scrolled = false;
const markDirty = () => dirty = true;
addEventListener('resize', markDirty); addEventListener('load', () => { markDirty(); setTimeout(markDirty, 800); });
(function loop() {
  requestAnimationFrame(loop);
  const sy = scrollY;
  state.vel = lerp(state.vel, sy - last, .15);
  last = sy;
  // heavy layout work only runs while something is actually moving
  if (sy === lastSY && !dirty && Math.abs(state.vel) < .05) return;
  lastSY = sy; dirty = false;
  if (!nativeProg) prog.style.transform = `scaleX(${sy / Math.max(1, document.documentElement.scrollHeight - innerHeight)})`;
  const s = sy > 24; if (s !== scrolled) { scrolled = s; document.body.classList.toggle('scrolled', s); }
  stackUpdate(); tlUpdate(); navUpdate(); heroParallax(); wordReveal(); projParallax();
})();

/* ---------- 6b. Glowing hero particles (additive canvas) ---------- */
(function particles() {
  const cv = $('#fx'); if (!cv || reduce) return;
  const ctx = cv.getContext('2d');
  const COLORS = ['255,61,143', '123,92,255', '0,209,255', '255,176,32'];
  const sprites = COLORS.map(c => {
    const o = document.createElement('canvas'); o.width = o.height = 64;
    const g = o.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${c},1)`); gr.addColorStop(.25, `rgba(${c},.55)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return o;
  });
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 1.5), P = [], run = true, mouse = { x: -999, y: -999 };
  const make = (init) => ({ x: Math.random() * W, y: init ? Math.random() * H : H + 20, z: .4 + Math.random() * 1.2, s: sprites[Math.floor(Math.random() * sprites.length)], vy: -(.12 + Math.random() * .4), vx: (Math.random() - .5) * .25, ph: Math.random() * 6.28 });
  const size = () => {
    const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = clamp(Math.floor(W * H / (low ? 46000 : 26000)), 14, 52);
    P = Array.from({ length: n }, () => make(true));
  };
  size(); addEventListener('resize', size);
  addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; }, { passive: true });
  new IntersectionObserver(es => run = es[0].isIntersecting).observe(cv);
  (function draw(t) {
    requestAnimationFrame(draw);
    if (!run || document.hidden) return;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    P.forEach((p, i) => {
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 150) { const f = (1 - d / 150) * 1.6; p.x += dx / (d || 1) * f; p.y += dy / (d || 1) * f; }
      p.x += p.vx + Math.sin(t / 1400 + p.ph) * .25; p.y += p.vy * p.z;
      if (p.y < -30) P[i] = make(false);
      const size = 14 + p.z * 22, tw = .55 + .45 * Math.sin(t / 700 + p.ph);
      ctx.globalAlpha = clamp(tw * (.35 + p.z * .35), 0, 1);
      ctx.drawImage(p.s, p.x - size / 2, p.y - size / 2, size, size);
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  })(0);
})();

/* ---------- 6c. Cursor spotlight ---------- */
if (fine && !reduce) {
  const spot = $('.spot'); let sx = state.mx, sy = state.my;
  (function tick() { sx = lerp(sx, state.mx, .08); sy = lerp(sy, state.my, .08); spot.style.transform = `translate(${sx}px,${sy}px)`; requestAnimationFrame(tick); })();
}

/* ---------- 6d. Eased anchor scrolling ---------- */
(function smoothAnchors() {
  let raf;
  const go = (y) => {
    cancelAnimationFrame(raf);
    const y0 = scrollY, dist = y - y0, dur = reduce ? 1 : clamp(Math.abs(dist) * .28, 380, 850), t0 = performance.now();
    const ease = (k) => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    (function step(t) {
      const k = clamp((t - t0) / dur, 0, 1);
      scrollTo({ top: y0 + dist * ease(k), left: 0, behavior: 'instant' }); // 'instant' so CSS smooth-scroll does not fight this animation
      if (k < 1) raf = requestAnimationFrame(step);
    })(t0);
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = id ? document.getElementById(id) : document.body;
    if (!el) return;
    e.preventDefault();
    go(id ? el.getBoundingClientRect().top + scrollY - (id === 'home' ? 0 : 70) : 0);
    history.replaceState(null, '', id ? '#' + id : location.pathname);
  });
  addEventListener('wheel', () => cancelAnimationFrame(raf), { passive: true });
  addEventListener('touchstart', () => cancelAnimationFrame(raf), { passive: true });
})();

/* ---------- 6e. Hero parallax (copy drifts + fades as you scroll) ---------- */
function heroParallax() {
  if (reduce) return;
  const p = clamp(scrollY / (heroSec.offsetHeight * .8), 0, 1);
  heroCopy.style.transform = `translate3d(0,${p * 70}px,0)`;
  heroCopy.style.opacity = String(1 - p * .9);
}

/* ---------- 12. Project links, photo, form ---------- */
/*
   PROJECTS: লিংক বসানো হয় index.html এ (প্রতিটি কার্ডের href="")।
   এখানে শুধু দেখে নেওয়া হচ্ছে লিংক আছে কি না:
   - লিংক থাকলে কার্ড নতুন ট্যাবে খুলবে
   - লিংক না থাকলে কার্ডে "Add your link" দেখাবে, ক্লিকে কিছু হবে না
   - data-shot এ ছবির পথ থাকলে সেটি কার্ডে বসবে
*/
$$('.proj').forEach(card => {
  const href = (card.getAttribute('href') || '').trim();
  if (!href || href === '#') {
    card.classList.add('empty');
    card.removeAttribute('href');
    card.removeAttribute('target');
    card.setAttribute('role', 'group');
    card.removeAttribute('data-cursor');
  } else if (!/^(https?:|\/|\.|[\w-]+\/)/i.test(href)) {
    card.setAttribute('href', 'https://' + href);
  }
  /* ছবি: data-shots="a.jpg,b.jpg,..." (একাধিক) অথবা data-shot="a.jpg" (একটি)
     দ্রুত লোডের জন্য: প্রথম ছবি কার্ড কাছে এলে, বাকিগুলো হোভার/স্ক্রলে লোড হয় */
  const list = ((card.dataset.shots || card.dataset.shot || '')).split(',').map(s => s.trim()).filter(Boolean);
  if (list.length) {
    const box = $('.shot', card), imgs = [], asked = new Set();
    const dots = document.createElement('div'); dots.className = 'dots'; dots.setAttribute('aria-hidden', 'true');
    list.forEach(() => dots.appendChild(document.createElement('i')));
    if (list.length > 1) box.appendChild(dots);
    let cur = 0, timer = null;
    const show = (i) => {
      if (!imgs.length) return;
      cur = (i + imgs.length) % imgs.length;
      imgs.forEach((m, k) => m.classList.toggle('on', k === cur));
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === cur));
    };
    const stop = () => { clearInterval(timer); timer = null; };
    const start = (ms) => { stop(); if (imgs.length > 1 && !reduce) timer = setInterval(() => show(cur + 1), ms); };
    const load = (k) => {
      if (asked.has(k) || !list[k]) return; asked.add(k);
      const img = new Image();
      img.alt = ($('h3', card)?.textContent || 'Project') + ' preview ' + (k + 1);
      img.decoding = 'async'; img.width = 960; img.height = 577;
      img._k = k;
      img.onload = () => {
        imgs.push(img); imgs.sort((a, b) => a._k - b._k); box.appendChild(img);
        if (imgs.length === 1) { box.classList.add('has-img'); }
        show(cur);
      };
      img.src = list[k];
    };
    const loadRest = () => list.forEach((_, k) => load(k));
    new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { load(0); ob.disconnect(); (window.requestIdleCallback ? requestIdleCallback(loadRest, { timeout: 1500 }) : setTimeout(loadRest, 1500)); } }, { rootMargin: '500px' }).observe(card);
    if (fine) {
      card.addEventListener('pointerenter', () => { loadRest(); show(cur + 1); start(1300); });
      card.addEventListener('pointerleave', () => { stop(); show(0); });
    } else {
      new IntersectionObserver(es => { es[0].isIntersecting ? (loadRest(), start(3200)) : stop(); }, { threshold: .55 }).observe(card);
    }
  }
});

/*
   YOUR PHOTO: index.html এ #photo এর data-photo="" এ ছবির পথ বসান।
   ফাঁকা থাকলে খালি ফ্রেম দেখাবে।
*/
(function photo() {
  const box = $('#photo'), src = (box.dataset.photo || '').trim();
  if (!src) return;
  const img = new Image();
  img.alt = 'Shahin Hosen';
  img.onload = () => { $('.ph-empty', box)?.remove(); box.appendChild(img); };
  img.src = src;
})();

/* Toast + contact form (Formspree) */
let toastTimer;
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200); };
$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target, btn = $('button[type="submit"]', form), label = $('span', btn);
  const n = $('#fn'), m = $('#fe'), t = $('#fm');
  [n, m, t].forEach(f => f.parentElement.classList.remove('err'));
  let ok = true;
  if (!n.value.trim()) { n.parentElement.classList.add('err'); ok = false; }
  if (!/^\S+@\S+\.\S+$/.test(m.value.trim())) { m.parentElement.classList.add('err'); ok = false; }
  if (!t.value.trim()) { t.parentElement.classList.add('err'); ok = false; }
  if (!ok) return toast('Please fill in all fields correctly');
  const original = label.textContent;
  btn.disabled = true; label.textContent = 'Sending…';
  try {
    const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      form.reset(); label.textContent = 'Sent!';
      toast('Thanks! Your message has been sent.');
      setTimeout(() => { label.textContent = original; btn.disabled = false; }, 3000);
    } else {
      const json = await res.json().catch(() => ({}));
      toast('Error: ' + ((json.errors && json.errors.map(x => x.message).join(', ')) || 'Something went wrong. Please try again.'));
      label.textContent = original; btn.disabled = false;
    }
  } catch {
    toast('Network error. Please try again.');
    label.textContent = original; btn.disabled = false;
  }
});


/* ---------- 16. Hero live coding: someone "types" real code, then the output runs ----------
   নতুন নমুনা যোগ করতে CODE_DEMOS এ একটি আইটেম বসান: { file, code (HTML highlight), out (আউটপুট ফাংশন) }  */
(function liveCode() {
  const pre = $('#code'); if (!pre) return;
  const fname = $('#fname'), live = $('#live'), liveT = $('em', live), pill = $('#runpill'), outb = $('#outb'), dots = $$('#dots5 i');
  const T = []; // pending timers, cleared when switching sample
  const later = (fn, ms) => { const id = setTimeout(fn, ms); T.push(id); return id; };
  const every = (fn, ms) => { const id = setInterval(fn, ms); T.push(id); return id; };
  const clearAll = () => { T.splice(0).forEach(id => { clearTimeout(id); clearInterval(id); }); };
  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };

  const CODE_DEMOS = [
    { file: 'portfolio.js',
      code: `<span class="c">// portfolio.js</span>
<span class="k">const</span> <span class="f">shahin</span> = {
  role: <span class="s">"Web Developer"</span>,
  stack: [<span class="s">"HTML"</span>, <span class="s">"CSS"</span>, <span class="s">"JS"</span>],
  responsive: <span class="n">true</span>
};
<span class="f">build</span>(<span class="s">"your next website"</span>);`,
      out(o) {
        o.innerHTML = '<div class="o-term"></div>'; const t = $('.o-term', o);
        const lines = ['<span class="d">&gt; build("your next website")</span>', '<span class="g">✔</span> Responsive layout', '<span class="g">✔</span> Clean, fast code', '<span class="g">🚀</span> Ready in 2.4s'];
        lines.forEach((l, i) => later(() => t.appendChild(el(`<div>${l}</div>`)), 250 + i * 520));
      } },
    { file: 'button.css',
      code: `<span class="c">/* button.css */</span>
<span class="f">.btn</span> {
  <span class="k">padding</span>: <span class="n">14px 30px</span>;
  <span class="k">border-radius</span>: <span class="n">16px</span>;
  <span class="k">background</span>: <span class="f">linear-gradient</span>(
    <span class="n">90deg</span>, <span class="s">#ff3d8f</span>, <span class="s">#7b5cff</span>);
  <span class="k">box-shadow</span>: <span class="n">0 0 30px</span> <span class="s">#7b5cff</span>;
}`,
      out(o) { o.innerHTML = '<button class="o-btn" tabindex="-1">Hire Me</button>'; } },
    { file: 'counter.js',
      code: `<span class="c">// counter.js</span>
<span class="k">let</span> count = <span class="n">0</span>;
btn.<span class="f">onclick</span> = () =&gt; {
  count++;
  label.textContent =
    <span class="s">\`Clicks: \${count}\`</span>;
};`,
      out(o) {
        o.innerHTML = '<div class="o-cnt"><span>Clicks: <b id="ocn">0</b></span><button tabindex="-1">+1</button></div>';
        const b = $('button', o), n = $('#ocn', o); let c = 0;
        every(() => { b.classList.add('p'); later(() => { b.classList.remove('p'); n.textContent = ++c; }, 160); }, 620);
      } },
    { file: 'theme.js',
      code: `<span class="c">// theme.js</span>
toggle.<span class="f">onclick</span> = () =&gt; {
  <span class="k">const</span> dark = document.body
    .classList.<span class="f">toggle</span>(<span class="s">"dark"</span>);
  toggle.textContent =
    dark ? <span class="s">"Dark"</span> : <span class="s">"Light"</span>;
};`,
      out(o) {
        o.innerHTML = '<div class="o-theme"><s></s><span>Light</span></div>';
        const box = $('.o-theme', o), lab = $('span', box);
        every(() => { const d = box.classList.toggle('dark'); lab.textContent = d ? 'Dark' : 'Light'; }, 1100);
      } },
    { file: 'progress.css',
      code: `<span class="c">/* progress.css */</span>
<span class="f">.bar i</span> {
  <span class="k">width</span>: <span class="n">0</span>;
  <span class="k">animation</span>: fill <span class="n">2.4s</span>
    <span class="k">ease-out</span> <span class="k">infinite</span>;
}
<span class="k">@keyframes</span> fill { to { <span class="k">width</span>: <span class="n">100%</span>; } }`,
      out(o) {
        o.innerHTML = '<div class="o-prog"><span>Loading… <b id="opv">0%</b></span><div><i></i></div></div>';
        const bar = $('i', o), v = $('#opv', o); let t0 = performance.now();
        const step = () => { const k = Math.min(1, (performance.now() - t0) / 2400), e = 1 - Math.pow(1 - k, 3); bar.style.width = (e * 100) + '%'; v.textContent = Math.round(e * 100) + '%'; if (k >= 1) t0 = performance.now() + 500; };
        every(step, 40);
      } },
  ];

  /* keep a highlighted slice: count only visible characters, close any open spans */
  const plainLen = (html) => html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '_').length;
  function cut(html, n) {
    let out = '', cnt = 0, i = 0; const st = [];
    while (i < html.length && cnt < n) {
      const ch = html[i];
      if (ch === '<') { const e = html.indexOf('>', i), tag = html.slice(i, e + 1); out += tag; if (tag[1] === '/') st.pop(); else st.push(tag.match(/^<(\w+)/)[1]); i = e + 1; }
      else if (ch === '&') { const e = html.indexOf(';', i); out += html.slice(i, e + 1); cnt++; i = e + 1; }
      else { out += ch; cnt++; i++; }
    }
    while (st.length) out += '</' + st.pop() + '>';
    return out;
  }

  const setState = (typing) => { live.classList.toggle('run', !typing); liveT.textContent = typing ? 'typing' : 'running'; pill.classList.toggle('go', !typing); pill.textContent = typing ? '▶ Run' : '● Live'; outb.classList.toggle('on', !typing); };
  const paintFull = (d) => { pre.innerHTML = d.code; };

  if (reduce) { paintFull(CODE_DEMOS[0]); setState(false); CODE_DEMOS[0].out(outb); return; }

  let idx = 0, visible = true;
  new IntersectionObserver(es => visible = es[0].isIntersecting, { threshold: .1 }).observe($('#stage'));
  const ready = (fn) => (function w() { (visible && !document.hidden) ? fn() : later(w, 400); })();

  function play(i) {
    clearAll(); idx = i; const d = CODE_DEMOS[i], total = plainLen(d.code);
    fname.textContent = d.file; outb.innerHTML = ''; setState(true);
    dots.forEach((x, k) => x.classList.toggle('on', k === i));
    pre.innerHTML = '<span class="tcaret"></span>';
    let n = 0;
    (function type() {
      ready(() => {
        n += 1 + (Math.random() < .25 ? 1 : 0);
        pre.innerHTML = cut(d.code, n) + '<span class="tcaret"></span>';
        if (n >= total) {
          pre.innerHTML = d.code + '<span class="tcaret"></span>';
          later(() => { setState(false); d.out(outb); later(() => play((idx + 1) % CODE_DEMOS.length), 5200); }, 650);
          return;
        }
        const ch = d.code.replace(/<[^>]+>/g, '')[n - 1];
        later(type, ch === '\n' ? 170 : ch === ' ' ? 18 : 24 + Math.random() * 30);
      });
    })();
  }
  later(() => play(0), 1800);
})();
