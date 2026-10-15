# Spec — Recorded attendance events only

Issue: #991 · Status: implemented · Intent: ./intent.md

## Behavior
1. Visible history excludes rows with result REJECTED.
2. Rejected scans of every error code do not appear. Accepted IN/OUT, EDIT and AUTO_CLOSED rows remain visible.
3. The suspected filter contains only visible non-rejected events with suspect reasons. Remove the rejected filter option.
4. Raw month rows remain available for recordTimes and latest edit resolution; KPIs continue using existing API summary data.
5. Visible rows retain descending work day and timestamp order. Empty result sets show the existing empty message.

## API and data
No API change and no audit deletion. Existing error logging and exported/API data remain intact. Numeric IDs, role and merchant scope unchanged.

## Out of scope
Changing payroll math, exports, mobile apps, error logging policy, adding audit screens.

## Acceptance
Focused model checks plus repeatable headed E2E with a mixed real API dataset (accepted, rejected and edited) prove filtering, ordering and edit dialog targeting. Recheck location badge behavior.
