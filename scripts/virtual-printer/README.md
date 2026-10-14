# Máy in ảo (ESC/POS qua mạng, cổng 9100)

Dùng để thử in hoá đơn trên app iOS / Android / Mac mà không cần máy in thật (#970).
Script nhận lệnh in như máy in nhiệt mạng, lưu mỗi lần in thành `job-N.bin` (dữ liệu gốc),
`job-N.txt` (chữ + lệnh ESC/POS đã giải mã) và `job-N.png` (ảnh tờ hoá đơn), rồi mở ảnh.

## Chạy

```bash
pip3 install Pillow          # cần để ra ảnh PNG; thiếu Pillow vẫn lưu .bin/.txt
python3 scripts/virtual-printer/virtual_printer.py
```

Mặc định nghe trên `127.0.0.1:9100` và IP mạng LAN của Mac (`ipconfig getifaddr en0`).
Màn hình in ra địa chỉ để nhập vào app.

Tuỳ chọn:

- `--port 9101` — đổi cổng (app iOS luôn in tới 9100; Android cho đổi cổng trong Cài đặt → Máy in).
- `--out <thư mục>` — nơi lưu job (mặc định `$TMPDIR/anyrent-virtual-printer`).
- `--no-open` — không tự mở ảnh sau mỗi lần in.
- `ADDR ...` — chỉ nghe trên các địa chỉ này, ví dụ `python3 virtual_printer.py 127.0.0.1`.

Script nghe trên từng địa chỉ cụ thể (không phải `*`), nên chạy được cạnh một tiến trình khác đang
nghe `*:9100` (ví dụ `tools/fake-zebra`). Nếu báo `cannot listen`, dùng `--port` hoặc tắt tiến trình kia.

## Nhập IP máy in trong app

| Chạy app trên | IP máy in |
|---|---|
| iPhone Simulator, Mac ("Designed for iPad") | `127.0.0.1` |
| Android emulator | `10.0.2.2` (cổng 9100) |
| Điện thoại thật cùng Wi-Fi | IP LAN của Mac (dòng đầu khi chạy script) |

Vào Cài đặt → Máy in → nhập IP → **In thử**: app báo thành công và script lưu `job-N.png`.
Nhập IP sai (ví dụ `10.255.255.1`) để xem thông báo lỗi kèm cách kiểm tra.
