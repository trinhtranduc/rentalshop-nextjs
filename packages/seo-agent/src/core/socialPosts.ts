/**
 * Proposed posts for social platforms, written from one source text (an article, or a video's narration): the shape of a
 * post, each platform's limits, the checks a proposal must pass, and the exact text a person copies. Nothing here calls
 * an AI, stores anything or posts anywhere: the host asks its model with `SOCIAL_POST_RULES` and `socialPostBrief`,
 * passes the answer to `parseSocialPosts`, and shows `socialPostCopy` to a person who publishes by hand.
 *
 * Limits are the platforms' own where they publish one (YouTube title and tags, X post, Reddit title, Instagram and
 * TikTok captions), kept on the safe side; hashtag counts are editorial choices, not platform rules.
 */
import { numbersNotIn } from "./video";

export type SocialPlatform = "youtube" | "tiktok" | "instagram" | "facebook" | "x" | "reddit";
export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = ["youtube", "tiktok", "instagram", "facebook", "x", "reddit"];
export const SOCIAL_PLATFORM_NAME: Record<SocialPlatform, string> = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook", x: "X", reddit: "Reddit" };

/** One proposed post. Fields a platform does not have are empty. */
export type SocialPost = {
  platform: SocialPlatform;
  /** YouTube and Reddit. */
  title: string;
  /** The description, caption or post text; empty for X, whose text is the thread. */
  body: string;
  /** Without "#". */
  hashtags: string[];
  /** YouTube tags. */
  tags: string[];
  /** X: the posts of the thread, in order. */
  thread: string[];
  /** A first comment to pin or add under the post; "" for none. */
  comment: string;
  /** Reddit: communities worth a look, each with the reason. The person checks each one's rules before posting. */
  communities: { name: string; why: string }[];
  /** Advice for the person, not part of the post. */
  note: string;
};
export type SocialPostInput = Partial<Omit<SocialPost, "platform">> & { platform: SocialPlatform };
/** One text to copy and paste. `label` is "title", "body", "tags", "comment", or "2/5" for a post of an X thread. */
export type SocialCopyPart = { label: string; text: string };

/** Where the link to the published article or video goes; replaced once the host knows the link. */
export const SOCIAL_LINK = "{link}";
/** X counts every link as 23 characters, whatever its length. */
const X_LINK = 23;

type Limit = { title: number; body: number; hashtags: number; tags: number; thread: number; post: number; communities: number };
export const SOCIAL_LIMITS: Record<SocialPlatform, Limit> = {
  youtube: { title: 100, body: 4500, hashtags: 3, tags: 500, thread: 0, post: 0, communities: 0 },
  tiktok: { title: 0, body: 2200, hashtags: 5, tags: 0, thread: 0, post: 0, communities: 0 },
  instagram: { title: 0, body: 2200, hashtags: 5, tags: 0, thread: 0, post: 0, communities: 0 },
  facebook: { title: 0, body: 2000, hashtags: 3, tags: 0, thread: 0, post: 0, communities: 0 },
  x: { title: 0, body: 0, hashtags: 0, tags: 0, thread: 8, post: 280, communities: 0 },
  reddit: { title: 300, body: 8000, hashtags: 0, tags: 0, thread: 0, post: 0, communities: 5 },
};

const chars = (s: string) => [...s].length;
const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
/** Length as X counts it: a link (or its placeholder) is 23. */
export const xLength = (s: string) => chars(s.replace(/https?:\/\/\S+/g, "x".repeat(X_LINK)).split(SOCIAL_LINK).join("x".repeat(X_LINK)));

const block = (s: string) =>
  s
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const hashtag = (s: string) => s.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
const unique = (list: string[]) => [...new Map(list.filter(Boolean).map((x) => [x.toLowerCase(), x])).values()];
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const text = (v: unknown) => (typeof v === "string" ? v : "");

