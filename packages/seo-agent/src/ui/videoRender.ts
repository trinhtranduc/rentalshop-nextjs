/**
 * Draws one frame of a guide video on a 2D canvas. Every frame is a pure function of time, so the same script gives the
 * same video at any size. No DOM, no fonts to load: system sans only.
 */
import { VIDEO_BEAT, sceneAt, type VideoScene, type VideoScript } from "../core/video";

export type VideoTheme = { brand: string; brandAccent: string; site: string; disclaimer: string; aiLabel: string; bg: string; ink: string; accent: string; muted: string };
export const DEFAULT_VIDEO_THEME: VideoTheme = { brand: "AI Content", brandAccent: "Agent", site: "", disclaimer: "", aiLabel: "", bg: "#0b1220", ink: "#ffffff", accent: "#38bdf8", muted: "#94a3b8" };

export const VIDEO_FORMATS = { square: [1080, 1080], vertical: [1080, 1920], landscape: [1920, 1080] } as const;
export type VideoFormat = keyof typeof VIDEO_FORMATS;

const FONT = '-apple-system, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const prog = (t: number, start: number, dur: number) => clamp((t - start) / dur);

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** Largest size at which the text fits the box in at most `maxLines` lines. */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, max: number, min: number, width: number, maxLines: number): { size: number; lines: string[] } {
  for (let size = max; size >= min; size -= 4) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    const lines = wrap(ctx, text, width);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = `${weight} ${min}px ${FONT}`;
  return { size: min, lines: wrap(ctx, text, width).slice(0, maxLines) };
}

function block(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, size: number, weight: number, color: string, alpha: number, rise: number, align: CanvasTextAlign = "left"): number {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, x, y + rise + i * size * 1.14));
  ctx.restore();
  return lines.length * size * 1.14;
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Loaded pictures by path. A path with no entry is drawn as if the step had no image. */
export type VideoImages = ReadonlyMap<string, HTMLImageElement>;

const isPhoto = (src: string) => /\.jpe?g($|\?)/i.test(src);

/** The card a picture gets inside the space it may use: photos take all of it, other pictures only what they need. */
function cardFor(img: HTMLImageElement, src: string, bw: number, bh: number): { w: number; h: number } {
  if (isPhoto(src)) return { w: bw, h: bh };
  const iw = img.naturalWidth || 1600;
  const ih = img.naturalHeight || 900;
  const full = (bw * ih) / iw;
  // At full width the picture fits: the card is just as tall as the picture.
  if (full <= bh) return { w: bw, h: full };
  // A portrait screenshot keeps its width, so its text stays readable, and is cut at the bottom.
  if (ih > iw) return { w: bw, h: bh };
  // A diagram is shown whole, narrower.
  return { w: (bh * iw) / ih, h: bh };
}

/**
 * A picture in a rounded card. Photos fill the card, cropped around the centre; screenshots and diagrams fill the width
 * and show from their top. `zoom` grows from 1 while the scene plays, so the picture is never quite still.
 */
function picture(ctx: CanvasRenderingContext2D, img: HTMLImageElement, src: string, x: number, y: number, bw: number, bh: number, radius: number, alpha: number, zoom: number) {
  const iw = img.naturalWidth || 1600;
  const ih = img.naturalHeight || 900;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = radius * 1.6;
  ctx.shadowOffsetY = radius * 0.5;
  ctx.fillStyle = "#ffffff";
  round(ctx, x, y, bw, bh, radius);
  ctx.fill();
  ctx.shadowColor = "transparent";
  round(ctx, x, y, bw, bh, radius);
  ctx.clip();
  const photo = isPhoto(src);
  const scale = (photo ? Math.max(bw / iw, bh / ih) : bw / iw) * (photo ? zoom : 1 + (zoom - 1) * 0.4);
  ctx.drawImage(img, x + (bw - iw * scale) / 2, photo ? y + (bh - ih * scale) / 2 : y, iw * scale, ih * scale);
  ctx.restore();
}

