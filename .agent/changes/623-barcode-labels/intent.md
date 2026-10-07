# Intent — #623 barcode labels and paper sizes (web)

Status: accepted (owner chose the options on 2026-10-07)

## Problem
Shops tag rental items with barcodes so they can scan them when creating orders, but the web cannot print labels. The bill also prints only on 80 mm paper.

## Outcome (verifiable)
A shop selects products, sets copies, sees a preview at the label size and prints it on its label printer from the browser. Settings → Máy in sets the label size and the bill width (80 / 58 mm) for this computer.

## Constraints
- Browser print dialog only (driver-installed label printer). No WebUSB, no helper app.
- Products without a barcode are skipped and listed; no DB writes.
- No API change. Settings stored in the browser (per computer, like the mobile printer note).
- Keep the label lean: name, Code128, code text.

## Decision log
- 2026-10-07 owner: browser print; skip products without barcode; format = label + bill paper size.
