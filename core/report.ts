import type { StageDef, TeamDataSource, TeamMonths, TeamReport } from "./types";
import { bucketsFor, countByBucket, teamWindow } from "./window";

/** The pipeline, in order. A host may pass its own list to rename stages; ids must stay. */
export const STAGES: StageDef[] = [
  { id: "analyse", title: "Phân tích từ khoá", does: "Thu số liệu: lượt tìm, độ khó, thứ hạng hiện tại của site." },
  { id: "evaluate", title: "Đánh giá từ khoá", does: "Đọc số liệu của từng từ khoá và đề xuất cách nâng hạng." },
  { id: "select", title: "Chọn lọc từ khoá", does: "Quyết định từ khoá nào đáng theo đuổi và gắn trang mục tiêu." },
  { id: "write", title: "Tạo bài viết", does: "Đề xuất ý tưởng bài, viết bản nháp tiếng Anh, dịch sang các ngôn ngữ khác." },
  { id: "image", title: "Tạo hình ảnh", does: "Chuẩn bị ảnh bìa và ảnh minh hoạ cho bài." },
  { id: "review", title: "Đánh giá bài viết", does: "Kiểm tra bản nháp trước khi đăng: số liệu, nguồn, chất lượng." },
  { id: "publish", title: "Xuất bản", does: "Đăng bài lên site và gửi cho công cụ tìm kiếm." },
];

/** Loads every stage from the host and turns its event dates into a per-bucket series. */
export async function buildTeamReport(source: TeamDataSource, months: TeamMonths, now: Date = new Date(), stages: StageDef[] = STAGES): Promise<TeamReport> {
  const window = teamWindow(months, now);
  const buckets = bucketsFor(window);
  const data = await source.load(window);
  return {
    months,
    from: window.from.toISOString(),
    to: window.to.toISOString(),
    bucketKind: months === 1 ? "week" : "month",
    buckets: buckets.map((b) => ({ label: b.label, from: b.from.toISOString(), to: b.to.toISOString() })),
    stages: stages.map((def, i) => {
      const { events, ...rest } = data[def.id];
      const latest = events.reduce<number | null>((max, d) => (max === null || d.getTime() > max ? d.getTime() : max), null);
      return { ...def, ...rest, n: i + 1, series: countByBucket(events, buckets), lastAt: latest === null ? null : new Date(latest).toISOString() };
    }),
  };
}
