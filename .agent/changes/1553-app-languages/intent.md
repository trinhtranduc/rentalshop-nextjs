# Dịch đầy đủ trang quản lý, app, email sang thêm ngôn ngữ

Issue: #1553 · Author: agent · Status: accepted · Created: 2026-11-13

## Problem

Landing có 12 ngôn ngữ (vi, en, ja, ko, zh, zh-TW, ru, fr, de, th, id, es), nhưng sau khi đăng ký thì mọi thứ chỉ có
Tiếng Việt và English:

- **Trang quản lý cửa hàng (web):** nút đổi ngôn ngữ chỉ có VI / EN.
  - 日本語 / 한국어 / 中文 chuyển về English (#1551). Bản dịch ja / ko / zh có khoảng 29%; chỗ thiếu tự hiện English (`mergeOverEnglish`).
  - 7 ngôn ngữ còn lại chỉ có phần landing.
- **App iOS / Android:** chỉ `en` + `vi`.
- **Email:** đã có 5 ngôn ngữ (vi, en, ja, ko, zh), nhưng ngôn ngữ shop (`Merchant.language`) chỉ nhận `vi` / `en`.
- **Lỗi từ API** (`errors.json`, #986): `Accept-Language` khác `en` → trả tiếng Việt.
- **Dữ liệu mẫu khi đăng ký** (`onboarding-seed-i18n.ts`): chỉ `vi` / `en`.
- **Chữ viết cứng trong code** (không qua file dịch) nên không dịch được. Đếm bằng `scripts/i18n/hardcoded-vi.js` (#1554), không tính chú thích:
  - web ~445 dòng (`packages/ui` 311, `apps/client` 134);
  - iOS 62 dòng;
  - Android 141 dòng.
  - Một phần là hợp lệ: bảng bỏ dấu để tìm, ký hiệu "đ", tên "Tiếng Việt".

Khách ở thị trường khác đăng ký xong chỉ dùng được English. Trên điện thoại cài tiếng Nhật, app hiện English.

## Proposed outcome

- Mỗi ngôn ngữ mới chạy được **trọn vẹn** trên web, iOS và Android:
  - giao diện;
  - email gửi shop;
  - thông báo lỗi;
  - dữ liệu mẫu;
  - phiếu in;
  - ngày, giờ và số định dạng theo ngôn ngữ.
- Một ngôn ngữ chỉ được bật cho khách khi:
  - test xác nhận đủ 100% khoá dịch, giữ đúng placeholder, không lẫn tiếng Việt;
  - đã chụp kiểm tra các màn chính.
- Từ đó về sau, mỗi PR thêm chữ mới phải thêm đủ cho mọi ngôn ngữ đã bật. Test chặn PR thiếu khoá.

## Affected users and systems

- **Người dùng:** chủ shop và nhân viên (`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`, `OUTLET_INVENTORY`).
- **Code:** web `client` (`packages/ui`, `apps/client`), app iOS, app Android, `api` (lỗi, email, đăng ký, Cài đặt), `packages/database` (dữ liệu mẫu), `locales/`.
- **Ngoài phạm vi:** trang admin nội bộ (`apps/admin`) vẫn VI / EN.

## Constraints

- **Additive:** app đã cài không gửi mã ngôn ngữ mới, nên API vẫn trả như cũ cho chúng (`api-compat-review`).
- **Tiền tệ** vẫn VND / USD; thêm tiền tệ là việc khác.
- **Phạm vi PR:** không bật ngôn ngữ dịch dở. Mỗi PR chỉ một khu vực hoặc một ngôn ngữ.
- **Chữ cố ý chỉ tiếng Việt** giữ nguyên: các trang SEO tiếng Việt (`cho-thue-*`), điều khoản / chính sách (bản pháp lý).

## Open questions (anh quyết trước khi làm)

1. **Ngôn ngữ nào, theo thứ tự nào?** Đề xuất đợt 1: 日本語, 한국어, 中文 (đã dịch sẵn ~29%, email có sẵn). Các ngôn ngữ khác làm khi có khách thật.
2. **Ai duyệt bản dịch?** Agent dịch máy theo bảng thuật ngữ, rồi:
   - (a) anh duyệt nhanh bảng thuật ngữ, hoặc
   - (b) thuê người bản xứ duyệt các màn chính.
3. **Ngôn ngữ shop:** email, dữ liệu mẫu, phiếu in có theo ngôn ngữ mới không, hay chỉ giao diện? Đề xuất: có, vì email ja / ko / zh đã có sẵn.
4. **App:** dịch cùng đợt với web, hay web trước, app sau?

## Decision log

- 2026-11-13 Chủ sản phẩm: "lên plan dịch đầy đủ giúp tôi", rồi "tiếp theo" (làm giai đoạn 1) và "bạn duyệt cho tôi".
  - Câu 2: agent duyệt bản dịch. Một agent dịch theo bảng thuật ngữ; một agent khác duyệt độc lập (dịch ngược về tiếng Việt, soát thuật ngữ, độ dài). Không cần người bản xứ.
  - Câu 1, 3, 4 theo đề xuất: đợt 1 là ja, ko, zh; email, dữ liệu mẫu, phiếu in theo ngôn ngữ mới; web trước, app sau trong cùng đợt.
  - Anh có thể đổi bất cứ lúc nào.
- 2026-11-13 Đếm lại chữ viết cứng bằng công cụ (bỏ chú thích): ~650 dòng, không phải ~2.250 như ước tính ban đầu bằng grep.
