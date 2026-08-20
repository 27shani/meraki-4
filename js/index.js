/* =====================================================================
   MERAKI 2026 — MAIN ANIMATION SCRIPT
   Vanilla JS + GSAP + ScrollTrigger + Lenis
   Architecture mirrors lukebaffait.fr: direct DOM manipulation,
   gsap.quickTo for cursor lag, gsap.ticker for continuous tilt,
   DOM writes only on actual index change (no per-frame re-render).
   ===================================================================== */

(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  // Real mobile browsers fire resize events when the address bar
  // hides/shows during scroll. Without this, ScrollTrigger would
  // recalculate all pinned start/end positions mid-scroll on every
  // one of those events, which is what makes pinned sections "jump"
  // or break on an actual phone even though desktop and DevTools
  // mobile emulation (which don't have a collapsing toolbar) look fine.
  ScrollTrigger.config({ ignoreMobileResize: true });

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===================================================================
     UTIL — character split + hover wipe (data-char-hover)
     =================================================================== */
  function splitIntoChars(el) {
    var text = el.textContent || '';
    el.innerHTML = '';
    el.classList.add('split-chars');
    var chars = [];
    text.split('').forEach(function (ch) {
      if (ch === ' ') {
        var space = document.createElement('span');
        space.className = 'char-space';
        space.innerHTML = '&nbsp;';
        el.appendChild(space);
        return;
      }
      var wrapper = document.createElement('span');
      wrapper.className = 'char';
      var top = document.createElement('span');
      top.className = 'ch-top';
      top.textContent = ch;
      var bot = document.createElement('span');
      bot.className = 'ch-bot';
      bot.textContent = ch;
      wrapper.appendChild(top);
      wrapper.appendChild(bot);
      el.appendChild(wrapper);
      chars.push({ top: top, bot: bot, wrapper: wrapper });
    });
    return chars;
  }

  function applyCharHover(chars, parent) {
    if (!chars.length) return;
    var stagger = 0.012;
    function onEnter() {
      chars.forEach(function (c, i) {
        gsap.to(c.top, { clipPath: 'inset(0 0 0 0)', duration: 0.45, ease: 'power3.out', delay: i * stagger, overwrite: true });
        gsap.to(c.bot, { yPercent: -100, duration: 0.45, ease: 'power3.out', delay: i * stagger, overwrite: true });
      });
    }
    function onLeave() {
      chars.forEach(function (c, i) {
        gsap.to(c.top, { clipPath: 'inset(100% 0 0 0)', duration: 0.4, ease: 'power3.out', delay: i * stagger, overwrite: true });
        gsap.to(c.bot, { yPercent: 0, duration: 0.4, ease: 'power3.out', delay: i * stagger, overwrite: true });
      });
    }
    parent.addEventListener('mouseenter', onEnter);
    parent.addEventListener('mouseleave', onLeave);
  }

  function initCharHover(root) {
    var nodes = (root || document).querySelectorAll('[data-char-hover]');
    nodes.forEach(function (el) {
      if (el.classList.contains('split-chars')) return;
      var chars = splitIntoChars(el);
      applyCharHover(chars, el);
    });
  }

  function splitWords(text) { return text.split(/(\s+)/); }
  function isSpace(s) { return !s || /^\s+$/.test(s); }

  // Word-wrap that preserves existing inline formatting (e.g. italic/gradient
  // spans) by copying an element child's classes onto its own word spans,
  // instead of flattening textContent (which would destroy the styling).
  function wrapLineWords(lineEl) {
    var wordEls = [];
    var childNodes = Array.prototype.slice.call(lineEl.childNodes);

    childNodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        var frag = document.createDocumentFragment();
        splitWords(node.textContent).forEach(function (w) {
          if (isSpace(w)) { if (w) frag.appendChild(document.createTextNode(w)); return; }
          var span = document.createElement('span');
          span.className = 'word';
          span.textContent = w;
          frag.appendChild(span);
          wordEls.push(span);
        });
        lineEl.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        var extraClasses = node.className;
        var text = node.textContent;
        node.textContent = '';
        splitWords(text).forEach(function (w) {
          if (isSpace(w)) { if (w) node.appendChild(document.createTextNode(w)); return; }
          var span = document.createElement('span');
          span.className = 'word ' + extraClasses;
          span.textContent = w;
          node.appendChild(span);
          wordEls.push(span);
        });
      }
    });

    lineEl.classList.add('word-reveal');
    return wordEls;
  }

  /* ===================================================================
     LENIS — smooth scroll, exact lukebaffait.fr config
     =================================================================== */
  var html = document.documentElement;
  html.classList.add('lenis', 'lenis-smooth');

  var lenis = new Lenis({
    lerp: 0.1,
    // Touch scroll is native/raw by default (no easing), which is why
    // mobile scroll speed feels inconsistent with the smoothed desktop
    // wheel scroll. syncTouch routes touch input through the same
    // lerp-eased loop so scroll speed feels the same everywhere.
    syncTouch: true,
    syncTouchLerp: 0.1,
    touchInertiaExponent: 1.7
  });
  window.__lenis = lenis;

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  lenis.stop();
  lenis.scrollTo(0, { immediate: true });
  html.classList.add('lenis-stopped');
  html.style.overflow = 'hidden';

  function unlockLenis() {
    if (!html.classList.contains('lenis-stopped')) return;
    html.style.overflow = '';
    html.classList.remove('lenis-stopped');
    lenis.start();
    lenis.scrollTo(0, { immediate: true });
    requestAnimationFrame(function () { ScrollTrigger.refresh(); });
  }
  window.__unlockLenis = unlockLenis;

  var safetyUnlock = window.setTimeout(unlockLenis, 5000);
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  /* ===================================================================
     LOADER
     =================================================================== */
