# Plan — #570

1. Add `vnDate()` next to the other helpers; use it for `pickupNotes` / `returnNotes`; Vietnamese `notes`.
2. Prove it: `E2E_DATABASE_URL=postgresql://postgres@127.0.0.1:54343/anyrent_seed_check scripts/mobile-e2e/seed-local.sh`
   (fresh local DB), then SQL that every note equals the Vietnam day of its plan date; drop the DB.