/** Tidies a post as a model wrote it: one spelling of hashtags (no "#"), no field a platform does not have. */
export function cleanSocialPost(raw: SocialPostInput): SocialPost {
  const lim = SOCIAL_LIMITS[raw.platform];
  return {
    platform: raw.platform,
    title: lim.title ? tidy(raw.title ?? "") : "",
    body: lim.body ? block(raw.body ?? "") : "",
    hashtags: lim.hashtags ? unique((raw.hashtags ?? []).map(hashtag)) : [],
    tags: lim.tags ? unique((raw.tags ?? []).map((t) => tidy(t.replace(/,/g, " ")))) : [],
    thread: lim.thread ? (raw.thread ?? []).map(block).filter(Boolean) : [],
    comment: block(raw.comment ?? ""),
    communities: lim.communities ? (raw.communities ?? []).map((c) => ({ name: tidy(c.name).replace(/^\/?(r\/)?/i, "r/"), why: tidy(c.why) })).filter((c) => c.name.length > 2) : [],
    note: block(raw.note ?? ""),
  };
}

const hashLine = (p: SocialPost) => p.hashtags.map((h) => `#${h}`).join(" ");
/** Everything a reader of the post would see (not the note, which is for the person posting). */
const published = (p: SocialPost) => [p.title, p.body, ...p.thread, p.comment].filter(Boolean).join("\n");

const HYPE = /guarantee|risk[- ]?free|sure (profit|win)|can'?t lose|get rich|100% (profit|win)|chắc chắn (lãi|thắng)|không rủi ro|cam kết lợi nhuận/i;
const CLOCK = /(^|\s)\d{1,2}:\d{2}(\s|$)/m;

/**
 * What is wrong with a post, in words a model (or a person) can act on. With `source`, a post may not state a number
 * the source never states: a post introduces no figure of its own.
 */
export function checkSocialPost(p: SocialPost, source?: string): string[] {
  const lim = SOCIAL_LIMITS[p.platform];
  const out: string[] = [];
  if (lim.title) {
    if (!p.title) out.push("title is empty");
    else if (chars(p.title) > lim.title) out.push(`title is ${chars(p.title)} characters; the limit is ${lim.title}`);
  }
  if (lim.body) {
    const whole = [p.body, hashLine(p)].filter(Boolean).join("\n\n");
    if (!p.body) out.push("body is empty");
    else if (chars(whole) > lim.body) out.push(`body with its hashtags is ${chars(whole)} characters; the limit is ${lim.body}`);
  }
  if (p.hashtags.length > lim.hashtags) out.push(`${p.hashtags.length} hashtags; use at most ${lim.hashtags}`);
  if (lim.tags && p.tags.join(",").length > lim.tags) out.push(`tags are ${p.tags.join(",").length} characters together; the limit is ${lim.tags}`);
  if (lim.thread) {
    if (!p.thread.length) out.push("thread is empty");
    if (p.thread.length > lim.thread) out.push(`${p.thread.length} posts in the thread; use at most ${lim.thread}`);
    p.thread.forEach((t, i) => {
      if (xLength(t) > lim.post) out.push(`thread post ${i + 1} is ${xLength(t)} characters; the limit is ${lim.post}`);
    });
  }
  if (p.communities.length > lim.communities) out.push(`${p.communities.length} communities; name at most ${lim.communities}`);
  const shown = published(p);
  // A time the model wrote is a guess: the host adds the real chapter list.
  if (CLOCK.test(shown)) out.push("contains a timestamp; leave timestamps out");
  if (HYPE.test(shown)) out.push("promises a result (guarantee, risk-free, sure profit); remove the promise");
  if (source !== undefined) {
    const extra = [...new Set(numbersNotIn(shown.split(SOCIAL_LINK).join(" "), source))];
    if (extra.length) out.push(`states numbers the source does not: ${extra.slice(0, 6).join(", ")}; remove them`);
  }
  return out;
}

/**
 * The texts the person copies for a post, one per part, with the link in place when it is known. `chapters` (lines of
 * "0:00 Title", measured by the host) are added to the YouTube description only.
 */
export function socialPostCopy(p: SocialPost, opts: { link?: string; chapters?: string } = {}): SocialCopyPart[] {
  const parts: SocialCopyPart[] = [];
  const add = (label: string, t: string) => {
    if (t.trim()) parts.push({ label, text: opts.link ? t.trim().split(SOCIAL_LINK).join(opts.link) : t.trim() });
  };
  if (p.title) add("title", p.title);
  if (p.platform === "x") p.thread.forEach((t, i) => add(`${i + 1}/${p.thread.length}`, t));
  else add("body", [p.body, p.platform === "youtube" ? (opts.chapters ?? "").trim() : "", hashLine(p)].filter(Boolean).join("\n\n"));
  if (p.tags.length) add("tags", p.tags.join(", "));
  add("comment", p.comment);
  return parts;
}

