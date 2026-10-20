# Spec — Settings layout C

Issue: #1140 · Status: in-progress

## Tabs (`SETTINGS_TABS`, ids keep old keys)

| Group | id | Label (vi) | Roles |
|---|---|---|---|
| shop | merchant | Thông tin cửa hàng | MERCHANT |
| shop | outlet | Chi nhánh | outlet roles |
| shop | public-page (new) | Trang shop công khai | MERCHANT |
| shop | bank-accounts | Ngân hàng | MERCHANT, OUTLET_ADMIN |
| shop | receipt | Phiếu in | all |
| account | subscription | Gói dịch vụ | MERCHANT |
| me | profile | Hồ sơ | all |
| me | account | Mật khẩu & bảo mật | all |
| me | language | Ngôn ngữ & giao diện | all |

Aliases: `appearance` → `language`, `printer` → `receipt`, `loyalty` → /loyalty (as today). Forbidden / unknown → role default.

## Content

- merchant: shop form (tenantKey removed from it, still sent unchanged; description, state, zip, country under a closed "Thêm"), Nhận đặt online card (id `dat-online`), one row "Chi nhánh · N chi nhánh · Mở Chi nhánh ›" → /outlets.
- public-page: Mã URL form (saves through the same merchant PUT with the rest unchanged) + Chia sẻ links card.
- outlet: unchanged (form, OUTLET_ADMIN booking switch, share links).
- language: Ngôn ngữ card + Giao diện card (Giao diện hidden by the theme kill switch).
- Phone (< lg): `?settings=` empty → grouped list; a tab → that page with a back button to the list. Desktop unchanged: empty → role default.

## Acceptance

Model test: tab ids per role, groups, aliases. Visual check owner + staff at 1366 and 390.
