#!/bin/sh
set -e
cd "$(dirname "$0")/.."
npx esbuild scripts/interact.jsx --bundle --platform=node --format=esm --packages=external --jsx=automatic --outfile=scripts/.interact.mjs --log-level=error
node scripts/.interact.mjs