/** Only an http(s) link; "" clears it; null when it is not a link. */
export function cleanSocialLink(raw: string): string | null {
  const s = raw.trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Reads a model's answer ({ posts: [...] }, as an object or JSON text, with or without a code fence). Posts that pass
 * every check are returned; the others are listed in `problems` ("X: thread post 2 is 301 characters…") so the host can
 * send them back to be rewritten. Platforms outside `wanted` are ignored; a platform given twice keeps the first good one.
 */
export function parseSocialPosts(raw: unknown, opts: { source?: string; wanted?: readonly SocialPlatform[] } = {}): { posts: SocialPost[]; problems: string[]; missing: SocialPlatform[] } {
  const wanted = opts.wanted?.length ? SOCIAL_PLATFORMS.filter((x) => opts.wanted!.includes(x)) : [...SOCIAL_PLATFORMS];
  let value: unknown = raw;
  if (typeof raw === "string") {
    const json = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    try {
      value = JSON.parse(json.slice(json.indexOf("{"), json.lastIndexOf("}") + 1));
    } catch {
      return { posts: [], problems: ["the answer is not JSON"], missing: wanted };
    }
  }
  const list = value && typeof value === "object" && Array.isArray((value as { posts?: unknown }).posts) ? ((value as { posts: unknown[] }).posts as unknown[]) : [];
  const good = new Map<SocialPlatform, SocialPost>();
  const problems: string[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const platform = text(o.platform).toLowerCase() as SocialPlatform;
    if (!wanted.includes(platform) || good.has(platform)) continue;
    const communities = Array.isArray(o.communities) ? o.communities.flatMap((c) => (c && typeof c === "object" ? [{ name: text((c as Record<string, unknown>).name), why: text((c as Record<string, unknown>).why) }] : [])) : [];
    const post = cleanSocialPost({ platform, title: text(o.title), body: text(o.body), hashtags: strings(o.hashtags), tags: strings(o.tags), thread: strings(o.thread), comment: text(o.comment), communities, note: text(o.note) });
    const wrong = checkSocialPost(post, opts.source);
    if (wrong.length) problems.push(`${SOCIAL_PLATFORM_NAME[platform]}: ${wrong.join("; ")}`);
    else good.set(platform, post);
  }
  return { posts: wanted.flatMap((x) => (good.has(x) ? [good.get(x)!] : [])), problems, missing: wanted.filter((x) => !good.has(x)) };
}

/** The shape to ask a model for (JSON Schema), for structured outputs or a tool's input. */
export const SOCIAL_POSTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["posts"],
  properties: {
    posts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["platform", "title", "body", "hashtags", "tags", "thread", "comment", "communities", "note"],
        properties: {
          platform: { type: "string", enum: [...SOCIAL_PLATFORMS] },
          title: { type: "string", description: "YouTube and Reddit only; empty elsewhere." },
          body: { type: "string", description: "Description, caption or post text. Empty for X." },
          hashtags: { type: "array", items: { type: "string" }, description: "Without #. None for X and Reddit." },
          tags: { type: "array", items: { type: "string" }, description: "YouTube only." },
          thread: { type: "array", items: { type: "string" }, description: "X only: the posts of the thread, in order." },
          comment: { type: "string", description: "A first comment to pin or add; empty for none." },
          communities: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "why"], properties: { name: { type: "string" }, why: { type: "string" } } }, description: "Reddit only." },
          note: { type: "string", description: "Advice for the person, not part of the post." },
        },
      },
    },
  },
} as const;

