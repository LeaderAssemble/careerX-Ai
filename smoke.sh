#!/bin/sh
set -e
cd "$(dirname "$0")/.."
npx esbuild scripts/smoke.jsx --bundle --platform=node --format=esm --packages=external --jsx=automatic --outfile=scripts/.smoke.mjs --log-level=error
node scripts/.smoke.mjs
