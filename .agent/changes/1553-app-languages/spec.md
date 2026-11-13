# Spec — #1553 thêm ngôn ngữ cho trang quản lý, app, email

Status: accepted

`L` là một ngôn ngữ đang được thêm (ví dụ `ja`). Mỗi mục là một điều test kiểm được.

## A. Nền (không đổi gì khách nhìn thấy)

1. **Danh sách ngôn ngữ app một chỗ:** `APP_LANGUAGES` trong `packages/constants`, mỗi ngôn ngữ có cờ `enabled`.
   - Web (`i18n.ts`, `layout.tsx`, `LanguageSwitcher`, `appLocaleFor`), API (`resolveApiMessageLocale`, `ShopLanguage`, zod) và dữ liệu mẫu đều đọc danh sách này.
   - Ngôn ngữ `enabled: false` không hiện trong nút đổi ngôn ngữ và không được API nhận.
2. **Không còn chữ tiếng Việt viết cứng** trong trang quản lý web, iOS, Android.
   - Test quét code: không có ký tự tiếng Việt trong chuỗi `.tsx/.ts/.swift/.kt`, trừ danh sách cho phép (trang SEO tiếng Việt, điều khoản, dữ liệu test, comment).
3. **Test đủ khoá** (`locales-complete`), với mỗi ngôn ngữ `enabled`:
   - có mọi khoá của `vi` trong mọi file `locales/*`;
   - placeholder (`{x}`, `%@`, `%1$s`) trùng `vi`;
   - không chứa chữ tiếng Việt.
   - Làm tương tự cho `Localizable.strings` (iOS) và `strings.xml` (Android).
4. **Bảng thuật ngữ** `locales/GLOSSARY.md`: mỗi thuật ngữ AnyRent có bản dịch cho mỗi ngôn ngữ (đơn thuê, đơn bán, cọc, phụ thu, giao đồ, trả đồ, chi nhánh, đặt trước, gia hạn, tích điểm…). Bản dịch phải dùng đúng bảng này.

## B. Web cho ngôn ngữ L

5. 25 file `locales/L/*.json` có đủ khoá (mục 3). `mergeOverEnglish` vẫn giữ làm lưới an toàn.
6. Khi L `enabled`:
   - nút đổi ngôn ngữ trang quản lý hiện L;
   - chọn L thì mọi màn ở L;
   - L không còn bị chuyển về English (bỏ fallback của #1551 cho L).
7. **Ngày, số, tiền** theo L (`Intl`, `intlLocale`). Lịch và “hôm nay” vẫn theo ngày Việt Nam (`timezone-dates`).
8. **Kiểm tra giao diện:** Chrome có cửa sổ, chụp các màn chính ở 1280px và 390px. Không chữ nào tràn, không còn khoá thô, không còn tiếng Việt lẫn vào.
   - Màn chính: đăng nhập, đăng ký, Tổng quan, Đơn (danh sách, tạo, chi tiết), Sản phẩm, Khách hàng, Lịch, Cài đặt, Gói, Nhân viên, Chi nhánh, In phiếu.

## C. Ngôn ngữ shop và phía server cho L

9. **Đăng ký và Cài đặt** nhận `language: L` (thêm vào zod, `ShopLanguage`). App cũ không gửi L nên không đổi gì.
   - Ở #1545, trang hoặc app đang ở L thì shop là L.
10. **Email** gửi shop theo L (email xác thực, quên mật khẩu, gói, nhắc hết hạn).
11. **Lỗi từ API:** `Accept-Language: L` → câu theo L. Ngôn ngữ chưa bật → **English** (hiện đang là tiếng Việt).
12. **Dữ liệu mẫu khi đăng ký** (chi nhánh, danh mục, sản phẩm mẫu) theo L.
13. **Phiếu in và mẫu in** theo ngôn ngữ shop.

## D. App cho ngôn ngữ L

14. iOS có `L.lproj/Localizable.strings` đủ khoá; Android có `values-L/strings.xml` đủ chuỗi. Máy để L thì app hiện L.
15. Ở #1545, đăng ký từ app ở L thì gửi `language: L` (chỉ khi API đã bật L; nếu chưa thì gửi `en`).
16. Mô tả và ảnh trên App Store, Google Play cho L: anh làm khi ra bản.

## E. Giữ đủ về sau

17. `AGENTS.md` và skill `i18n-keys`: khoá mới phải có ở mọi ngôn ngữ đã bật.
    - Agent dịch theo bảng thuật ngữ ngay trong PR đó.
    - Test mục 3 chặn PR thiếu khoá (chạy ở máy khi GitHub Actions đang tắt).

## Out of scope

- Trang admin nội bộ (`apps/admin`).
- Tiền tệ mới ngoài VND / USD.
- Dịch trang SEO tiếng Việt và bản pháp lý (điều khoản, chính sách).
- Ngôn ngữ viết từ phải sang trái.
