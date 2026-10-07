# iOS order detail: Chia sẻ đơn; search debounce 0.3 s

Issue: #639 · Author: Trinh Tran · Status: accepted · Created: 2026-10-07

## Problem
The new iOS order detail ⋯ sheet has no "Chia sẻ đơn"; the old preview screen and Android have it. Some old iOS
search boxes wait 0.7 s.

## Outcome
⋯ → "Chia sẻ đơn" (after "In hoá đơn") renders the old screen's receipt JPG (reused via
`PreviewViewController.shareReceiptImageURL`) and opens the share sheet (Lưu ảnh, Zalo, …). Old search boxes 0.3 s.

## Decision log
- 2026-10-07 — owner: "theo bạn đề xuất" (share on iOS; type-to-search with 0.3 s debounce, no submit button)