/** The writing rules, as a system prompt. They hold for any site; the host adds its own voice and compliance rules after them. */
export const SOCIAL_POST_RULES = `You propose what a person posts on each social platform to go with a finished piece (an article or a narrated video). You publish nothing: the person reads your proposals, copies them and posts them, so write text that is ready to paste, with no placeholders other than ${SOCIAL_LINK} and no notes to the person inside a post.

Answer with JSON only: { "posts": [ one object per platform asked for ] }. Each object has platform, title, body, hashtags, tags, thread, comment, communities, note; leave a field empty when the platform does not use it.

What every post must respect
- Write in the language named in the brief.
- Claim only what the source says. No new fact, date, number or quotation, and no promise the piece does not keep. Never promise a result or a profit.
- Each platform gets its own text, written for how people read there. Never the same paragraph pasted on every platform.
- Open with the question or the tension, not with "In this video" or "New post".
- No timestamps. No emoji walls, no "like and subscribe", no hashtags inside sentences. Hashtags go in "hashtags" without #: specific ones a person would search, not #fyp or #viral.
- When pictures or voice were made by AI, do not present them as real; in "note", remind the person to switch on the platform's label for AI-made content where the platform has one.

YouTube: "title" aims for 60 characters or fewer (limit 100) with the subject in the first words. "body": the first two lines show before "more", so they carry the question the piece answers; then a short paragraph on what it covers. At most 3 hashtags. "tags": 8 to 15 phrases people search, most specific first. "comment": a question to pin that invites a real answer.

TikTok and Instagram: "body" is one or two lines that make someone stop, then one line of context. 3 to 5 hashtags.

Facebook: "body" is two or three short paragraphs that tell the opening and stop at the question, then ${SOCIAL_LINK} on its own line. At most 3 hashtags, or none.

X: "thread" of 3 to 6 posts, each at most 280 characters (a link counts as 23). The first post is the hook and must stand alone; each later post is one point of the piece, not a summary; the last carries ${SOCIAL_LINK}.

Reddit: Reddit punishes promotion, so write a post a reader would value even if they never click. "title": a plain, specific statement or question, no clickbait. "body": the substance in three to five paragraphs in your own words, then one honest closing line saying where the full piece is, with ${SOCIAL_LINK}. "communities": up to 5 large communities where the subject belongs, each with one sentence on why; name only communities you are sure exist, and fewer when unsure. "note": say that every community has its own rules on self-promotion, AI content and link posts, and that the person must read them first.`;

const limitLine = (p: SocialPlatform) => {
  const l = SOCIAL_LIMITS[p];
  return [
    `${SOCIAL_PLATFORM_NAME[p]}:`,
    l.title ? `title ≤ ${l.title} characters;` : "",
    l.body ? `body with hashtags ≤ ${l.body} characters;` : "",
    l.thread ? `thread of at most ${l.thread} posts, each ≤ ${l.post} characters;` : "",
    l.tags ? `tags ≤ ${l.tags} characters together;` : "",
    `hashtags ≤ ${l.hashtags}${l.communities ? `; communities ≤ ${l.communities}` : ""}`,
  ]
    .filter(Boolean)
    .join(" ");
};

export type SocialBrief = {
  /** What the piece is, e.g. "article" or "narrated video, 9:16, 0:32". */
  kind: string;
  title: string;
  /** The language of every post, e.g. "English" or "Vietnamese". */
  language: string;
  /** The article text or the narration: the only source for what a post may claim. */
  source: string;
  platforms?: readonly SocialPlatform[];
  /** Site rules, a change the person asked for, or anything else the writer needs. */
  notes?: string;
  /** Problems from an earlier answer (`parseSocialPosts().problems`), to have only those posts rewritten. */
  fix?: string[];
};

/** The user message for one piece. */
export function socialPostBrief(b: SocialBrief): string {
  const platforms = b.platforms?.length ? SOCIAL_PLATFORMS.filter((x) => b.platforms!.includes(x)) : [...SOCIAL_PLATFORMS];
  return [
    `Piece: ${b.kind}, «${tidy(b.title)}». Language of every post: ${b.language}.`,
    `Write a post for: ${platforms.map((x) => SOCIAL_PLATFORM_NAME[x]).join(", ")}.`,
    "",
    "Limits (a post over a limit is refused):",
    ...platforms.map(limitLine),
    b.notes ? `\n${b.notes.trim()}` : "",
    b.fix?.length ? `\nYour earlier answer was refused for these; rewrite only them:\n${b.fix.map((f) => `- ${f}`).join("\n")}` : "",
    "",
    "Source (the only basis for what a post may claim):",
    b.source.trim(),
  ]
    .filter((l, i, all) => l !== "" || (i > 0 && all[i - 1] !== ""))
    .join("\n");
}
