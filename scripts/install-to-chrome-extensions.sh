#!/usr/bin/env bash
# Copy the unpacked Clearblock folder to ~/chrome-extensions/clearblock
# (the path Chrome should Load unpacked from on your Mac).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/chrome-extensions/clearblock"
DEST="${HOME}/chrome-extensions/clearblock"

if [[ ! -f "${SRC}/manifest.json" ]]; then
  echo "Cannot find the unpacked extension at ${SRC}" >&2
  exit 1
fi

mkdir -p "${HOME}/chrome-extensions"
rm -rf "${DEST}"
mkdir -p "${DEST}"
cp -R "${SRC}/." "${DEST}/"
rm -rf "${DEST}/_metadata"

echo "Clearblock is at ${DEST}"
echo "In Chrome: chrome://extensions → Developer mode → Load unpacked → ${DEST}"
