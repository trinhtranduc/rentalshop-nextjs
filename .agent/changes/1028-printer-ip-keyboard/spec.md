# Spec — Printer IP keyboard has "."

Issue: #1028

## Behaviour

1. The printer IP field opens a keyboard with digits and "." in every language:
   iOS `.numbersAndPunctuation`, Android `KeyboardType.Uri`.
2. While typing and on save, the IP is normalised: "," becomes ".", whitespace is removed
   (`PrinterSetup.normalizedIP` on iOS, `ThermalPrinter.normalizeIp` on Android).
   "192,168,1,50" → "192.168.1.50"; " 192.168.1.50 \n" → "192.168.1.50".
3. A saved IP is read back normalised too (an older "192,168,1,50" save prints).
4. Port and paper width keep the number keyboard.

## Out of scope

IP validation rules (the iOS test-print regex stays). The label printer is Bluetooth and has no IP field.
