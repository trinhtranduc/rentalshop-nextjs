# #970 Spec

## iOS
1. `PrinterSetup.configuredIP(saved:)`: nil for nil / blank / the old fallback `192.168.1.199`; otherwise the
   trimmed IP. `Utils.loadBillPrinter()` returns that or `""` (no fake default anywhere, the settings field
   starts empty).
2. `PrinterError.notConfigured`; `PrinterManager.printOrder` / `printBill` fail with it before any network
   call. `PrinterError` is a `LocalizedError` so alerts show the real text, not "error 4".
3. `PrinterSetup.failureMessage(_:ip:onMac:)`: the check list per error (connect / timeout / disconnect);
   on a Mac (`ProcessInfo.processInfo.isiOSAppOnMac`) one more line: Mac on the printer's network and
   System Settings → Privacy & Security → Local Network → AnyRent on.
4. Every print entry point (order detail, preview, Sale) goes through `PrintFeedback.show(_:from:)`:
   not configured → "Chưa cấu hình máy in" with a "Cài đặt máy in" button that opens Printer
   Configuration; other errors → the message of 3.
5. Printer settings "In thử": a progress HUD while sending (no alert), then one alert: success, or the
   message of 3. The button is disabled while it runs.
6. `CreatedOrderAutoPrint.shouldPrint` uses the same rule (a saved `.199` is not a printer).
7. `Info.plist` `NSLocalNetworkUsageDescription`, localized vi/en in `InfoPlist.strings`.

## Android
Android has no fake default IP and "In thử" already shows its result. Same message bug: a blank IP shows
the raw "Printer IP required", a failed connection shows the raw socket exception.
1. `ThermalPrinter.Result.Failure` gains `reason` (`NOT_CONFIGURED`, `CONNECT`, `OTHER`); a blank IP returns
   `NOT_CONFIGURED` without opening a socket; socket errors are `CONNECT`.
2. `PrintFeedback.message(context, failure, ip, port)`: "Chưa cấu hình máy in…" / connect check list /
   raw text. Used by "In thử" and by every order print button.
3. Only a blank IP is "not configured" on Android (it never had the `.199` fallback; a real printer there
   keeps working).

## Script
`scripts/virtual-printer/virtual_printer.py` (+ README in Vietnamese): ESC/POS over TCP 9100 on 127.0.0.1
and the LAN IP (or `--host`), `--port`, `--out`, `--no-open`; saves `job-N.bin/.txt/.png` and opens the PNG.

## API
No change.
