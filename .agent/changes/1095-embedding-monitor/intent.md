# Intent — #1095 admin image-search monitor

Issue: #1095 · Status: approved (owner chose the mockup tab "Admin tìm bằng ảnh", 2026-10-19)

## Problem
After "Re-index", the admin card shows only totals: nobody can see which products are done, which job runs,
why one failed, or which model/collection the system uses after the FashionCLIP switch (#1087).

## Outcome
One compact card: model line, progress of the last run, 3 stats, a jobs table with 4 tabs (running, waiting,
done, failed), buttons at the bottom, auto refresh while work is left.

## Constraints
Admin only, read-only new route, additive status field, no migration, no mobile change. Keep #1065 (no request loop).
