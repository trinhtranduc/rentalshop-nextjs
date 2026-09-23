# CLAUDE.md — Claude adapter

AnyRent agent instructions live in [AGENTS.md](AGENTS.md). Read that file before planning or editing.
This file only wires Claude Code. Other agents use `AGENTS.md` directly.

@AGENTS.md

## Claude-only

- Skills: `.agents/skills/` (SDLC) and `.claude/skills/` (domain). Both are on the skill path.
- Approval gate: `.claude/hooks/production-gate.sh`, configured in `.claude/settings.json`.
  Exit 2 blocks the tool call. It stops production commands, secret files, edits to applied
  migrations, and test edits while `FIX_MODE=1`.
- A human go for one destructive command is `RELEASE_APPROVED=1` on that command only.
- Bug-fix sessions set `FIX_MODE=1` after the failing test is committed (`bug-fix-tdd`).
- Do not duplicate rules here. Change `AGENTS.md`, then leave this adapter as a pointer.
