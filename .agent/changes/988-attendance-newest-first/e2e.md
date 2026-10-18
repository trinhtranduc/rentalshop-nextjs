# Web E2E — attendance newest-first and location badges

**Historical run before #991:** the rejected-filter expectations below are superseded by ../991-attendance-recorded-events/e2e.md.

Date: 2026-10-15. Result: **10/10 manual UI E2E checks passed**.

Actual Next.js client at http://127.0.0.1:3374 and real API at http://127.0.0.1:3286 against dedicated local PostgreSQL database `anyrent_att0850_20261015`. UI actions used the visible Cốc Cốc browser. No API mocks or static UI fixtures in this run. Source hashes of the model, locations page and person page match worktree commit `bd1f6b8a0`.

Account: merchant2@example.com (MERCHANT), merchant 2. Person: Staff Outlet 2, userId 1004, outletId 2, October 2026.

| Check | Result | Evidence |
|---|---|---|
| Login through the real form | PASS | Merchant 2 dashboard loaded after login |
| Generated QR with missing coordinates | PASS | Main Branch shows amber “Chưa đặt vị trí” alongside “Có mã QR · cố định” |
| Configured outlet | PASS | Outlet 4 shows green “Đã đặt vị trí” and its daily QR status |
| Configure and save through UI | PASS | Mở → Chọn trên bản đồ → select point → Lưu → confirmation; success toast; return to list shows green badge. SQL confirms outlet 2 configured and QR remains FIXED |
| Newest work day first | PASS | Person history groups: 15/10, 14/10, 13/10 |
| Newest event time first | PASS | Within 15/10: 09:28:46, 09:28:45, 09:28:45, 08:58:12, 08:58:11, then 08:50:29 events |
| Rejected filter | PASS | Only rejected events displayed, newest 09:28:46 first |
| Suspected filter empty state | PASS | “Không có lượt quét nào.” for this dataset |
| Restore all filter | PASS | Full history returns with the same descending order |
| Edit control still targets the right record | PASS | Click Sửa beside E2E 13:00–17:00 row; dialog shows Staff Outlet 2, 15/10, 13:00 and 17:00; cancelled without editing |

Visual screenshots and accessibility trees were inspected during the run for the actual locations list, map configuration, and person history. Screenshots appear in the tool conversation.

Environment setup issues resolved before signoff: selected an unused client port, declared the exact client origin with CORS_ORIGINS on the local API, installed the already-declared leaflet@1.9.4 into temporary client dependencies. No product source or lockfile changed during this E2E turn.

Scope: web behavior for issues #988 and #989. No physical mobile scan, store app, deployed production account or production data was exercised or modified.
