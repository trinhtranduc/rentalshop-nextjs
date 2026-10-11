# Spec #800

- `PUT` validate `{ ...body, id }` (id từ URL thắng id trong body) và gọi `db.planLimitAddons.update(id, changes)` không kèm `id`.
- Số âm vẫn 400; id URL không phải số vẫn 400 `INVALID_INPUT`.
- Test: `tests/api/plan-limit-addon-update-route.test.ts`.
