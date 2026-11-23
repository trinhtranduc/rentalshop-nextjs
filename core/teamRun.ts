/** Pure logic of the SEO team run: who the agents are, when a run is due, and the reviewer's fixed checks. */

/** `person` is only a display name, so the diagram reads like a team. */
export const TEAM_AGENTS = [
  { id: "analyse", person: "Linh", phase: "analysis", name: "Phân tích từ khoá", does: "Đồng bộ Search Console (miễn phí) rồi tổng hợp hiện trạng danh sách từ khoá mục tiêu." },
  { id: "site", person: "An", phase: "analysis", name: "Đọc trang hiện tại", does: "Đọc các trang mục tiêu của chính site: mã trả về, title, mô tả, H1, canonical, số từ, liên kết nội bộ." },
  { id: "competitor", person: "Bảo", phase: "analysis", name: "Phân tích đối thủ", does: "Từ kết quả Google đã mua (DataForSEO): site nào giữ top 10 của từ khoá mục tiêu, và đứng trên mình ở đâu." },
  { id: "rank", person: "Khoa", phase: "analysis", name: "Theo dõi thứ hạng", does: "So tuần này với tuần trước, tìm từ khoá mục tiêu bị tụt." },
  { id: "evaluate", person: "Minh", phase: "decide", name: "Đánh giá từ khoá", does: "Dùng Claude đánh giá các từ khoá mục tiêu vừa tụt hạng, kèm đối thủ và hiện trạng trang." },
  { id: "select", person: "Hà", phase: "decide", name: "Chọn lọc và đề xuất", does: "Dùng Claude đề xuất bài nên viết khi danh sách đề xuất gần hết." },
  { id: "write", person: "Quân", phase: "produce", name: "Viết bài", does: "Dùng Claude viết một bản nháp tiếng Anh từ đề xuất cũ nhất, theo chuẩn bài của kế hoạch." },
  { id: "image", person: "Vy", phase: "produce", name: "Tạo hình ảnh", does: "Gắn ảnh bìa chữ theo mẫu thương hiệu cho bản nháp chưa có ảnh bìa. Không phải ảnh minh hoạ; bạn có thể thay." },
  { id: "review", person: "Tùng", phase: "produce", name: "Chấm bài", does: "Chấm hình thức bằng quy tắc cố định; trả bài chưa đạt cho khâu viết sửa một lần; rồi dùng Claude liệt kê điểm cần người kiểm tra." },
  { id: "video", person: "Duy", phase: "produce", name: "Video hướng dẫn", does: "Dùng Claude viết kịch bản video ngắn cho bản nháp đã đạt hình thức. Bạn dựng và tải video ở mục Chờ bạn duyệt." },
  { id: "publish", person: "Mai", phase: "approve", name: "Xuất bản", does: "Không tự đăng. Chỉ báo số bài đang chờ bạn duyệt." },
  { id: "translate", person: "Lan", phase: "approve", name: "Dịch bài", does: "Dùng Claude dịch bài tiếng Anh bạn đã đăng sang các ngôn ngữ đã chọn. Bản dịch là bản nháp, không tự đăng." },
] as const;

/** Languages the translator works in until the owner picks others: the three the site already has indexed. */
export const DEFAULT_TRANSLATE_LOCALES = ["ko", "zh", "hi"] as const;
export const MAX_TRANSLATE_LOCALES = 6;

/** Agents of one phase do not wait for each other, except that the rank tracker reads what the keyword analyst synced. */
export const TEAM_PHASES = [
  { id: "analysis", name: "Phân tích", note: "Chạy song song" },
  { id: "decide", name: "Quyết định", note: "Lần lượt" },
  { id: "produce", name: "Sản xuất", note: "Lần lượt" },
  { id: "approve", name: "Duyệt", note: "Chờ bạn" },
] as const;

/** How the analysis phase runs: each inner list is one track run in order, and the tracks run at the same time. */
export const ANALYSIS_TRACKS = [["analyse", "rank"], ["site"], ["competitor"]] as const;

export type TeamAgentId = (typeof TEAM_AGENTS)[number]["id"];
export const isTeamAgent = (value: unknown): value is TeamAgentId => TEAM_AGENTS.some((a) => a.id === value);

export type TeamFrequency = "off" | "daily" | "weekly" | "biweekly" | "monthly";
/** `day`: 0 Sunday to 6 Saturday. `time`: "HH:MM" in Vietnam time (UTC+7, no daylight saving). */
export type TeamSchedule = { freq: TeamFrequency; day: number; time: string };
export const DEFAULT_SCHEDULE: TeamSchedule = { freq: "off", day: 1, time: "08:00" };

