# Plan — #1553 thêm ngôn ngữ

Status: accepted (quyết định trong `intent.md`, decision log)

Mỗi giai đoạn là một hoặc vài PR vào `dev`, mỗi PR có issue con. Ví dụ dưới đây dùng đợt 1 là `ja`, `ko`, `zh`.

## Giai đoạn 0 — Quyết định (anh)

- Ngôn ngữ và thứ tự.
- Người duyệt bản dịch.
- Ngôn ngữ shop có mở rộng không.
- App làm cùng đợt hay sau.

## Giai đoạn 1 — Nền (khách chưa thấy gì đổi)

| PR | Việc | File chính | Skill | Kiểm tra |
|---|---|---|---|---|
| 1.1 (#1554) | `APP_LANGUAGES` một chỗ (mục A1). `i18n.ts` / `layout.tsx` / `LanguageSwitcher` / `appLocaleFor` đọc từ đây | `packages/constants/src/app-languages.ts`, `apps/client/i18n.ts`, `apps/client/app/layout.tsx`, `packages/ui/.../LanguageSwitcher.tsx` | i18n-keys | Jest, e2e đổi VI / EN như cũ |
| 1.2 (#1554) | Test `locales-complete` và test chặn chữ viết cứng mới (mức trần theo file) (mục A3) cho web, iOS, Android; ban đầu chỉ kiểm `vi` / `en` | `tests/locales-complete.test.ts` | verify-change | test xanh với vi / en |
| 1.3 | Bảng thuật ngữ (mục A4), anh duyệt | `locales/GLOSSARY.md` | i18n-keys | anh duyệt |
| 1.4–1.8 | Gom chữ viết cứng trên **web** vào khoá dịch (vi + en), mỗi PR một khu vực | Tích điểm, Nhập Excel (sản phẩm, khách hàng), Form đơn, In phiếu (`print-preview-model.ts`, `ReceiptPreviewModal`), còn lại | i18n-keys | test quét chữ cứng (A2), e2e các màn đó |
| 1.9–1.12 | Như trên cho **iOS** (62 dòng) và **Android** (141 dòng), mỗi app 1 PR | `apps/mobile`, `apps/mobile-android` | mobile-parity | unit test, e2e Simulator / emulator có cửa sổ |
| 1.13 | API: ngôn ngữ chưa bật → lỗi trả English (mục C11) | `packages/utils/src/api-messages.ts` | api-compat-review | `api-message-locale`, LOG.md |

## Giai đoạn 2 — Web cho từng ngôn ngữ (mỗi ngôn ngữ 2–3 PR)

1. Dịch 25 file `locales/L/*.json` theo bảng thuật ngữ; mỗi PR một nhóm file.
   - Nhóm 1: `common`, `auth`, `validation`, `errors`.
   - Nhóm 2: `orders`, `products`, `customers`.
   - Nhóm 3: phần còn lại.
2. Bật L trong `APP_LANGUAGES` (web). Bỏ fallback English của #1551 cho L.
3. Kiểm tra giao diện (mục B8): e2e Chrome có cửa sổ, chụp ~15 màn × 2 khổ, đưa ảnh lên tab mockup để anh xem.

## Giai đoạn 3 — Ngôn ngữ shop và server

1. `ShopLanguage` và zod nhận L (additive), `Merchant.language` lưu L (cột `TEXT`, không cần migration). Có LOG.md và api-compat-review.
2. Email theo L (mục C10). `email.json` ja / ko / zh đã có; ngôn ngữ khác thì dịch thêm.
3. Lỗi API theo L (mục C11): `errors.json` L đủ 571 khoá.
4. Dữ liệu mẫu theo L (mục C12): `onboarding-seed-i18n.ts`.
5. Phiếu in theo L (mục C13).
6. Ở #1545, `signupShopPrefs`: trang ở L → shop L.

## Giai đoạn 4 — App cho từng ngôn ngữ

1. iOS: `L.lproj/Localizable.strings` (3.079 khoá). Android: `values-L/strings.xml` (2.370 chuỗi).
2. App ở L → đăng ký gửi `language: L`. Cài đặt → Ngôn ngữ email có thêm L.
3. Unit test, e2e có cửa sổ, chụp màn hình. Tăng số build; anh ra bản và cập nhật mô tả trên store.

## Giai đoạn 5 — Giữ đủ về sau

- Cập nhật `AGENTS.md` (Things agents get wrong) và skill `i18n-keys`: khoá mới phải có cho mọi ngôn ngữ đã bật.
- Thêm eval case khi lần đầu có PR thiếu khoá.
- Đề xuất bật lại GitHub Actions để test chạy trên mọi PR.

## Khối lượng ước tính (mỗi ngôn ngữ thêm)

| Phần | Số câu | Ghi chú |
|---|---|---|
| Web | ~7.070 khoá (ja / ko / zh còn ~5.000) | dịch máy theo bảng thuật ngữ + duyệt màn chính |
| iOS | ~3.080 khoá | sau giai đoạn 1 có thêm ~60 câu từ chữ viết cứng |
| Android | ~2.370 chuỗi | sau giai đoạn 1 có thêm ~140 câu |
| Lỗi API | 571 khoá | dùng chung web / API |
| Email | 119 khoá | ja / ko / zh đã có |

Làm **một lần** (không phụ thuộc số ngôn ngữ): giai đoạn 1 (~650 dòng chữ viết cứng, khoảng 8–10 PR).

Mỗi ngôn ngữ sau đó: khoảng 8–10 PR (web 3, server 2, app 2–4, kiểm tra giao diện).

## Kiểm tra chung (mỗi PR)

- `yarn --cwd tests test locales-complete locales-valid-json` cùng test của khu vực, `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.
- `npx tsc --noEmit -p apps/client/tsconfig.json`, so số lỗi với `dev`.
- iOS `xcodebuild test`, Android `./gradlew :app:testDebugUnitTest`.
- e2e có cửa sổ cho màn đã đổi.