/** Draws the frame at time `t` (seconds) into a canvas of `w` × `h` pixels. `images` and `cover` are optional pictures. */
export function drawVideoFrame(ctx: CanvasRenderingContext2D, w: number, h: number, script: VideoScript, scenes: VideoScene[], t: number, theme: VideoTheme = DEFAULT_VIDEO_THEME, images: VideoImages = new Map(), cover?: HTMLImageElement | null): void {
  // A tall frame has room for larger type.
  const u = (Math.min(w, h) / 1080) * (h > w ? 1.18 : 1);
  const pad = Math.round((w > h ? 110 : 80) * u);
  const width = w - pad * 2;
  const { scene, local } = sceneAt(scenes, t);
  // A scene fades in over its first quarter second and out over its last fifth, so cuts dip through the background.
  // The opening scene starts settled, so frame 0 is a readable thumbnail on every platform.
  const opening = scene === scenes[0];
  const alpha = (opening ? 1 : easeOut(prog(local, 0.02, 0.26))) * (1 - prog(local, scene.duration - 0.2, 0.18));
  const rise = opening ? 0 : (1 - easeOut(prog(local, 0.02, 0.32))) * 36 * u;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.88, -h * 0.08, 0, w * 0.88, -h * 0.08, Math.max(w, h) * 0.7);
  glow.addColorStop(0, "rgba(29,58,138,0.55)");
  glow.addColorStop(1, "rgba(29,58,138,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // The article's own cover sits dimmed behind the opening line.
  if (scene.kind === "hook" && cover) {
    const iw = cover.naturalWidth || 1600;
    const ih = cover.naturalHeight || 900;
    const scale = Math.max(w / iw, h / ih) * (1 + 0.06 * (local / scene.duration));
    ctx.save();
    ctx.globalAlpha = 0.34 * (1 - prog(local, scene.duration - 0.2, 0.18));
    ctx.drawImage(cover, (w - iw * scale) / 2, (h - ih * scale) / 2, iw * scale, ih * scale);
    ctx.restore();
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, "rgba(11,18,32,0.55)");
    shade.addColorStop(1, "rgba(11,18,32,0.9)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
  }

  // Brand, top left; the AI label, top right.
  ctx.textBaseline = "top";
  ctx.font = `800 ${Math.round(34 * u)}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillStyle = theme.ink;
  ctx.fillText(theme.brand, pad, pad * 0.62);
  const bw = ctx.measureText(`${theme.brand} `).width;
  ctx.fillStyle = theme.accent;
  ctx.fillText(theme.brandAccent, pad + bw, pad * 0.62);
  if (theme.aiLabel) {
    ctx.font = `600 ${Math.round(24 * u)}px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillStyle = theme.muted;
    ctx.fillText(theme.aiLabel, w - pad, pad * 0.68);
  }

  const top = pad * 1.9;
  const bottom = h - pad * 1.9;
  const mid = (top + bottom) / 2;

  if (scene.kind === "hook" || scene.kind === "promise" || scene.kind === "outro") {
    const big = fit(ctx, scene.title, 800, Math.round(150 * u), Math.round(72 * u), width, w > h ? 3 : 5);
    const height = big.lines.length * big.size * 1.14;
    const color = scene.kind === "promise" ? theme.accent : theme.ink;
    block(ctx, big.lines, w / 2, mid - height / 2 - (scene.kind === "outro" ? 40 * u : 0), big.size, 800, color, alpha, rise, "center");
    if (scene.kind === "outro" && theme.site) {
      const a = easeOut(prog(local, 0.5, 0.3)) * alpha;
      block(ctx, [theme.site], w / 2, mid + height / 2 - 10 * u, Math.round(46 * u), 700, theme.accent, a, 0, "center");
    }
  } else {
    const n = script.steps.length;
    const img = scene.image ? images.get(scene.image) : undefined;
    const wide = w > h;
    const gap = 44 * u;
    // With a picture: beside the text on a wide frame (sides alternate from step to step), above it otherwise.
    const picW = img ? (wide ? width * 0.44 : width) : 0;
    // A square frame has the least room under the picture, so the picture is shorter there.
    const picH = img ? (wide ? bottom - top - 20 * u : (bottom - top) * (h > w ? 0.42 : 0.33)) : 0;
    const picLeft = wide && scene.index % 2 === 1;
    const card = img ? cardFor(img, scene.image!, picW, picH) : { w: 0, h: 0 };
    const picX = wide ? (picLeft ? pad : pad + width - picW) : pad;
    // Beside the text the card sits in the middle of its column; above the text it sits at the top and the text follows it.
    const picY = wide ? top + (picH - card.h) / 2 : top;
    const textX = wide && img && picLeft ? pad + picW + gap : pad;
    const textW = wide && img ? width - picW - gap : width;
    const textTop = !wide && img ? top + card.h + gap * 0.8 : top + 10 * u;
    if (img) {
      const a = easeOut(prog(local, 0.1, 0.34)) * (1 - prog(local, scene.duration - 0.2, 0.18));
      const slide = (1 - easeOut(prog(local, 0.1, 0.4))) * 40 * u * (wide ? (picLeft ? -1 : 1) : 0);
      picture(ctx, img, scene.image!, picX + (picW - card.w) / 2 + slide, picY, card.w, card.h, 26 * u, a, 1 + 0.05 * (local / scene.duration));
    }
    const small = Boolean(img) && !wide;
    const badge = Math.round((small ? 86 : 124) * u);
    const bounce = easeOut(prog(local, 0.02, 0.28));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = theme.accent;
    round(ctx, textX, textTop, badge * (0.7 + 0.3 * bounce), badge * (0.7 + 0.3 * bounce), badge * 0.24);
    ctx.fill();
    ctx.fillStyle = "#04121f";
    ctx.font = `800 ${Math.round(badge * 0.68)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(scene.index + 1), textX + badge / 2, textTop + badge / 2 + 4 * u);
    ctx.restore();
    block(ctx, [`${scene.index + 1} / ${n}`], textX + badge + 28 * u, textTop + badge / 2 - 20 * u, Math.round(36 * u), 600, theme.muted, alpha, 0);
    const title = fit(ctx, scene.title, 800, Math.round((img ? 84 : 104) * u), Math.round(52 * u), textW, wide ? (img ? 3 : 2) : 3);
    const ty = textTop + badge + (small ? 34 : 70) * u;
    const used = block(ctx, title.lines, textX, ty, title.size, 800, theme.ink, alpha, rise);
    const text = fit(ctx, scene.text, 500, Math.round((img ? 48 : 58) * u), Math.round(36 * u), textW, wide ? (img ? 5 : 3) : 5);
    const ta = easeOut(prog(local, 0.3, 0.3)) * (1 - prog(local, scene.duration - 0.2, 0.18));
    block(ctx, text.lines, textX, ty + used + (small ? 22 : 34) * u, text.size, 500, "#cbd5e1", ta, (1 - easeOut(prog(local, 0.3, 0.34))) * 28 * u);
    // Step dots: where we are in the list.
    const dot = 18 * u;
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = i === scene.index ? theme.accent : i < scene.index ? "#1e6fa0" : "#24324d";
      round(ctx, pad + i * (dot * 3.2), bottom + 6 * u, i === scene.index ? dot * 2.6 : dot, dot, dot / 2);
      ctx.fill();
    }
  }

  // The risk line stays on every frame.
  if (theme.disclaimer) {
    ctx.font = `500 ${Math.round(25 * u)}px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = theme.muted;
    wrap(ctx, theme.disclaimer, width).slice(0, 2).reverse().forEach((line, i) => ctx.fillText(line, pad, h - pad * 0.62 - i * 32 * u));
  }
}

