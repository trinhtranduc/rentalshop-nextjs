# Intent — #1089 admin image search: one shop at a time

Issue: #1089 · Status: approved (owner 2026-10-19)

**What:** in Settings › Admin Info › "Tìm bằng ảnh", pick one shop, re-index only that shop with the current
(new) model and have it processed right away, instead of re-running the whole system.

**Why:** after the FashionCLIP switch (#1087) the owner wants to do important shops first and check them.

**Constraints:** additive API change on an ADMIN-only route (installed apps never call it); no migration;
the model and Qdrant collection stay system-wide (env), so a shop not re-indexed after an env switch is not
found. #1065: the card must not loop requests.
