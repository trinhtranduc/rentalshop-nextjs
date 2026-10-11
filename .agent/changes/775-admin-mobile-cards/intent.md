# 775 — Admin pages usable on a phone

Issue: #775. The owner uses `apps/admin` from a phone. Wide `<table>`s need sideways scroll and tiny taps.

Wanted: at 390 px, each table row is a compact card; at 768 px and wider nothing changes.
Priority: Subscriptions + Payments + Billing cycles, then Orders + Customers + Products, then Merchants + Users + System users, then Dashboard.

Constraints: `apps/client` shares these components and must not change. No API change. Owner chose cards (not horizontal scroll).
