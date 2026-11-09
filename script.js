/* =========================================================
   Tanya Nagarajan — motion layer
   Lenis smooth scroll + GSAP / ScrollTrigger / SplitText
   ========================================================= */
(() => {
  const root = document.documentElement;
  const body = document.body;
  const loader = document.querySelector('.loader');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Fallback: libraries failed to load ---------- */
  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove('js');
    loader && loader.remove();
    body.classList.remove('is-loading');
    $$('.split').forEach((el) => (el.style.visibility = 'visible'));
    $$('.stat__num').forEach((el) => (el.textContent = el.dataset.count));
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: 'power3.out', duration: 0.9 });

  // Refresh always starts at the cover
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  addEventListener('beforeunload', () => window.scrollTo(0, 0));
  addEventListener('pageshow', (e) => { if (e.persisted) window.scrollTo(0, 0); });

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  const scrollToTarget = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -70, duration: 1.6 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('.menu-btn');
  const menu = $('#mobile-menu');
  const openMenu = () => {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    body.classList.add('menu-open');
    lenis && lenis.stop();
    gsap.fromTo($$('a', menu), { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.06, delay: 0.2, duration: 0.7 });
  };
  const closeMenu = () => {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    body.classList.remove('menu-open');
    lenis && lenis.start();
  };
  menuBtn.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
  addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

  /* ---------- Anchor links ---------- */
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(target);
    })
  );

  /* ---------- Masthead: solid on scroll, hide on scroll down ---------- */
  const mast = $('.masthead');
  let lastY = 0;
  const onScroll = (y) => {
    mast.classList.toggle('is-scrolled', y > 40);
    mast.classList.toggle('is-hidden', y > lastY && y > 500 && !body.classList.contains('menu-open'));
    lastY = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true });

  /* ---------- Cursor + magnetic buttons (desktop only) ---------- */
  if (finePointer && !reduceMotion) {
    // "Plot point" cursor: sparkle + crosshair + live (x, y) readout
    const cursor = $('.cursor');
    const tag = $('.cursor__tag');
    gsap.set(cursor, { x: -200, y: -200 });
    const cx = gsap.quickTo(cursor, 'x', { duration: 0.18, ease: 'power3' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.18, ease: 'power3' });
    const darkZones = '.mind, .court, .mobile-menu, .marquee, .loader, .sheet__row:hover, .masthead__cta, .pill--solid';
    let label = null;
    let hidden = false;
    addEventListener('pointermove', (e) => {
      cx(e.clientX); cy(e.clientY);
      if (hidden) { hidden = false; gsap.to(cursor, { autoAlpha: 1, duration: 0.2 }); }
      if (!label) tag.textContent = `x ${(e.clientX / innerWidth).toFixed(2)} · y ${(e.clientY / innerHeight).toFixed(2)}`;
      const under = document.elementFromPoint(e.clientX, e.clientY);
      cursor.classList.toggle('is-light', !!(under && under.closest(darkZones)));
    });
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.documentElement.addEventListener('pointerleave', () => { hidden = true; gsap.to(cursor, { autoAlpha: 0, duration: 0.2 }); });

    const labelFor = (el) => {
      if (el.dataset.cursor) return el.dataset.cursor;
      const href = el.getAttribute('href') || '';
      if (href.startsWith('mailto:')) return 'write to her ✉';
      if (href.startsWith('tel:')) return 'call ☏';
      if (el.hasAttribute('download')) return 'download ↓';
      if (href.startsWith('http')) return 'open ↗';
      if (el.classList.contains('sheet__row')) return 'select row';
      return 'go →';
    };
    $$('a, button, .sheet__row').forEach((el) => {
      el.addEventListener('pointerenter', () => { label = labelFor(el); tag.textContent = label; cursor.classList.add('is-hover'); });
      el.addEventListener('pointerleave', () => { label = null; cursor.classList.remove('is-hover'); });
    });

    $$('.magnetic').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      const my = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.22);
        my((e.clientY - r.top - r.height / 2) * 0.32);
      });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  }

  /* ---------- Toolkit spreadsheet: formula bar follows the active row ---------- */
  const expr = $('.sheet__expr');
  const ref = $('.sheet__ref');
  const rows = $$('.sheet__row');
  let typeTween = null;
  const showFormula = (row) => {
    rows.forEach((r) => r.classList.toggle('is-active', r === row));
    ref.textContent = row ? row.dataset.ref : 'B1';
    const text = row ? row.dataset.formula : expr.dataset.default;
    if (reduceMotion) { expr.textContent = text; return; }
    const o = { n: 0 };
    typeTween && typeTween.kill();
    typeTween = gsap.to(o, { n: text.length, duration: Math.min(0.6, text.length * 0.012), ease: 'none', onUpdate: () => (expr.textContent = text.slice(0, Math.round(o.n))) });
  };
  rows.forEach((row) => {
    row.addEventListener('pointerenter', () => showFormula(row));
    row.addEventListener('click', () => showFormula(row));
  });
  $('.sheet') && $('.sheet').addEventListener('pointerleave', () => showFormula(null));

  /* ---------- Reduced motion: show everything, no animation ---------- */
  if (reduceMotion) {
    loader.remove();
    body.classList.remove('is-loading');
    $$('.split').forEach((el) => (el.style.visibility = 'visible'));
    $$('.stat__num').forEach((el) => (el.textContent = el.dataset.count));
    $$('.bar').forEach((el) => el.style.setProperty('--p', 1));
    return;
  }

  /* ---------- Boot once fonts are ready (prevents bad line splits) ---------- */
  const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  fontsReady.then(() => {
    buildScrollAnimations();
    playIntro();
  });

  /* ---------- Preloader → cover intro ---------- */
  function playIntro() {
    const num = $('.loader__num');
    const count = { v: 0 };
    const tl = gsap.timeline();

    gsap.set('.cover__word', { yPercent: 115 });
    gsap.set('.cover__photo-mask', { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 22px 22px)' });
    gsap.set('.cover__photo-mask img', { scale: 1.3 });
    gsap.set(['.cover__bar', '.cover__lines > *', '.cover__data > *', '.cover__photo figcaption', '.cover__scroll'], { autoAlpha: 0, y: 24 });

    tl.to(count, {
      v: 100, duration: 1.7, ease: 'power2.inOut',
      onUpdate: () => (num.textContent = Math.round(count.v)),
    })
      .to('.loader__bar span', { scaleX: 1, duration: 1.7, ease: 'power2.inOut' }, 0)
      .to('.loader__inner', { autoAlpha: 0, y: -30, duration: 0.5, ease: 'power2.in' }, '+=0.15')
      .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'power4.inOut' }, '-=0.1')
      .add(() => {
        loader.remove();
        body.classList.remove('is-loading');
        lenis && lenis.start();
      })
      .to('.cover__word', { yPercent: 0, duration: 1.3, stagger: 0.12, ease: 'power4.out' }, '-=0.55')
      .to('.cover__photo-mask', { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 22px 22px)', duration: 1.4, ease: 'power4.inOut' }, '<0.1')
      .to('.cover__photo-mask img', { scale: 1, duration: 1.8, ease: 'power3.out' }, '<')
      .to('.cover__bar', { autoAlpha: 1, y: 0, duration: 0.8 }, '<0.3')
      .to(['.cover__lines > *', '.cover__data > *'], { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.9 }, '<0.2')
      .to(['.cover__photo figcaption', '.cover__scroll'], { autoAlpha: 1, y: 0, duration: 0.8 }, '<0.4')
      .add(() => gsap.set('.cover__photo-mask', { clearProps: 'clipPath' }));
  }

  /* ---------- Scroll-driven animations ---------- */
  function buildScrollAnimations() {
    const mm = gsap.matchMedia();

    // Chapter titles: masked line reveal
    $$('.split').forEach((el) => {
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'line',
        autoSplit: true,
        onSplit(self) {
          gsap.set(el, { visibility: 'visible' });
          return gsap.from(self.lines, {
            yPercent: 115, duration: 1.2, stagger: 0.1, ease: 'power4.out',
            scrollTrigger: { trigger: el, start: 'top 86%', once: true },
          });
        },
      });
    });

    // Generic text + card reveals
    ScrollTrigger.batch('.reveal', {
      start: 'top 90%', once: true,
      onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, stagger: 0.09, duration: 1, overwrite: true }),
    });
    ScrollTrigger.batch('.reveal-card', {
      start: 'top 90%', once: true,
      onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, y: 70, rotate: 1.5 }, { autoAlpha: 1, y: 0, rotate: 0, stagger: 0.1, duration: 1.1, overwrite: true }),
    });

    // Cover: name drifts apart as you scroll out (signature move)
    mm.add('(min-width: 861px)', () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.cover', start: 'top top', end: 'bottom top', scrub: 1 } });
      tl.to('.cover__first', { xPercent: -8, ease: 'none' }, 0)
        .to('.cover__last', { xPercent: 6, ease: 'none' }, 0)
        .to('.cover__photo', { yPercent: -10, ease: 'none' }, 0)
        .to('.cover__data', { yPercent: -18, ease: 'none' }, 0);
    });

    // Marquee: endless loop that speeds up with scroll velocity
    const track = $('.marquee__track');
    const loop = gsap.to(track, { xPercent: -50, repeat: -1, duration: 34, ease: 'none' });
    let speedTween;
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: (self) => {
        const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 350, 4);
        speedTween && speedTween.kill();
        loop.timeScale(boost * (self.direction === 1 ? 1 : -1));
        speedTween = gsap.to(loop, { timeScale: self.direction === 1 ? 1 : -1, duration: 1.2, ease: 'power2.out' });
      },
    });

    // Profile photo parallax
    gsap.fromTo('.parallax-img', { yPercent: -15 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.profile__photo', start: 'top bottom', end: 'bottom top', scrub: true },
    });

    // Stat counters
    $$('.stat__num').forEach((el) => {
      const obj = { v: 0 };
      gsap.to(obj, {
        v: +el.dataset.count, duration: 1.6, ease: 'power2.out',
        onUpdate: () => (el.textContent = Math.round(obj.v)),
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    // ENTJ letters rise in, each with its own beat
    // Each card animates when it reaches the screen (cards stack on mobile)
    gsap.set('.entj__card', { autoAlpha: 0, y: 60 });
    ScrollTrigger.batch('.entj__card', {
      start: 'top 90%', once: true,
      onEnter: (els) => {
        gsap.to(els, { y: 0, autoAlpha: 1, stagger: 0.12, duration: 1.1, ease: 'power4.out', overwrite: true });
        gsap.fromTo(els.map((el) => $('.entj__letter', el)), { yPercent: 40, rotate: -8 },
          { yPercent: 0, rotate: 0, stagger: 0.12, duration: 1.3, ease: 'back.out(1.7)' });
      },
    });

    // Trait bars fill
    gsap.fromTo('.bar', { '--p': 0 }, {
      '--p': 1, stagger: 0.12, duration: 1.4, ease: 'power3.inOut',
      scrollTrigger: { trigger: '.query', start: 'top 78%', once: true },
    });

    // Work: big outlined numbers drift, mini charts build
    $$('.feature').forEach((f) => {
      gsap.fromTo($('.feature__index', f), { yPercent: 30 }, {
        yPercent: -30, ease: 'none',
        scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
    gsap.from('.mini-chart__bars span', {
      scaleY: 0, stagger: 0.07, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.mini-chart', start: 'top 85%', once: true },
    });
    gsap.from('.slots__grid span', {
      scale: 0, autoAlpha: 0, duration: 0.6, ease: 'back.out(2)',
      stagger: { each: 0.05, from: 'random' },
      scrollTrigger: { trigger: '.slots', start: 'top 85%', once: true },
    });

    // Journey: line draws with scroll, milestones pop as the line reaches them
    const points = $$('.plot__points li');
    // Desktop: the chart pins in the middle of the screen while the line draws,
    // so every milestone is readable before the page moves on.
    mm.add('(min-width: 861px)', () => {
      const plotTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.plot-stage', start: 'center 52%', end: '+=1100',
          scrub: 1, pin: true, anticipatePin: 1, refreshPriority: 1,
        },
      });
      plotTl.fromTo('.plot__svg', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 1 }, 0);
      points.forEach((li) => {
        const x = parseFloat(li.style.getPropertyValue('--x')) / 100 || 0;
        plotTl.from(li, { autoAlpha: 0, y: 20, scale: 0.85, duration: 0.1, ease: 'power2.out' }, Math.max(0, x - 0.08));
      });
      plotTl.to({}, { duration: 0.25 }); // hold the finished chart briefly
    });
    // Mobile: no pin; line draws while in view, milestones reveal one by one.
    mm.add('(max-width: 860px)', () => {
      gsap.fromTo('.plot__svg', { clipPath: 'inset(0% 100% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
        scrollTrigger: { trigger: '.plot__svg', start: 'top 85%', end: 'bottom 50%', scrub: 1 },
      });
      points.forEach((li) => gsap.from(li, {
        autoAlpha: 0, y: 24, duration: 0.8,
        scrollTrigger: { trigger: li, start: 'top 92%', once: true },
      }));
    });

    // Scoreboard: medal numbers flip up
    gsap.from('.score__rank', {
      yPercent: 60, autoAlpha: 0, stagger: 0.12, duration: 1.2, ease: 'power4.out',
      scrollTrigger: { trigger: '.scoreboard', start: 'top 85%', once: true },
    });

    // Footer name rises
    gsap.from('.footer__big', {
      yPercent: 50, autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: 1 },
    });

    // Images and fonts may shift layout — refresh once everything is in
    addEventListener('load', () => ScrollTrigger.refresh());
  }
})();
