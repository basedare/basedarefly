#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

can_import_graphify() {
  "$1" -c 'from graphify.watch import _rebuild_code' >/dev/null 2>&1
}

resolve_graphify_python() {
  if [[ -n "${GRAPHIFY_PYTHON:-}" ]]; then
    if [[ ! -x "$GRAPHIFY_PYTHON" ]] || ! can_import_graphify "$GRAPHIFY_PYTHON"; then
      echo "GRAPHIFY_PYTHON does not point to an executable Graphify runtime: $GRAPHIFY_PYTHON" >&2
      return 1
    fi
    printf '%s\n' "$GRAPHIFY_PYTHON"
    return 0
  fi

  local candidate
  for candidate in \
    "$PROJECT_ROOT/.venv-graphify311/bin/python" \
    "$PROJECT_ROOT/.venv-graphify/bin/python"; do
    if [[ -x "$candidate" ]] && can_import_graphify "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  # Linked worktrees share one Git common directory. Reuse the primary
  # checkout's Graphify runtime instead of creating a virtualenv per worktree.
  local common_git_dir common_root shared_runtime
  common_git_dir="$(git rev-parse --git-common-dir 2>/dev/null || true)"
  if [[ -n "$common_git_dir" ]]; then
    common_root="$(cd "$common_git_dir/.." && pwd)"
    shared_runtime="$common_root/basedare/.venv-graphify311/bin/python"
    if [[ -x "$shared_runtime" ]] && can_import_graphify "$shared_runtime"; then
      printf '%s\n' "$shared_runtime"
      return 0
    fi
  fi

  if command -v python3 >/dev/null 2>&1 && can_import_graphify "$(command -v python3)"; then
    command -v python3
    return 0
  fi

  return 1
}

GRAPHIFY_RUNTIME="$(resolve_graphify_python || true)"

if [[ -z "$GRAPHIFY_RUNTIME" ]]; then
  PYTHON_BOOTSTRAP="$(command -v python3.11 || true)"
  if [[ -z "$PYTHON_BOOTSTRAP" ]]; then
    echo "Graphify needs Python 3.11. Install it with Homebrew, then rerun npm run graphify:rebuild." >&2
    exit 1
  fi

  VENV_PATH="$PROJECT_ROOT/.venv-graphify311"
  echo "Creating local Graphify runtime at $VENV_PATH"
  "$PYTHON_BOOTSTRAP" -m venv "$VENV_PATH"
  "$VENV_PATH/bin/python" -m pip install \
    --disable-pip-version-check \
    --requirement "$PROJECT_ROOT/requirements-graphify.txt"
  GRAPHIFY_RUNTIME="$VENV_PATH/bin/python"
fi

echo "Rebuilding Graphify with $GRAPHIFY_RUNTIME"
"$GRAPHIFY_RUNTIME" -c \
  "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"

# graphifyy 0.4.2 emits a trailing space for empty community node lists. Keep
# generated reports compatible with the repository's `git diff --check` gate.
"$GRAPHIFY_RUNTIME" -c \
  "from pathlib import Path; p=Path('graphify-out/GRAPH_REPORT.md'); p.write_text('\\n'.join(line.rstrip() for line in p.read_text().splitlines()) + '\\n') if p.exists() else None"
