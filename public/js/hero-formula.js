const heroFormulaCanvas = document.querySelector("[data-hero-formula]");

if (heroFormulaCanvas instanceof HTMLCanvasElement) {
  initHeroFormula(heroFormulaCanvas);
}

function initHeroFormula(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const logicalSize = 400;
  const pointCount = 20000;
  const heroSection = canvas.closest(".hero");
  let frameId = 0;
  let resizeTimer = 0;
  let t = Math.PI / 6;
  let width = 0;
  let height = 0;
  let isVisible = true;

  const drawLayer = (startIndex, m, color, pointSize) => {
    ctx.fillStyle = color;

    for (let i = startIndex; i >= 0; i -= 2) {
      const k = 9 * Math.cos(i / 61);
      const e = i / 652 - 13;
      const d = Math.hypot(k, e) ** 2 / 89 + 1;
      const q =
        79 -
        (e / 2) * Math.sin(k) +
        (k / d) * (6 + 5 * Math.sin(Math.sin(d * d + e / 9 - t + m)));
      const c = d / 1.9 + Math.cos(t - d * 3 + m) / 11 - t / 16 + m;
      const x = q * Math.sin(c) + 200;
      const y = (q + 40) * Math.cos(c) + 200;

      ctx.fillRect(x, y, pointSize, pointSize);
    }
  };

  const render = () => {
    if (!width || !height) {
      return;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const scale = Math.min(width, height) / logicalSize;
    const offsetX = (width - logicalSize * scale) / 2;
    const offsetY = (height - logicalSize * scale) / 2;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const halo = ctx.createRadialGradient(200, 200, 18, 200, 200, 160);
    halo.addColorStop(0, "rgba(255, 139, 56, 0.08)");
    halo.addColorStop(0.45, "rgba(98, 231, 214, 0.06)");
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, logicalSize, logicalSize);

    drawLayer(pointCount - 2, 0, "rgba(255, 139, 56, 0.18)", 1.5);
    drawLayer(pointCount - 1, 3, "rgba(98, 231, 214, 0.13)", 1.2);
    drawLayer(pointCount - 2, 0, "rgba(255, 255, 255, 0.035)", 0.9);

    ctx.restore();
  };

  const stop = () => {
    if (!frameId) {
      return;
    }

    cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const tick = () => {
    frameId = 0;

    if (reduceMotion.matches || !isVisible || document.hidden) {
      render();
      return;
    }

    t += Math.PI / 45;
    render();
    frameId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (frameId || reduceMotion.matches || !isVisible || document.hidden) {
      return;
    }

    frameId = requestAnimationFrame(tick);
  };

  const resize = () => {
    const displayWidth = Math.max(canvas.clientWidth, 1);
    const displayHeight = Math.max(canvas.clientHeight, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    width = displayWidth;
    height = displayHeight;
    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    render();
    start();
  };

  const handleVisibility = () => {
    if (document.hidden) {
      stop();
      return;
    }

    render();
    start();
  };

  const handleMotionChange = () => {
    render();

    if (reduceMotion.matches) {
      stop();
      return;
    }

    start();
  };

  if ("IntersectionObserver" in window && heroSection) {
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries.some((entry) => entry.isIntersecting);

        if (!isVisible) {
          stop();
          return;
        }

        render();
        start();
      },
      {
        threshold: 0.08
      }
    );

    observer.observe(heroSection);
  }

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 120);
  });

  document.addEventListener("visibilitychange", handleVisibility);

  if (typeof reduceMotion.addEventListener === "function") {
    reduceMotion.addEventListener("change", handleMotionChange);
  } else if (typeof reduceMotion.addListener === "function") {
    reduceMotion.addListener(handleMotionChange);
  }

  resize();
}
