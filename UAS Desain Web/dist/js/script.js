(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function initNavbarScroll() {
    const navbar = $("#navbar");
    if (!navbar) return;

    let lastScroll = 0;
    window.addEventListener(
      "scroll",
      () => {
        const currentScroll = window.pageYOffset;

        navbar.classList.toggle("navbar-scrolled", currentScroll > 50);

        if (currentScroll > lastScroll && currentScroll > 500) {
          navbar.style.transform = "translateY(-100%)";
        } else {
          navbar.style.transform = "translateY(0)";
        }
        lastScroll = currentScroll;
      },
      { passive: true },
    );
  }

  function initMobileMenu() {
    const btn = $("#mobile-menu-btn");
    const menu = $("#mobile-menu");
    const closeBtn = $("#close-menu");
    if (!btn || !menu) return;

    const open = () => {
      menu.classList.remove("opacity-0", "pointer-events-none");
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      menu.classList.add("opacity-0", "pointer-events-none");
      document.body.style.overflow = "";
    };

    btn.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    $$("a", menu).forEach((a) => a.addEventListener("click", close));
  }

  function initMouseGlow() {
    const mouseGlow = $("#mouse-glow");
    if (!mouseGlow || window.innerWidth < 1024) return;

    let mouseX = 0,
      mouseY = 0,
      currentX = 0,
      currentY = 0;

    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animateGlow() {
      currentX += (mouseX - currentX) * 0.1;
      currentY += (mouseY - currentY) * 0.1;
      mouseGlow.style.left = `${currentX - 192}px`;
      mouseGlow.style.top = `${currentY - 192}px`;
      requestAnimationFrame(animateGlow);
    }
    animateGlow();
  }

  function initHeroAndFloatingItems() {
    const heroHeading = $("#heroHeading");
    const zone = $("#floatZone");
    const items = $$(".float-item");
    if (
      !heroHeading ||
      !zone ||
      items.length === 0 ||
      typeof gsap === "undefined"
    )
      return;

    function splitHeadingToLetters(headingEl) {
      const nodes = Array.from(headingEl.childNodes);
      headingEl.innerHTML = "";

      nodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent.split("").forEach((ch) => {
            if (ch === " ") {
              headingEl.appendChild(document.createTextNode(" "));
            } else {
              const span = document.createElement("span");
              span.className = "hero-letter";
              span.textContent = ch;
              headingEl.appendChild(span);
            }
          });
        } else if (node.nodeName === "BR") {
          headingEl.appendChild(document.createElement("br"));
        } else {
          headingEl.appendChild(node);
        }
      });
    }

    splitHeadingToLetters(heroHeading);
    const heroLetters = heroHeading.querySelectorAll(".hero-letter");

    let rafId = null;
    const revealedSet = new Set();

    const itemOriginals = items.map((item) => ({
      leftPct: parseFloat(item.style.left) / 100,
      topPct: parseFloat(item.style.top) / 100,
    }));

    function checkOverlaps() {
      rafId = null;

      const itemRects = items.map((el) => el.getBoundingClientRect());
      const newRevealed = new Set();

      heroLetters.forEach((span, i) => {
        const lr = span.getBoundingClientRect();
        if (lr.width === 0) return;

        for (const ir of itemRects) {
          if (
            lr.left < ir.right &&
            lr.right > ir.left &&
            lr.top < ir.bottom &&
            lr.bottom > ir.top
          ) {
            newRevealed.add(i);
            break;
          }
        }
      });

      newRevealed.forEach((i) => {
        if (!revealedSet.has(i)) heroLetters[i].classList.add("is-revealed");
      });
      revealedSet.forEach((i) => {
        if (!newRevealed.has(i)) heroLetters[i].classList.remove("is-revealed");
      });

      revealedSet.clear();
      newRevealed.forEach((i) => revealedSet.add(i));
    }

    function scheduleCheck() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(checkOverlaps);
    }

    function resetToOriginalPositions() {
      const zoneRect = zone.getBoundingClientRect();
      items.forEach((item, i) => {
        const orig = itemOriginals[i];
        gsap.set(item, { y: 0, x: 0 });
        item.style.left = orig.leftPct * zoneRect.width + "px";
        item.style.top = orig.topPct * zoneRect.height + "px";
      });
      scheduleCheck();
    }

    let topZ = 10;

    items.forEach((item, i) => {
      const floatTween = gsap.to(item, {
        y: "+=16",
        duration: 2.4 + i * 0.35,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: i * 0.35,
        onUpdate: scheduleCheck,
      });

      gsap.to(item, {
        rotation: i % 2 === 0 ? 3.5 : -3.5,
        duration: 3.2 + i * 0.25,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      function getPointer(e) {
        if (e.touches && e.touches.length)
          return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
      }

      function onDown(e) {
        e.preventDefault();
        isDragging = true;
        item.classList.add("dragging");
        topZ += 1;
        item.style.zIndex = topZ;

        const pointer = getPointer(e);
        startX = pointer.x;
        startY = pointer.y;

        const rect = item.getBoundingClientRect();
        const zoneRect = zone.getBoundingClientRect();
        const gsapY = parseFloat(gsap.getProperty(item, "y")) || 0;
        const gsapX = parseFloat(gsap.getProperty(item, "x")) || 0;
        initialLeft = rect.left - zoneRect.left - gsapX;
        initialTop = rect.top - zoneRect.top - gsapY;

        floatTween.pause();
        gsap.to(item, { scale: 1.07, duration: 0.18 });

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        document.addEventListener("touchmove", onMove, { passive: false });
        document.addEventListener("touchend", onUp);
      }

      function onMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const pointer = getPointer(e);
        const dx = pointer.x - startX;
        const dy = pointer.y - startY;

        const zoneRect = zone.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        let newLeft = Math.max(
          0,
          Math.min(initialLeft + dx, zoneRect.width - itemRect.width),
        );
        let newTop = Math.max(
          0,
          Math.min(initialTop + dy, zoneRect.height - itemRect.height),
        );

        item.style.left = newLeft + "px";
        item.style.top = newTop + "px";

        scheduleCheck();
      }

      function onUp() {
        isDragging = false;
        item.classList.remove("dragging");
        gsap.to(item, { scale: 1, duration: 0.25 });
        floatTween.resume();
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onUp);

        scheduleCheck();
      }

      item.addEventListener("mousedown", onDown);
      item.addEventListener("touchstart", onDown, { passive: false });

      const img = item.querySelector("img");
      if (img) {
        img.addEventListener("mousedown", (e) => e.preventDefault());
        img.addEventListener("touchstart", (e) => e.preventDefault(), {
          passive: false,
        });
      }
    });

    let resizeRaf = null;
    window.addEventListener("resize", () => {
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        resetToOriginalPositions();
      });
    });

    requestAnimationFrame(() => {
      checkOverlaps();
      setTimeout(scheduleCheck, 100);
    });
  }

  function initSideCakes() {
    if (typeof gsap === "undefined") return;

    const leftCakes = [
      $(".side-cake-left-1"),
      $(".side-cake-left-2"),
      $(".side-cake-left-3"),
    ];
    const rightCakes = [
      $(".side-cake-right-1"),
      $(".side-cake-right-2"),
      $(".side-cake-right-3"),
    ];
    if (![...leftCakes, ...rightCakes].some(Boolean)) return;

    function getSideCakeSize() {
      return Math.min(64, Math.max(38, window.innerWidth * 0.055));
    }
    function getGap() {
      return getSideCakeSize() * 1.15;
    }
    function getHalfSectionDistance() {
      const section = $("#home");
      if (!section) return window.innerHeight * 0.5;
      const rect = section.getBoundingClientRect();
      const midPoint = rect.top + rect.height / 2;
      return rect.bottom - midPoint;
    }

    const BASE_LIFT = 28;

    function getTargetPositions() {
      const cakeSize = getSideCakeSize();
      const gap = getGap();
      const halfDistance = getHalfSectionDistance();
      const step = cakeSize + gap;
      const top = -(halfDistance - cakeSize);
      return [
        top + step * 2 - BASE_LIFT,
        top + step - BASE_LIFT,
        top - BASE_LIFT,
      ];
    }

    const SCALE_STEPS = [1, 0.8, 0.6];

    function getSpreadX(side, index) {
      const base = [6, 26, 16][index];
      const jitter = gsap.utils.random(-6, 6);
      return side * (base + jitter);
    }

    const RISE_DUR = 0.55;
    const RISE_PAUSE = 0.18;
    const WOBBLE_DUR = 0.22;
    const HOLD_DUR = 2.5;
    const FALL_DUR = 0.45;
    const FALL_PAUSE = 0.15;
    const SIDE_OFFSET = 0.25;
    const EASE_RISE = "back.out(1.7)";
    const EASE_FALL = "back.in(1.4)";

    function buildRiseTimeline(cakes, clampedY, rotRange, sideSign) {
      const tl = gsap.timeline();
      cakes.forEach((cake, i) => {
        if (!cake) return;
        const startAt = i * (RISE_DUR + RISE_PAUSE);
        const targetScale = SCALE_STEPS[i];
        const targetX = getSpreadX(sideSign, i);

        tl.set(
          cake,
          { y: 0, x: 0, opacity: 0, rotation: 0, scale: 1 },
          startAt - 0.001,
        )
          .to(
            cake,
            {
              y: clampedY[i],
              x: targetX,
              scale: targetScale,
              opacity: 0.9,
              rotation: gsap.utils.random(rotRange[0], rotRange[1]),
              duration: RISE_DUR,
              ease: EASE_RISE,
            },
            startAt,
          )
          .to(
            cake,
            {
              y: `+=-8`,
              duration: WOBBLE_DUR,
              ease: "sine.inOut",
              yoyo: true,
              repeat: 1,
            },
            startAt + RISE_DUR + 0.08,
          );
      });
      return tl;
    }

    function buildFallTimeline(cakes) {
      const tl = gsap.timeline();
      const order = [2, 1, 0];
      order.forEach((i, seq) => {
        const cake = cakes[i];
        if (!cake) return;
        const startAt = seq * (FALL_DUR + FALL_PAUSE);
        tl.to(
          cake,
          {
            y: 0,
            x: 0,
            scale: 1,
            opacity: 0,
            rotation: 0,
            duration: FALL_DUR,
            ease: EASE_FALL,
          },
          startAt,
        );
      });
      return tl;
    }

    function timelineDuration(cakeCount, dur, pause, extra = 0) {
      return (cakeCount - 1) * (dur + pause) + dur + extra;
    }

    let sideCycleTimeline = null;

    function runSideCycle() {
      const clampedY = getTargetPositions();
      const master = gsap.timeline({ onComplete: runSideCycle });
      sideCycleTimeline = master;

      const riseLeft = buildRiseTimeline(leftCakes, clampedY, [8, 18], 1);
      const riseRight = buildRiseTimeline(rightCakes, clampedY, [-18, -8], -1);

      master.add(riseLeft, 0);
      master.add(riseRight, SIDE_OFFSET);

      const riseLeftTotal = timelineDuration(
        3,
        RISE_DUR,
        RISE_PAUSE,
        WOBBLE_DUR,
      );
      const riseRightTotal = SIDE_OFFSET + riseLeftTotal;
      const allRiseDone = Math.max(riseLeftTotal, riseRightTotal);
      const fallStart = allRiseDone + HOLD_DUR;

      const fallLeft = buildFallTimeline(leftCakes);
      const fallRight = buildFallTimeline(rightCakes);

      master.add(fallLeft, fallStart);
      master.add(fallRight, fallStart + SIDE_OFFSET);
    }

    gsap.delayedCall(0.4, runSideCycle);

    let sideResizeRaf = null;
    window.addEventListener("resize", () => {
      if (sideResizeRaf !== null) cancelAnimationFrame(sideResizeRaf);
      sideResizeRaf = requestAnimationFrame(() => {
        sideResizeRaf = null;
        if (sideCycleTimeline) {
          sideCycleTimeline.kill();
          runSideCycle();
        }
      });
    });
  }

  function initFAQ() {
    const faqItems = $$(".faq-item");
    if (faqItems.length === 0) return;

    faqItems.forEach((item) => {
      const toggle = item.querySelector(".faq-toggle");
      const content = item.querySelector(".faq-content");
      const icon = item.querySelector(".faq-icon");
      if (!toggle || !content) return;

      toggle.addEventListener("click", () => {
        faqItems.forEach((otherItem) => {
          if (otherItem !== item) {
            otherItem.querySelector(".faq-content")?.classList.add("hidden");
            otherItem.querySelector(".faq-icon")?.classList.remove("rotated");
          }
        });
        content.classList.toggle("hidden");
        icon?.classList.toggle("rotated");
      });
    });
  }

  function initMenuRecommendation() {
    const moodGrid = $("#mood-grid");
    const tasteGrid = $("#taste-grid");
    if (!moodGrid || !tasteGrid) return;

    const MOOD_ICONS = {
      bahagia:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><circle cx="12" cy="12" r="9"/><path d="M8.5 10.5h.01M15.5 10.5h.01"/><path d="M8 14.5c1.2 1.3 2.6 2 4 2s2.8-.7 4-2"/></svg>',
      cinta:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M12 20s-7-4.35-9.5-8.5C.8 8.2 2.2 4.8 5.6 4.2c2-.35 3.8.6 4.9 2.3.4.6.6.9 1.5 2.2.9-1.3 1.1-1.6 1.5-2.2 1.1-1.7 2.9-2.65 4.9-2.3 3.4.6 4.8 4 3.1 7.3C19 15.65 12 20 12 20z"/></svg>',
      comfort:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>',
      rayakan:
        '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="w-full h-full"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z"/></svg>',
      nugas:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><rect x="4" y="5" width="16" height="10" rx="1.2"/><path d="M2 19h20"/></svg>',
      nongkrong:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8" r="2.5"/><path d="M15.5 14.2c2.6.4 4.5 2.6 4.5 5.3"/></svg>',
      hujan:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M7 16a4 4 0 0 1 .3-8A5.5 5.5 0 0 1 18 9.5 3.5 3.5 0 0 1 17.5 16H7z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/></svg>',
      panas:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8"/></svg>',
      santai:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z"/><path d="M5 19c3-4 6-7 11-11"/></svg>',
      lapar:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11M6 3v4M10 3v4"/><path d="M17 3c-1.5 0-3 1.5-3 4s1 4 1 4v10"/></svg>',
      manis:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><circle cx="12" cy="8" r="5"/><path d="M12 13v8"/></svg>',
      segar:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg>',
    };

    const TASTE_ICONS = {
      cokelat:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M9 6v12M15 6v12M3 12h18"/></svg>',
      buah: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><circle cx="8" cy="17" r="3.2"/><circle cx="15" cy="17" r="3.2"/><path d="M8 13.8V6c0-1.5 1.2-3 3-3.5M15 13.8V9c0-1.2.8-2.2 2-2.6"/></svg>',
      creamy:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M9 2h6l1 4-1.5 2v9a3.5 3.5 0 0 1-7 0V8L6 4l1-2z"/><path d="M8.5 4h7"/></svg>',
      keju: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M3 17l9-11 9 11H3z"/><circle cx="10" cy="14" r=".8" fill="currentColor" stroke="none"/><circle cx="14" cy="15.5" r=".8" fill="currentColor" stroke="none"/><circle cx="16.5" cy="12.5" r=".6" fill="currentColor" stroke="none"/></svg>',
      gurih:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M9 4c0 1-1 1-1 2s1 1 1 2M14 4c0 1-1 1-1 2s1 1 1 2"/></svg>',
      segar:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/></svg>',
      crunchy:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><circle cx="9" cy="9" r=".6" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r=".6" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r=".6" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r=".6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r=".6" fill="currentColor" stroke="none"/></svg>',
      lembut:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M7 17a4 4 0 0 1 .3-8A5.5 5.5 0 0 1 18 9.5 3.5 3.5 0 0 1 17.5 17H7z"/></svg>',
      pedas:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M4 9c2-1.5 4-1 5 .5 3-2 7 .5 7 5 0 4-3 7-6.5 7C6 21.5 3 18 3 14c0-2 .5-3.5 1-5z"/><path d="M9 3c1 .5 1.5 1.5 1 3"/></svg>',
    };
    TASTE_ICONS.manis =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10z"/><path d="M9.5 13.5c0 1.4 1.1 2.5 2.5 2.5"/></svg>';

    const moods = [
      { id: "bahagia", name: "Lagi Bahagia", desc: "Hari penuh semangat" },
      {
        id: "cinta",
        name: "Lagi Jatuh Cinta",
        desc: "Perasaan hangat & manis",
      },
      {
        id: "comfort",
        name: "Butuh Comfort Food",
        desc: "Mau yang menenangkan",
      },
      { id: "rayakan", name: "Lagi Merayakan", desc: "Momen spesial tiba" },
      { id: "nugas", name: "Lagi Nugas / Kerja", desc: "Butuh teman fokus" },
      {
        id: "nongkrong",
        name: "Nongkrong Bareng Teman",
        desc: "Seru bareng orang tersayang",
      },
      { id: "hujan", name: "Hujan-Hujan", desc: "Cuaca dingin tiba" },
      { id: "panas", name: "Cuaca Panas", desc: "Butuh yang menyegarkan" },
      { id: "santai", name: "Ingin Santai", desc: "Me time yang tenang" },
      { id: "lapar", name: "Lagi Lapar Banget", desc: "Perut keroncongan" },
      { id: "manis", name: "Lagi Pengen Manis", desc: "Cravings rasa manis" },
      {
        id: "segar",
        name: "Lagi Pengen yang Segar",
        desc: "Mau sensasi dingin",
      },
    ];

    const tastes = [
      { id: "cokelat", name: "Cokelat" },
      { id: "buah", name: "Buah" },
      { id: "creamy", name: "Creamy" },
      { id: "keju", name: "Keju" },
      { id: "gurih", name: "Gurih" },
      { id: "segar", name: "Segar" },
      { id: "crunchy", name: "Crunchy" },
      { id: "lembut", name: "Lembut" },
      { id: "manis", name: "Manis" },
      { id: "pedas", name: "Pedas" },
    ];

    const products = [
      {
        id: 1,
        name: "Mochi Coklat",
        category: "Mochi",
        categorySlug: "mochi",
        price: "15.000",
        img: "dist/img/menu/mochi/mochi-coklat.png",
        desc: "Kulit mochi kenyal dengan isian cokelat Belgia yang lumer dan manis di setiap gigitan.",
        tasteProfile: ["Cokelat", "Manis", "Lembut"],
        bestWith: "Kopi hangat atau susu cokelat dingin",
        moods: ["nugas", "comfort", "manis", "hujan", "lapar"],
        tastes: ["cokelat", "creamy", "manis", "lembut"],
      },
      {
        id: 2,
        name: "Mochi Durian",
        category: "Mochi",
        categorySlug: "mochi",
        price: "18.000",
        img: "dist/img/menu/mochi/mochi-durian.png",
        desc: "Isian durian asli yang creamy dan harum, favorit pencinta durian sejati.",
        tasteProfile: ["Creamy", "Manis", "Lembut"],
        bestWith: "Teh tawar hangat",
        moods: ["santai", "comfort", "nongkrong"],
        tastes: ["creamy", "manis", "lembut"],
      },
      {
        id: 3,
        name: "Mochi Kunafa",
        category: "Mochi",
        categorySlug: "mochi",
        price: "22.000",
        img: "dist/img/menu/mochi/mochi-kunafa.png",
        desc: "Perpaduan unik kunafa renyah khas Timur Tengah dengan cokelat lumer di dalamnya.",
        tasteProfile: ["Cokelat", "Crunchy", "Manis"],
        bestWith: "Kopi susu atau teh Arab",
        moods: ["rayakan", "nongkrong", "lapar"],
        tastes: ["cokelat", "crunchy", "manis"],
      },
      {
        id: 4,
        name: "Mochi Lemon",
        category: "Mochi",
        categorySlug: "mochi",
        price: "15.000",
        img: "dist/img/menu/mochi/mochi-lemon.png",
        desc: "Sensasi asam manis lemon segar yang menyegarkan mulut setiap kali digigit.",
        tasteProfile: ["Segar", "Manis", "Asam"],
        bestWith: "Es teh atau infused water",
        moods: ["panas", "segar", "bahagia"],
        tastes: ["segar", "buah", "manis"],
      },
      {
        id: 5,
        name: "Mochi Blueberi",
        category: "Mochi",
        categorySlug: "mochi",
        price: "16.000",
        img: "dist/img/menu/mochi/mochi-blueberry.png",
        desc: "Selai blueberi manis dengan sedikit asam segar yang bikin nagih.",
        tasteProfile: ["Buah", "Manis", "Segar"],
        bestWith: "Jus buah dingin",
        moods: ["bahagia", "manis", "santai", "panas"],
        tastes: ["buah", "manis", "segar"],
      },
      {
        id: 6,
        name: "Mochi Oreo",
        category: "Mochi",
        categorySlug: "mochi",
        price: "16.000",
        img: "dist/img/menu/mochi/mochi-oreo.png",
        desc: "Cookies & cream dengan remah Oreo renyah yang bikin ketagihan.",
        tasteProfile: ["Cokelat", "Crunchy", "Creamy"],
        bestWith: "Susu dingin atau milkshake",
        moods: ["comfort", "manis", "lapar", "nongkrong"],
        tastes: ["cokelat", "crunchy", "creamy", "manis"],
      },
      {
        id: 7,
        name: "Mochi Stroberi",
        category: "Mochi",
        categorySlug: "mochi",
        price: "15.000",
        img: "dist/img/menu/mochi/mochi-strawberry.png",
        desc: "Stroberi segar dengan rasa manis asam yang seimbang dan menyegarkan.",
        tasteProfile: ["Buah", "Manis", "Segar"],
        bestWith: "Teh dingin atau infused water",
        moods: ["cinta", "bahagia", "rayakan", "panas"],
        tastes: ["buah", "manis", "segar"],
      },
      {
        id: 8,
        name: "Mochi Taro",
        category: "Mochi",
        categorySlug: "mochi",
        price: "15.000",
        img: "dist/img/menu/mochi/mochi-taro.png",
        desc: "Talas ungu lembut dengan rasa manis khas yang menenangkan.",
        tasteProfile: ["Lembut", "Manis", "Creamy"],
        bestWith: "Susu hangat",
        moods: ["santai", "comfort", "manis"],
        tastes: ["manis", "lembut", "creamy"],
      },
      {
        id: 9,
        name: "Mochi Matcha",
        category: "Mochi",
        categorySlug: "mochi",
        price: "17.000",
        img: "dist/img/menu/mochi/mochi-matcha.png",
        desc: "Matcha Jepang premium, sedikit pahit dan lembut wangi yang menenangkan.",
        tasteProfile: ["Lembut", "Creamy", "Segar"],
        bestWith: "Teh hijau atau latte hangat",
        moods: ["hujan", "santai", "comfort", "nugas"],
        tastes: ["creamy", "lembut", "segar"],
      },
      {
        id: 10,
        name: "Slice Blueberi",
        category: "Slice Cake",
        categorySlug: "slice-cake",
        price: "25.000",
        img: "dist/img/menu/slice/slice-bluberi.png",
        desc: "Cake lembut dengan lapisan blueberi segar yang manis dan sedikit asam.",
        tasteProfile: ["Buah", "Creamy", "Segar"],
        bestWith: "Teh earl grey",
        moods: ["bahagia", "panas", "santai", "rayakan"],
        tastes: ["buah", "creamy", "segar", "manis"],
      },
      {
        id: 11,
        name: "Slice Coklat",
        category: "Slice Cake",
        categorySlug: "slice-cake",
        price: "25.000",
        img: "dist/img/menu/slice/slice-coklat.png",
        desc: "Cake cokelat lembut berlapis ganache, pas untuk cuaca dingin.",
        tasteProfile: ["Cokelat", "Manis", "Lembut"],
        bestWith: "Kopi hitam atau cokelat panas",
        moods: ["hujan", "comfort", "manis", "lapar", "nugas"],
        tastes: ["cokelat", "manis", "lembut", "creamy"],
      },
      {
        id: 12,
        name: "Slice Stroberi",
        category: "Slice Cake",
        categorySlug: "slice-cake",
        price: "25.000",
        img: "dist/img/menu/slice/slice-stroberi.png",
        desc: "Cake lembut dengan lapisan stroberi segar, manis dan menyegarkan.",
        tasteProfile: ["Buah", "Creamy", "Manis"],
        bestWith: "Teh dingin atau infused water",
        moods: ["bahagia", "cinta", "rayakan", "panas"],
        tastes: ["buah", "creamy", "manis", "segar"],
      },
      {
        id: 13,
        name: "Slice Red Velvet",
        category: "Slice Cake",
        categorySlug: "slice-cake",
        price: "27.000",
        img: "dist/img/menu/slice/slice-velvet.png",
        desc: "Red velvet lembut dengan cream cheese yang creamy, elegan untuk momen spesial.",
        tasteProfile: ["Keju", "Creamy", "Lembut"],
        bestWith: "Kopi latte",
        moods: ["rayakan", "cinta", "santai"],
        tastes: ["keju", "creamy", "manis", "lembut"],
      },
      {
        id: 14,
        name: "Dimsum Keju",
        category: "Dimsum Mentai",
        categorySlug: "dimsum-mentai",
        price: "20.000",
        img: "dist/img/menu/dimsum/dimsum-keju.png",
        desc: "Dimsum lumer dengan saus keju gurih yang creamy, cukup mengenyangkan.",
        tasteProfile: ["Keju", "Gurih", "Creamy"],
        bestWith: "Teh hangat",
        moods: ["lapar", "nugas", "nongkrong"],
        tastes: ["keju", "gurih", "creamy"],
      },
      {
        id: 15,
        name: "Dimsum Original",
        category: "Dimsum Mentai",
        categorySlug: "dimsum-mentai",
        price: "18.000",
        img: "dist/img/menu/dimsum/dimsum-original.png",
        desc: "Dimsum klasik dengan saus mentai gurih, cocok untuk menemani fokus kerja.",
        tasteProfile: ["Gurih", "Creamy"],
        bestWith: "Jus buah segar",
        moods: ["lapar", "nugas", "nongkrong"],
        tastes: ["gurih", "creamy"],
      },
      {
        id: 16,
        name: "Dimsum Seaweed",
        category: "Dimsum Mentai",
        categorySlug: "dimsum-mentai",
        price: "19.000",
        img: "dist/img/menu/dimsum/dimsum-seawed.png",
        desc: "Taburan nori renyah dengan saus mentai gurih yang menambah sensasi tekstur.",
        tasteProfile: ["Gurih", "Crunchy"],
        bestWith: "Es teh manis",
        moods: ["nugas", "lapar", "nongkrong"],
        tastes: ["gurih", "crunchy", "creamy"],
      },
      {
        id: 17,
        name: "Dimsum Spicy",
        category: "Dimsum Mentai",
        categorySlug: "dimsum-mentai",
        price: "20.000",
        img: "dist/img/menu/dimsum/dimsum-spicy.png",
        desc: "Dimsum dengan sentuhan pedas sambal mentai yang menggugah selera.",
        tasteProfile: ["Gurih", "Pedas", "Crunchy"],
        bestWith: "Es teh manis atau jus jeruk",
        moods: ["lapar", "nongkrong", "rayakan"],
        tastes: ["gurih", "pedas", "crunchy"],
      },
      {
        id: 18,
        name: "Dessert Coklat",
        category: "Dessert",
        categorySlug: "dessert",
        price: "20.000",
        img: "dist/img/menu/dessert/dessert-coklat.png",
        desc: "Brownie cokelat lumer premium, comfort food yang pas saat hari melelahkan.",
        tasteProfile: ["Cokelat", "Manis", "Lembut"],
        bestWith: "Kopi hitam atau susu cokelat",
        moods: ["comfort", "hujan", "manis", "lapar"],
        tastes: ["cokelat", "manis", "lembut"],
      },
      {
        id: 19,
        name: "Dessert Oreo",
        category: "Dessert",
        categorySlug: "dessert",
        price: "22.000",
        img: "dist/img/menu/dessert/dessert-oreo.png",
        desc: "Dessert box Oreo berlapis cream lembut, pas untuk berbagi bersama teman.",
        tasteProfile: ["Cokelat", "Creamy", "Crunchy"],
        bestWith: "Susu dingin",
        moods: ["nongkrong", "comfort", "manis", "lapar"],
        tastes: ["cokelat", "creamy", "manis", "crunchy"],
      },
      {
        id: 20,
        name: "Dessert Stroberi",
        category: "Dessert",
        categorySlug: "dessert",
        price: "22.000",
        img: "dist/img/menu/dessert/dessert-stoberi.png",
        desc: "Dessert box stroberi segar dan lembut, ringan dan menyegarkan.",
        tasteProfile: ["Buah", "Creamy", "Segar"],
        bestWith: "Air es atau infused water",
        moods: ["bahagia", "cinta", "panas", "santai"],
        tastes: ["buah", "creamy", "segar", "manis"],
      },
      {
        id: 21,
        name: "Dessert Tiramisu",
        category: "Dessert",
        categorySlug: "dessert",
        price: "25.000",
        img: "dist/img/menu/dessert/dessert-tiramisu.png",
        desc: "Tiramisu lembut dengan aroma kopi khas Italia, teman terbaik saat fokus.",
        tasteProfile: ["Creamy", "Lembut"],
        bestWith: "Espresso atau cappuccino",
        moods: ["nugas", "santai", "comfort"],
        tastes: ["creamy", "lembut", "manis"],
      },
    ];

    let selectedMood = null;
    let selectedTaste = null;

    const MOOD_CARD_BASE =
      "relative bg-putih-tulang/70 backdrop-blur-md border border-putih-tulang/90 rounded-[2rem] px-7 py-5 text-center cursor-pointer overflow-hidden transition-all duration-300 ease-out shadow-card hover:-translate-y-2 hover:scale-[1.02] hover:shadow-card-hover hover:border-secondary/40";
    const MOOD_CARD_SELECTED =
      "bg-linear-to-br from-primary/90 to-secondary/70 border-secondary shadow-card-hover ring-2 ring-secondary/30 -translate-y-1 scale-[1.02]";

    const TASTE_CARD_BASE =
      "relative bg-putih-tulang/70 backdrop-blur-md border border-putih-tulang/90 rounded-2xl px-3 py-5 text-center cursor-pointer overflow-hidden transition-all duration-300 ease-out shadow-[0_6px_20px_-8px_rgba(90,62,54,0.08)] hover:-translate-y-1.5 hover:scale-105 hover:shadow-card-gold hover:border-gold/40";
    const TASTE_CARD_SELECTED =
      "bg-linear-to-br from-gold/20 to-primary/15 border-gold shadow-card-gold ring-2 ring-gold/30";

    function renderMoods() {
      moodGrid.innerHTML = moods
        .map(
          (m) => `
        <button type="button" class="${MOOD_CARD_BASE}" data-mood="${m.id}" aria-label="Pilih mood ${m.name}">
          <span class="w-11 h-11 mx-auto mb-3 flex items-center justify-center text-cokelat transition-transform duration-300 ease-out">${MOOD_ICONS[m.id]}</span>
          <h3 class="font-semibold text-cokelat text-sm sm:text-base mb-1">${m.name}</h3>
          <p class="text-cokelat/50 text-xs leading-snug">${m.desc}</p>
        </button>
      `,
        )
        .join("");

      $$("[data-mood]", moodGrid).forEach((card) => {
        card.addEventListener("click", () => {
          $$("[data-mood]", moodGrid).forEach((c) => {
            c.className = MOOD_CARD_BASE;
          });
          card.className = `${MOOD_CARD_BASE} ${MOOD_CARD_SELECTED}`;
          selectedMood = card.dataset.mood;
          updateRecButton();
        });
      });
    }

    function renderTastes() {
      tasteGrid.innerHTML = tastes
        .map(
          (t) => `
        <button type="button" class="${TASTE_CARD_BASE}" data-taste="${t.id}" aria-label="Pilih selera ${t.name}">
          <span class="w-7 h-7 mx-auto mb-2 flex items-center justify-center text-gold transition-transform duration-300 ease-out">${TASTE_ICONS[t.id]}</span>
          <span class="text-cokelat text-xs sm:text-sm font-medium block">${t.name}</span>
        </button>
      `,
        )
        .join("");

      $$("[data-taste]", tasteGrid).forEach((card) => {
        card.addEventListener("click", () => {
          $$("[data-taste]", tasteGrid).forEach((c) => {
            c.className = TASTE_CARD_BASE;
          });
          card.className = `${TASTE_CARD_BASE} ${TASTE_CARD_SELECTED}`;
          selectedTaste = card.dataset.taste;
          updateRecButton();
        });
      });
    }

    function updateRecButton() {
      const btn = $("#get-recommendation");
      const text = $("#rec-btn-text");
      if (!btn || !text) return;

      if (selectedMood && selectedTaste) {
        btn.disabled = false;
        text.textContent = "Lihat Rekomendasi";
        btn.classList.add("animate-soft-pulse");
      } else if (selectedMood) {
        btn.disabled = true;
        text.textContent = "Pilih selera favoritmu juga";
        btn.classList.remove("animate-soft-pulse");
      } else if (selectedTaste) {
        btn.disabled = true;
        text.textContent = "Pilih suasana hatimu juga";
        btn.classList.remove("animate-soft-pulse");
      } else {
        btn.disabled = true;
        text.textContent = "Pilih mood & selera dulu yuk";
        btn.classList.remove("animate-soft-pulse");
      }
    }

    function getRecommendations(moodId, tasteId) {
      const scored = products.map((p) => {
        let score = 0;
        if (p.moods.includes(moodId)) score += 3;
        if (p.tastes.includes(tasteId)) score += 2;
        if (p.moods.includes(moodId) && p.tastes.includes(tasteId)) score += 1;
        score += Math.random() * 0.5;
        return { product: p, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 3).map((s) => s.product);
    }

    function buildReason(product, moodId, tasteId) {
      const mood = moods.find((m) => m.id === moodId);
      const taste = tastes.find((t) => t.id === tasteId);
      const parts = [];

      if (product.moods.includes(moodId)) {
        parts.push(
          `Sesuai dengan suasana hatimu yang ${mood.name.toLowerCase()}`,
        );
      }
      if (product.tastes.includes(tasteId)) {
        parts.push(`memiliki rasa ${taste.name.toLowerCase()} yang kamu cari`);
      }
      if (parts.length === 0) {
        parts.push("merupakan pilihan yang menarik untuk dicoba hari ini");
      }

      return parts.join(", ") + ".";
    }

    function getMoodExplanation(moodId, tasteId, mood, taste) {
      const explanations = {
        bahagia:
          "Menu dengan rasa buah yang segar dan tekstur lembut sangat cocok menemani suasana hati yang sedang ceria. Perpaduan rasa manis dan sedikit asam memberikan sensasi yang menyenangkan di setiap gigitan.",
        cinta:
          "Hari yang penuh cinta pantas disempurnakan dengan dessert yang manis dan elegan. Tekstur lembut dengan rasa yang pas akan membuat momen ini terasa semakin spesial dan berkesan.",
        comfort:
          "Saat butuh kenyamanan, dessert dengan tekstur lembut dan rasa hangat menjadi pelukan terbaik. Manis yang pas membantu menenangkan pikiran dan memberikan kehangatan di setiap suapan.",
        rayakan:
          "Momen perayaan butuh sesuatu yang istimewa! Menu pilihan kami hadir dengan presentasi premium dan rasa yang menggugah selera, sempurna untuk merayakan kebahagiaanmu hari ini.",
        nugas:
          "Saat fokus belajar atau bekerja, menu yang gurih dan cukup mengenyangkan menjadi teman terbaik. Rasa yang pas menjaga mood tetap stabil sepanjang aktivitasmu.",
        nongkrong:
          "Nongkrong bareng teman lebih seru dengan menu yang bisa dibagi! Pilihan kami hadir dalam porsi yang pas untuk berbagi kebahagiaan bersama orang-orang tersayang.",
        hujan:
          "Saat hujan turun, dessert hangat dan manis menjadi pelengkap sempurna. Rasa cokelat atau matcha yang menenangkan membuat suasana dingin terasa semakin nyaman.",
        panas:
          "Cuaca panas butuh sesuatu yang menyegarkan! Menu dengan rasa buah segar dan sensasi dingin akan membantu mendinginkan harimu dengan cara paling lezat.",
        santai:
          "Me time yang tenang paling pas dengan dessert yang tidak terlalu manis. Rasa yang seimbang dan tekstur lembut menemani momen relaksasi tanpa mengganggu ketenanganmu.",
        lapar:
          "Saat lapar melanda, menu dengan porsi cukup dan rasa yang memuaskan adalah jawabannya. Gurih, creamy, dan mengenyangkan untuk mengembalikan energimu.",
        manis:
          "Cravings rasa manis pantas dipenuhi dengan dessert premium kami. Manis yang pas, tidak berlebihan, dengan tekstur yang membuat ketagihan.",
        segar:
          "Sensasi segar adalah yang kamu cari! Menu dengan rasa buah dan kesegaran citrus akan memberikan sensasi dingin yang menyegarkan setiap gigitan.",
      };

      let text =
        explanations[moodId] ||
        "Menu pilihan kami dirancang khusus untuk menemani suasana hatimu hari ini.";

      text += ` Dipilih berdasarkan selera ${taste.name.toLowerCase()} yang kamu inginkan, kombinasi ini akan memberikan pengalaman menikmati dessert yang sempurna.`;

      return text;
    }

    function showToast(message) {
      let toast = $("#toast-dynamic");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-dynamic";
        toast.className =
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] opacity-0 pointer-events-none translate-y-4 transition-all duration-300";
        toast.innerHTML = `
          <div class="bg-putih-tulang/60 backdrop-blur-xl border border-putih-tulang/80 rounded-full px-6 py-4 flex items-center gap-3 shadow-soft-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-secondary"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>
            <span class="text-cokelat font-medium text-sm" id="toast-dynamic-msg"></span>
          </div>
        `;
        document.body.appendChild(toast);
      }
      $("#toast-dynamic-msg").textContent = message;
      toast.classList.remove(
        "opacity-0",
        "pointer-events-none",
        "translate-y-4",
      );
      toast.classList.add("opacity-100", "translate-y-0");
      setTimeout(() => {
        toast.classList.add(
          "opacity-0",
          "pointer-events-none",
          "translate-y-4",
        );
        toast.classList.remove("opacity-100", "translate-y-0");
      }, 3000);
    }

    function showRecommendations() {
      if (!selectedMood || !selectedTaste) return;

      const recs = getRecommendations(selectedMood, selectedTaste);
      const mood = moods.find((m) => m.id === selectedMood);
      const taste = tastes.find((t) => t.id === selectedTaste);

      const recEmpty = $("#rec-empty");
      const recResults = $("#rec-results");
      const recCards = $("#rec-cards");
      const recIntro = $("#rec-intro");
      const mengapaSection = $("#mengapa-cocok");
      const mengapaContent = $("#mengapa-content");

      if (recEmpty) recEmpty.classList.add("hidden");
      if (recResults) recResults.classList.remove("hidden");

      if (recIntro) {
        recIntro.innerHTML = `Kamu lagi <span class="font-semibold text-cokelat">${mood.name}</span> dan pengen yang <span class="font-semibold text-cokelat">${taste.name}</span>. Ini tiga menu terbaik untukmu.`;
      }

      const ranks = [
        {
          badge: "1",
          label: "Rekomendasi Utama",
          cls: "bg-linear-to-br from-[#ffd700] to-gold",
        },
        {
          badge: "2",
          label: "Pilihan Kedua",
          cls: "bg-linear-to-br from-[#e8e8e8] to-[#c0c0c0]",
        },
        {
          badge: "3",
          label: "Alternatif Lain",
          cls: "bg-linear-to-br from-[#e0a070] to-[#cd7f32]",
        },
      ];

      if (recCards) {
        recCards.innerHTML = recs
          .map((p, i) => {
            const rank = ranks[i];
            const reason = buildReason(p, selectedMood, selectedTaste);
            const isPrimary = i === 0;
            return `
            <article class="relative bg-putih-tulang/80 backdrop-blur-lg border border-putih-tulang/90 rounded-[2.5rem] overflow-hidden shadow-rec-card transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-rec-card-hover animate-rec-reveal ${isPrimary ? "bg-linear-to-br from-primary/15 to-putih-tulang/85 border-secondary/30" : ""}" style="animation-delay: ${i * 0.15}s">
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-0">
                <div class="lg:col-span-5 relative overflow-hidden ${isPrimary ? "min-h-70" : "min-h-60"} lg:min-h-full">
                  <img src="${p.img}" alt="${p.name}" class="w-full h-full object-cover absolute inset-0" loading="lazy" />
                  <div class="absolute top-6 left-6">
                    <span class="inline-flex items-center justify-center font-bold text-lg text-cokelat w-12 h-12 rounded-full shadow-[0_8px_20px_-6px_rgba(90,62,54,0.2)] ${rank.cls}">${rank.badge}</span>
                  </div>
                </div>
                <div class="lg:col-span-7 p-8 lg:p-10">
                  <span class="text-xs font-semibold tracking-wider uppercase text-secondary mb-2 block">${rank.label}</span>
                  <h3 class="font-caveat text-3xl sm:text-4xl font-bold text-cokelat mb-3">${p.name}</h3>
                  <p class="text-cokelat/60 text-sm leading-relaxed mb-5">${p.desc}</p>
                  <div class="flex flex-wrap gap-2 mb-5">
                    ${p.tasteProfile
                      .map(
                        (t) =>
                          `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/30 text-cokelat">${t}</span>`,
                      )
                      .join("")}
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div class="bg-background/60 rounded-2xl p-4">
                      <span class="text-xs font-medium text-cokelat/40 uppercase tracking-wider mb-1 block">Cocok karena</span>
                      <p class="text-cokelat/70 text-sm leading-snug">${reason}</p>
                    </div>
                    <div class="bg-background/60 rounded-2xl p-4">
                      <span class="text-xs font-medium text-cokelat/40 uppercase tracking-wider mb-1 block">Paling nikmat dengan</span>
                      <p class="text-cokelat/70 text-sm leading-snug">${p.bestWith}</p>
                    </div>
                  </div>
                  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span class="text-xs text-cokelat/40 block mb-0.5">Harga</span>
                      <span class="text-2xl font-bold text-cokelat">Rp ${p.price}</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          `;
          })
          .join("");
      }

      if (mengapaSection && mengapaContent) {
        mengapaSection.classList.remove("hidden");
        mengapaContent.innerHTML = `
          <div class="mb-6">
            <span class="inline-flex w-16 h-16 text-secondary">${MOOD_ICONS[selectedMood]}</span>
          </div>
          <p class="text-cokelat/70 text-lg leading-relaxed max-w-2xl mx-auto">
            Hari ini kamu memilih mood <span class="font-semibold text-cokelat">${mood.name}</span>.
            ${getMoodExplanation(selectedMood, selectedTaste, mood, taste)}
          </p>
          <div class="mt-8 flex flex-wrap gap-3 justify-center">
            <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-primary/30 text-cokelat"><span class="w-4 h-4 inline-flex">${MOOD_ICONS[selectedMood]}</span> ${mood.name}</span>
            <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-gold/25 text-cokelat"><span class="w-4 h-4 inline-flex">${TASTE_ICONS[selectedTaste]}</span> ${taste.name}</span>
          </div>
        `;

        requestAnimationFrame(() => {
          mengapaContent.classList.remove("opacity-0", "translate-y-6");
          mengapaContent.classList.add("opacity-100", "translate-y-0");
        });
      }

      const recSection = $("#hasil-rekomendasi");
      setTimeout(() => {
        if (recSection)
          recSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }

    function initHeroCTA() {
      const cta = $("#hero-cta");
      if (!cta) return;
      cta.addEventListener("click", (e) => {
        e.preventDefault();
        const target = $("#pilih-mood");
        if (target) target.scrollIntoView({ behavior: "smooth" });
      });
    }

    function initRecButton() {
      const btn = $("#get-recommendation");
      if (!btn) return;
      btn.addEventListener("click", () => {
        if (!selectedMood || !selectedTaste) return;
        showRecommendations();
        showToast("Rekomendasi siap untukmu!");
      });
    }

    renderMoods();
    renderTastes();
    initHeroCTA();
    initRecButton();
    updateRecButton();
  }

  function initGallery() {
    const wrappers = $$(".gallery-item-wrapper");
    const cards = $$(".gallery-card");
    const pills = $$(".filter-pill");
    if (wrappers.length === 0 && cards.length === 0 && pills.length === 0)
      return;

    const indicator = $("#filter-indicator");

    function moveIndicator(pill) {
      if (!indicator) return;
      indicator.style.width = pill.offsetWidth + "px";
      indicator.style.transform = `translateX(${pill.offsetLeft}px)`;
      pill.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }

    function getVisibleCards() {
      return wrappers
        .filter((w) => w.style.display !== "none")
        .map((w) => w.querySelector(".gallery-card"));
    }

    pills.forEach((pill) => {
      pill.addEventListener("click", () => {
        pills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        moveIndicator(pill);

        const category = pill.dataset.category;
        wrappers.forEach((wrapper) => {
          const cat = wrapper.dataset.category;
          wrapper.style.display =
            category === "all" || cat === category ? "block" : "none";
        });
        if (typeof AOS !== "undefined") {
          AOS.refresh();
        }
      });
    });

    function syncIndicatorToActive() {
      const active = $(".filter-pill.active");
      if (active) moveIndicator(active);
    }
    if (pills.length) {
      window.addEventListener("load", syncIndicatorToActive);
      window.addEventListener("resize", syncIndicatorToActive, {
        passive: true,
      });
    }

    const lb = $("#lightbox");
    const lbImg = $("#lb-img");
    const lbTitle = $("#lb-title");
    const lbDesc = $("#lb-desc");
    const lbDots = $("#lb-dots");

    let currentIdx = 0;
    let visibleCards = [];

    function buildDots() {
      if (!lbDots) return;
      lbDots.innerHTML = "";
      visibleCards.forEach((_, i) => {
        const d = document.createElement("div");
        d.className = "lb-dot" + (i === currentIdx ? " active" : "");
        lbDots.appendChild(d);
      });
    }

    function updateDots() {
      lbDots?.querySelectorAll(".lb-dot").forEach((d, i) => {
        d.classList.toggle("active", i === currentIdx);
      });
    }

    function showCard(idx) {
      currentIdx = idx;
      const card = visibleCards[idx];
      if (!card) return;
      lbImg.src = card.dataset.src || card.querySelector("img").src;
      lbImg.alt = card.querySelector("img").alt;
      lbTitle.textContent = card.dataset.title || "";
      lbDesc.textContent = card.dataset.desc || "";
      updateDots();
    }

    function openLightbox(card) {
      visibleCards = getVisibleCards();
      currentIdx = visibleCards.indexOf(card);
      if (currentIdx < 0) currentIdx = 0;
      buildDots();
      showCard(currentIdx);
      lb.classList.add("active");
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      lb.classList.remove("active");
      document.body.style.overflow = "";
    }

    function prev() {
      showCard((currentIdx - 1 + visibleCards.length) % visibleCards.length);
    }
    function next() {
      showCard((currentIdx + 1) % visibleCards.length);
    }

    if (lb) {
      cards.forEach((card) =>
        card.addEventListener("click", () => openLightbox(card)),
      );

      $("#lb-close")?.addEventListener("click", closeLightbox);
      $("#lb-prev")?.addEventListener("click", (e) => {
        e.stopPropagation();
        prev();
      });
      $("#lb-next")?.addEventListener("click", (e) => {
        e.stopPropagation();
        next();
      });
      lb.addEventListener("click", (e) => {
        if (e.target === lb) closeLightbox();
      });

      document.addEventListener("keydown", (e) => {
        if (!lb.classList.contains("active")) return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
      });

      let tx0 = 0;
      lb.addEventListener(
        "touchstart",
        (e) => {
          tx0 = e.changedTouches[0].screenX;
        },
        { passive: true },
      );
      lb.addEventListener("touchend", (e) => {
        const diff = tx0 - e.changedTouches[0].screenX;
        if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
      });
    }
  }

  function init() {
    initNavbarScroll();
    initMobileMenu();
    initMouseGlow();
    initHeroAndFloatingItems();
    initSideCakes();
    initFAQ();
    initMenuRecommendation();
    initGallery();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
