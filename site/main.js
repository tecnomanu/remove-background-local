/* ░░░░░░ rm.backgroundlocal — landing interactions ░░░░░░ */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";

  /* ── nav: shrink on scroll ── */
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ── before / after slider ── */
  (function beforeAfter() {
    const ba = document.getElementById("ba");
    const before = document.getElementById("baBefore");
    const handle = document.getElementById("baHandle");
    if (!ba || !before || !handle) return;

    let dragging = false;
    const setPos = (pct) => {
      pct = Math.max(0, Math.min(100, pct));
      before.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
      handle.style.left = pct + "%";
      handle.setAttribute("aria-valuenow", Math.round(pct));
    };
    const fromEvent = (e) => {
      const rect = ba.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      setPos((x / rect.width) * 100);
    };
    const start = (e) => { dragging = true; fromEvent(e); };
    const move = (e) => { if (dragging) fromEvent(e); };
    const end = () => { dragging = false; };

    ba.addEventListener("mousedown", start);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    ba.addEventListener("touchstart", start, { passive: true });
    ba.addEventListener("touchmove", move, { passive: true });
    ba.addEventListener("touchend", end);
    handle.addEventListener("keydown", (e) => {
      const cur = parseFloat(handle.getAttribute("aria-valuenow")) || 50;
      if (e.key === "ArrowLeft") { setPos(cur - 4); e.preventDefault(); }
      if (e.key === "ArrowRight") { setPos(cur + 4); e.preventDefault(); }
    });

    // intro sweep when scrolled into view (once)
    let played = false;
    const sweep = () => {
      if (played || reduceMotion) return;
      played = true;
      let p = 50, dir = 1, steps = 0;
      const id = setInterval(() => {
        p += dir * 3; steps++;
        if (p >= 82) dir = -1;
        if (p <= 22) dir = 1;
        setPos(p);
        if (steps > 42) { clearInterval(id); setPos(50); }
      }, 22);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { sweep(); io.disconnect(); } });
    }, { threshold: 0.5 });
    io.observe(ba);
  })();

  /* ── terminal typing ── */
  (function typeTerminal() {
    const el = document.querySelector(".term-type");
    if (!el) return;
    const text = el.getAttribute("data-type") || "";
    if (reduceMotion) { el.textContent = text; return; }
    let i = 0;
    const tick = () => {
      el.textContent = text.slice(0, i);
      if (i++ <= text.length) setTimeout(tick, 45);
    };
    setTimeout(tick, 900);
  })();

  /* ── copy buttons ── */
  document.querySelectorAll(".copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.getAttribute("data-copy") || "");
        const old = btn.textContent;
        btn.textContent = "¡Copiado!";
        btn.classList.add("done");
        setTimeout(() => { btn.textContent = old; btn.classList.remove("done"); }, 1600);
      } catch (_) {}
    });
  });

  /* ── feature card cursor glow ── */
  document.querySelectorAll(".feature").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* ── smooth anchor scroll (respect reduce motion handled by CSS) ── */

  if (!hasGSAP) {
    // graceful fallback: just show everything
    document.querySelectorAll("[data-reveal],[data-stagger]").forEach((el) => { el.style.opacity = 1; });
    document.querySelectorAll(".model-table").forEach((t) => t.classList.add("in-view"));
    return;
  }

  const { gsap } = window;
  gsap.registerPlugin(window.ScrollTrigger);
  gsap.defaults({ ease: "power3.out", duration: 0.8 });

  if (reduceMotion) {
    gsap.set("[data-reveal],[data-stagger]", { opacity: 1, y: 0 });
    document.querySelectorAll(".model-table").forEach((t) => t.classList.add("in-view"));
    return;
  }

  /* ── hero entrance timeline ── */
  const heroTl = gsap.timeline({ delay: 0.15 });
  heroTl
    .from(".brand", { y: -16, autoAlpha: 0, duration: 0.6 })
    .from(".nav-links a", { y: -10, autoAlpha: 0, stagger: 0.06, duration: 0.5 }, "<0.1")
    .from(".nav-cta", { y: -10, autoAlpha: 0, duration: 0.5 }, "<")
    .from(".pill-badge", { y: 20, autoAlpha: 0 }, "-=0.2")
    .from(".hero-title [data-word]", { y: 40, autoAlpha: 0, stagger: 0.12, duration: 0.7, ease: "power4.out" }, "-=0.3")
    .from(".hero-sub", { y: 20, autoAlpha: 0 }, "-=0.4")
    .from(".hero-cta", { y: 20, autoAlpha: 0 }, "-=0.5")
    .from(".hero-term", { y: 20, autoAlpha: 0 }, "-=0.5")
    .from(".hero-demo", { x: 60, autoAlpha: 0, scale: 0.94, duration: 1, ease: "power3.out" }, "-=1");

  /* ── floating orbs (parallax + drift) ── */
  gsap.to(".orb-1", { y: 40, x: -30, duration: 9, ease: "sine.inOut", repeat: -1, yoyo: true });
  gsap.to(".orb-2", { y: -50, x: 30, duration: 11, ease: "sine.inOut", repeat: -1, yoyo: true });
  gsap.to(".orb-3", { y: 30, x: -40, duration: 13, ease: "sine.inOut", repeat: -1, yoyo: true });
  gsap.utils.toArray(".orb").forEach((orb, i) => {
    gsap.to(orb, { yPercent: (i + 1) * 12, ease: "none",
      scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1 } });
  });

  /* ── generic reveals ── */
  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    if (el.closest(".hero")) return; // hero handled by timeline
    gsap.from(el, {
      y: 40, autoAlpha: 0, duration: 0.9,
      scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none reverse" },
    });
  });

  /* ── staggered groups ── */
  const groups = new Map();
  gsap.utils.toArray("[data-stagger]").forEach((el) => {
    const parent = el.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });
  groups.forEach((items, parent) => {
    gsap.from(items, {
      y: 48, autoAlpha: 0, scale: 0.97, duration: 0.7, stagger: 0.09,
      scrollTrigger: { trigger: parent, start: "top 82%", toggleActions: "play none none reverse" },
    });
  });

  /* ── model speed bars fill ── */
  gsap.utils.toArray(".model-table").forEach((tbl) => {
    window.ScrollTrigger.create({
      trigger: tbl, start: "top 75%",
      onEnter: () => tbl.classList.add("in-view"),
    });
  });

  /* ── section headings shimmer on enter ── */
  gsap.utils.toArray(".section-head h2 .accent").forEach((sp) => {
    gsap.from(sp, { backgroundPositionX: "100%", duration: 1.2,
      scrollTrigger: { trigger: sp, start: "top 85%" } });
  });
})();
