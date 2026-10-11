# #864 — Release tags on main-real

**Want:** every production deploy has a tag, so each PR's impact is judged against the exact code customers run.
**Why:** owner asked (2026-10-11). Without tags, "production" is only `origin/main-real`, and older deploys are hard to name.
**Constraint:** no app or API change; tagging must not need a human step; never push to `main-real` itself.
