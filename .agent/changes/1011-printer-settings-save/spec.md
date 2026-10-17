# Spec — #1011

- iOS: an IP saved from Máy in (Save, Test, or leaving the field) is kept, including `192.168.1.199`.
  A `192.168.1.199` that an older build wrote by itself (never saved from Máy in) still counts as no printer (#970).
  Marker: UserDefaults `IpBillPrinterChosen` = true, written by `Utils.saveBillPrinter`.
- Android (match iOS): a saved note is kept as saved, even blank; the default note only when nothing was saved.
  The IP is trimmed on save and on read.
- No API, shared package, schema or env change.