/** Limits of one team run, so cost and the review queue cannot pile up. */
export const RUN_LIMITS = { evaluations: 3, drafts: 1, maxWaitingDrafts: 3, minNewSuggestions: 3, pages: 20, revisions: 1, reviews: 2, draftsPerRun: 3, translations: 4, videoScripts: 1, serpWaitSeconds: 150, agentSerpUsd: 3 } as const;

/** New drafts the writer may add in any 7 days. Two a week is the owner's chosen average; the ops page changes it. */
export const DEFAULT_DRAFTS_PER_WEEK = 2;
export const MAX_DRAFTS_PER_WEEK = 7;
export function parseDraftsPerWeek(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= MAX_DRAFTS_PER_WEEK ? n : null;
}

/** How many drafts one run may write now: what is left of the week's quota, of the run limit, and of the review queue. */
export function draftsToWrite(input: { perWeek: number; writtenLast7Days: number; waiting: number }): number {
  const queueRoom = Math.max(RUN_LIMITS.maxWaitingDrafts, input.perWeek + 2) - input.waiting;
  return Math.max(0, Math.min(input.perWeek - input.writtenLast7Days, RUN_LIMITS.draftsPerRun, queueRoom));
}

const VN = 7 * 3_600_000;
const DAY = 86_400_000;

export function parseSchedule(value: unknown): TeamSchedule | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const freqs: TeamFrequency[] = ["off", "daily", "weekly", "biweekly", "monthly"];
  if (!freqs.includes(v.freq as TeamFrequency)) return null;
  const day = Number(v.day);
  if (!Number.isInteger(day) || day < 0 || day > 6) return null;
  if (typeof v.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time)) return null;
  return { freq: v.freq as TeamFrequency, day, time: v.time };
}

/** The latest scheduled instant at or before `now`; null when the schedule is off. */
export function lastSlot(schedule: TeamSchedule, now: Date): Date | null {
  if (schedule.freq === "off") return null;
  const [h, m] = schedule.time.split(":").map(Number);
  const local = new Date(now.getTime() + VN);
  let slot = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), h, m);
  if (schedule.freq === "monthly") {
    slot = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1, h, m);
    if (slot > local.getTime()) slot = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1, h, m);
  } else if (schedule.freq === "daily") {
    if (slot > local.getTime()) slot -= DAY;
  } else {
    slot -= ((local.getUTCDay() - schedule.day + 7) % 7) * DAY;
    if (slot > local.getTime()) slot -= 7 * DAY;
  }
  return new Date(slot - VN);
}

/** Due when a scheduled instant has passed that no run has covered yet. Biweekly also needs 13 days since the last run. */
export function isDue(schedule: TeamSchedule, lastRunAt: Date | null, now: Date): boolean {
  const slot = lastSlot(schedule, now);
  if (!slot) return false;
  if (lastRunAt && lastRunAt.getTime() >= slot.getTime()) return false;
  if (schedule.freq === "biweekly" && lastRunAt && now.getTime() - lastRunAt.getTime() < 13 * DAY) return false;
  return true;
}

/** The next instant a run will start, for display; null when off. */
export function nextRunAt(schedule: TeamSchedule, lastRunAt: Date | null, now: Date): Date | null {
  if (schedule.freq === "off") return null;
  if (isDue(schedule, lastRunAt, now)) return now;
  for (let i = 1; i <= 70; i += 1) {
    const probe = new Date(now.getTime() + i * DAY);
    const slot = lastSlot(schedule, probe);
    if (slot && slot.getTime() > now.getTime() && isDue(schedule, lastRunAt, slot)) return slot;
  }
  return null;
}

/** The next few instants the schedule will start a run, soonest first; empty when off. */
export function upcomingRuns(schedule: TeamSchedule, lastRunAt: Date | null, now: Date, count = 3): Date[] {
  const out: Date[] = [];
  let last = lastRunAt;
  let from = now;
  while (out.length < count) {
    const next = nextRunAt(schedule, last, from);
    if (!next) break;
    out.push(next);
    last = next;
    from = new Date(next.getTime() + 60_000);
  }
  return out;
}

export type RunRow = { batchId: string; agent: string; trigger: string; status: string; costUsd: number; startedAt: Date; finishedAt: Date | null };
export type RunBatch = { batchId: string; trigger: string; only: string | null; startedAt: string; finishedAt: string | null; seconds: number | null; agents: number; done: number; failed: number; skipped: number; running: number; costUsd: number };

