/* ░░░░░░ rm.background local — i18n (EN base · ES second option) ░░░░░░ */
(function () {
  "use strict";

  // Spanish overrides. English is the DOM default and is captured on load.
  const ES = {
    "nav.privacy": "Privacidad",
    "nav.features": "Características",
    "nav.models": "Modelos",
    "nav.install": "Instalar",

    "hero.badge": "100% local · open source",
    "hero.t1": "Quitá fondos",
    "hero.t2": "sin subir nada",
    "hero.t3": "a internet",
    "hero.sub": "Una alternativa offline a remove.bg que corre <b>entera en tu máquina</b>. Tus imágenes nunca salen de tu PC. Sin nube, sin cuentas, sin API.",
    "hero.cta1": "Instalar ahora",
    "hero.cta2": "Ver en GitHub →",

    "ba.before": "Antes",
    "ba.after": "Después",
    "ba.caption": "Arrastrá para comparar · resultado real del modelo",

    "priv.h2": "Todo pasa en tu PC. <span class=\"accent\">100% local y privado.</span>",
    "priv.sub": "Tus imágenes no se suben a servidores externos. Nunca.",
    "priv.c1t": "Sin internet",
    "priv.c1p": "Funciona sin conexión, incluso en modo avión.",
    "priv.c2t": "Sin nube",
    "priv.c2p": "Procesamiento 100% en tu dispositivo.",
    "priv.c3t": "Sin cuentas",
    "priv.c3p": "No necesitás registrarte para usarlo.",
    "priv.c4t": "Sin API",
    "priv.c4p": "No usás claves. No dependés de nadie.",

    "feat.h2": "Pensado para trabajar <span class=\"accent\">en serio</span>",
    "feat.sub": "De una imagen a cientos. Sin límites de cantidad ni resolución.",
    "feat.c1t": "Cola de procesamiento",
    "feat.c1p": "Soltá varias imágenes a la vez y se procesan una por una. Cada resultado en su propia tarjeta — nada se pisa.",
    "feat.c2t": "Sesiones persistentes",
    "feat.c2p": "Tus resultados se guardan localmente y se agrupan en sesiones. Sobreviven recargas hasta que los borres.",
    "feat.c3t": "PNG · WEBP · JPG",
    "feat.c3p": "Descargá en el formato que quieras, con fondo transparente o un color sólido. Por imagen o todas juntas.",
    "feat.c4t": "6 modelos",
    "feat.c4p": "ISNet por defecto (rápido y muy bueno) y BiRefNet 2024 para máxima calidad. Elegí según el caso.",
    "feat.c5t": "Alpha matting",
    "feat.c5p": "Modo de bordes finos para pelo, plantas y mallas. Ajustá los umbrales para resultados quirúrgicos.",
    "feat.c6t": "Web + Desktop",
    "feat.c6p": "Usalo en el navegador o como app nativa con <code>rm-bg desktop</code> (Electron). La misma UI, sin pestañas.",

    "mod.h2": "Elegí <span class=\"accent\">velocidad o calidad</span>",
    "mod.sub": "Tiempos aproximados por imagen en Apple Silicon (CPU).",
    "mod.col1": "Modelo",
    "mod.col2": "Cuándo usarlo",
    "mod.col3": "Velocidad",
    "mod.r1": "Rápido y muy buena calidad para cualquier imagen.",
    "mod.r2": "El clásico — bueno para productos simples.",
    "mod.r3": "Solo personas.",
    "mod.r4": "Más calidad, todavía razonable.",
    "mod.r5": "Mejor calidad para cualquier imagen.",
    "mod.r6": "Personas, máxima calidad (pelo difícil).",

    "show.h2": "Una herramienta, <span class=\"accent\">muchas formas de usarla</span>",
    "show.r1tag": "Privacidad real",
    "show.r1h": "Todo pasa en tu PC",
    "show.r1p": "El modelo se ejecuta en tu propia máquina. Tus imágenes no se suben a ningún servidor: funciona sin conexión y nada queda dando vueltas en la nube.",
    "show.r1pts": ["Sin internet", "Sin nube", "Sin cuentas", "Sin API"],
    "show.r2tag": "Web + Desktop",
    "show.r2h": "Usalo como quieras",
    "show.r2p": "Abrilo en el navegador o instalalo como app de escritorio con la misma interfaz. Soltá varias imágenes a la vez, mirá el progreso y descargá todo junto cuando termina.",
    "show.r2pts": ["Procesa en lote", "Arrastrá imágenes", "Descarga masiva"],
    "show.r3tag": "Formatos y modelos",
    "show.r3h": "Más control sobre el resultado",
    "show.r3p": "Elegí entre velocidad o calidad y exportá como necesites: PNG, WEBP o JPG, con fondo transparente o un color sólido. Cambiá de modelo según la imagen.",
    "show.r3pts": ["PNG · WEBP · JPG", "Rápido o calidad", "6 modelos"],
    "show.r4tag": "El resultado",
    "show.r4h": "Quitá fondos, sin subir nada",
    "show.r4p": "Lo importante: recortes limpios incluso en pelo y bordes difíciles, en segundos y 100% local. Compará el antes y el después al instante con el deslizador.",
    "show.r4pts": ["Bordes finos", "En segundos", "100% local"],

    "inst.h2": "Empezá en <span class=\"accent\">un comando</span>",
    "inst.sub": "Necesitás Node.js y Python 3.9+ ya instalados.",
    "inst.c1tag": "Probalo ya",
    "inst.c1h": "npx (temporal)",
    "inst.c1p": "Lo descarga temporalmente, lo corre y abre <code>127.0.0.1:7860</code>. No deja nada instalado.",
    "inst.c2tag": "Recomendado",
    "inst.c2h": "npm (permanente + <code>rm-bg</code>)",
    "inst.c2p": "Instala el comando <code>rm-bg</code> en todo el sistema. Ideal para uso regular y la app de escritorio.",
    "inst.c3tag": "Desde el código",
    "inst.c3p": "El primer arranque crea el entorno y baja las dependencias.",

    "btn.copy": "Copiar",

    "cta.h2": "Quita-fondos, <span class=\"accent\">de verdad tuyo</span>.",
    "cta.sub": "Sin límites, sin cuenta, sin API. Open source y gratis.",
    "cta.b1": "Ver en GitHub",
    "cta.b2": "Instalar",

    "foot.note": "Proyecto open source bajo licencia MIT. No afiliado a remove.bg ni a Canva Austria GmbH."
  };

  // "Copied!" toast per language (used by main.js copy buttons)
  const COPIED = { en: "Copied!", es: "¡Copiado!" };

  // Capture English (DOM default) so we can restore it.
  const EN = {};
  const EN_LIST = {};
  document.querySelectorAll("[data-i18n]").forEach((el) => { EN[el.dataset.i18n] = el.innerHTML; });
  document.querySelectorAll("[data-i18n-list]").forEach((el) => {
    EN_LIST[el.dataset.i18nList] = Array.from(el.children).map((li) => li.innerHTML);
  });

  const renderList = (el, arr) => { el.innerHTML = arr.map((t) => "<li>" + t + "</li>").join(""); };

  function setLang(lang) {
    const es = lang === "es";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const v = es ? ES[el.dataset.i18n] : EN[el.dataset.i18n];
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-list]").forEach((el) => {
      const arr = es ? ES[el.dataset.i18nList] : EN_LIST[el.dataset.i18nList];
      if (arr) renderList(el, arr);
    });
    document.documentElement.lang = lang;
    try { localStorage.setItem("rmbg-lang", lang); } catch (e) {}
    document.querySelectorAll("#langToggle [data-lang]").forEach((b) => {
      b.classList.toggle("active", b.dataset.lang === lang);
    });
    window.__rmbgLang = lang;
    window.__rmbgCopied = COPIED[lang] || COPIED.en;
  }

  window.__setLang = setLang;

  const toggle = document.getElementById("langToggle");
  if (toggle) {
    toggle.addEventListener("click", (e) => {
      const b = e.target.closest("[data-lang]");
      if (b) setLang(b.dataset.lang);
    });
  }

  let saved = "en";
  try { saved = localStorage.getItem("rmbg-lang") || "en"; } catch (e) {}
  setLang(saved);
})();
