# Spec: một nút "Thu giai đoạn N"

Issue: #1441 · Intent: ./intent.md

## In scope

- iOS `InstallmentCardView.make`, Android `InstallmentCard`: bỏ nút `deposit.card.collect` và tham số `onCollect`. Giữ `deposit.card.edit`, các dòng giai đoạn, chạm dòng đã thu để huỷ.
- Thanh dưới, sheet thu, `UnpaidStagesSheet`, `blocksHandOver`, `stageToCollectBeforeHandOver`: giữ nguyên, chỉ sửa chú thích.
- Test: `OrderMoneyBlockTests`, `OrderMoneyBlockTest`, `test5j`, `test5k`, `testOrderMoney01`, `testOrderMoney02`, `test7qStagedDeposit`.
- `scripts/mobile-e2e/api-local.sh`: pathspec khôi phục file dist.

## Out of scope

API, web, chuỗi dịch (`deposit.card.collectStage` vẫn dùng ở thanh dưới và sheet), màn cũ khi `newOrderDetail` tắt.

## Acceptance

- Khối không có `deposit.card.collect` ở mọi trạng thái. Thanh dưới có `order.detail.collectStage` đúng giai đoạn khi đơn còn giai đoạn chưa thu, mọi vai trò.
- Unit test iOS và Android fail trước khi sửa, pass sau khi sửa.
- `test7qStagedDeposit` fail trên dev, pass sau khi sửa, vẫn kiểm việc chặn giao đồ, thu giai đoạn 2, mở sheet giao đồ, huỷ đơn giữ tiền.
- Trên Simulator và AVD có cửa sổ: 2 giai đoạn chưa thu, thu từ thanh dưới, giao đồ.
- `api-local.sh start --build` xong, `git status` không còn `packages/*/dist`.
