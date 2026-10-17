# #1033 — Tổng quan is drawn narrow, then expands, on first load

**Want:** the first frame of the Tổng quan tab (iOS `OverviewV2ViewController`) already spans the phone width.
**Why:** owner, Release build on an iPhone against dev-api: the screen first shows shrunk, then widens when the figures arrive.
**Constraint:** no API change; no delay or animation workaround; the iPad centered column (#973) keeps its 900pt cap.
