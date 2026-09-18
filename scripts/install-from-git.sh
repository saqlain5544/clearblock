#!/usr/bin/env bash
# Clone Clearblock from GitHub and install the unpacked folder to
# ~/chrome-extensions/clearblock (the path Chrome should Load unpacked).
#
#   bash scripts/install-from-git.sh
#   bash scripts/install-from-git.sh git@github.com:saqlain5544/clearblock.git
set -euo pipefail

DEFAULT_REPO_URL='https://github.com/saqlain5544/clearblock.git'
REPO_URL="${1:-${CLEARBLOCK_GIT_URL:-${DEFAULT_REPO_URL}}}"
DEST="${HOME}/chrome-extensions/clearblock"
REF="${CLEARBLOCK_GIT_REF:-}"

WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "${WORKDIR}"; }
trap cleanup EXIT

CLONE_ARGS=(--depth 1 --filter=blob:none --sparse)
if [[ -n "${REF}" ]]; then
  CLONE_ARGS+=(--branch "${REF}")
fi

git clone "${CLONE_ARGS[@]}" "${REPO_URL}" "${WORKDIR}/src"
git -C "${WORKDIR}/src" sparse-checkout set chrome-extensions/clearblock

SRC="${WORKDIR}/src/chrome-extensions/clearblock"
if [[ ! -f "${SRC}/manifest.json" ]]; then
  echo "No unpacked extension at chrome-extensions/clearblock in ${REPO_URL}" >&2
  exit 1
fi

mkdir -p "${HOME}/chrome-extensions"
rm -rf "${DEST}"
mkdir -p "${DEST}"
cp -R "${SRC}/." "${DEST}/"
rm -rf "${DEST}/_metadata"

echo "Clearblock is at ${DEST}"
echo "In Chrome: chrome://extensions → Developer mode → Load unpacked → ${DEST}"
