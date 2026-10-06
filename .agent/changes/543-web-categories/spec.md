# Spec — #543 Danh mục

Issue: #543 · Status: accepted · Intent: ./intent.md

## Page

1. Container like Nhân viên (`max-w-[1280px]`, 16px gutter on phones). Title "Danh mục · {total}" (count once loaded).
2. "Thêm danh mục" (primary) only when `usePermissions().canManageProducts` (as today).
3. Card: search box (Vietnamese placeholder "Tìm tên danh mục", debounced 300 ms → `?q=`, page reset),
   then the table: Tên (sortable, "Mặc định" tag on the default category), Mô tả ("—" when empty),
   Ngày tạo (sortable, `dd/MM/yyyy HH:mm` in Vietnam time), actions.
4. Actions per row: "Sửa" button and ⋯ menu (Xem chi tiết, Xoá) for `canManageProducts`; Xoá is hidden on the
   default category; without `canManageProducts` only "Xem". Clicking the name opens Xem chi tiết.
5. Under 768px the table becomes a list (name, description, date, actions).
6. URL: `q`, `sortBy` (`name` | `createdAt`, default `name`), `sortOrder` (default `asc`), `page`, `limit` (10/20/50/100, default 20).
   Paging footer shows when total > limit or page > 1.
7. Loading: skeleton rows; error: message + "Thử lại"; empty: "Chưa có danh mục" or "Không có danh mục khớp" with a search.

## Dialogs (shell `Modal`, themed)

8. Thêm / Sửa: Tên (required, 2–50 chars after trim), Mô tả (≤ 200, counter). Errors shown under the field with the
   existing `categories.validation.*` texts. Saving disables the buttons; success toast `messages.createSuccess` /
   `updateSuccess` (as today), then refetch. API errors: global handler (as today), dialog stays open.
9. Xem chi tiết: name, description, created date; "Sửa" from there for managers.
10. Xoá: confirm with the name; success toast `messages.deleteSuccess`; refetch.

## Model (`categories-model.ts`, pure)

`parseCategoryParams`, `validateCategory`, `formatCreatedAt`, `rowActions`.

## Out of scope

Activate / deactivate (hidden today), product counts, nav labels.