/** Groups agent rows into the runs they belong to, newest first. A run still going has no end time. */
export function groupBatches(rows: RunRow[], limit = 30): RunBatch[] {
  const byBatch = new Map<string, RunRow[]>();
  for (const r of rows) byBatch.set(r.batchId, [...(byBatch.get(r.batchId) ?? []), r]);
  return [...byBatch.entries()]
    .map(([batchId, list]) => {
      const start = Math.min(...list.map((r) => r.startedAt.getTime()));
      const running = list.filter((r) => r.status === "running").length;
      const ends = list.map((r) => r.finishedAt?.getTime() ?? 0);
      const end = running > 0 || ends.every((e) => e === 0) ? null : Math.max(...ends);
      const count = (status: string) => list.filter((r) => r.status === status).length;
      return {
        batchId,
        trigger: list[0].trigger,
        only: list[0].trigger === "single" ? list[0].agent : null,
        startedAt: new Date(start).toISOString(),
        finishedAt: end ? new Date(end).toISOString() : null,
        seconds: end ? Math.max(0, Math.round((end - start) / 1000)) : null,
        agents: list.length,
        done: count("done"),
        failed: count("failed"),
        skipped: count("skipped"),
        running,
        costUsd: Math.round(list.reduce((sum, r) => sum + r.costUsd, 0) * 1000) / 1000,
      };
    })
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, limit);
}

export type ArticleCheck = { id: string; label: string; ok: boolean; detail: string };

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export const FORMAT_LIMITS = { paragraphWords: 110, headingChars: 70, leadWords: 20 } as const;

/**
 * What is wrong with the shape of an article body, in plain words; empty when the shape is right. Shape only: a lead
 * paragraph, sections in order, readable paragraphs, no leftover Markdown or stray markup.
 */
