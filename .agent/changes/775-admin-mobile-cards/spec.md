# Spec

1. `apps/admin/app/globals.css` defines `.table-cards`. Under 768 px: `thead` hidden, `tr` is a block card (border, radius, padding, margin), `td` is a flex row; a `td` with `data-label` shows the label (small, secondary colour) on the left and the value on the right; a `td` with `data-primary` is a full-width card title without label; a `td` with `data-actions` sits at the card's right edge. From 768 px nothing is applied.
2. A shared table opts in by adding `table-cards` to its `<table>` and `data-label` / `data-primary` / `data-actions` to its `<td>`s. `apps/client` has no `.table-cards` rule, so it renders as before.
3. Remove `min-w-[…]` that force sideways scroll only below 768 px (use `md:min-w-[…]`).
4. Filters stack; header action buttons wrap; tap targets are at least 44 px on the card actions.
5. Labels reuse the existing header text of the column (same strings the table already shows), so no new locale key is added. If a header is hard-coded English today it stays as is.
6. Not changed: data, sorting, selection, permissions, API, desktop layout.
