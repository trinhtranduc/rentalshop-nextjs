# Spec — Public support mailbox

Issue: #1164 · Status: accepted · Intent: ./intent.md

## Behavior

1. Every public mailto and displayed contact email on client landing, public footer, Terms, Privacy, and JSON-LD is `support@anyrent.shop`.
2. The public footer shows that address as visible text, not only a mail icon.
3. iOS App Information and Android Settings contact email is `support@anyrent.shop`.
4. `EMAIL_FROM` / `noreply@anyrent.shop` is unchanged.
5. Fastlane `apple_id` is unchanged.

## Out of scope

OpenAPI swagger `info.contact.email`. Chat widget. Changing DNS/MX. In-app shop-customer chat.

## API and data

No API fields, routes, or env vars.

## Acceptance

- [ ] Grep of client/mobile public surfaces has no `trinhduc20@gmail.com` except Fastlane `apple_id`
- [ ] Footer on landing shows `support@anyrent.shop` (UI check)
- [ ] `landing.footer.emailAddress` exists in every `locales/*/landing.json`
- [ ] iOS and Android settings strings updated (store rebuild later)