(function loaderAnim() {
  var loader = document.getElementById('loader');
  var logo = document.getElementById('loaderLogo');
  var wipeRed = document.getElementById('wipeRed');
  var wipeBlack = document.getElementById('wipeBlack');
  var heroTitle = document.getElementById('heroTitle');

  // 🛡️ Debug: check if elements exist
  if (!loader || !logo || !wipeRed || !wipeBlack) {
    console.error('Loader elements missing! Check IDs.');
    return;
  }

  // ✅ FORCE reset: no CSS transform conflicts, use GSAP's 'y' (in %)
  gsap.set(loader, { opacity: 1, visibility: 'visible', pointerEvents: 'auto' });
  gsap.set(logo, { scale: 0.5, opacity: 0 });
  
  // CRITICAL: explicitly set y to 100% (down) and ensure they are opaque
  gsap.set(wipeRed, { y: '100%', opacity: 1 });
  gsap.set(wipeBlack, { y: '100%', opacity: 1 });

  var tl = gsap.timeline();

  tl
    // 1) Logo scales up big & fades in
    .to(logo, { scale: 1.2, opacity: 1, duration: 0.8, ease: 'expo.out' })

    // 2) Red wipe slides UP (from 100% to 0%)
    .to(wipeRed, { y: '0%', duration: 0.6, ease: 'power3.inOut' }, '+=0.2')

    // 3) Black wipe slides UP (overlaps red)
    .to(wipeBlack, { y: '0%', duration: 0.6, ease: 'power3.inOut' }, '-=0.4')

    // 4) Logo fades out instantly
    .set(logo, { opacity: 0 })

    // 5) Loader background becomes transparent
    .set(loader, { backgroundColor: 'transparent' })

    // 6) Red wipe slides back DOWN
    .to(wipeRed, { y: '100%', duration: 0.6, ease: 'power3.inOut' })

    // 7) Black wipe slides back DOWN (triggers completion)
    .to(wipeBlack, {
      y: '100%',
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: function () {
        gsap.set(loader, { visibility: 'hidden', pointerEvents: 'none' });
        window.clearTimeout(safetyUnlock);
        unlockLenis();
        ScrollTrigger.refresh();

        if (heroTitle) {
          var words = heroTitle.querySelectorAll('span');
          gsap.from(words, {
            opacity: 0,
            y: 50,
            duration: 0.6,
            stagger: 0.12,
            ease: 'power3.out',
            delay: 0.2
          });
        }
      }
    }, '-=0.4');
})();
  /* ===================================================================
     SCROLL PROGRESS
     =================================================================== */
  (function scrollProgress() {
    var wrap = document.getElementById('scrollProgress');
    var bar = document.getElementById('scrollProgressBar');
    var pct = document.getElementById('scrollProgressPct');
    if (!wrap) return;

    lenis.on('scroll', function (e) {
      var progress = e.progress || 0;
      gsap.set(bar, { scaleY: progress });
      pct.textContent = String(Math.round(progress * 100)).padStart(2, '0');
      wrap.classList.toggle('is-visible', e.scroll > 40);
    });
  })();

  var mm = gsap.matchMedia();

  /* ===================================================================
     1. HERO — pinned expand-to-fullscreen reveal
     =================================================================== */
  (function hero() {
    var container = document.getElementById('hero');
    var titleWrap = document.getElementById('heroTitleWrap');
    var expandBox = document.getElementById('heroExpand');
    var expandContent = document.getElementById('heroExpandContent');
    if (!container) return;

    mm.add('(min-width: 768px)', function () {
      gsap.set(titleWrap, { y: 0 });
      var tl = gsap.timeline({
        scrollTrigger: { trigger: container, start: 'top top', end: '+=160%', scrub: 0.6, pin: true, anticipatePin: 1, fastScrollEnd: true, preventOverlaps: true }
      });
      tl.to(expandBox, { width: '350px', height: '200px', opacity: 1, borderRadius: '0px', ease: 'power3.out' })
        .to(expandBox, { width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut' }, '+=0.1')
        .fromTo(expandContent, { opacity: 0, y: 60, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power3.out', duration: 1.5 }, '<0.2')
        .to(container, { scale: 0.85, opacity: 0.15, filter: 'blur(6px)', yPercent: -20, ease: 'power2.inOut', duration: 1.2 }, '+=0.3');
    });

    mm.add('(max-width: 767px)', function () {
      gsap.set(titleWrap, { y: '22vh' });
      var tl = gsap.timeline({
        scrollTrigger: { trigger: container, start: 'top top', end: '+=180%', scrub: 0.6, pin: true, anticipatePin: 1, fastScrollEnd: true, preventOverlaps: true }
      });
      tl.to(titleWrap, { y: 0, duration: 1.2, ease: 'power2.out' })
        .to(expandBox, { width: '220px', height: '350px', opacity: 1, borderRadius: '0px', ease: 'power3.out', duration: 1 }, '+=0.2')
        .to(expandBox, { width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut', duration: 1.2 }, '+=0.2')
        .fromTo(expandContent, { opacity: 0, y: 60, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power3.out', duration: 1.5 }, '<0.2')
        .to(container, { scale: 0.85, opacity: 0.15, filter: 'blur(6px)', yPercent: -20, ease: 'power2.inOut', duration: 1.2 }, '+=0.3');
    });
  })();

  /* ===================================================================
     2. ABOUT — word reveal + horizontal card slider
     =================================================================== */
  (function about() {
    var container = document.getElementById('about');
    var heading = document.getElementById('aboutHeading');
    var image = document.getElementById('aboutImage');
    var boxesWrapper = document.getElementById('aboutBoxes');
    var boxes = boxesWrapper ? Array.prototype.slice.call(boxesWrapper.querySelectorAll('[data-box]')) : [];
    if (!container) return;

    var lineDivs = heading.querySelectorAll(':scope > div');
    lineDivs.forEach(function (div, index) {
      var words = wrapLineWords(div);
      gsap.fromTo(words, { opacity: 0, filter: 'blur(8px)' }, {
        opacity: 1, filter: 'blur(0px)', stagger: 0.04, ease: 'power2.out',
        scrollTrigger: { trigger: heading, start: 'top 85%', toggleActions: 'play none none reverse' },
        delay: index * 0.2
      });
    });

    gsap.fromTo(container, { opacity: 0.15, filter: 'blur(8px)' }, {
      opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power2.out',
      scrollTrigger: { trigger: container, start: 'top bottom', end: 'top center', scrub: 0.6 }
    });

    mm.add('(min-width: 768px)', function () {
      var containerWidth = container.clientWidth;
      var wrapperWidth = boxesWrapper.scrollWidth;
      var startOffset = containerWidth * 0.6;
      var finalX = -(wrapperWidth - containerWidth + 200);

      gsap.set(boxesWrapper, { x: startOffset });

      var tl = gsap.timeline({
        scrollTrigger: { trigger: container, start: 'top top', end: '+=120%', pin: true, scrub: 0.6, anticipatePin: 1, fastScrollEnd: true, preventOverlaps: true }
      });
      tl.fromTo(image, { filter: 'blur(12px) brightness(0.6)', opacity: 0.3 }, { filter: 'blur(2px) brightness(1)', opacity: 1, duration: 1.0, ease: 'power2.out' }, 0)
        .to(boxesWrapper, { x: finalX, duration: 2.0, ease: 'power2.inOut' }, 0.1)
        .fromTo(boxes, { y: '80px', scale: 0.92 }, { y: 0, scale: 1, stagger: 0.35, duration: 1.2, ease: 'power2.out' }, 0.2);
    });

    mm.add('(max-width: 767px)', function () {
      var tl = gsap.timeline({
        scrollTrigger: { trigger: container, start: 'top top', end: '+=130%', pin: true, scrub: 0.5, invalidateOnRefresh: true, anticipatePin: 1, fastScrollEnd: true, preventOverlaps: true }
      });
      tl.fromTo(image, { filter: 'blur(12px) brightness(0.6)', opacity: 0.3 }, { filter: 'blur(2px) brightness(1)', opacity: 1, duration: 0.8, ease: 'power2.out' }, 0)
        .fromTo(boxes, { y: '40px', scale: 0.92 }, { y: 0, scale: 1, stagger: 0.2, duration: 0.9, ease: 'power2.out' }, 0.1)
        .to(boxesWrapper, {
          x: function () {
            var wrapperWidth = boxesWrapper.scrollWidth || 0;
            return -(wrapperWidth - window.innerWidth + 120);
          },
          duration: 1.8, ease: 'power2.inOut'
        }, 0.1);
    });
  })();

 /* ===================================================================
   3. HOW IT WORKS — PROCESS
   -------------------------------------------------------------------
   Architecture:
   - 100svh pinned viewport
   - Vertical step list travels through fixed center focus
   - SVG ribbon remains in the same viewport
   - Step titles follow a controlled curved trajectory
   - Right preview remains stationary
   - Active step controls counter / image / description
   =================================================================== */

(function howItWorks() {

  var container =
    document.getElementById('how');

  var pathEl =
    document.getElementById('ribbonPath');

  var list =
    document.getElementById('howList');

  var card =
    document.getElementById('howCard');

  var cover =
    document.getElementById('howCover');

  var cursor =
    document.getElementById('howCursor');

  if (
    !container ||
    !list ||
    !card
  ) {
    return;
  }


  /* ===============================================================
     PROCESS DATA
     =============================================================== */

  var STEPS = [
    {
      stepNum:'01',
      title:'Apply'
    },
    {
      stepNum:'02',
      title:'Get Evaluated'
    },
    {
      stepNum:'03',
      title:'Make the Cut'
    },
    {
      stepNum:'04',
      title:'Refine Your Pitch'
    },
    {
      stepNum:'05',
      title:'Pitch at Meraki'
    },
    {
      stepNum:'06',
      title:'Win'
    }
  ];


  /* ===============================================================
     ELEMENTS
     =============================================================== */

  var stepEls =
    Array.prototype.slice.call(
      list.querySelectorAll('.how__step')
    );

  var imgEls =
    Array.prototype.slice.call(
      card.querySelectorAll('[data-img]')
    );

  var descEls =
    Array.prototype.slice.call(
      container.querySelectorAll('[data-desc]')
    );

  var counterEl =
    document.getElementById('howCounter');

  var stepLabelEl =
    document.getElementById('howStepLabel');

  var coverTitleEl =
    document.getElementById('howCoverTitle');


  /* ===============================================================
     CONSTANTS
     =============================================================== */

  var ROW_HEIGHT = 130;

  var isCardHovered = false;

  var tilt = {
    targetRY:0,
    targetRX:0,
    ry:0,
    rx:0
  };


  /* ===============================================================
     PRELOAD IMAGES
     =============================================================== */

  STEPS.forEach(function(step, i){

    var img =
      imgEls[i] &&
      imgEls[i].querySelector('img');

    if(img){

      var preload =
        new Image();

      preload.src =
        img.src;
    }

  });


  /* ===============================================================
     CARD TILT
     =============================================================== */

  function onMouseMove(e){

    if(!isCardHovered){
      return;
    }

    var rect =
      card.getBoundingClientRect();

    var cx =
      rect.left +
      rect.width / 2;

    var cy =
      rect.top +
      rect.height / 2;

    var ry =
      Math.max(
        -1,
        Math.min(
          1,
          (e.clientX - cx) /
          (rect.width / 2)
        )
      );

    var rx =
      Math.max(
        -1,
        Math.min(
          1,
          (e.clientY - cy) /
          (rect.height / 2)
        )
      );

    tilt.targetRY =
      ry * 7;

    tilt.targetRX =
      -rx * 5;
  }


  card.addEventListener(
    'mousemove',
    onMouseMove
  );


  card.addEventListener(
    'mouseenter',
    function(){

      isCardHovered = true;

      gsap.to(
        cursor,
        {
          opacity:1,
          duration:.25
        }
      );

      gsap.to(
        cover,
        {
          opacity:1,
          y:-8,
          duration:.45,
          ease:'power3.out'
        }
      );

    }
  );


  card.addEventListener(
    'mouseleave',
    function(){

      isCardHovered = false;

      tilt.targetRY = 0;
      tilt.targetRX = 0;

      gsap.to(
        cursor,
        {
          opacity:0,
          duration:.25
        }
      );

      gsap.to(
        cover,
        {
          opacity:0,
          y:0,
          duration:.45,
          ease:'power3.out'
        }
      );

    }
  );


  /* ===============================================================
     RESPONSIVE GSAP
     =============================================================== */

  var mm =
    gsap.matchMedia();


  mm.add(
    {
      isDesktop:'(min-width:768px)',
      isMobile:'(max-width:767px)'
    },

    function(context){

      var isMobile =
        context.conditions.isMobile;

      var isDesktop =
        context.conditions.isDesktop;

      var total =
        STEPS.length;

      var lastIndex = -1;


      /* ===========================================================
         CARD TICKER
         =========================================================== */

      function tickerFn(){

        if(!isCardHovered){
          return;
        }

        tilt.ry +=
          (
            tilt.targetRY -
            tilt.ry
          ) * .12;

        tilt.rx +=
          (
            tilt.targetRX -
            tilt.rx
          ) * .12;

        card.style.transform =
          'perspective(900px)' +
          ' rotateY(' +
          tilt.ry.toFixed(2) +
          'deg)' +
          ' rotateX(' +
          tilt.rx.toFixed(2) +
          'deg)';
      }


      gsap.ticker.add(
        tickerFn
      );


      /* ===========================================================
         CURSOR FOLLOW
         =========================================================== */

      var qCursorX = null;
      var qCursorY = null;


      if(isDesktop){

        qCursorX =
          gsap.quickTo(
            cursor,
            'left',
            {
              duration:.35,
              ease:'power3.out'
            }
          );

        qCursorY =
          gsap.quickTo(
            cursor,
            'top',
            {
              duration:.35,
              ease:'power3.out'
            }
          );

      }


      function onGlobalMove(e){

        if(
          !isCardHovered ||
          !qCursorX
        ){
          return;
        }

        var rect =
          card.getBoundingClientRect();

        qCursorX(
          e.clientX -
          rect.left
        );

        qCursorY(
          e.clientY -
          rect.top
        );

      }


      window.addEventListener(
        'mousemove',
        onGlobalMove
      );


      /* ===========================================================
         RIBBON — PROGRESSIVE SVG REVEAL
         -----------------------------------------------------------
         Copied from the reference/source Process logic:
         the path is fully hidden using its measured length,
         then strokeDashoffset is reduced to 0 by the same
         scroll-scrubbed timeline.
         =========================================================== */

      var pathLength = 0;

      if (pathEl) {
        // Force a layout pass first: some browsers report 0 from
        // getTotalLength() if the SVG hasn't been laid out yet
        // (e.g. right after a display:none -> display:block switch).
        pathEl.getBoundingClientRect();
        pathLength = pathEl.getTotalLength() || 0;

        // Fallback in case measurement still comes back empty —
        // without this the dash pattern is 0 and the stroke renders
        // fully solid immediately, so it never appears to "grow".
        if (!pathLength) pathLength = 4200;

        gsap.set(
          pathEl,
          {
            strokeDasharray:pathLength,
            strokeDashoffset:pathLength
          }
        );
      }


      /* ===========================================================
         VIEWPORT POSITIONING
         =========================================================== */

      function getViewportHeight(){

        return (
          container.clientHeight ||
          window.innerHeight
        );

      }


      function getListPositions(){

        var vh =
          getViewportHeight();

        /*
         * The active row is always centered
         * in the Process viewport.
         */

        var centerY =
          vh / 2;


        var startY =
          centerY -
          ROW_HEIGHT / 2;


        var endY =
          centerY -
          (
            (total - 1) *
            ROW_HEIGHT +
            ROW_HEIGHT / 2
          );


        return {
          startY:startY,
          endY:endY
        };

      }


      var positions =
        getListPositions();


      /*
       * Initial position.
       */

      gsap.set(
        list,
        {
          y:positions.startY
        }
      );


      /* ===========================================================
         TITLE CURVE
         =========================================================== */

      function updateTitleCurve(activeIndex){

        stepEls.forEach(
          function(el, i){

            var title =
              el.querySelector(
                '.how__step-title'
              );

            if(!title){
              return;
            }


            /*
             * Distance from active item.
             */
            var distance =
              i - activeIndex;


            /*
             * Gentle S / ribbon-like curve.
             *
             * IMPORTANT:
             * This is intentionally much smaller
             * than the old 25px quadratic value.
             *
             * Old:
             *   distance² × 25
             *
             * New:
             *   distance² × 8
             *
             * This keeps all titles visually
             * connected to the ribbon instead
             * of throwing inactive titles
             * hundreds of pixels away.
             */

            var translateX =
              -24 +
              (
                distance *
                distance *
                8
              );


            /*
             * Active item sits slightly left,
             * matching the reference structure.
             */

            if(distance === 0){

              translateX = -32;

            }


            var scale =
              i === activeIndex
                ? 1.05
                : .95;


            title.style.transform =
              'translate3d(' +
              translateX +
              'px,0,0)' +
              ' scale(' +
              scale +
              ')';

          }
        );

      }


      /* ===========================================================
   ACTIVE STATE
   =========================================================== */

function updateProcessState(index){

  if(index === lastIndex){
    return;
  }

  lastIndex = index;


  /* =========================================================
     COUNTER
     ========================================================= */

  if(counterEl){

    counterEl.textContent =
      '(' +
      STEPS[index].stepNum +
      ')';

  }


  /* =========================================================
     STEP LABEL
     ========================================================= */

  if(stepLabelEl){

    stepLabelEl.textContent =
      'Step ' +
      STEPS[index].stepNum;

  }


  /* =========================================================
     CARD TITLE
     ========================================================= */

  if(coverTitleEl){

    coverTitleEl.textContent =
      STEPS[index].title;

  }


  /* =========================================================
     STEP STATE + CURVED POSITIONING
     ========================================================= */

  stepEls.forEach(function(el, i){

    /*
     * Active / inactive state
     */
    el.classList.toggle(
      'is-active',
      i === index
    );


    /*
     * Distance from active step
     *
     * Example:
     *
     *       Apply          distance -2
     *       Get Evaluated  distance -1
     *       MAKE THE CUT   distance  0
     *       Refine Pitch   distance +1
     *       Pitch Meraki   distance +2
     */

    var distance =
      i - index;


    var h2 =
      el.querySelector(
        '.how__step-title'
      );


    if(!h2){
      return;
    }


    /* =======================================================
       CURVED HORIZONTAL POSITION
       =======================================================

       Active:
         -24px

       1 step away:
         -6px

       2 steps away:
         +48px

       3 steps away:
         +138px

       This creates the curved/ribbon-like arrangement.
       ======================================================= */

    var tx =
      -24 +
      (
        distance *
        distance *
        25
      );


    /*
     * Keep active step locked
     * to the center-left focus.
     */

    if(distance === 0){

      tx = -24;

    }


    /*
     * Active step is slightly larger.
     */

    var scale =
      i === index
        ? 1.05
        : .95;


    /*
     * JS owns the complete transform.
     *
     * Do NOT add another transform
     * from CSS for the active item.
     */

    h2.style.transform =
      'translate3d(' +
      tx +
      'px, 0, 0)' +
      ' scale(' +
      scale +
      ')';

  });


  /* =========================================================
     PREVIEW IMAGES
     ========================================================= */

  imgEls.forEach(function(el, i){

    el.classList.toggle(
      'is-active',
      i === index
    );

  });


  /* =========================================================
     DESCRIPTIONS
     ========================================================= */

  descEls.forEach(function(el, i){

    el.classList.toggle(
      'is-active',
      i === index
    );

  });

}

      /* ===========================================================
         INITIAL STATE
         =========================================================== */

      updateProcessState(0);


      /* ===========================================================
         MAIN PROCESS TIMELINE
         =========================================================== */

      var tl =
        gsap.timeline({

          scrollTrigger:{

            trigger:
              container,

            start:
              'top top',

            /*
             * Desktop:
             * enough distance for all 6 steps.
             *
             * Mobile:
             * shorter because the ribbon/card
             * architecture is simplified.
             */

            end:
              isMobile
                ? '+=340%'
                : '+=300%',

            pin:true,

            fastScrollEnd:true,

            preventOverlaps:true,

            scrub:
              isMobile
                ? .2
                : .25,

            anticipatePin:1,

            invalidateOnRefresh:true

          }

        });


      /* ===========================================================
         STEP ENTRANCE
         =========================================================== */

      tl.fromTo(

        stepEls,

        {
          y:80,
          opacity:0
        },

        {
          y:0,
          opacity:1,

          stagger:.08,

          duration:1,

          ease:'power2.out'
        },

        0

      );


      /* ===========================================================
         RIBBON — PROGRESSIVE SVG REVEAL
         -----------------------------------------------------------
         Same reveal behavior as the reference/source file.
         The path grows as the pinned Process timeline advances.
         =========================================================== */

if (pathEl) {

  tl.to(
    pathEl,
    {
      strokeDashoffset:0,
      ease:'power1.inOut',
      duration:1.08
    },
    -0.08
  );
}


      /* ===========================================================
         STEP LIST MOVEMENT
         =========================================================== */

      tl.to(

        list,

        {

          y:function(){

            /*
             * Recalculate at refresh time.
             * This prevents viewport changes from
             * breaking the final position.
             */

            return getListPositions().endY;

          },

          ease:'none',

          duration:1,


          onUpdate:function(){

            var progress =
              this.progress();


            /*
             * Convert scroll progress
             * into active step index.
             */

            var rawIndex =
              progress *
              (total - 1);


            var index =
              Math.min(
                Math.round(rawIndex),
                total - 1
              );


            updateProcessState(
              index
            );

          }

        },

        0

      );


      /* ===========================================================
         SMALL HOLD AT END
         =========================================================== */

      tl.to(
        {},
        {
          duration:.12
        },
        .9
      );


      /* ===========================================================
         CLEANUP
         =========================================================== */

      return function cleanup(){

        gsap.ticker.remove(
          tickerFn
        );

        window.removeEventListener(
          'mousemove',
          onGlobalMove
        );

      };

    }
  );

})();

  /* ===================================================================
     3b. WALL OF FAME — manual card slider
     =================================================================== */
  (function wallOfFame() {
    var section = document.getElementById('fame');
    var sliderEl = document.getElementById('fameSlider');
    var prevBtn = document.getElementById('fameArrowPrev');
    var nextBtn = document.getElementById('fameArrowNext');
    if (!section || !sliderEl) return;

    // Sourced from the Meraki Hall of Fame content doc + image set.
    var WINNERS = [
      { name: 'Picapool', year: '2025', college: 'IIT Bangalore', prize: '₹150,000', img: 'assets/hall-of-fame/picapool.jpg' },
      { name: 'TGP Bioplast', year: '2025', college: 'Rajarambapu Institute of Technology', prize: '₹150,000', img: 'assets/hall-of-fame/tgp-bioplast.jpg' },
      { name: 'Jalraaj', year: '2025', college: 'Buddha Institute of Technology, Gorakhpur', prize: '₹100,000', img: 'assets/hall-of-fame/jalraaj.jpg' },
      { name: 'Ksham Innovation', year: '2023', college: 'Government College of Engineering, Amravati', prize: '₹75,000', img: 'assets/hall-of-fame/ksham-innovation.jpg' },
      { name: 'Stimlite', year: '2023', college: 'Netaji Subhas University of Technology (NSUT), Delhi', prize: '₹50,000', img: 'assets/hall-of-fame/stimlite.jpg' },
      { name: 'Svar', year: '2023', college: 'Indian Institute of Technology, Delhi', prize: '₹25,000', img: 'assets/hall-of-fame/svar.jpg' },
      { name: 'Team Aarogya', year: '2021', college: 'Shri Ram College of Commerce, DU', prize: '₹75,000', img: 'assets/hall-of-fame/team-aarogya.jpg' },
      { name: 'Wellness Mandala', year: '2021', college: 'Indian Institute of Technology (IIT), BHU', prize: '₹50,000', img: 'assets/hall-of-fame/wellness-mandala.jpg' },
      { name: 'Nirmalya', year: '2020', college: 'Indian Institute of Technology (IIT), Delhi', prize: '₹25,000', img: 'assets/hall-of-fame/nirmalya.jpg' }
    ];

    WINNERS.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'fame__card';

      card.innerHTML =
        '<div class="fame__card-media">' +
          '<img src="' + item.img + '" alt="' + item.name + '" loading="lazy">' +
          '<span class="fame__card-year">' + item.year + '</span>' +
        '</div>' +
        '<div class="fame__card-body">' +
          '<h3 class="fame__card-name">' + item.name + '</h3>' +
          '<div class="fame__card-divider"></div>' +
          '<div class="fame__card-meta">' +
            '<div class="fame__card-college"><span class="fame__card-label">College</span><span class="fame__card-value">' + item.college + '</span></div>' +
            '<div class="fame__card-prize"><span class="fame__card-label">Prize Money</span><span class="fame__card-value fame__card-value--prize">' + item.prize + '</span></div>' +
          '</div>' +
        '</div>';
      sliderEl.appendChild(card);
    });

    function cardStep() {
      var card = sliderEl.querySelector('.fame__card');
      if (!card) return 320;
      var style = window.getComputedStyle(sliderEl);
      var gap = parseFloat(style.columnGap || style.gap || '0') || 0;
      return card.getBoundingClientRect().width + gap;
    }

    if (prevBtn) prevBtn.addEventListener('click', function () {
      sliderEl.scrollBy({ left: -cardStep(), behavior: 'smooth' });
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      sliderEl.scrollBy({ left: cardStep(), behavior: 'smooth' });
    });

    // Desktop mouse drag-to-scroll (touch/trackpad already scroll natively).
    var isDown = false, startX = 0, startScroll = 0, dragged = false;
    sliderEl.addEventListener('mousedown', function (e) {
      isDown = true; dragged = false;
      startX = e.pageX;
      startScroll = sliderEl.scrollLeft;
      sliderEl.classList.add('is-dragging');
    });
    window.addEventListener('mouseup', function () {
      isDown = false;
      sliderEl.classList.remove('is-dragging');
    });
    window.addEventListener('mousemove', function (e) {
      if (!isDown) return;
      var dx = e.pageX - startX;
      if (Math.abs(dx) > 4) dragged = true;
      sliderEl.scrollLeft = startScroll - dx;
    });
    // Prevent the drag gesture from also registering as a click on a card link.
    sliderEl.addEventListener('click', function (e) {
      if (dragged) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    gsap.fromTo(section, { opacity: 0.15, filter: 'blur(8px)' }, {
      opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power2.out',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'top center', scrub: 0.6 }
    });
  })();

  (function gallery() {
    // The two investor-logo rows now run on a pure CSS infinite marquee
    // (see .gallery__track--left / --right in styles/index.css) so they
    // scroll continuously in opposite directions without any scroll-linked
    // JS driving their transform — this keeps them smooth and avoids the
    // stutter/lag a scroll-scrubbed transform would introduce.
    var section = document.getElementById('gallery');
    var text = document.getElementById('galleryText');
    if (!section) return;

    gsap.set(text, { opacity: 1, clearProps: 'filter,scale' });
  })();

  /* ===================================================================
     5. TRACKS — horizontal card slider + prize emphasis + content pan
     =================================================================== */
  (function tracks() {
    var container = document.getElementById('tracks');
    var content = document.getElementById('tracksContent');
    var title = document.getElementById('tracksTitle');
    var wrapper = document.getElementById('tracksWrapper');
    var prizesWrap = document.getElementById('tracksPrizes');
    if (!container) return;

    var trackBoxes = Array.prototype.slice.call(wrapper.querySelectorAll('[data-track]'));
    var prizeBoxes = Array.prototype.slice.call(prizesWrap.querySelectorAll('[data-prize]'));

    gsap.fromTo(container, { opacity: 0.15, filter: 'blur(8px)' }, {
      opacity: 1, filter: 'blur(0px)', ease: 'power2.out',
      scrollTrigger: { trigger: container, start: 'top bottom', end: 'top center', scrub: 0.6 }
    });

    gsap.context(function () {
      var isMobile = window.innerWidth < 768;

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: container, start: 'top top', end: isMobile ? '+=420%' : '+=520%',
          pin: true, scrub: 1.2, anticipatePin: 1, invalidateOnRefresh: true, fastScrollEnd: true, preventOverlaps: true
        }
      });

      gsap.set(title, { y: 40 });
      tl.to(title, { clipPath: 'inset(0 0 0% 0)', opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0);

      var wrapperWidth = wrapper.getBoundingClientRect().width;
      var viewportWidth = window.innerWidth;
      var startOffset = viewportWidth * 0.8;
      var finalX = 0;
      if (wrapperWidth > viewportWidth) finalX = -(wrapperWidth - viewportWidth) - 20;
      gsap.set(wrapper, { x: startOffset });
      tl.to(wrapper, { x: finalX, duration: 3.0, ease: 'power2.inOut' }, 0.15);

      trackBoxes.forEach(function (box, i) {
        tl.to(box, { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0.4 + i * 0.2);
      });

      tl.to(prizesWrap, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 3.0);
      prizeBoxes.forEach(function (box, i) {
        tl.to(box, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out' }, 3.2 + i * 0.25);
      });

      tl.to(content, {
        y: function () {
          var overflow = content.scrollHeight - window.innerHeight;
          return overflow > 0 ? -(overflow + 100) : 0;
        },
        ease: 'none', duration: 2.5
      }, isMobile ? 4.5 : 4.0);

      tl.to({}, { duration: 0.35 }, '+=0.15');
    }, container);
  })();

  /* ===================================================================
     6. TIMELINE (SAVE THE DATES) — vertical scroll + accordion
     =================================================================== */
(function timeline() {
  var container = document.getElementById('timeline');
  var rightOuter = container ? container.querySelector('.timeline__right-outer') : null;
  var rightContent = document.getElementById('timelineRight');
  if (!container) return;

  initCharHover(container);

  // Get all accordion items
  var events = Array.prototype.slice.call(rightContent.querySelectorAll('[data-event]'));
  var openIndex = 0; // track which is open (-1 = none)

  // Function to open/close
  function setOpen(idx) {
    openIndex = idx;
    events.forEach(function (evt, i) {
      var body = evt.querySelector('[data-body]');
      var icon = evt.querySelector('.timeline__event-icon');
      var isOpen = (i === idx);

      // Update class and icon
      evt.classList.toggle('is-open', isOpen);
      icon.textContent = isOpen ? '—' : '+';

      // Kill any ongoing animation on this body
      gsap.killTweensOf(body);

      if (isOpen) {
        // Open: use scrollHeight (full content)
        var h = body.scrollHeight;
        gsap.to(body, {
          height: h,
          opacity: 1,
          duration: 0.45,
          ease: 'power3.inOut',
          onComplete: function () {
            body.style.height = 'auto';
            ScrollTrigger.refresh();
          }
        });
      } else {
        // Close: collapse to 0
        gsap.to(body, {
          height: 0,
          opacity: 0,
          duration: 0.45,
          ease: 'power3.inOut',
          onComplete: function () {
            ScrollTrigger.refresh();
          }
        });
      }
    });
  }

  // --- SCROLL TRIGGER (pinning) ---
  function getMaxScroll() {
    return Math.max(0, rightContent.scrollHeight - rightOuter.clientHeight + 100);
  }

  gsap.context(function () {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: function () { return '+=' + (getMaxScroll() * 1.5); },
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        fastScrollEnd: true,
        preventOverlaps: true,
        invalidateOnRefresh: true
      }
    });
    tl.to(rightContent, { y: function () { return -getMaxScroll(); }, ease: 'none' }, 0);
  }, container);

  // --- EVENT DELEGATION (works even after scroll) ---
  // Listen on the container that never moves
  rightContent.addEventListener('click', function (e) {
    // Find the closest clickable header
    var head = e.target.closest('[data-toggle]');
    if (!head) return;

    // Find the parent event item
    var evt = head.closest('[data-event]');
    if (!evt) return;

    var idx = events.indexOf(evt);
    if (idx === -1) return;

    // Toggle: if already open, close it (set -1), else open this one
    setOpen(openIndex === idx ? -1 : idx);
  });

  // --- INITIAL STATE: open the first one ---
  setOpen(0);

  // Safety: force pointer-events on the headers (just in case CSS blocks them)
  document.querySelectorAll('.timeline__event-head').forEach(function (btn) {
    btn.style.pointerEvents = 'auto';
  });
})();

  /* ===================================================================
     7. FAQ (AWARDS) — sequential row highlight + accordion + cursor
     =================================================================== */
  (function faq() {
    var section = document.getElementById('faq');
    var cursor = document.getElementById('faqCursor');
    if (!section) return;

    var rows = Array.prototype.slice.call(section.querySelectorAll('.faq__row'));
    var bgs = rows.map(function (r) { return r.querySelector('.faq__row-bg'); });

    // Live mobile check (matchMedia .matches is always current, no resize
    // listener needed) — used by the click handler to decide whether the
    // strip should be click-driven (mobile) or left to the scroll timeline (desktop).
    var mqMobile = window.matchMedia('(max-width: 767px)');

    // gsap.matchMedia cleanly separates desktop/mobile GSAP setup and
    // automatically reverts + re-runs the matching block if the viewport
    // crosses the breakpoint (e.g. device rotation).
    var mm = gsap.matchMedia();

    mm.add('(min-width: 768px)', function () {
      // ---- DESKTOP ONLY: automatic scroll-driven spotlight cycle ----
      gsap.set(bgs, { scaleX: 0, transformOrigin: 'left center' });
      gsap.set(rows, { color: '#737373' });

      gsap.fromTo(section, { opacity: 0, filter: 'blur(14px)' }, {
        opacity: 1, filter: 'blur(0px)', ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'top center', scrub: 0.6 }
      });

      if (!prefersReduced) {
        rows.forEach(function (row, i) {
          gsap.fromTo(row, { opacity: 0, y: 20, filter: 'blur(6px)' }, {
            opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power3.out',
            scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 60%', scrub: 0.8 },
            delay: i * 0.03
          });
        });
      }

      var pinDuration = rows.length * 150;
      var enterDuration = 1.0;
      var staggerDelay = 0.6;

      var tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top top', end: '+=' + pinDuration + '%', pin: true, scrub: 1.0, anticipatePin: 1, fastScrollEnd: true, preventOverlaps: true }
      });

      var time = 0;
      var activeCount = 2;

      for (var i = 0; i < activeCount; i++) {
        tl.to(bgs[i], { scaleX: 1, duration: enterDuration, ease: 'none' }, time);
        tl.to(rows[i], { color: '#191818', duration: enterDuration, ease: 'none' }, time);
        time += staggerDelay;
      }
      time += 0.3;

      for (var j = 0; j < rows.length - activeCount; j++) {
        var rowOut = j, rowIn = j + activeCount;
        tl.to(bgs[rowOut], { scaleX: 0, transformOrigin: 'left center', duration: enterDuration, ease: 'none' }, time);
        tl.to(rows[rowOut], { color: '#737373', duration: enterDuration, ease: 'none' }, time);
        tl.to(bgs[rowIn], { scaleX: 1, transformOrigin: 'left center', duration: enterDuration, ease: 'none' }, time);
        tl.to(rows[rowIn], { color: '#191818', duration: enterDuration, ease: 'none' }, time);
        time += enterDuration;
      }
      time += 0.3;

      for (var k = rows.length - activeCount; k < rows.length; k++) {
        tl.to(bgs[k], { scaleX: 0, transformOrigin: 'left center', duration: enterDuration, ease: 'none' }, time);
        tl.to(rows[k], { color: '#737373', duration: enterDuration, ease: 'none' }, time);
        time += staggerDelay;
      }
      tl.to({}, { duration: 0.5 }, time);
    });

    mm.add('(max-width: 767px)', function () {
      // ---- MOBILE: no scroll-jacked pin, strip is click-driven instead ----
      gsap.set(bgs, { scaleX: 0, transformOrigin: 'left center' });
      gsap.set(rows, { color: '#737373', opacity: 1, y: 0, filter: 'blur(0px)' });

      // Seed whichever row starts marked is-open in the HTML with the open state.
      rows.forEach(function (row, i) {
        if (row.classList.contains('is-open')) {
          gsap.set(bgs[i], { scaleX: 1 });
          gsap.set(row, { color: '#191818' });
        }
      });
    });

    function onMove(e) {
      gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.35, ease: 'power3.out' });
    }
    window.addEventListener('mousemove', onMove);
    if (window.matchMedia('(min-width: 768px)').matches) cursor.style.display = 'block';

    rows.forEach(function (row, idx) {
      row.addEventListener('mouseenter', function () {
        gsap.to(cursor, { scale: 1, opacity: 1, duration: 0.35, ease: 'power3.out' });
      });
      row.addEventListener('mouseleave', function () {
        gsap.to(cursor, { scale: 0.4, opacity: 0, duration: 0.3, ease: 'power3.out' });
      });
      var head = row.querySelector('[data-toggle]');
      head.addEventListener('click', function () {
        var isOpen = row.classList.contains('is-open');
        var mobileNow = mqMobile.matches;

        rows.forEach(function (r, ri) {
          r.classList.remove('is-open');
          r.querySelector('.faq__icon').textContent = '+';
          if (mobileNow) {
            gsap.to(bgs[ri], { scaleX: 0, duration: 0.4, ease: 'power2.inOut', transformOrigin: 'left center' });
            gsap.to(r, { color: '#737373', duration: 0.4, ease: 'power2.inOut' });
          }
        });

        if (!isOpen) {
          row.classList.add('is-open');
          row.querySelector('.faq__icon').textContent = '—';
          if (mobileNow) {
            gsap.to(bgs[idx], { scaleX: 1, duration: 0.45, ease: 'power2.out', transformOrigin: 'left center' });
            gsap.to(row, { color: '#191818', duration: 0.4, ease: 'power2.inOut' });
          }
        }
      });
    });
  })();


  /* ===================================================================
     8. CONTACT + FOOTER — countdown and restrained reveals
     =================================================================== */
  (function contactAndFooter() {
    var contact = document.getElementById('contact');
    var footerEl = document.getElementById('siteFooter');

    var daysEls = [document.getElementById('contactDays')];
    var hoursEls = [document.getElementById('contactHours')];
    var minutesEls = [document.getElementById('contactMinutes')];

    function updateCountdown() {
      var target = new Date('2026-10-23T00:00:00+05:30').getTime();
      var diff = Math.max(0, target - Date.now());
      var totalMinutes = Math.floor(diff / 60000);
      var days = Math.floor(totalMinutes / 1440);
      var hours = Math.floor((totalMinutes % 1440) / 60);
      var minutes = totalMinutes % 60;

      daysEls.forEach(function (el) { if (el) el.textContent = String(days).padStart(2, '0'); });
      hoursEls.forEach(function (el) { if (el) el.textContent = String(hours).padStart(2, '0'); });
      minutesEls.forEach(function (el) { if (el) el.textContent = String(minutes).padStart(2, '0'); });
    }

    updateCountdown();
    window.setInterval(updateCountdown, 30000);

    if (contact) {
      gsap.context(function () {
        // Circle reveal entrance for the contact section.
       gsap.fromTo(
  contact,
  {
    clipPath: 'circle(0% at 50% 50%)'
  },
  {
    clipPath: 'circle(150% at 50% 50%)',
    ease: 'none',
    scrollTrigger: {
      trigger: contact,
      start: 'top 100%',
      end: 'top 15%',
      scrub: 2.2,
      invalidateOnRefresh: true
    }
  }
);

var content = document.getElementById('contactContent');

if (content) {
  gsap.fromTo(
    content,
    {
      opacity: 0,
      y: 50,
      scale: .97
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: contact,
        start: 'top 88%',
        end: 'top 30%',
        scrub: 1.8,
        invalidateOnRefresh: true
      }
    }
  );
}
      }, contact);
    }

    if (footerEl) {
      gsap.context(function () {
        gsap.fromTo(footerEl, { opacity: 0, y: 40 }, {
          opacity: 1, y: 0, duration: .9, ease: 'power2.out',
          scrollTrigger: { trigger: footerEl, start: 'top 90%', end: 'top 70%', scrub: 1, invalidateOnRefresh: true }
        });
      }, footerEl);
    }
  })();

})();
