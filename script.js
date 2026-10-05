/* ════════════════════════════════════════════════════════════
   NIDO ÁGUILA · VALLE DE CHALCO — Interacciones y animaciones
   ────────────────────────────────────────────────────────────
   Vanilla JS, sin dependencias obligatorias.
   (Lenis, cargado por CDN, solo añade el scroll "inercial";
    si no carga, la página funciona igual con scroll nativo.)

   Índice
     0. Utilidades y motor de frames
     1. Loader (spinner de carga)
     2. Scroll suave + bloqueo de scroll
     3. Navegación (menú, scrollspy, progreso)
     4. Animaciones de aparición (reveal + titulares)
     5. Contadores
     6. Hero (partículas, tilt, palabras rotativas)
     7. Marquees reactivos al scroll
     8. Efectos de interacción (cursor, imán, spotlight)
     9. Verificador "Pase Aguilita"
    10. Radar de habilidades
    11. Manifiesto (texto que se ilumina)
    12. Campeones (scroll horizontal fijado) + confeti
    13. Pasos, parallax
    14. Galería + lightbox
    15. FAQ
    16. Formulario → WhatsApp
    17. WhatsApp flotante y varios
   ════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ───────── 0. UTILIDADES ───────── */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var WA_NUMBER = '525613796501';
  var waLink = function (text) { return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text); };

  var navHeight = function () { return parseInt(getComputedStyle(root).getPropertyValue('--nav-h'), 10) || 72; };

  /* Cola de "cuando el loader termina" */
  var isReady = false, readyQueue = [];
  var onReady = function (fn) { isReady ? fn() : readyQueue.push(fn); };
  function setReady() {
    isReady = true;
    document.body.classList.add('is-ready');
    readyQueue.forEach(function (fn) { fn(); });
    readyQueue = [];
  }

  /* Motor único de frames: scroll-linked + animaciones continuas */
  var lenis = null;
  var loops = [];
  var S = { y: 0, vel: 0, vSmooth: 0, vh: window.innerHeight, vw: window.innerWidth, moved: true };
  var lastY = -1;

  function frame(t) {
    if (lenis) lenis.raf(t);
    var y = window.scrollY;
    S.moved = y !== lastY;
    S.vel = lastY < 0 ? 0 : y - lastY;
    S.vSmooth = lerp(S.vSmooth, S.vel, 0.12);
    S.y = y; lastY = y;
    for (var i = 0; i < loops.length; i++) loops[i](t, S);
    requestAnimationFrame(frame);
  }

  /* IntersectionObserver reutilizable → devuelve estado "visible" */
  function watchVisible(el, cb, opts) {
    var state = { visible: false };
    if (!el || !('IntersectionObserver' in window)) { state.visible = true; return state; }
    new IntersectionObserver(function (entries) {
      state.visible = entries[0].isIntersecting;
      if (cb) cb(state.visible);
    }, opts || { threshold: 0 }).observe(el);
    return state;
  }

  var resizeTimer;
  var onResize = [];
  window.addEventListener('resize', function () {
    S.vh = window.innerHeight; S.vw = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { onResize.forEach(function (fn) { fn(); }); }, 160);
  }, { passive: true });

  /* ───────── 2. SCROLL: bloqueo + Lenis + anclas ───────── */
  var lockReasons = {};
  function lockScroll(reason) {
    lockReasons[reason] = true;
    root.classList.add('is-locked');
    if (lenis) lenis.stop();
  }
  function unlockScroll(reason) {
    delete lockReasons[reason];
    if (Object.keys(lockReasons).length) return;
    root.classList.remove('is-locked');
    if (lenis) lenis.start();
  }

  function initLenis() {
    if (reduceMotion || !window.Lenis) return;
    try {
      lenis = new window.Lenis({
        duration: 1.3,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true,
        wheelMultiplier: 0.9
      });
    } catch (e) { lenis = null; }
  }

  function scrollToTarget(target) {
    var offset = -navHeight() + 1;
    if (lenis) lenis.scrollTo(target, { offset: offset, duration: 1.6, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function initAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      var hash = a.getAttribute('href');
      if (hash.length < 2) return;
      a.addEventListener('click', function (e) {
        var target = $(hash);
        if (!target) return;
        e.preventDefault();

        /* Si el botón trae un turno, lo pre-seleccionamos en el formulario */
        if (a.dataset.turno) {
          var radio = $$('input[name="turno"]').filter(function (r) { return r.value === a.dataset.turno; })[0];
          if (radio) radio.checked = true;
        }
        setMenu(false);
        scrollToTarget(target);
        if (history.pushState) history.pushState(null, '', hash);
      });
    });
  }

  /* ───────── 1. LOADER ───────── */
  function initLoader() {
    var loader = $('#loader');
    if (!loader) { setReady(); return; }

    var pctEl = $('#ldPct');
    var bar = $('.ld__bar i', loader);
    var msgEl = $('.ld__msg', loader);
    var msgs = ['Calentando motores', 'Armando la alineación', 'Pisando la cancha', '¡Listo para el silbatazo!'];
    var msgIdx = -1;

    lockScroll('loader');

    var MIN = reduceMotion ? 300 : 2500;
    var t0 = performance.now();
    var p = 0, assetsOk = false, finished = false;

    var heroImg = $('.hv__card img');
    var heroDecoded = heroImg && heroImg.decode ? heroImg.decode().catch(function () {}) : Promise.resolve();
    var windowLoaded = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise(function (r) { window.addEventListener('load', r, { once: true }); });
    var fontsOk = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

    Promise.race([
      Promise.all([windowLoaded, fontsOk, heroDecoded]),
      new Promise(function (r) { setTimeout(r, 7000); }) /* seguro: nunca nos quedamos atorados */
    ]).then(function () { assetsOk = true; });

    function finish() {
      if (finished) return;
      finished = true;
      pctEl.textContent = '100';
      bar.style.setProperty('--p', 1);
      msgEl.textContent = msgs[3];
      setTimeout(function () { loader.classList.add('is-done'); }, 420);
      setTimeout(function () { setReady(); unlockScroll('loader'); }, 760);
      setTimeout(function () { loader.classList.add('is-gone'); loader.setAttribute('aria-hidden', 'true'); }, 2000);
    }

    function step(now) {
      var timeP = Math.min((now - t0) / MIN, 1);
      var eased = 1 - Math.pow(1 - timeP, 3);
      var target = assetsOk ? eased * 100 : Math.min(eased * 100, 88);
      p += (target - p) * 0.12;
      var shown = Math.min(100, Math.round(p));
      pctEl.textContent = shown;
      bar.style.setProperty('--p', (p / 100).toFixed(3));

      var idx = shown < 28 ? 0 : shown < 58 ? 1 : shown < 88 ? 2 : 3;
      if (idx !== msgIdx) { msgIdx = idx; msgEl.textContent = msgs[idx]; }

      if (assetsOk && timeP >= 1 && p > 99.3) finish();
      else if (!finished) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ───────── 3. NAVEGACIÓN ───────── */
  var menu, burger;
  function setMenu(open) {
    if (!menu) return;
    if (menu.classList.contains('is-open') === open) return;
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    if (open) lockScroll('menu'); else unlockScroll('menu');
  }

  function initNav() {
    var nav = $('#nav');
    var progress = $('#progress');
    menu = $('#menu'); burger = $('#navToggle');

    if (menu) menu.inert = true;
    if (burger) burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    onResize.push(function () { if (S.vw >= 960) setMenu(false); });

    /* Estado "pegado" + barra de progreso */
    loops.push(function (t, s) {
      if (!s.moved && t > 200) return;
      nav.classList.toggle('is-stuck', s.y > 30);
      var max = document.documentElement.scrollHeight - s.vh;
      progress.style.setProperty('--sp', max > 0 ? clamp(s.y / max, 0, 1).toFixed(4) : 0);
    });

    /* Scrollspy */
    var links = $$('.nav__links a');
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    if ('IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (l) { l.classList.remove('is-active'); });
          var a = map[en.target.id];
          if (a) a.classList.add('is-active');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
    }
  }

  /* ───────── 4. REVEAL + TITULARES ───────── */
  function splitText(el) {
    var i = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            var wi = document.createElement('span'); wi.className = 'wi';
            wi.style.setProperty('--i', i++); wi.textContent = part;
            w.appendChild(wi); frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          if (child.tagName === 'EM') child.classList.add('split-grad');
          walk(child);
        }
      });
    })(el);
  }

  function initReveal() {
    $$('[data-split]').forEach(splitText);
    var els = $$('[data-reveal], [data-split]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ───────── 5. CONTADORES ───────── */
  function initCounters() {
    var els = $$('[data-count]');
    function run(el) {
      var target = parseInt(el.dataset.count, 10);
      if (reduceMotion) { el.textContent = target; return; }
      var dur = target > 500 ? 2600 : 1800, t0 = null;
      requestAnimationFrame(function tick(ts) {
        if (!t0) t0 = ts;
        var pr = clamp((ts - t0) / dur, 0, 1);
        var e = pr === 1 ? 1 : 1 - Math.pow(2, -10 * pr);
        el.textContent = Math.round(e * target);
        if (pr < 1) requestAnimationFrame(tick);
      });
    }
    if (!reduceMotion) els.forEach(function (el) { el.textContent = '0'; }); /* el HTML trae el valor final para quien no tenga JS */
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.textContent = el.dataset.count; }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        onReady(function () { run(en.target); });
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ───────── 6. HERO ───────── */
  function initHeroFX() {
    var cv = $('#fx');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var hero = $('#inicio');
    var vis = watchVisible(hero);
    var w = 0, h = 0, dpr = 1, parts = [], meteors = [], nextMeteor = 1800;
    var mouse = { x: -999, y: -999 };
    var COLORS = [[255, 210, 63], [255, 255, 255], [255, 184, 0], [125, 165, 255], [255, 96, 84]];

    /* Sprites con brillo pre-renderizados (más barato que gradientes por frame) */
    var sprites = COLORS.map(function (c) {
      var s = document.createElement('canvas'); s.width = s.height = 64;
      var g = s.getContext('2d');
      var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(' + c.join(',') + ',1)');
      gr.addColorStop(0.25, 'rgba(' + c.join(',') + ',.55)');
      gr.addColorStop(1, 'rgba(' + c.join(',') + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return s;
    });

    function spawn(initial) {
      return {
        x: Math.random() * w, y: initial ? Math.random() * h : h + 12,
        vx: (Math.random() - 0.5) * 0.28, vy: -(0.12 + Math.random() * 0.5),
        r: 1 + Math.random() * 2.4, a: 0.3 + Math.random() * 0.6,
        c: Math.random() < 0.55 ? 0 : Math.floor(Math.random() * COLORS.length),
        ph: Math.random() * 6.28
      };
    }
    function resize() {
      var r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = clamp(Math.round(w * h / 15000), 26, 82);
      parts = []; for (var i = 0; i < n; i++) parts.push(spawn(true));
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      /* Líneas de red entre partículas cercanas */
      var maxD = w < 600 ? 90 : 130, i, j, p, q, dx, dy, d, a;
      ctx.lineWidth = 1;
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        for (j = i + 1; j < parts.length; j++) {
          q = parts[j]; dx = p.x - q.x; dy = p.y - q.y;
          if (Math.abs(dx) > maxD || Math.abs(dy) > maxD) continue;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxD) {
            a = (1 - d / maxD) * 0.2;
            ctx.strokeStyle = 'rgba(255,210,63,' + a.toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        /* Líneas hacia el cursor */
        dx = p.x - mouse.x; dy = p.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150) {
          ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - d / 150) * 0.45).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          if (d < 110) { p.vx += (dx / d) * 0.05; p.vy += (dy / d) * 0.05; }
        }
      }

      /* Partículas */
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.99; p.vy = p.vy * 0.99 + (-0.12 - p.vy) * 0.004;
        if (p.y < -14) { parts[i] = spawn(false); continue; }
        if (p.x < -14) p.x = w + 14; else if (p.x > w + 14) p.x = -14;
        var tw = 0.65 + 0.35 * Math.sin(t * 0.0022 + p.ph);
        ctx.globalAlpha = p.a * tw;
        var sz = p.r * 9;
        ctx.drawImage(sprites[p.c], p.x - sz / 2, p.y - sz / 2, sz, sz);
      }

      /* Estrellas fugaces */
      ctx.globalAlpha = 1;
      if (t > nextMeteor && meteors.length < 2) {
        meteors.push({ x: w * (0.35 + Math.random() * 0.65), y: -20, vx: -(7 + Math.random() * 4), vy: 4 + Math.random() * 3, life: 0 });
        nextMeteor = t + 2600 + Math.random() * 3200;
      }
      for (i = meteors.length - 1; i >= 0; i--) {
        var m = meteors[i];
        m.x += m.vx; m.y += m.vy; m.life++;
        var tx = m.x - m.vx * 9, ty = m.y - m.vy * 9;
        var gr = ctx.createLinearGradient(m.x, m.y, tx, ty);
        gr.addColorStop(0, 'rgba(255,240,170,.95)'); gr.addColorStop(1, 'rgba(255,210,63,0)');
        ctx.strokeStyle = gr; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
        if (m.y > h + 40 || m.x < -60) meteors.splice(i, 1);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    resize();
    onResize.push(resize);

    if (reduceMotion) { draw(0); return; }

    hero.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
    loops.push(function (t) { if (vis.visible && !document.hidden) draw(t); });
  }

  function initHeroMotion() {
    /* Tilt 3D de la tarjeta principal */
    var hv = $('#hv');
    var card = hv && $('.hv__card', hv);
    if (hv && card && finePointer && !reduceMotion) {
      hv.addEventListener('pointermove', function (e) {
        var r = hv.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--rx', (-py * 11).toFixed(2) + 'deg');
        card.style.setProperty('--ry', (px * 13).toFixed(2) + 'deg');
      });
      hv.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
      });
    }

    /* Palabra que rota */
    var el = $('#cycle');
    if (el && !reduceMotion) {
      var words = ['talento', 'disciplina', 'valores', 'pasión', 'campeones'], idx = 0;
      var next = function () {
        idx = (idx + 1) % words.length;
        el.style.transition = 'transform .42s cubic-bezier(.4,0,.2,1), opacity .36s ease';
        el.style.transform = 'translateY(-26px) scale(.94)'; el.style.opacity = '0';
        setTimeout(function () {
          el.textContent = words[idx];
          el.style.transition = 'none';
          el.style.transform = 'translateY(26px) scale(.94)';
          void el.offsetHeight;
          el.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1), opacity .5s ease';
          el.style.transform = 'none'; el.style.opacity = '1';
        }, 420);
      };
      onReady(function () { setTimeout(function () { setInterval(next, 2800); }, 3400); });
    }

    /* Profundidad del hero al hacer scroll */
    var inner = $('.hero__inner');
    var heroEl = $('#inicio');
    if (inner && !reduceMotion) {
      loops.push(function (t, s) {
        if (!s.moved || s.y > s.vh * 1.3) return;
        var k = clamp(s.y / s.vh, 0, 1);
        inner.style.transform = 'translate3d(0,' + (s.y * 0.12).toFixed(1) + 'px,0)';
        inner.style.opacity = (1 - k * 0.85).toFixed(3);
      });
    }
    void heroEl;
  }

  /* ───────── 7. MARQUEES ───────── */
  function initMarquees() {
    var items = $$('.marquee').map(function (m) {
      var track = $('.marquee__track', m);
      var base = Array.prototype.slice.call(track.children);
      return { m: m, track: track, base: base, dir: parseFloat(m.dataset.marquee) || -1, x: 0, w: 0, clone: null, vis: watchVisible(m) };
    });

    function build(it) {
      if (it.clone) { it.clone.remove(); it.clone = null; }
      $$('[data-dup]', it.track).forEach(function (n) { n.remove(); });
      /* Duplicamos el contenido hasta cubrir al menos 1.15× el ancho visible */
      var guard = 0;
      while (it.track.getBoundingClientRect().width < it.m.clientWidth * 1.15 && guard++ < 6) {
        it.base.forEach(function (n) {
          var c = n.cloneNode(true); c.setAttribute('data-dup', ''); it.track.appendChild(c);
        });
      }
      it.w = it.track.getBoundingClientRect().width;
      it.clone = it.track.cloneNode(true);
      it.clone.setAttribute('aria-hidden', 'true');
      it.m.appendChild(it.clone);
      it.x = it.dir < 0 ? 0 : -it.w;
    }
    items.forEach(build);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { items.forEach(build); });
    onResize.push(function () { items.forEach(build); });

    if (reduceMotion) return;
    var last = 0;
    loops.push(function (t, s) {
      var dt = Math.min(t - last, 60) / 1000; last = t;
      items.forEach(function (it) {
        if (!it.vis.visible || !it.w) return;
        /* velocidad base + impulso por velocidad de scroll */
        var speed = 55 + Math.min(Math.abs(s.vSmooth) * 14, 420);
        it.x += it.dir * speed * dt;
        if (it.dir < 0 && it.x <= -it.w) it.x += it.w;
        if (it.dir > 0 && it.x >= 0) it.x -= it.w;
        var tr = 'translate3d(' + it.x.toFixed(1) + 'px,0,0)';
        it.track.style.transform = tr;
        if (it.clone) it.clone.style.transform = tr;
      });
    });
  }

  /* ───────── 8. INTERACCIONES ───────── */
  function initInteractions() {
    /* Spotlight en tarjetas */
    $$('.spot').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    if (!finePointer || reduceMotion) return;

    /* Botones magnéticos */
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.32;
        el.style.setProperty('--mx', dx.toFixed(1) + 'px');
        el.style.setProperty('--my', dy.toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px');
      });
    });

    /* Brillo que sigue al cursor */
    var glow = document.createElement('div');
    glow.className = 'cursor-glow'; glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);
    var tx = -500, ty = -500, cx = tx, cy = ty;
    window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; glow.classList.add('on'); }, { passive: true });
    document.addEventListener('pointerleave', function () { glow.classList.remove('on'); });
    loops.push(function () {
      cx = lerp(cx, tx, 0.12); cy = lerp(cy, ty, 0.12);
      glow.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    });
  }

  /* ───────── 9. VERIFICADOR: PASE AGUILITA ───────── */
  function initChecker() {
    var ticket = $('#ticket');
    if (!ticket) return;
    var chips = $$('#checker .chip');
    var cta = $('#tkCta'), ctaTxt = $('#tkCtaTxt');
    var el = {
      title: $('#tkTitle'), sub: $('#tkSub'), cat: $('#tkCat'),
      year: $('#tkYear'), age: $('#tkAge'), code: $('#tkCode')
    };
    var thisYear = new Date().getFullYear();

    cta.setAttribute('aria-disabled', 'true'); cta.tabIndex = -1;
    chips.forEach(function (c, i) { c.tabIndex = i === 0 ? 0 : -1; });

    function select(chip) {
      chips.forEach(function (c) {
        var on = c === chip;
        c.setAttribute('aria-checked', String(on));
        c.tabIndex = on ? 0 : -1;
      });
      var val = chip.dataset.year;
      var ok = val !== 'otro';

      ticket.dataset.state = ok ? 'ok' : 'other';
      cta.removeAttribute('aria-disabled'); cta.tabIndex = 0;

      if (ok) {
        var age = thisYear - parseInt(val, 10);
        el.title.textContent = '¡Tu peque califica en Aguilitas!';
        el.sub.textContent = 'Los nacidos en ' + val + ' forman parte de la categoría. Elige su turno y apártale su lugar.';
        el.cat.textContent = 'Aguilitas';
        el.year.textContent = val;
        el.age.textContent = (age - 1) + '–' + age + ' años';
        el.code.textContent = 'AG · ' + val + ' · ✓';
        ctaTxt.textContent = '¡Apártale su lugar!';
        cta.href = waLink('¡Hola! Mi peque nació en ' + val + ' y quiero apartarle su lugar en la categoría Aguilitas de Nido Águila Valle de Chalco. ¿Me comparten informes?');
      } else {
        el.title.textContent = 'Cuéntanos su año y te orientamos.';
        el.sub.textContent = 'Escríbenos y te decimos qué categoría le corresponde a tu peque.';
        el.cat.textContent = 'Por confirmar';
        el.year.textContent = 'Otro año';
        el.age.textContent = '—';
        el.code.textContent = 'AG · ? · ?';
        ctaTxt.textContent = 'Consultar su categoría';
        cta.href = waLink('¡Hola! Mi peque nació en otro año y quiero saber qué categoría le corresponde en Nido Águila Valle de Chalco.');
      }

      /* Sincronizamos el formulario final */
      var sel = $('#f-year');
      if (sel) sel.value = ok ? val : 'Otro año';

      ticket.classList.remove('is-pop'); void ticket.offsetWidth; ticket.classList.add('is-pop');
    }

    chips.forEach(function (c, i) {
      c.addEventListener('click', function () { select(c); });
      c.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = chips[(i + 1) % chips.length];
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = chips[(i - 1 + chips.length) % chips.length];
        if (n) { e.preventDefault(); n.focus(); select(n); }
      });
    });
    cta.addEventListener('click', function (e) { if (cta.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
  }

  /* ───────── 10. RADAR ───────── */
  function initRadar() {
    var shape = $('#radarShape');
    var dots = $$('#radarDots circle');
    if (!shape || !dots.length) return;
    var vis = watchVisible($('#radar'));
    var ang = [-90, -18, 54, 126, 198].map(function (a) { return a * Math.PI / 180; });
    var cur = [0.72, 0.6, 0.78, 0.55, 0.7], tgt = cur.slice(), next = 0, R = 80;

    function paint() {
      var pts = cur.map(function (r, i) { return [100 + Math.cos(ang[i]) * R * r, 100 + Math.sin(ang[i]) * R * r]; });
      shape.setAttribute('points', pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '));
      dots.forEach(function (d, i) { d.setAttribute('cx', pts[i][0].toFixed(1)); d.setAttribute('cy', pts[i][1].toFixed(1)); });
    }
    paint();
    if (reduceMotion) return;
    loops.push(function (t) {
      if (!vis.visible) return;
      if (t > next) { tgt = cur.map(function () { return 0.42 + Math.random() * 0.58; }); next = t + 2200; }
      cur = cur.map(function (c, i) { return c + (tgt[i] - c) * 0.035; });
      paint();
    });
  }

  /* ───────── 11. MANIFIESTO ───────── */
  function initManifesto() {
    var sec = $('#manifiesto');
    var txt = $('#manifestoText');
    if (!sec || !txt) return;

    /* Separa el texto en palabras conservando las <em> resaltadas */
    var words = [];
    (function walk(node, hl) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span'); s.className = 'mw' + (hl ? ' hl' : ''); s.textContent = part;
            frag.appendChild(s); words.push(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) walk(child, hl || child.tagName === 'EM');
      });
    })(txt, false);

    if (reduceMotion) return;
    var vis = watchVisible(sec);
    var n = words.length;
    loops.push(function (t, s) {
      if (!vis.visible || (!s.moved && t > 300)) return;
      var r = sec.getBoundingClientRect();
      var total = r.height - s.vh;
      var pr = clamp(-r.top / total, 0, 1);
      var tt = clamp((pr - 0.06) / 0.76, 0, 1) * n;
      for (var i = 0; i < n; i++) {
        words[i].style.opacity = (0.16 + 0.84 * clamp(tt - i, 0, 1)).toFixed(3);
      }
    });
  }

  /* ───────── 12. CONFETI + CAMPEONES ───────── */
  var Confetti = (function () {
    var cv, ctx, w, h, dpr, parts = [], running = false;
    var COLORS = ['#ffd23f', '#ffb800', '#e63b34', '#ffffff', '#f2ed9c', '#4f78ff'];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function ensure() {
      if (cv) return;
      cv = document.createElement('canvas'); cv.className = 'confetti'; cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv); ctx = cv.getContext('2d');
      resize(); window.addEventListener('resize', resize);
    }
    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.34;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
        if (p.y > h + 30 || p.life > p.ttl) { parts.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = clamp(1 - (p.life / p.ttl) * 0.9, 0, 1);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, 6.283); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life * 0.12)) + 1);
        ctx.restore();
      }
      if (parts.length) requestAnimationFrame(tick);
      else { running = false; ctx.clearRect(0, 0, w, h); }
    }
    function burst(x, y, opts) {
      if (reduceMotion) return;
      ensure();
      opts = opts || {};
      var count = opts.count || 110, angle = opts.angle != null ? opts.angle : -Math.PI / 2;
      var spread = opts.spread || Math.PI * 0.6, power = opts.power || 15;
      for (var i = 0; i < count; i++) {
        var a = angle + (Math.random() - 0.5) * spread, v = power * (0.45 + Math.random() * 0.7);
        parts.push({
          x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
          w: 6 + Math.random() * 7, h: 4 + Math.random() * 5, color: COLORS[(Math.random() * COLORS.length) | 0],
          round: Math.random() < 0.25, life: 0, ttl: 160 + Math.random() * 90
        });
      }
      if (!running) { running = true; requestAnimationFrame(tick); }
    }
    return { burst: burst };
  })();

  function initChamps() {
    var sec = $('#campeones');
    var track = $('#champsTrack');
    var bar = $('#champsBar');
    if (!sec || !track) return;

    var mq = window.matchMedia('(min-width: 960px)');
    var pinned = false, maxX = 0, burstedEnd = false;
    var vis = watchVisible(sec);

    function setup() {
      pinned = mq.matches && !reduceMotion;
      sec.classList.toggle('is-pinned', pinned);
      track.style.transform = '';
      sec.style.removeProperty('--champs-h');
      if (!pinned) { onTrackScroll(); return; }
      var cs = getComputedStyle(track);
      var last = track.lastElementChild;
      var contentRight = last.offsetLeft + last.offsetWidth + parseFloat(cs.paddingRight);
      maxX = Math.max(0, contentRight - window.innerWidth);
      sec.style.setProperty('--champs-h', (maxX + window.innerHeight) + 'px');
    }

    function onTrackScroll() {
      if (pinned) return;
      var max = track.scrollWidth - track.clientWidth;
      bar.style.setProperty('--cp', (max > 0 ? clamp((track.scrollLeft + track.clientWidth * 0.2) / (max + track.clientWidth * 0.2), 0.12, 1) : 1).toFixed(3));
    }
    track.addEventListener('scroll', onTrackScroll, { passive: true });

    setup();
    onResize.push(setup);
    if (mq.addEventListener) mq.addEventListener('change', setup);
    window.addEventListener('load', setup);

    /* Confeti cuando entra la sección */
    var done = false;
    if ('IntersectionObserver' in window && !reduceMotion) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting && !done) {
          done = true;
          Confetti.burst(window.innerWidth * 0.08, window.innerHeight, { angle: -Math.PI / 3, count: 90, power: 17 });
          Confetti.burst(window.innerWidth * 0.92, window.innerHeight, { angle: -2 * Math.PI / 3, count: 90, power: 17 });
        }
      }, { threshold: 0.45 }).observe(sec);
    }

    loops.push(function (t, s) {
      if (!pinned || !vis.visible) return;
      var r = sec.getBoundingClientRect();
      var total = r.height - s.vh;
      var pr = clamp(-r.top / total, 0, 1);
      track.style.transform = 'translate3d(' + (-pr * maxX).toFixed(1) + 'px,0,0)';
      bar.style.setProperty('--cp', Math.max(pr, 0.06).toFixed(4));
      if (pr > 0.97 && !burstedEnd) {
        burstedEnd = true;
        Confetti.burst(window.innerWidth * 0.5, window.innerHeight * 0.95, { angle: -Math.PI / 2, spread: Math.PI * 0.9, count: 120, power: 19 });
      }
      if (pr < 0.6) burstedEnd = false;
    });
  }

  /* ───────── 13. PASOS + PARALLAX ───────── */
  function initSteps() {
    var steps = $('#steps');
    if (!steps) return;
    var vis = watchVisible(steps);
    loops.push(function (t, s) {
      if (!vis.visible || !s.moved) return;
      var r = steps.getBoundingClientRect();
      var desktop = s.vw >= 960;
      var pr = desktop
        ? clamp((s.vh * 0.85 - r.top) / (s.vh * 0.5), 0, 1)
        : clamp((s.vh * 0.7 - r.top) / r.height, 0, 1);
      steps.style.setProperty('--sp', pr.toFixed(4));
    });
  }

  function initParallax() {
    if (reduceMotion) return;
    var items = $$('[data-parallax]').map(function (el) {
      return { el: el, img: $('img', el), amp: parseFloat(el.dataset.parallax) || 0.06 };
    });
    var first = true;
    loops.push(function (t, s) {
      if (!s.moved && !first) return;
      first = false;
      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > s.vh + 80) return;
        var p = clamp(((r.top + r.height / 2) - s.vh / 2) / (s.vh / 2 + r.height / 2), -1, 1);
        it.img.style.setProperty('--py', (-p * it.amp * r.height).toFixed(1) + 'px');
        it.img.style.setProperty('--ps', (1 + Math.abs(it.amp) * 2.1 + 0.01).toFixed(3));
      });
    });
  }

  /* ───────── 14. GALERÍA + LIGHTBOX ───────── */
  function initGallery() {
    var tiles = $$('#gallery .tile');
    var dlg = $('#lightbox');
    if (!tiles.length || !dlg || typeof dlg.showModal !== 'function') return;

    var img = $('.lb__img', dlg), count = $('.lb__count', dlg), alt = $('.lb__alt', dlg);
    var idx = 0, opener = null;
    var items = tiles.map(function (t) { var i = $('img', t); return { src: i.getAttribute('src'), alt: i.getAttribute('alt') }; });

    function show(i) {
      idx = (i + items.length) % items.length;
      img.src = items[idx].src; img.alt = items[idx].alt;
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
      count.textContent = (idx + 1) + ' / ' + items.length;
      alt.textContent = items[idx].alt;
      [idx + 1, idx - 1].forEach(function (n) { var p = new Image(); p.src = items[(n + items.length) % items.length].src; });
    }
    function open(i, trigger) {
      opener = trigger; show(i);
      dlg.showModal(); lockScroll('lightbox');
    }
    function close() { if (dlg.open) dlg.close(); }

    tiles.forEach(function (t, i) { t.addEventListener('click', function () { open(i, t); }); });
    $('.lb__close', dlg).addEventListener('click', close);
    $('.lb__prev', dlg).addEventListener('click', function () { show(idx - 1); });
    $('.lb__next', dlg).addEventListener('click', function () { show(idx + 1); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.classList.contains('lb__fig')) close(); });
    dlg.addEventListener('close', function () { unlockScroll('lightbox'); if (opener) opener.focus({ preventScroll: true }); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });

    /* Swipe en móvil */
    var sx = null;
    dlg.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    dlg.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 60) show(idx + (dx < 0 ? 1 : -1));
    });
  }

  /* ───────── 15. FAQ ───────── */
  function initFAQ() {
    var items = $$('#acc .acc__item');
    items.forEach(function (it, i) {
      var btn = $('.acc__q', it);
      function toggle(open) {
        it.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      }
      btn.addEventListener('click', function () {
        var willOpen = !it.classList.contains('is-open');
        items.forEach(function (o) {
          o.classList.remove('is-open'); $('.acc__q', o).setAttribute('aria-expanded', 'false');
        });
        toggle(willOpen);
      });
      if (i === 0) toggle(true);
    });
  }

  /* ───────── 16. FORMULARIO → WHATSAPP ───────── */
  function initForm() {
    var form = $('#enrollForm');
    if (!form) return;

    function setErr(id, msg) {
      var box = $('#e-' + id);
      if (!box) return;
      box.textContent = msg || '';
      var field = box.closest('.field');
      if (field) field.classList.toggle('has-err', !!msg);
    }

    function validate() {
      var tutor = form.tutor.value.trim();
      var peque = form.peque.value.trim();
      var year = form.year.value;
      var turno = form.turno.value;
      var firstBad = null;
      var bad = function (id, msg, field) { setErr(id, msg); if (!firstBad) firstBad = field; };

      setErr('tutor', ''); setErr('peque', ''); setErr('year', ''); setErr('turno', '');
      if (tutor.length < 2) bad('tutor', 'Cuéntanos tu nombre para saber con quién hablamos.', form.tutor);
      if (peque.length < 2) bad('peque', 'Escribe el nombre de tu peque.', form.peque);
      if (!year) bad('year', 'Elige el año en que nació.', form.year);
      if (!turno) bad('turno', 'Elige un turno (o "Cualquiera").', form.querySelector('input[name="turno"]'));
      return firstBad ? { ok: false, focus: firstBad } : { ok: true, data: { tutor: tutor, peque: peque, year: year, turno: turno, msg: form.mensaje.value.trim() } };
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = validate();
      if (!r.ok) {
        form.classList.remove('is-shake'); void form.offsetWidth; form.classList.add('is-shake');
        r.focus.focus();
        return;
      }
      var d = r.data;
      var text = '¡Hola! Quiero inscribir a mi peque en Nido Águila Valle de Chalco (categoría Aguilitas).\n\n' +
        '• Papá/mamá/tutor: ' + d.tutor + '\n' +
        '• Nombre del peque: ' + d.peque + '\n' +
        '• Año de nacimiento: ' + d.year + '\n' +
        '• Turno preferido: ' + d.turno + '\n' +
        (d.msg ? '• Comentarios: ' + d.msg + '\n' : '') +
        '\n¿Me comparten informes e inscripción? ¡Gracias!';
      var url = waLink(text);

      var ok = $('#formOk'), link = $('#formOkLink');
      link.href = url; ok.hidden = false;
      var btn = form.querySelector('button[type="submit"]').getBoundingClientRect();
      Confetti.burst(btn.left + btn.width / 2, btn.top, { count: 90, spread: Math.PI * 0.9, power: 14 });
      window.open(url, '_blank', 'noopener');
    });

    ['tutor', 'peque', 'year'].forEach(function (id) {
      var input = form[id];
      input.addEventListener('input', function () { setErr(id, ''); });
      input.addEventListener('change', function () { setErr(id, ''); });
    });
    $$('input[name="turno"]', form).forEach(function (r) { r.addEventListener('change', function () { setErr('turno', ''); }); });
  }

  /* ───────── 17. VARIOS ───────── */
  function initMisc() {
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

    var wa = $('#wa');
    if (wa) {
      onReady(function () {
        setTimeout(function () { wa.classList.add('is-visible'); }, 600);
        setTimeout(function () { wa.classList.add('show-tip'); }, 3200);
        setTimeout(function () { wa.classList.remove('show-tip'); }, 9000);
      });
    }
  }

  /* ───────── ARRANQUE ───────── */
  initLenis();
  initNav();
  initAnchors();
  initReveal();
  initCounters();
  initHeroFX();
  initHeroMotion();
  initMarquees();
  initInteractions();
  initChecker();
  initRadar();
  initManifesto();
  initChamps();
  initSteps();
  initParallax();
  initGallery();
  initFAQ();
  initForm();
  initMisc();
  initLoader();
  requestAnimationFrame(frame);
})();
