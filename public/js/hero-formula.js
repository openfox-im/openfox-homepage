const formulaCanvases = Array.from(document.querySelectorAll("[data-formula-variant]"));
const FORMULA_COLORS = {
  haloOrange: "rgba(255, 139, 56, 0.08)",
  haloCyan: "rgba(98, 231, 214, 0.06)",
  layerOrange: "rgba(255, 139, 56, 0.18)",
  layerCyan: "rgba(98, 231, 214, 0.13)",
  layerWhite: "rgba(255, 255, 255, 0.035)"
};
const BUTTERFLY_COLORS = [
  "rgba(255, 128, 70, 0.22)",
  "rgba(255, 83, 151, 0.2)",
  "rgba(98, 231, 214, 0.18)",
  "rgba(171, 255, 105, 0.18)",
  "rgba(123, 147, 255, 0.18)"
];
const CODE_RAIN_WORD = Array.from("OPENFOX");
const TOWER_LIGHT_PALETTES = [
  { lower: [255, 84, 24], upper: [255, 245, 92] },
  { lower: [32, 170, 255], upper: [128, 255, 255] },
  { lower: [146, 52, 255], upper: [255, 106, 224] },
  { lower: [0, 255, 194], upper: [194, 255, 56] },
  { lower: [255, 28, 132], upper: [255, 152, 52] },
  { lower: [72, 90, 255], upper: [0, 255, 242] }
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }

  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mixChannels(from, to, ratio) {
  return from.map((channel, index) => channel + (to[index] - channel) * ratio);
}

function rgbaString(channels, alpha) {
  return `rgba(${channels.map((channel) => Math.round(channel)).join(", ")}, ${alpha})`;
}

