# Plan (#1359)

1. Worktree `wt-e2e-final2-android` từ `origin/dev` (`f85814d8e`), DB `anyrent_e2e_final2_android`, API :3670 (Node 20), AVD `e2e_final2_android` :5672 có cửa sổ.
2. Chạy lại các ca cũ của #1329 (rows, deposit, shopinfo, owner, owner-bills, print, bankcache, currency-fg, overlap, classic).
3. Viết và chạy ca mới: `listing`, `othbr`, `sharenote`, `share` cho từng vai trò; lấy ảnh chia sẻ thật.
4. Chạy unit test Android liên quan và toàn bộ `testDebugUnitTest`.
5. Ghi kết quả vào `tests/e2e/mobile/SETTINGS_SYNC_ANDROID.md`; phát hiện không sửa trong PR này.
