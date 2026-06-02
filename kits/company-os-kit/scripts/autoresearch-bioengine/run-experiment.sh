#!/bin/bash
# BioEngine Autoresearch — Experiment Runner
#
# Runs the eval harness, compares with previous best,
# and commits if improved.
#
# Usage: bash run-experiment.sh
# Or:    npm run experiment

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🧬 BioEngine Autoresearch — Experiment Runner${NC}"
echo ""

# 1. Ensure scenarios exist
if [ ! -f ground-truth/scenarios.json ]; then
    echo "📦 Generating synthetic scenarios..."
    npx tsx prepare.ts
    echo ""
fi

# 2. Read previous best metric
PREV_METRIC=0
if [ -f results/best-metric.json ]; then
    PREV_METRIC=$(cat results/best-metric.json | grep '"composite"' | sed 's/[^0-9]//g')
fi

# 3. Run eval
echo "🔬 Running evaluation..."
npx tsx eval.ts

# 4. Read new metric
if [ ! -f results/latest-metric.json ]; then
    echo -e "${RED}❌ No metric output. Eval may have crashed.${NC}"
    exit 1
fi

NEW_METRIC=$(cat results/latest-metric.json | grep '"composite"' | head -1 | sed 's/.*: //' | sed 's/,//')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Previous best: ${PREV_METRIC}"
echo -e "Current:       ${NEW_METRIC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 5. Compare and decide
if [ "$(echo "$NEW_METRIC > $PREV_METRIC" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
    echo -e "${GREEN}✅ IMPROVED! Saving as new best.${NC}"
    cp results/latest-metric.json results/best-metric.json

    # Git commit if in a repo
    if git rev-parse --is-inside-work-tree &>/dev/null; then
        git add -A
        git commit -m "autoresearch: metric ${PREV_METRIC} → ${NEW_METRIC}" --no-verify 2>/dev/null || true
        echo -e "${GREEN}📝 Changes committed.${NC}"
    fi
else
    echo -e "${RED}❌ No improvement. Reverting engine changes.${NC}"
    if git rev-parse --is-inside-work-tree &>/dev/null; then
        git checkout -- engine.ts config.ts 2>/dev/null || true
    fi
fi

echo ""
echo "Done. Next experiment? Modify engine.ts/config.ts and run again."