/**
 * Music for the video on the same beat grid, built from oscillators so nothing is downloaded. Returns when it ends.
 * `out` is where it plays: the recorder's destination, and the speakers too if you connect them.
 */
export function scheduleVideoMusic(ac: AudioContext, out: AudioNode, startAt: number, duration: number): void {
  const master = ac.createGain();
  master.gain.setValueAtTime(0.5, startAt);
  master.gain.setValueAtTime(0.5, startAt + Math.max(0, duration - 1.2));
  master.gain.linearRampToValueAtTime(0.0001, startAt + duration);
  master.connect(out);
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  const tone = (type: OscillatorType, freq: number, at: number, len: number, gain: number, sweepTo?: number) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, at + len * 0.6);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(g).connect(master);
    osc.start(at);
    osc.stop(at + len + 0.02);
  };
  // A minor, F, C, G: four beats each.
  const chords: [number, number[]][] = [
    [45, [57, 60, 64]],
    [41, [57, 60, 65]],
    [48, [55, 60, 64]],
    [43, [55, 59, 62]],
  ];
  const arp = [0, 1, 2, 1, 0, 2, 1, 2];
  const beats = Math.floor(duration / VIDEO_BEAT);
  for (let b = 0; b < beats; b += 1) {
    const at = startAt + b * VIDEO_BEAT;
    const [root, triad] = chords[Math.floor(b / 4) % 4];
    const drums = b >= 3 && b < beats - 2;
    for (let half = 0; half < 2; half += 1) tone("triangle", hz(triad[arp[(b * 2 + half) % 8]] + 12), at + (half * VIDEO_BEAT) / 2, 0.32, 0.11);
    if (drums) {
      tone("sine", 150, at, 0.26, 0.5, 48);
      tone("sine", hz(root - 12), at, VIDEO_BEAT * 0.9, 0.22);
    }
  }
}

/** Loads same-site pictures for a video. A picture that fails to load is left out, and its step is drawn as text. */
export async function loadVideoImages(paths: string[]): Promise<Map<string, HTMLImageElement>> {
  const out = new Map<string, HTMLImageElement>();
  await Promise.all(
    [...new Set(paths)].map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            out.set(src, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = src;
        })
    )
  );
  return out;
}
