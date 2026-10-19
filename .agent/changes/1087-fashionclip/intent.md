# Intent — image search on Marqo-FashionCLIP (#1087)

Issue: #1087 · Status: approved by owner (2026-10-19)

## Problem
Customers report image search finds less than before. The model is generic CLIP ViT-B/32 (not trained on
clothing), and many products have no vector (queue drained only by a cron that may not run).

## Outcome
Image vectors come from `Marqo/marqo-fashionCLIP` (fashion model, ViT-B/16, 512-dim, Apache-2.0), every
product with photos is re-indexed, and the queue can be drained fast enough for a full reindex.

## Constraints
- Search response shape unchanged (installed apps). Additive API only. No migration.
- Unset env = today's behaviour. Vectors of the new model go to a NEW Qdrant collection; the old one stays
  for an instant rollback.
- Dev first; production only after dev is checked.
