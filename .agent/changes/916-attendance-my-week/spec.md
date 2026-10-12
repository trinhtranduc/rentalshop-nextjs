# #916 Spec

## Data (origin/dev, unchanged)
`rows[]` of `people/[userId]/month` holds scans (`IN`/`OUT`, `ACCEPTED`/`REJECTED`, `recordId`), auto-closes
(`OUT`, `AUTO_CLOSED`, `recordId`) and edits: `{ at, kind: "EDIT", result: "EDITED", recordId, before, after }`.
`after = { checkInAt, checkOutAt, status, dateKey? }` (ISO instants). A manual add has `before: null` and
`after.dateKey`. Rows are in time order, so the last EDIT of a record holds its current times.

## Rule (both apps)
1. Pairs from accepted scans by `recordId` (as before).
2. For every record with an EDIT row, the last EDIT's `after.checkInAt` / `after.checkOutAt` replace the pair's
   times (a record with no scans becomes a new pair). Late minutes and break come from the IN scan when there is
   one; a manual record has none (0 late, 0 break).
3. The day of a pair: the row's own `dateKey` when present (added to every row by #918, optional so the apps work
   before and after it), else the EDIT's `after.dateKey`, else the shop day of its check-in time (as before).
4. An edited record with an OUT is no longer "missing out" (Android `?`).
5. Rows without `recordId` or with an unreadable `after` are ignored (old behaviour).

## Copy (Android = iOS)
| key | vi | en |
|---|---|---|
| module off title | Shop chưa bật Chấm công | Attendance is not turned on |
| module off message | Liên hệ chủ shop để bật Chấm công. | Ask the shop owner to turn on Attendance. |
| not configured title | Chi nhánh chưa cài chấm công | Attendance is not set up for this outlet |
| not configured message | Nhờ chủ shop cài vị trí và mã QR cho chi nhánh. | Ask the shop owner to set the outlet location and QR code. |
| no location title | Chưa định vị chính xác | Location not precise yet |
| no location message | Không lấy được vị trí. Ra gần cửa rồi thử lại. | Could not get your location. Move near the door and try again. |

## API
No change. No `.agent/api-changes/LOG.md` row (mobile only).
