# Headed web E2E — failed scans hidden from person history

2026-10-15: **6 cases, 14 checks passed, 0 failed**. Supersedes the earlier rejected-filter behavior in #988's manual E2E report.

Actual updated Next.js client :3374, real API :3286, dedicated local PostgreSQL DB anyrent_att0850_20261015. Chrome runs headed with slow steps. Account merchant2@example.com, outletId=2, userId=1004, month=2026-10. No API mocks or static fixtures.

The real API dataset contains accepted IN/OUT, manual/edited work and rejected scans. A real API request with temporarily missing coordinates produced ATTENDANCE_NOT_CONFIGURED; coordinates were restored immediately. QR_WRONG_OUTLET is also present in this dataset.

| Case | Checks | Result |
|---|---:|---|
| ATT-PER-01 | 5 | No rejected rows or error details; visible count excludes only failed scans; edits remain; rejected filter removed |
| ATT-PER-02 | 3 | Newest day and event first, correct order within latest day |
| ATT-PER-03 | 2 | Suspected empty state and return to all records work |
| ATT-PER-04 | 1 | Edit dialog resolves correct latest IN/OUT times |
| ATT-PER-05 | 2 | Viewing the page preserves raw failed audit data and summary totals |
| ATT-PER-06 | 1 | Location badge and QR status remain visible and correct |

Run the repeatable test with explicit local fixture IDs:

```sh
WEB_E2E_HEADED=1 \
WEB_E2E_API_URL=http://127.0.0.1:3286 \
WEB_E2E_CLIENT_URL=http://127.0.0.1:3374 \
WEB_E2E_ATTENDANCE_OUTLET_ID=2 \
WEB_E2E_ATTENDANCE_USER_ID=1004 \
WEB_E2E_ATTENDANCE_MONTH=2026-10 \
WEB_E2E_CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
node tests/e2e/web/attendance-person.web.js
```

The script uses the existing seed merchant2 login default. Configure WEB_E2E_EMAIL / WEB_E2E_PASSWORD for another local fixture account. It requires accepted/rejected/edit events, including both named error codes, and refuses remote URLs or headless runs.

Output: `results: attendance-person-results.json — pass 14, fail 0, known 0, fixed? 0`.

Local evidence: /private/tmp/anyrent-991-e2e/attendance-person-results.json, ATT-PER-01-recorded-only.png and ATT-PER-06-location-status.png. Both screenshots visually inspected. No production or installed mobile app exercised; no production data modified.
