# Cart: "Only N free" warning in amber, not red

Issue: #1054 · Author: Trinh Tran · Status: approved · Created: 2026-10-18

## Problem

A cart line whose product has some units free, but fewer than asked, shows "Chỉ còn 1 trống trong ngày đã
chọn" / "Only 1 free on these dates" (sale: "Chỉ còn N trong kho") in red (#991B1B on #FEE2E2), the colour of
the "Hết dd/MM → dd/MM ›" booked-out tag. Users read it as out of stock.

## Proposed outcome

- Units free ≥ 1: the pill is amber, the #1032 "Chưa soạn đồ" palette (`DS.Status.waiting`: #9A3412 on #FFEDD5),
  medium weight. Same size and shape.
- Units free = 0: the pill stays red.
- The overlap tag stays red. Text and VoiceOver/TalkBack are unchanged.

## Affected users and systems

All cart users (rent and sale), iOS and Android. No API.

## Constraints

Goes into the current release (#1049). No text change, no API change.

## Decision log

- 2026-10-18 — amber for 1+, red for 0 (owner)
