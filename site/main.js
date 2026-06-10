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

  /* ── demo background swatches ── */
  (function baBackground() {
    const ba = document.getElementById("ba");
    const picker = document.getElementById("baBgPicker");
    const custom = document.getElementById("baBgCustom");
    if (!ba || !picker) return;

    const CHECKER_BG =
      "linear-gradient(45deg, #2a2a35 25%, transparent 25%)," +
      "linear-gradient(-45deg, #2a2a35 25%, transparent 25%)," +
      "linear-gradient(45deg, transparent 75%, #2a2a35 75%)," +
      "linear-gradient(-45deg, transparent 75%, #2a2a35 75%)";

    const presetBgs = new Set(
      Array.from(picker.querySelectorAll("[data-bg]")).map((sw) => sw.dataset.bg)
    );

    const setBg = (bg) => {
      const isCustom = bg.startsWith("#") && !presetBgs.has(bg);
      picker.querySelectorAll(".ba-swatch").forEach((sw) => {
        const match = sw.dataset.bg === bg ||
          (isCustom && sw.classList.contains("ba-swatch-custom"));
        sw.classList.toggle("active", !!match);
      });
      if (bg === "checker") {
        ba.style.backgroundColor = "#1f1f27";
        ba.style.backgroundImage = CHECKER_BG;
        ba.style.backgroundSize = "22px 22px";
        ba.style.backgroundPosition = "0 0, 0 11px, 11px -11px, 11px 0";
      } else {
        ba.style.backgroundColor = bg;
        ba.style.backgroundImage = "none";
        ba.style.backgroundSize = "";
        ba.style.backgroundPosition = "";
      }
    };

    picker.querySelectorAll("[data-bg]").forEach((btn) => {
      btn.addEventListener("click", () => setBg(btn.dataset.bg));
    });
    if (custom) {
      custom.addEventListener("input", (e) => setBg(e.target.value));
    }
  })();

  /* ── demo quality toggle (high / low) ── */
  (function baQuality() {
    const after = document.getElementById("baAfter");
    const group = document.getElementById("baQuality");
    if (!after || !group) return;

    const SRC = {
      high: "./assets/dog-despues-high.png",
      low: "./assets/dog-despues-low.png",
    };

    group.querySelectorAll("[data-quality]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = btn.dataset.quality;
        if (!SRC[q]) return;
        after.src = SRC[q];
        group.querySelectorAll("[data-quality]").forEach((b) => {
          b.classList.toggle("active", b.dataset.quality === q);
        });
      });
    });
  })();

  /* ── word-by-word typing (hero title + terminal) ── */
  function typeWordByWord(el, msPerWord, done) {
    const text = (el.dataset.fullText || el.textContent || el.getAttribute("data-type") || "").trim();
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) { if (done) done(); return; }
    el.dataset.fullText = text;
    el.textContent = "";
    let i = 0;
    const tick = () => {
      if (i < words.length) {
        el.textContent += (i ? " " : "") + words[i++];
        setTimeout(tick, msPerWord);
      } else if (done) done();
    };
    tick();
  }

  function typeHeroTitle(done) {
    const lines = Array.from(document.querySelectorAll(".hero-title .line"));
    if (!lines.length) { if (done) done(); return; }
    lines.forEach((line) => { line.dataset.fullText = line.textContent.trim(); line.textContent = ""; });
    let idx = 0;
    const nextLine = () => {
      if (idx >= lines.length) { if (done) done(); return; }
      typeWordByWord(lines[idx], 170, () => {
        idx++;
        setTimeout(nextLine, 260);
      });
    };
    nextLine();
  }

  function typeCharByChar(el, msPerChar, done) {
    const text = el.getAttribute("data-type") || el.dataset.fullText || el.textContent || "";
    if (!text) { if (done) done(); return; }
    el.textContent = "";
    let i = 0;
    const tick = () => {
      el.textContent = text.slice(0, i);
      if (i++ <= text.length) setTimeout(tick, msPerChar);
      else if (done) done();
    };
    tick();
  }

  function typeTerminal() {
    const el = document.querySelector(".term-type");
    if (!el) return;
    const text = el.getAttribute("data-type") || "";
    if (reduceMotion) { el.textContent = text; return; }
    typeCharByChar(el, 45);
  }

  if (!reduceMotion) {
    setTimeout(() => typeHeroTitle(() => setTimeout(typeTerminal, 220)), 380);
  }

  /* ── install cards: type commands on scroll ── */
  (function setupInstallTyping() {
    const grid = document.querySelector(".install-grid");
    if (!grid || reduceMotion) return;

    const queues = [...grid.querySelectorAll(".inst-card")].map((card) =>
      [...card.querySelectorAll(".codeblock code[data-type]")].map((code) => {
        const muted = code.querySelector(".muted");
        if (muted) {
          code.dataset.mutedHtml = muted.outerHTML;
          muted.remove();
        }
        code.dataset.fullText = code.getAttribute("data-type") || "";
        code.textContent = "";
        return code;
      })
    );

    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      let delay = 480;
      queues.forEach((codes, cardIdx) => {
        codes.forEach((code, codeIdx) => {
          setTimeout(() => {
            typeCharByChar(code, 32, () => {
              if (code.dataset.mutedHtml) {
                code.insertAdjacentHTML("beforeend", code.dataset.mutedHtml);
                delete code.dataset.mutedHtml;
              }
            });
          }, delay + cardIdx * 220 + codeIdx * 520);
        });
      });
    };

    if (hasGSAP && window.ScrollTrigger) {
      window.ScrollTrigger.create({ trigger: grid, start: "top 82%", once: true, onEnter: play });
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { play(); io.disconnect(); } });
      }, { threshold: 0.2 });
      io.observe(grid);
    }
  })();

  /* ── copy buttons ── */
  document.querySelectorAll(".copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.getAttribute("data-copy") || "");
        const old = btn.textContent;
        btn.textContent = window.__rmbgCopied || "Copied!";
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
    .from(".hero-title", { y: 24, autoAlpha: 0, duration: 0.5, ease: "power4.out" }, "-=0.3")
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

  /* ── showcase rows: directional slide ── */
  gsap.utils.toArray(".show-row").forEach((row) => {
    const media = row.querySelector(".show-media");
    const text = row.querySelector(".show-text");
    const reversed = row.classList.contains("reverse");
    const st = { trigger: row, start: "top 80%", toggleActions: "play none none reverse" };
    gsap.from(media, { x: reversed ? 60 : -60, autoAlpha: 0, duration: 0.9, scrollTrigger: st });
    gsap.from(text, { x: reversed ? -50 : 50, y: 16, autoAlpha: 0, duration: 0.9, scrollTrigger: st });
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
