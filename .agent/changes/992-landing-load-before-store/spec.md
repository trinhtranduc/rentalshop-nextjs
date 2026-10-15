# Spec
Issue: #992 · Status: implemented (verification limits in verification.md)

1. Middleware always passes / through, persisting anyrent_web=1 when ?web=1 is present.
2. A client effect selects the existing store URL for iOS/Android or desktop-mode iPadOS.
3. Navigation waits for window load; if document is already complete, schedule immediately. Two requestAnimationFrame callbacks ensure the landing has a paint opportunity before location.replace.
4. No navigation for existing desktop/bot/chat exclusions or web opt-out. Cleanup removes listeners and cancels animation frames, including Strict Mode effect cleanup.
5. Other routes and metadata remain unchanged. No extra copy or timer delay.

No API or data changes; installed apps unaffected.
