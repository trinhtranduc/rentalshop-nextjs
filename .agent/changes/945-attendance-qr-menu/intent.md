# #945 Web: QR and location under the Chấm công menu

Status: done

## What
Move the per-branch attendance page (location, radius, QR mode, print / kiosk / new code, who must clock in)
from Cài đặt → Chi nhánh → Mở › into the Chấm công menu as a new tab "Mã QR & vị trí": a list of branches,
then the branch page. The Chi nhánh page keeps only branch info.

## Why
Shop owner decision 13/10/26 (mockup MikH31P6eVqyzbnj6BoWzf, tab Web). Attendance setup lives with attendance;
the Chi nhánh page no longer mixes in attendance status.

## Constraints
- `apps/client` only. No API change. New strings in all 5 locales.
- Old link `/outlets/{id}/attendance` keeps working (redirect).
- Same permissions: owner sees every branch; outlet admin only its own; staff / kho see nothing.
