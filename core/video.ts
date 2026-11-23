/**
 * Pure parts of a short guide video: the script shape, its timing on one beat grid, and the limits that keep it readable.
 * Nothing here calls an AI or draws anything; `ui/videoRender.ts` draws a frame from this.
 */

/** `image` is a path the host listed as usable; absent when the step is text only. */
export type VideoStep = { title: string; text: string; image?: string };
export type VideoScript = {
  /** The question or claim of the first two seconds. */
  hook: string;
  /** What the viewer gets, in one line. */
  promise: string;
  steps: VideoStep[];
  outro: string;
  /** Text to post with the video. */
  caption: string;
};

export const VIDEO_LIMITS = { hookWords: 9, promiseWords: 13, titleWords: 6, textWords: 13, outroWords: 11, minSteps: 3, maxSteps: 5, captionChars: 400, maxSeconds: 32 } as const;
/** 100 beats a minute: every scene starts on a beat, and so does the music. */
export const VIDEO_BEAT = 0.6;

export type VideoScene = { kind: "hook" | "promise" | "step" | "outro"; index: number; start: number; duration: number; title: string; text: string; image?: string };

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
/** Seconds a line needs: an entrance, then about 0.3 s a word, between 1.8 s and 6 s; rounded up to whole beats. */
export function holdSeconds(text: string, extra = 0): number {
  const raw = Math.min(6, Math.max(1.8, 0.6 + words(text) * 0.28 + extra));
  return Math.round(Math.ceil(raw / VIDEO_BEAT - 1e-9) * VIDEO_BEAT * 1000) / 1000;
}

/** The scenes in order with start times. Steps hold longer because they carry a title and a line. */
export function videoTimeline(script: VideoScript): { scenes: VideoScene[]; duration: number } {
  const scenes: VideoScene[] = [];
  let at = 0;
  const push = (kind: VideoScene["kind"], index: number, title: string, text: string, extra = 0, image?: string) => {
    const duration = holdSeconds(`${title} ${text}`, extra);
    scenes.push({ kind, index, start: Math.round(at * 1000) / 1000, duration, title, text, ...(image ? { image } : {}) });
    at += duration;
  };
  push("hook", 0, script.hook, "");
  push("promise", 0, script.promise, "");
  // A picture needs a moment of its own on top of the reading time.
  script.steps.forEach((s, i) => push("step", i, s.title, s.text, s.image ? 0.9 : 0.3, s.image));
  push("outro", 0, script.outro, "", 0.9);
  return { scenes, duration: Math.round(at * 1000) / 1000 };
}

/** The scene on screen at time `t` and how far into it we are (0 to 1). */
export function sceneAt(scenes: VideoScene[], t: number): { scene: VideoScene; local: number; progress: number } {
  const scene = [...scenes].reverse().find((s) => t >= s.start) ?? scenes[0];
  const local = Math.max(0, t - scene.start);
  return { scene, local, progress: Math.min(1, local / scene.duration) };
}

const BANNED = /guarantee|risk[- ]?free|sure (profit|win)|can'?t lose|get rich|100% (profit|win)|chắc chắn (lãi|thắng)|không rủi ro|cam kết lợi nhuận/i;
const clip = (s: string, maxWords: number) => s.trim().replace(/\s+/g, " ").split(" ").slice(0, maxWords).join(" ");

/** Numbers written in `text` that the source never states. A video may not introduce a figure of its own. */
export function numbersNotIn(text: string, source: string): string[] {
  const norm = (s: string) => s.replace(/[.,](?=\d{3}\b)/g, "");
  const have = new Set(norm(source).match(/\d+(?:[.,]\d+)?/g) ?? []);
  return (norm(text).match(/\d+(?:[.,]\d+)?/g) ?? []).filter((n) => !have.has(n));
}

/**
 * Trims every line to its limit and drops what may not be shown: hype, any step that states a number the article does
 * not, and any image that is not in `images`. Null when too little is left to make a video.
 */
export function cleanVideoScript(raw: { hook: string; promise: string; steps: VideoStep[]; outro: string; caption: string }, source: string, images: ReadonlySet<string> = new Set()): VideoScript | null {
  const ok = (s: string) => s.trim().length > 0 && !BANNED.test(s) && numbersNotIn(s, source).length === 0;
  const hook = clip(raw.hook, VIDEO_LIMITS.hookWords);
  const promise = clip(raw.promise, VIDEO_LIMITS.promiseWords);
  const outro = clip(raw.outro, VIDEO_LIMITS.outroWords);
  const steps = raw.steps
    .map((s): VideoStep => {
      const image = (s.image ?? "").trim();
      return { title: clip(s.title, VIDEO_LIMITS.titleWords), text: clip(s.text, VIDEO_LIMITS.textWords), ...(image && images.has(image) ? { image } : {}) };
    })
    .filter((s) => ok(s.title) && ok(s.text))
    .slice(0, VIDEO_LIMITS.maxSteps);
  if (!ok(hook) || !ok(promise) || !ok(outro) || steps.length < VIDEO_LIMITS.minSteps) return null;
  const shown = new Set<string>();
  for (const s of steps) {
    if (s.image && shown.has(s.image)) delete s.image;
    else if (s.image) shown.add(s.image);
  }
  const caption = BANNED.test(raw.caption) || numbersNotIn(raw.caption, source).length > 0 ? "" : raw.caption.trim().replace(/\s+/g, " ").slice(0, VIDEO_LIMITS.captionChars);
  const script = { hook, promise, steps, outro, caption };
  // Too long to hold attention: drop steps from the end until it fits.
  while (script.steps.length > VIDEO_LIMITS.minSteps && videoTimeline(script).duration > VIDEO_LIMITS.maxSeconds) script.steps.pop();
  return script;
}
