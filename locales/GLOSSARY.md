# AnyRent glossary (#1553)

Every translation of the shop pages, the apps, the emails and the API messages uses these words. One idea, one word.
The `en` column is what the English files say today; where they say two things, the first one is the one to use.

Rules for every language:

- **Do not translate:** `AnyRent`, order numbers, product and customer names, `VND`, `USD`, `QR`, `Excel`, `Google`, `Zalo`.
- **Placeholders stay as they are:** `{count}`, `{amount}`, `%@`, `%1$s`, `%d`. In ICU plurals (`{count, plural, …}`), keep the variable name and give every plural form the language needs (ja, ko, zh only need `other`).
- **Dates, times, money:** never written into a string; the code formats them for the language (`Intl`). The shop's day is the Vietnam day.
- **Length:** buttons and tabs stay short (ja / zh ≤ 6 characters where the Vietnamese is 1–2 words). A message is one sentence where possible.
- **Tone:**
  - ja: です / ます in messages, and nouns or short verbs on buttons (保存, 削除).
  - ko: 합니다체 in messages, nouns on buttons (저장, 삭제).
  - zh: Simplified Chinese (zh-CN), short and plain.

## Orders

| vi | en | ja | ko | zh | Meaning |
|---|---|---|---|---|---|
| Đơn hàng | Order | 注文 | 주문 | 订单 | any order (rental or sale) |
| Đơn thuê | Rental | レンタル注文 | 대여 주문 | 租赁订单 | an order that goes out and comes back (`RENT`) |
| Đơn bán | Sale | 販売注文 | 판매 주문 | 销售订单 | an order that is sold (`SALE`) |
| Tạo đơn | New order | 注文を作成 | 주문 생성 | 新建订单 | |
| Đặt lại đơn | Reorder | 再注文 | 재주문 | 再次下单 | copy a past order into a new one (#1515) |
| Đã đặt (`RESERVED`) | Reserved | 予約済み | 예약됨 | 已预订 | booked, not picked up yet |
| Đã lấy hàng (`PICKUPED`) | Picked up | 貸出中 | 대여 중 | 已取货 | the customer has the items |
| Đã trả hàng (`RETURNED`) | Returned | 返却済み | 반납됨 | 已归还 | |
| Hoàn thành (`COMPLETED`) | Completed | 完了 | 완료 | 已完成 | a sale, or a closed order |
| Đã hủy (`CANCELLED`) | Cancelled | キャンセル済み | 취소됨 | 已取消 | |
| Giao đồ | Hand over | 引き渡し | 인도 | 交付 | the shop gives the items to the customer |
| Trả đồ | Return | 返却 | 반납 | 归还 | the customer brings the items back |
| Ngày lấy | Pickup date | 受取日 | 수령일 | 取货日期 | |
| Ngày trả | Return date | 返却日 | 반납일 | 归还日期 | |
| Trễ hạn | Overdue | 返却遅れ | 연체 | 逾期 | not returned on the return date |
| Gia hạn (đơn) | Extend | 延長 | 연장 | 延期 | push an order's return date |
| Trùng lịch | Schedule overlap | 予約の重複 | 일정 중복 | 档期冲突 | the same item is booked twice on a day |
| Có sẵn | Available | 在庫あり | 이용 가능 | 可用 | free to rent on that day |
| Món | Item | 品目 | 품목 | 件 | one line of an order |
| Ghi chú | Note | メモ | 메모 | 备注 | |

## Money

| vi | en | ja | ko | zh | Meaning |
|---|---|---|---|---|---|
| Tiền thuê | Rent | レンタル料 | 대여료 | 租金 | price of a rental |
| Giá thuê | Rental price | レンタル価格 | 대여 가격 | 租赁价格 | per rental or per day |
| Giá bán | Sale price | 販売価格 | 판매 가격 | 售价 | |
| theo lần / theo ngày | per rental / per day | 1回あたり / 1日あたり | 회당 / 일당 | 每次 / 每天 | |
| Tiền cọc, đặt cọc | Deposit | 前金 | 선금 | 定金 | paid in advance, **counts toward the rent** |
| Thế chân | Security deposit | 保証金 | 보증금 | 押金 | money or papers held, **given back at return** |
| Phụ thu | Surcharge | 追加料金 | 추가 요금 | 附加费 | extra charge (late, damage…) |
| Giảm giá | Discount | 割引 | 할인 | 折扣 | |
| Còn lại | Amount due | 残金 | 잔액 | 待付金额 | what the customer still owes |
| Thanh toán | Payment | 支払い | 결제 | 付款 | |
| Hoàn tiền | Refund | 返金 | 환불 | 退款 | |
| Doanh thu | Revenue | 売上 | 매출 | 营业收入 | excludes cancelled orders |
| Tiền tệ | Currency | 通貨 | 통화 | 货币 | |

## Shop, people, products

| vi | en | ja | ko | zh | Meaning |
|---|---|---|---|---|---|
| Cửa hàng (shop) | Shop | ショップ | 매장 | 店铺 | the business (merchant) |
| Chi nhánh | Branch (older screens: Outlet) | 店舗 | 지점 | 门店 | one location of the shop |
| Chủ cửa hàng | Shop owner | オーナー | 사장님 | 店主 | `MERCHANT` |
| Quản lý chi nhánh | Branch manager | 店舗管理者 | 지점 관리자 | 门店经理 | `OUTLET_ADMIN` |
| Nhân viên | Staff | スタッフ | 직원 | 员工 | `OUTLET_STAFF` |
| Nhân viên kho | Inventory staff | 在庫担当 | 재고 담당 | 库存员 | `OUTLET_INVENTORY` |
| Khách hàng | Customer | 顧客 | 고객 | 客户 | |
| Sản phẩm | Product | 商品 | 상품 | 商品 | |
| Danh mục | Category | カテゴリ | 카테고리 | 分类 | |
| Tồn kho | Stock | 在庫 | 재고 | 库存 | |
| Mã vạch | Barcode | バーコード | 바코드 | 条形码 | |
| Áo dài | áo dài | アオザイ | 아오자이 | 奥黛 | Vietnamese garment; keep the word in en |
| Váy cưới | Wedding dress | ウェディングドレス | 웨딩드레스 | 婚纱 | |
| Trang phục | Costume | 衣装 | 의상 | 服装 | |

## Screens and features

| vi | en | ja | ko | zh |
|---|---|---|---|---|
| Tổng quan | Overview | 概要 | 개요 | 概览 |
| Lịch | Calendar | カレンダー | 캘린더 | 日历 |
| Cài đặt | Settings | 設定 | 설정 | 设置 |
| Gói dịch vụ | Plan | プラン | 요금제 | 套餐 |
| Dùng thử | Trial | 無料トライアル | 무료 체험 | 免费试用 |
| Gia hạn (gói) | Renew | 更新 | 갱신 | 续费 |
| Tích điểm | Loyalty points | ポイント | 포인트 | 积分 |
| Chấm công | Attendance | 勤怠 | 출퇴근 | 考勤 |
| In phiếu | Print receipt | 伝票を印刷 | 영수증 인쇄 | 打印单据 |
| Phiếu (hóa đơn) | Receipt | 伝票 | 영수증 | 单据 |
| Nhập Excel | Import from Excel | Excelから取り込み | 엑셀 가져오기 | 从Excel导入 |
| Tìm bằng hình | Image search | 画像検索 | 이미지 검색 | 以图搜索 |
| Ngôn ngữ email | Email language | メールの言語 | 이메일 언어 | 邮件语言 |
| Đăng nhập | Sign in | ログイン | 로그인 | 登录 |
| Đăng ký / Tạo cửa hàng | Create a shop | ショップを作成 | 매장 만들기 | 创建店铺 |