function hashValue(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

const FORMULA_PRESETS = {
  hero: {
    initialT: Math.PI / 6,
    step: Math.PI / 45,
    renderFrame(ctx, t) {
      const pointCount = 20000;
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

      const halo = ctx.createRadialGradient(200, 200, 18, 200, 200, 160);
      halo.addColorStop(0, FORMULA_COLORS.haloOrange);
      halo.addColorStop(0.45, FORMULA_COLORS.haloCyan);
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, 400, 400);

      drawLayer(pointCount - 2, 0, FORMULA_COLORS.layerOrange, 1.5);
      drawLayer(pointCount - 1, 3, FORMULA_COLORS.layerCyan, 1.2);
      drawLayer(pointCount - 2, 0, FORMULA_COLORS.layerWhite, 0.9);
    }
  },
  statement: {
    initialT: 0,
    step: Math.PI / 30,
    renderFrame(ctx, t) {
      const logicalSize = 400;
      const midpoint = logicalSize / 2;
      const pointCount = 20000;
      const drawJelly = ({ color, pointSize, timeOffset, offsetX, offsetY, rotate, scale }) => {
        const time = t + timeOffset;
        ctx.save();
        ctx.translate(midpoint + offsetX, midpoint + offsetY);
        ctx.rotate(rotate);
        ctx.scale(scale, scale);
        ctx.translate(-midpoint, -midpoint);
        ctx.fillStyle = color;

        for (let i = pointCount - 1; i >= 0; i -= 1) {
          const xInput = i;
          const yInput = i / 1000;
          const k = (5 + Math.sin(yInput)) * Math.cos(xInput * 2);
          const e = yInput / 6 - 13;
          const d = Math.hypot(k, e) - 3;
          const q =
            3 * Math.sin(k * 2) +
            ((k / 19) * yInput) * (e + (d / 3) * Math.sin(e - d * 4 + time)) +
            99;
          const c = d - time / 4 + (i % 2) * 8;
          const x = q * Math.sin(c) * Math.cos(c / 4 + e / 3) + 200;
          const y = ((q * d) / 9) * Math.cos(c / 2 + 7) + 200;

          ctx.fillRect(x, y, pointSize, pointSize);
        }

        ctx.restore();
      };

      const halo = ctx.createRadialGradient(midpoint, midpoint, 20, midpoint, midpoint, 164);
      halo.addColorStop(0, FORMULA_COLORS.haloOrange);
      halo.addColorStop(0.42, FORMULA_COLORS.haloCyan);
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, logicalSize, logicalSize);

      drawJelly({
        color: FORMULA_COLORS.layerOrange,
        pointSize: 1.15,
        timeOffset: 0,
        offsetX: -54,
        offsetY: 18,
        rotate: -0.2,
        scale: 0.92
      });
      drawJelly({
        color: FORMULA_COLORS.layerCyan,
        pointSize: 1,
        timeOffset: Math.PI / 8,
        offsetX: 52,
        offsetY: -10,
        rotate: 0.14,
        scale: 0.96
      });
      drawJelly({
        color: FORMULA_COLORS.layerWhite,
        pointSize: 0.8,
        timeOffset: -Math.PI / 12,
        offsetX: 4,
        offsetY: -52,
        rotate: 0.05,
        scale: 0.84
      });
    }
  },
  capabilities: {
    initialT: 0,
    step: Math.PI / 90,
    renderFrame(ctx, t) {
      const logicalSize = 400;
      const midpoint = logicalSize / 2;
      const pointCount = 40000;
      const drawJelly = ({ color, pointSize, timeOffset, offsetX, offsetY, rotate, scale }) => {
        const time = t + timeOffset;
        ctx.save();
        ctx.translate(midpoint + offsetX, midpoint + offsetY);
        ctx.rotate(rotate);
        ctx.scale(scale, scale);
        ctx.translate(-midpoint, -midpoint);
        ctx.fillStyle = color;

        for (let i = pointCount; i--;) {
          const m = ~(i & 1);
          const k = Math.cos(i / 9);
          const e = Math.cos(i / logicalSize);
          const d = Math.hypot(k, e) ** 4 / 9 + 4;
          const q =
            k * (9 + 6 * Math.cos(e + d * d + m * time + (i % 6))) -
            Math.sin(Math.atan2(k, e) * 9);
          const c = d + (time / 9) * m + (i % 6);
          const x = q + 60 * Math.sin(c) + midpoint;
          const y = (q + 90 + d * 9 - e * 9) * Math.cos(c / 2 + (i % 4) + m * 8) + midpoint;

          ctx.fillRect(x, y, pointSize, pointSize);
        }

        ctx.restore();
      };

      const halo = ctx.createRadialGradient(midpoint, midpoint, 26, midpoint, midpoint, 178);
      halo.addColorStop(0, FORMULA_COLORS.haloOrange);
      halo.addColorStop(0.44, FORMULA_COLORS.haloCyan);
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, logicalSize, logicalSize);

      drawJelly({
        color: FORMULA_COLORS.layerOrange,
        pointSize: 1.08,
        timeOffset: 0,
        offsetX: -108,
        offsetY: 78,
        rotate: -0.2,
        scale: 0.88
      });
      drawJelly({
        color: FORMULA_COLORS.layerCyan,
        pointSize: 0.96,
        timeOffset: Math.PI / 12,
        offsetX: 0,
        offsetY: 8,
        rotate: 0.08,
        scale: 0.96
      });
      drawJelly({
        color: FORMULA_COLORS.layerWhite,
        pointSize: 0.78,
        timeOffset: -Math.PI / 18,
        offsetX: 116,
        offsetY: -86,
        rotate: 0.22,
        scale: 0.82
      });
    }
  },
  timeline: {
    initialT: 0,
    step: Math.PI / 60,
    renderFrame(ctx, t) {
      const logicalSize = 400;
      const midpoint = logicalSize / 2;
      const pointCount = 40000;

      const halo = ctx.createRadialGradient(midpoint, midpoint, 18, midpoint, midpoint, 184);
      halo.addColorStop(0, "rgba(255, 138, 92, 0.09)");
      halo.addColorStop(0.22, "rgba(255, 83, 151, 0.07)");
      halo.addColorStop(0.46, "rgba(98, 231, 214, 0.08)");
      halo.addColorStop(0.7, "rgba(171, 255, 105, 0.07)");
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, logicalSize, logicalSize);

      let currentBand = -1;

      for (let i = pointCount; i--;) {
        const band = Math.floor((i / pointCount) * BUTTERFLY_COLORS.length);
        if (band !== currentBand) {
          currentBand = band;
          ctx.fillStyle = BUTTERFLY_COLORS[Math.min(band, BUTTERFLY_COLORS.length - 1)];
        }

        const xInput = i % 200;
        const yInput = i / 200;
        const k = xInput / 8 - 12.5;
        const e = Math.cos(k) + Math.sin(yInput / 24) + Math.cos(k / 2);
        const d = Math.abs(e);
        const q = xInput / 4 + 90 + d * k * (1 + Math.cos(d * 4 - t * 2 + yInput / 72));
        const c = (yInput * e) / 594 - t / 8 + d / 6;
        const x = q * Math.cos(c) + midpoint;
        const y = (q / 2 + 99 * Math.cos(c / 2)) * Math.sin(c) + e * 6 + midpoint;

        ctx.fillRect(x, y, 1, 1);
      }
    }
  },
  quickstart: {
    initialT: 0,
    step: 1,
    compositeOperation: "source-over",
    logicalWidth: 720,
    logicalHeight: 440,
    fit: "stretch",
    renderFrame(ctx, t, logicalWidth, logicalHeight) {
      const frame = t;
      const columnSpacing = 58;
      const columns = Math.max(Math.floor(logicalWidth / columnSpacing), 8);
      const lineHeight = 22;
      const fontSize = 14;
      const wordHeight = CODE_RAIN_WORD.length * lineHeight;
      const monoFamily =
        getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() ||
        '"JetBrains Mono", "SF Mono", monospace';
      const topGlow = ctx.createLinearGradient(0, 0, 0, logicalHeight);
      topGlow.addColorStop(0, "rgba(3, 16, 13, 0.08)");
      topGlow.addColorStop(0.42, "rgba(6, 22, 18, 0.22)");
      topGlow.addColorStop(1, "rgba(2, 7, 9, 0.36)");
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      ctx.save();
      ctx.font = `600 ${fontSize}px ${monoFamily}`;
      ctx.textBaseline = "top";
      ctx.shadowBlur = 0;

      for (let column = 0; column < columns; column += 1) {
        const seed = column + 1;
        const x =
          18 +
          column * columnSpacing +
          (hashValue(seed * 1.7) - 0.5) * Math.min(18, columnSpacing * 0.32);
        const speed = 0.72 + hashValue(seed * 2.3) * 0.54;
        const stride = lineHeight * (0.94 + hashValue(seed * 4.1) * 0.18);
        const trail = CODE_RAIN_WORD.length;
        const resetSpan = logicalHeight + wordHeight + 180;
        const offset = hashValue(seed * 5.9) * resetSpan;
        const topY = (frame * speed * 1.18 + offset) % resetSpan - wordHeight - 120;
        const streakTop = topY - 26;
        const streakHeight = wordHeight + 92;
        const streak = ctx.createLinearGradient(0, streakTop, 0, streakTop + streakHeight);
        streak.addColorStop(0, "rgba(0, 0, 0, 0)");
        streak.addColorStop(0.2, "rgba(86, 255, 168, 0.02)");
        streak.addColorStop(0.7, "rgba(86, 255, 168, 0.12)");
        streak.addColorStop(1, "rgba(214, 255, 244, 0.28)");
        ctx.fillStyle = streak;
        ctx.fillRect(x + columnSpacing * 0.42, streakTop, 2, streakHeight);

        for (let step = 0; step < trail; step += 1) {
          const y = topY + step * stride;
          if (y < -lineHeight || y > logicalHeight + lineHeight) {
            continue;
          }

          const fade = (step + 1) / trail;
          const pulse =
            0.68 +
            0.32 * ((Math.sin(frame * 0.045 + column * 0.62 + step * 0.85) + 1) / 2);
          const alpha = (0.06 + fade * 0.25) * pulse;
          const glyph = CODE_RAIN_WORD[step];

          if (step === trail - 1) {
            ctx.fillStyle = `rgba(232, 255, 244, ${0.92 * pulse})`;
            ctx.shadowBlur = 14;
            ctx.shadowColor = "rgba(196, 255, 228, 0.7)";
          } else if (step >= trail - 3) {
            ctx.fillStyle = `rgba(120, 255, 202, ${0.34 + alpha * 1.6})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "rgba(72, 255, 176, 0.46)";
          } else {
            const green = Math.round(210 + fade * 42);
            const blue = Math.round(104 + fade * 54);
            ctx.fillStyle = `rgba(76, ${green}, ${blue}, ${alpha})`;
            ctx.shadowBlur = 6;
            ctx.shadowColor = "rgba(40, 255, 162, 0.24)";
          }

          ctx.fillText(glyph, x, y);
        }
      }

      ctx.restore();
    }
  },
  "use-cases": {
    initialT: 0,
    step: 1,
    compositeOperation: "source-over",
    renderFrame(ctx, t) {
      const logicalSize = 400;
      const virtualSize = 1080;
      const virtualHalf = virtualSize / 2;
      const logicalScale = logicalSize / virtualSize;
      const tau = Math.PI * 2;
      const meshStep = tau / 20;
      const rotation = (t * Math.PI) / 720;
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      const eyeZ = virtualHalf / Math.tan(Math.PI / 6);
      const nearClamp = 42;
      const cycleFrames = 420;
      const cyclePhase = (t % cycleFrames) / cycleFrames;
      const paletteIndex = Math.floor(t / cycleFrames) % TOWER_LIGHT_PALETTES.length;
      const nextPaletteIndex = (paletteIndex + 1) % TOWER_LIGHT_PALETTES.length;
      const paletteBlend = smoothstep(0.88, 1, cyclePhase);
      const currentPalette = TOWER_LIGHT_PALETTES[paletteIndex];
      const nextPalette = TOWER_LIGHT_PALETTES[nextPaletteIndex];
      const lowerLight = mixChannels(currentPalette.lower, nextPalette.lower, paletteBlend);
      const upperLight = mixChannels(currentPalette.upper, nextPalette.upper, paletteBlend);
      const quads = [];
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      const projectPoint = (u, v) => {
        const radius = 70 * Math.cosh(v);
        const x = radius * Math.cos(u);
        const y = 140 * v;
        const z = radius * Math.sin(u);
        const rotatedX = x * cosR + z * sinR;
        const rotatedZ = z * cosR - x * sinR;
        const cameraDepth = eyeZ - rotatedZ;
        const perspective = eyeZ / Math.max(cameraDepth, nearClamp);
        const screenX = virtualHalf + rotatedX * perspective;
        const screenY = virtualHalf + y * perspective;

        return {
          x: screenX * logicalScale,
          y: screenY * logicalScale,
          z: rotatedZ
        };
      };

      const halo = ctx.createRadialGradient(logicalSize / 2, logicalSize / 2, 30, logicalSize / 2, logicalSize / 2, 196);
      halo.addColorStop(0, rgbaString(lowerLight, 0.2));
      halo.addColorStop(0.36, rgbaString(upperLight, 0.14));
      halo.addColorStop(0.68, rgbaString(upperLight, 0.07));
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, logicalSize, logicalSize);

      let rowIndex = 0;
      for (let j = -Math.PI; j < tau; j += meshStep, rowIndex += 1) {
        let columnIndex = 0;
        for (let i = 0; i < tau; i += meshStep, columnIndex += 1) {
          const corners = [
            projectPoint(i, j),
            projectPoint(i + meshStep, j + meshStep),
            projectPoint(i + meshStep, j),
            projectPoint(i, j + meshStep)
          ];
          const avgX = corners.reduce((total, corner) => total + corner.x, 0) / corners.length;
          const avgY = corners.reduce((total, corner) => total + corner.y, 0) / corners.length;
          minX = Math.min(minX, avgX);
          maxX = Math.max(maxX, avgX);
          minY = Math.min(minY, avgY);
          maxY = Math.max(maxY, avgY);

          quads.push({
            corners,
            avgZ: corners.reduce((total, corner) => total + corner.z, 0) / corners.length,
            avgX,
            avgY,
            isLight: (columnIndex + rowIndex) % 2 === 0
          });
        }
      }

      quads.sort((left, right) => left.avgZ - right.avgZ);
      ctx.lineWidth = 0.62;
      ctx.lineJoin = "round";
      const sweepProgress = cyclePhase < 0.84 ? cyclePhase / 0.84 : 1;
      const cycleFade = cyclePhase < 0.84 ? 1 : 1 - smoothstep(0.84, 1, cyclePhase);
      const verticalSpan = Math.max(maxY - minY, 1);
      const horizontalSpan = Math.max(maxX - minX, 1);

      for (const quad of quads) {
        const fromBottom = 1 - clamp((quad.avgY - minY) / verticalSpan, 0, 1);
        const horizontal = clamp((quad.avgX - minX) / horizontalSpan, 0, 1);
        const activation = smoothstep(fromBottom - 0.12, fromBottom + 0.035, sweepProgress);
        const sparkle =
          0.72 +
          0.28 *
            ((Math.sin(quad.avgX * 0.09 + t * 0.08) + Math.cos(quad.avgY * 0.06 - t * 0.07) + 2) / 4);
        const illumination = activation * cycleFade * sparkle;
        const towerLight = mixChannels(lowerLight, upperLight, horizontal * 0.62 + fromBottom * 0.38);
        const hotEdge = smoothstep(fromBottom - 0.03, fromBottom + 0.012, sweepProgress) * cycleFade;
        const headFlash = hotEdge * (0.72 + 0.28 * Math.sin(quad.avgX * 0.12 + t * 0.18) ** 2);
        const baseFill = quad.isLight ? [248, 250, 255] : [10, 14, 19];
        const baseStroke = quad.isLight ? [255, 255, 255] : [0, 0, 0];
        const fillMix = illumination * (quad.isLight ? 1 : 0.86);
        const strokeMix = illumination * (quad.isLight ? 1 : 0.98);
        const litFillChannels = mixChannels(baseFill, towerLight, fillMix);
        const litStrokeChannels = mixChannels(baseStroke, towerLight, strokeMix);
        const fillChannels = mixChannels(litFillChannels, [255, 248, 236], headFlash * (quad.isLight ? 0.64 : 0.24));
        const strokeChannels = mixChannels(litStrokeChannels, [255, 251, 244], headFlash * 0.78);

        ctx.beginPath();
        ctx.moveTo(quad.corners[0].x, quad.corners[0].y);
        ctx.lineTo(quad.corners[1].x, quad.corners[1].y);
        ctx.lineTo(quad.corners[2].x, quad.corners[2].y);
        ctx.lineTo(quad.corners[3].x, quad.corners[3].y);
        ctx.closePath();
        ctx.fillStyle = rgbaString(fillChannels, (quad.isLight ? 0.26 : 0.52) + illumination * (quad.isLight ? 0.5 : 0.22) + headFlash * 0.12);
        ctx.strokeStyle = rgbaString(strokeChannels, (quad.isLight ? 0.065 : 0.12) + illumination * (quad.isLight ? 0.54 : 0.22) + headFlash * 0.16);
        ctx.fill();
        ctx.stroke();
      }

      const sweepCenterY = maxY - verticalSpan * sweepProgress;
      const sweepGlowHeight = 68;
      const sweepGlow = ctx.createLinearGradient(0, sweepCenterY + sweepGlowHeight, 0, sweepCenterY - sweepGlowHeight);
      sweepGlow.addColorStop(0, "rgba(0, 0, 0, 0)");
      sweepGlow.addColorStop(0.24, rgbaString(lowerLight, 0.14 * cycleFade));
      sweepGlow.addColorStop(0.48, rgbaString(upperLight, 0.34 * cycleFade));
      sweepGlow.addColorStop(0.66, rgbaString([255, 248, 240], 0.2 * cycleFade));
      sweepGlow.addColorStop(0.78, rgbaString(lowerLight, 0.18 * cycleFade));
      sweepGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = sweepGlow;
      ctx.fillRect(0, minY - sweepGlowHeight * 1.5, logicalSize, verticalSpan + sweepGlowHeight * 3);
      const beamWidth = logicalSize * 0.28;
      const beam = ctx.createRadialGradient(
        logicalSize / 2,
        maxY + 18,
        0,
        logicalSize / 2,
        maxY + 18,
        beamWidth
      );
      beam.addColorStop(0, rgbaString(upperLight, 0.2 * cycleFade));
      beam.addColorStop(0.28, rgbaString(lowerLight, 0.14 * cycleFade));
      beam.addColorStop(0.62, rgbaString(lowerLight, 0.06 * cycleFade));
      beam.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = beam;
      ctx.fillRect(logicalSize / 2 - beamWidth, minY, beamWidth * 2, maxY - minY + beamWidth * 0.8);
      ctx.restore();
    }
  }
};

for (const canvas of formulaCanvases) {
  if (canvas instanceof HTMLCanvasElement) {
    initFormulaCanvas(canvas);
  }
}

function initFormulaCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const preset = FORMULA_PRESETS[canvas.dataset.formulaVariant] ?? FORMULA_PRESETS.hero;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const logicalWidth = preset.logicalWidth ?? 400;
  const logicalHeight = preset.logicalHeight ?? logicalWidth;
  const fit = preset.fit ?? "contain";
  const observedSection = canvas.closest("section");
  let frameId = 0;
  let resizeTimer = 0;
  let t = preset.initialT;
  let width = 0;
  let height = 0;
  let isVisible = true;
  const render = () => {
    if (!width || !height) {
      return;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = preset.compositeOperation ?? "screen";

    let scaleX = 1;
    let scaleY = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (fit === "stretch") {
      scaleX = width / logicalWidth;
      scaleY = height / logicalHeight;
    } else {
      const scale =
        fit === "cover"
          ? Math.max(width / logicalWidth, height / logicalHeight)
          : Math.min(width / logicalWidth, height / logicalHeight);
      scaleX = scale;
      scaleY = scale;
      offsetX = (width - logicalWidth * scale) / 2;
      offsetY = (height - logicalHeight * scale) / 2;
    }

    ctx.translate(offsetX, offsetY);
    ctx.scale(scaleX, scaleY);

    preset.renderFrame(ctx, t, logicalWidth, logicalHeight);

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

    t += preset.step;
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

  if ("IntersectionObserver" in window && observedSection) {
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

    observer.observe(observedSection);
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
