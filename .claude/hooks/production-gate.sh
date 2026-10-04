#!/usr/bin/env bash
# PreToolUse approval gate (see AGENTS.md and .agents/skills/protocol-guardian).
# Reads the tool call as JSON on stdin. Exit 0 = allow, exit 2 = block (stderr is shown to Claude).
# Every verdict is appended to .claude/hooks/gate.log for audit.
set -u
INPUT="$(cat)"
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG="$ROOT/.claude/hooks/gate.log"

TOOL="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')"
CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"
FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')"

log() { printf '%s\t%s\t%s\t%s\n' "$(date -u +%FT%TZ)" "$1" "$TOOL" "${CMD:-$FILE}" >> "$LOG" 2>/dev/null || true; }
block() { log "BLOCK: $1"; printf '%s\n%s\n' "BLOCKED by .claude/hooks/production-gate.sh: $1" "$2" >&2; exit 2; }

case "$TOOL" in
  Bash)
    # Production-affecting commands: need an explicit human go for this one invocation.
    PROD_RE='railway[^|;&]*--environment[[:space:]]+production|railway:blog:(migrate|full)([[:space:]]|$)|railway:(reset|setup)|db:reset-railway|db:[a-z:-]*:prod([[:space:]]|$)|update-admin-password:prod|generate:all-embeddings:production|prisma[[:space:]]+migrate[[:space:]]+(reset|deploy)|vercel[[:space:]]+[^|;&]*--prod|gradlew[^|;&]*bundleRelease|fastlane[^|;&]*(release|deliver|pilot|supply)|git[[:space:]]+push[^|;&]*(--force|-f([[:space:]]|$)|[[:space:]]main(-real)?([[:space:]]|$))'
    if printf '%s' "$CMD" | grep -Eq "$PROD_RE"; then
      if [ "${RELEASE_APPROVED:-0}" != "1" ]; then
        block "production / destructive command" \
          "Ask the human for a go, then re-run with RELEASE_APPROVED=1 prefixed to this single command."
      fi
      log "ALLOW (RELEASE_APPROVED=1)"
    fi
    # The seed wipes every business table: only against a DATABASE_URL on this machine, set on the same command.
    # scripts/mobile-e2e/seed-local.sh refuses non-local URLs itself, so it is not matched here.
    # Matches running it (yarn/npm/node), not reading it (cat, grep, sed on the file).
    SEED_RE='(yarn|npm[[:space:]]+run|pnpm)[[:space:]]+([^|;&]*[[:space:]])?(db:regenerate-system|railway:seed)([[:space:]]|$)|(node|bun|tsx)[[:space:]]+[^|;&]*regenerate-entire-system-2025'
    if printf '%s' "$CMD" | grep -Eq "$SEED_RE"; then
      SEED_URLS="$(printf '%s' "$CMD" | grep -Eo '(^|[[:space:];&|(])DATABASE_URL=["'"'"']?[^[:space:]"'"'"']*' || true)"
      SEED_OK=1
      [ -n "$SEED_URLS" ] || SEED_OK=0
      # Every DATABASE_URL on the line must be local; railway run would inject the remote one.
      while IFS= read -r u; do
        [ -z "$u" ] && continue
        printf '%s' "$u" | grep -Eq '^[[:space:];&|(]?DATABASE_URL=["'"'"']?[a-z]+://([^@/]*@)?(127\.0\.0\.1|localhost)([:/]|$)' || SEED_OK=0
      done <<< "$SEED_URLS"
      printf '%s' "$CMD" | grep -Eq 'railway[[:space:]]+run' && SEED_OK=0
      if [ "$SEED_OK" != 1 ]; then
        block "seed script without a local DATABASE_URL" \
          "The seed deletes all data. Set DATABASE_URL=postgresql://…@127.0.0.1:<port>/<db> on the same command, or use scripts/mobile-e2e/seed-local.sh (it checks the URL itself)."
      fi
      log "ALLOW (seed on local DATABASE_URL)"
    fi
    # Secrets must not be printed or copied.
    if printf '%s' "$CMD" | grep -Eq '(^|[[:space:];&|])(cat|less|more|head|tail|cp|scp)[[:space:]]+[^|;&]*(\.env(\.[a-z]+)?([[:space:]]|$)|\.env\.local|keystore\.properties|\.p8([[:space:]]|$))'; then
      block "reading a secrets file" "Use env.example for variable names; never print .env*, keystore.properties or *.p8."
    fi
    ;;
  Edit|Write|MultiEdit|NotebookEdit)
    case "$FILE" in
      */.env|*/.env.*|.env|.env.*|*/keystore.properties|*.p8)
        block "editing a secrets file ($FILE)" "Edit env.example instead and tell the human what to set." ;;
      */prisma/migrations/*|prisma/migrations/*)
        if [ "${MIGRATION_EDIT_OK:-0}" != "1" ]; then
          block "editing prisma/migrations" "Applied migrations are immutable. Create a new migration with yarn db:migrate:dev, or set MIGRATION_EDIT_OK=1 for an unapplied one."
        fi ;;
    esac
    if [ "${FIX_MODE:-0}" = "1" ]; then
      case "$FILE" in
        */tests/*|tests/*|*.test.ts|*.test.tsx|*.test.js|*Tests.swift|*Test.kt)
          block "editing tests while FIX_MODE=1" "The pre-committed failing test is the proof of the fix. Change the implementation, not the test." ;;
      esac
    fi
    ;;
esac
log "ALLOW"
exit 0