export function formatIssues(content: string): string[] {
  const issues: string[] = [];
  const blocks = [...content.matchAll(/<(h[1-6]|p|ul|ol|table|figure|blockquote|img|hr)\b[^>]*>(?:([\s\S]*?)<\/\1>)?/gi)].map((m) => ({ tag: m[1].toLowerCase(), inner: m[2] ?? "" }));
  const h2At = blocks.findIndex((b) => b.tag === "h2");
  if (h2At === -1) issues.push("bài chưa chia mục H2");
  const lead = blocks[0]?.tag === "p" ? text(blocks[0].inner).split(" ").filter(Boolean).length : 0;
  if (lead < FORMAT_LIMITS.leadWords) issues.push(`chưa có đoạn mở đầu (ít nhất ${FORMAT_LIMITS.leadWords} từ) trước mục đầu tiên`);
  if (/<h1\b/i.test(content)) issues.push("có H1 trong thân bài");
  if (/<h[4-6]\b/i.test(content)) issues.push("có tiêu đề nhỏ hơn H3");
  const h3At = blocks.findIndex((b) => b.tag === "h3");
  if (h3At !== -1 && (h2At === -1 || h3At < h2At)) issues.push("H3 đứng trước H2 đầu tiên");
  const heads = blocks.filter((b) => /^h[1-6]$/.test(b.tag)).map((b) => text(b.inner));
  if (heads.some((h) => h.length === 0)) issues.push("có tiêu đề rỗng");
  const longHead = heads.filter((h) => h.length > FORMAT_LIMITS.headingChars).length;
  if (longHead) issues.push(`${longHead} tiêu đề dài quá ${FORMAT_LIMITS.headingChars} ký tự`);
  if (heads.some((h) => /[:.]$/.test(h))) issues.push("tiêu đề kết thúc bằng dấu chấm hoặc hai chấm");
  if (blocks.some((b, i) => b.tag === "h2" && blocks[i + 1]?.tag === "h2")) issues.push("có mục H2 không có nội dung");
  const longPara = blocks.filter((b) => b.tag === "p" && text(b.inner).split(" ").length > FORMAT_LIMITS.paragraphWords).length;
  if (longPara) issues.push(`${longPara} đoạn dài quá ${FORMAT_LIMITS.paragraphWords} từ`);
  const plain = text(content);
  if (/\*\*[^*]+\*\*|(^|\s)#{2,4}\s|\[[^\]]+\]\([^)]+\)|\|\s*-{3,}/.test(plain)) issues.push("còn ký hiệu Markdown chưa chuyển");
  if (/<hr\b|<br\s*\/?>\s*<br|\sstyle="|<(script|iframe|font|span)\b/i.test(content)) issues.push("có thẻ hoặc kiểu trình bày lạ (hr, br kép, style, span)");
  if (/<p>\s*<\/p>|<li>\s*<\/li>/i.test(content)) issues.push("có đoạn hoặc gạch đầu dòng rỗng");
  return issues;
}

/**
 * The reviewer's fixed checks against the plan's article standard. Rules only, no AI: a pass here means the draft is
 * ready for a person to read, not that its facts are right.
 */
export function lintArticle(post: { title: string; seoDescription: string | null; content: string; thumbnail: string | null; seoKeywords?: string[] }): ArticleCheck[] {
  // The review box the writer puts on top is for the owner, not part of the article.
  const content = post.content.replace(/^\s*<blockquote>(?:(?!<\/blockquote>)[\s\S])*AI DRAFT[\s\S]*?<\/blockquote>/, "");
  const body = text(content);
  const words = body ? body.split(" ").length : 0;
  const format = formatIssues(content);
  const meta = post.seoDescription?.trim() ?? "";
  // On-page SEO. The target keyword is the first of the post's keywords; a keyword counts when all its words are there.
  const keyword = (post.seoKeywords?.[0] ?? "").trim().toLowerCase();
  const words2 = keyword.split(/\s+/).filter((w) => w.length > 1);
  const has = (s: string) => words2.length > 0 && words2.every((w) => s.toLowerCase().includes(w));
  const h2 = [...content.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => text(m[1]));
  const intro = body.split(" ").slice(0, 120).join(" ");
  const links = new Set([...content.matchAll(/<a\b[^>]*?href="(\/(?!\/)[^"#?]*)/gi)].map((m) => m[1].replace(/\/+$/, "") || "/").filter((p) => p !== "/risk"));
  const imgs = [...content.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const noAlt = imgs.filter((t) => !/\balt="[^"]{3,}"/i.test(t)).length;
  const kw = (id: string, label: string, where: string): ArticleCheck => ({ id, label, ok: has(where), detail: keyword ? `từ khoá "${keyword}"` : "bài chưa có từ khoá mục tiêu" });
  return [
    kw("kwTitle", "Từ khoá mục tiêu có trong tiêu đề", post.title),
    kw("kwIntro", "Từ khoá mục tiêu có trong đoạn mở đầu", intro),
    kw("kwMeta", "Từ khoá mục tiêu có trong mô tả", meta),
    kw("kwHeading", "Từ khoá mục tiêu có trong một tiêu đề H2", h2.join(" | ")),
    { id: "headings", label: "Ít nhất 4 mục H2", ok: h2.length >= 4, detail: `${h2.length} mục` },
    { id: "links", label: "Ít nhất 3 liên kết nội bộ", ok: links.size >= 3, detail: `${links.size} liên kết` },
    { id: "images", label: "Có hình trong bài, đều có alt", ok: imgs.length >= 1 && noAlt === 0, detail: imgs.length === 0 ? "chưa có hình" : noAlt ? `${noAlt}/${imgs.length} hình thiếu alt` : `${imgs.length} hình` },
    { id: "title", label: "Tiêu đề tối đa 60 ký tự", ok: post.title.length > 0 && post.title.length <= 60, detail: `${post.title.length} ký tự` },
    { id: "meta", label: "Mô tả có và tối đa 155 ký tự", ok: meta.length > 0 && meta.length <= 155, detail: meta ? `${meta.length} ký tự` : "chưa có" },
    { id: "cover", label: "Có ảnh bìa", ok: Boolean(post.thumbnail?.trim()), detail: post.thumbnail?.trim() ? "có" : "chưa có" },
    { id: "takeaways", label: "Có khối tóm tắt đầu bài", ok: /key takeaways|in short|tóm tắt/i.test(body.slice(0, 1500)), detail: "tìm trong 1.500 ký tự đầu" },
    { id: "faq", label: "Có FAQ cuối bài", ok: /<h[23][^>]*>[^<]*(faq|frequently asked|câu hỏi thường gặp)/i.test(content), detail: "tìm tiêu đề FAQ" },
    { id: "disclosure", label: "Có dòng công bố affiliate", ok: /affiliate|we (may )?earn|commission|hoa hồng/i.test(body), detail: "tìm theo từ khoá, cần người đọc lại" },
    { id: "risk", label: "Có link tới trang rủi ro", ok: /href="[^"]*\/risk["#/?]/i.test(content) || /href="[^"]*\/risk"/i.test(content), detail: "/risk" },
    { id: "length", label: "Ít nhất 600 từ", ok: words >= 600, detail: `${words.toLocaleString("vi-VN")} từ` },
    { id: "format", label: "Định dạng bài đúng chuẩn", ok: format.length === 0, detail: format.length ? format.join("; ") : "đoạn mở đầu, mục, đoạn văn đều đúng" },
  ];
}

export type WatchState = { total: number; top3: number; top10: number; top20: number; beyond: number; none: number; noTarget: number; wrongPage: number; noVolume: number };

/** Where the target keywords stand now, counted from stored numbers. */
export function watchState(items: { status: "none" | "top3" | "top10" | "top20" | "beyond"; targetPath: string | null; rankingMatchesTarget: boolean | null; volume: number | null }[]): WatchState {
  const count = (s: string) => items.filter((i) => i.status === s).length;
  return {
    total: items.length,
    top3: count("top3"),
    top10: count("top10"),
    top20: count("top20"),
    beyond: count("beyond"),
    none: count("none"),
    noTarget: items.filter((i) => !i.targetPath).length,
    wrongPage: items.filter((i) => i.rankingMatchesTarget === false).length,
    noVolume: items.filter((i) => i.volume === null).length,
  };
}
