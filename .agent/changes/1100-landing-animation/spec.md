# Spec (#1100)

1. Ba mục `FeatureSpotlight` (Tìm bằng ảnh AI, Chống trùng lịch, Quy trình đơn): khi khối hình vào màn hình lần đầu (IntersectionObserver, ngưỡng 0,25, một lần):
   - điện thoại: hiện dần và trồi lên 28px (0,8 s);
   - thẻ ảnh bên trái/phải/dưới: trượt vào từ hướng của nó (0,25–0,45 s trễ), giữ đúng góc nghiêng hiện có, sau đó trôi nhẹ 6–7px liên tục (6–7 s);
   - nhãn ("Đã tìm thấy", "Chụp", …): bật ra (scale 0,6 → 1) sau ~0,9 s.
2. Ảnh đầu trang: phóng to rất chậm 1 → 1,06 (16 s, qua lại) và một vệt sáng lướt qua một lần khi tải.
3. Không có JS hoặc không có IntersectionObserver: hình hiện bình thường, không animation vào màn hình. Khối đã nằm trong màn hình lúc mở trang: chạy animation ngay.
4. `prefers-reduced-motion: reduce`: không animation nào, hình hiện đầy đủ.
5. Dùng thuộc tính CSS `translate`/`scale` riêng để không ghi đè `transform` (góc nghiêng, căn giữa) có sẵn.
